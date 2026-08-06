// youtube/studio/studio_content.ts
//
// ПРИЗНАЧЕННЯ: Головний контролер Studio-модуля. Ініціалізація, MutationObserver,
//              обхід коментарів, SPA-навігація.
//
// ТОЧКА ВХОДУ: StudioModuleController.init() — автозапуск при завантаженні сторінки.
//
// ПОТІК РОБОТИ:
//   1. init()                  — завантаження storage, підписка на зміни, запуск спостерігача
//   2. handleStateChange()     — перевірка чи ми на /comments/ і чи модуль увімкнено
//   3. startModule()           — початкова обробка + MutationObserver для нових коментарів
//   4. scheduleProcessComments() → processVisibleComments()
//      → сортує ytcp-comment (БАТЬКІВСЬКІ ПЕРШИМИ, потім is-reply)
//      → для кожного викликає bindStudioCommentEvents() (studio_events.ts)
//
// ВАЖЛИВО — ПОРЯДОК ОБРОБКИ:
//   Батьківські ytcp-comment обробляються ПЕРШИМИ (sort за is-reply),
//   щоб reply-коментарі могли успадкувати videoKey через data-syh-video-key.
//   Логіка спадкування — REPLY INHERITANCE у studio_events.ts (~ряд 88).
//
// ЗАЛЕЖНОСТІ:
//   studio_events.ts  — bindStudioCommentEvents() (вся логіка одного коментаря)
//   studio_selectors.ts — getCommentThreads()
//   studio_comment_key.ts — cleanupStudioState() (30-денне очищення)
//   studio_video_map.ts — VIDEO_MAP_STORAGE_KEY
import { SYH_STORAGE, STORAGE_KEYS } from '../../modules/storage';
import { SYH_DOM_OBSERVER } from '../../modules/dom_observer';
import { getStudioChannelInfo, type StudioChannelInfo } from './studio_channel';
import { getCommentThreads, getCommentHeaderLabelElement, getCommentHeaderElement, STUDIO_SELECTORS } from './studio_selectors';
import { bindStudioCommentEvents, type StudioEventCaches } from './studio_events';
import { VIDEO_MAP_STORAGE_KEY } from './studio_video_map';
import { cleanupStudioState, STUDIO_BUTTON_STATE_KEY, STUDIO_CHECKBOX_STATE_KEY } from './studio_comment_key';
import { getAllSheetIds } from '../../modules/sheets';
import { renderStudioHeaderCounters, type SheetHeaderStats } from './studio_header_counters';
import { countQuestionsInText } from '../../modules/telegram_parser';
import type { CommentPayload } from '../../modules/comment_service';
import { SYH_COMMENT_ASSISTANT } from '../../modules/comment_assistant';
import { SYH_CONFIG } from '../../modules/config';

const STUDIO_ENABLED_KEY = STORAGE_KEYS.STUDIO_ENABLED;

class StudioModuleController {
    private enabled: boolean = true;
    private isInitialized: boolean = false;
    private unregisterObserver: (() => void) | null = null;
    private channelInfo: StudioChannelInfo | null = null;
    private lastPath: string = '';
    private frameId: number | null = null;
    private pollInterval: number | null = null;
    private scrollHandler: (() => void) | null = null;
    private contextMenuHandler: ((e: MouseEvent) => void) | null = null;
    private sheetStatsMap: Record<string, SheetHeaderStats> = {};
    private caches: StudioEventCaches = {
        videoSheetMap: {},
        buttonStates: {},
        checkboxStates: {},
        collectedItems: []
    };

    public async init(): Promise<void> {
        console.log('[SYH Studio] Initializing Studio Module...');

        // 0. Initialize Comment Assistant with Studio selectors
        SYH_COMMENT_ASSISTANT.init({
            SELECTORS: {
                commentBlock: STUDIO_SELECTORS.COMMENT,
                commentText: STUDIO_SELECTORS.CONTENT_TEXT
            },
            TRIGGER_WORDS_QUESTION: SYH_CONFIG.TRIGGER_WORDS_QUESTION,
            TRIGGER_WORDS_PRAYER: SYH_CONFIG.TRIGGER_WORDS_PRAYER,
            TRIGGER_WORDS: SYH_CONFIG.TRIGGER_WORDS
        });

        // 1. Run 30-day state cleanup
        cleanupStudioState().catch((err) => console.warn('[SYH Studio] Cleanup error:', err));

        // 2. Load storage state
        await this.loadStorageData();

        // 3. Listen for storage changes
        SYH_STORAGE.onChanged((changes) => {
            const studioEnabledChange = changes[STUDIO_ENABLED_KEY];
            if (studioEnabledChange) {
                this.enabled = studioEnabledChange.newValue ?? true;
                console.log('[SYH Studio] Studio enabled state changed to:', this.enabled);
                this.handleStateChange();
            }
            const videoMapChange = changes[VIDEO_MAP_STORAGE_KEY];
            if (videoMapChange) {
                this.caches.videoSheetMap = videoMapChange.newValue || {};
                this.scheduleProcessComments(true);
            }
            const buttonStateChange = changes[STUDIO_BUTTON_STATE_KEY];
            if (buttonStateChange) {
                this.caches.buttonStates = buttonStateChange.newValue || {};
                this.scheduleProcessComments(true);
            }
            const checkboxStateChange = changes[STUDIO_CHECKBOX_STATE_KEY];
            if (checkboxStateChange) {
                this.caches.checkboxStates = checkboxStateChange.newValue || {};
                this.scheduleProcessComments(true);
            }
            const hasCollectedChange = Object.keys(changes).some((k) => k.startsWith('syh:popup:collected:'));
            if (hasCollectedChange) {
                this.loadStorageData().then(() => this.scheduleProcessComments(true));
            }
        });

        // 4. Initial check & start SPA listeners
        this.lastPath = window.location.pathname;
        this.handleStateChange();
        this.setupSPAListeners();
    }

    private async loadStorageData(): Promise<void> {
        const sheetIds = getAllSheetIds();
        const collectedKeys = sheetIds.map((sId) => `syh:popup:collected:${sId}`);
        const keysToFetch = [
            STUDIO_ENABLED_KEY,
            VIDEO_MAP_STORAGE_KEY,
            STUDIO_BUTTON_STATE_KEY,
            STUDIO_CHECKBOX_STATE_KEY,
            ...collectedKeys
        ];

        return new Promise((resolve) => {
            SYH_STORAGE.get(keysToFetch, (res) => {
                this.enabled = res[STUDIO_ENABLED_KEY] ?? true;
                this.caches.videoSheetMap = res[VIDEO_MAP_STORAGE_KEY] || {};
                this.caches.buttonStates = res[STUDIO_BUTTON_STATE_KEY] || {};
                this.caches.checkboxStates = res[STUDIO_CHECKBOX_STATE_KEY] || {};

                const collected: CommentPayload[] = [];
                const sheetStatsMap: Record<string, SheetHeaderStats> = {};
                sheetIds.forEach((sId) => {
                    const list = res[`syh:popup:collected:${sId}`];
                    let questions = 0;
                    let prayers = 0;
                    if (Array.isArray(list)) {
                        collected.push(...list);
                        list.forEach((item: any) => {
                            if (item.type === 'question') {
                                questions += countQuestionsInText(item.text || '');
                            } else if (item.type === 'prayer') {
                                prayers += 1;
                            }
                        });
                    }
                    sheetStatsMap[sId] = { questions, prayers };
                });
                this.caches.collectedItems = collected;
                this.sheetStatsMap = sheetStatsMap;
                resolve();
            });
        });
    }

    private isCommentsPage(): boolean {
        return window.location.pathname.includes('/comments/');
    }

    private handleStateChange(): void {
        if (!this.enabled || !this.isCommentsPage()) {
            this.stopModule();
            return;
        }

        this.startModule();
    }

    private startModule(): void {
        if (this.isInitialized) {
            this.scheduleProcessComments(false);
            return;
        }

        console.log('[SYH Studio] Starting Studio comment injection...');
        this.isInitialized = true;
        this.channelInfo = getStudioChannelInfo();

        // Initial process
        this.scheduleProcessComments(false);

        // Observer for dynamic virtualized comment lists via central DomObserverService
        if (!this.unregisterObserver) {
            this.unregisterObserver = SYH_DOM_OBSERVER.register(
                '.ytcp-comment-thread, ytcp-comment-thread, ytcp-comment, #comments-content, #items',
                () => {
                    if (this.enabled && this.isCommentsPage()) {
                        this.scheduleProcessComments(false);
                    }
                }
            );

            SYH_DOM_OBSERVER.start(document.body);
        }

        // Attach capture scroll listener to capture Polymer iron-list recycling
        if (!this.scrollHandler) {
            this.scrollHandler = () => {
                if (this.enabled && this.isCommentsPage()) {
                    this.scheduleProcessComments(false);
                }
            };
            window.addEventListener('scroll', this.scrollHandler, { capture: true, passive: true });
        }

        // Attach capture contextmenu handler to bypass YouTube tooltip bugs and handle all RMB clicks
        if (!this.contextMenuHandler) {
            this.contextMenuHandler = (e: MouseEvent) => {
                if (!this.enabled || !this.isCommentsPage()) return;
                const target = e.target as HTMLElement | null;
                if (!target) return;

                const threadEl = target.closest('ytcp-comment, ytcp-comment-thread');
                if (!threadEl) return;

                if (target.closest('button, a, input, select, textarea, .syh-studio-dropdown, .syh-studio-btn, .syh-yt-btn')) {
                    return;
                }

                const checkbox = threadEl.querySelector<HTMLInputElement>('.syh-studio-checkbox');
                if (!checkbox) return;

                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            };
            window.addEventListener('contextmenu', this.contextMenuHandler, { capture: true });
        }
    }

    private stopModule(): void {
        if (!this.isInitialized) return;
        console.log('[SYH Studio] Stopping Studio module (disabled or left /comments/)...');
        this.isInitialized = false;

        if (this.pollInterval !== null) {
            window.clearInterval(this.pollInterval);
            this.pollInterval = null;
        }

        if (this.frameId !== null) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }

        if (this.unregisterObserver) {
            this.unregisterObserver();
            this.unregisterObserver = null;
        }

        if (this.scrollHandler) {
            window.removeEventListener('scroll', this.scrollHandler, { capture: true, passive: true });
            this.scrollHandler = null;
        }

        if (this.contextMenuHandler) {
            window.removeEventListener('contextmenu', this.contextMenuHandler, { capture: true });
            this.contextMenuHandler = null;
        }

        // Cleanup injected UI elements
        document.querySelectorAll('.syh-studio-btn, .syh-studio-video-meta, .syh-header-counters-wrapper').forEach((el) => el.remove());
        document.querySelectorAll('.syh-studio-comment-checked').forEach((el) => el.classList.remove('syh-studio-comment-checked'));
    }

    private scheduleProcessComments(forceUpdate: boolean = false): void {
        if (this.frameId !== null) return;

        this.frameId = requestAnimationFrame(() => {
            this.frameId = null;
            this.processVisibleComments(forceUpdate);
        });
    }

    private processVisibleComments(forceUpdate: boolean = false): void {
        if (!this.enabled || !this.isCommentsPage()) return;

        // Re-check channel info if unknown
        if (!this.channelInfo || this.channelInfo.key === 'unknown') {
            this.channelInfo = getStudioChannelInfo();
        }

        const channelKey = this.channelInfo?.key || 'unknown';
        const channelLabel = this.channelInfo?.label || 'Невідомий канал';

        this.updateHeaderCounters();

        const threads = getCommentThreads();
        // Process parent comments first so replies can inherit their videoKey
        const sortedThreads = threads.slice().sort((a, b) => {
            const aIsReply = a.hasAttribute('is-reply') ? 1 : 0;
            const bIsReply = b.hasAttribute('is-reply') ? 1 : 0;
            return aIsReply - bIsReply;
        });
        sortedThreads.forEach((threadEl) => {
            bindStudioCommentEvents(threadEl, channelKey, channelLabel, this.caches, forceUpdate);
        });
    }

    private updateHeaderCounters(): void {
        if (!this.enabled || !this.isCommentsPage()) return;

        // Cleanup any legacy badges near 'Спільнота' header
        document.querySelectorAll('ytcp-entity-page-header .syh-header-counters-wrapper').forEach((el) => el.remove());

        if (!this.channelInfo || this.channelInfo.key === 'unknown') {
            this.channelInfo = getStudioChannelInfo();
        }

        const channelKey = this.channelInfo?.key || 'unknown';
        const headerTarget = getCommentHeaderLabelElement() || getCommentHeaderElement();
        if (headerTarget) {
            renderStudioHeaderCounters(headerTarget, channelKey, this.sheetStatsMap);
        }
    }

    private setupSPAListeners(): void {
        window.addEventListener('popstate', () => this.checkPathChange());
        window.addEventListener('yt-navigate-finish', () => this.checkPathChange());

        // Polling fallback for SPA url changes
        if (this.pollInterval !== null) return;
        this.pollInterval = window.setInterval(() => {
            this.checkPathChange();
        }, 1000);
    }

    private checkPathChange(): void {
        const currentPath = window.location.pathname;
        if (currentPath !== this.lastPath) {
            this.lastPath = currentPath;
            console.log('[SYH Studio] Location changed to:', currentPath);
            this.handleStateChange();
        }
    }
}

// Auto-start on load
const studioController = new StudioModuleController();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => studioController.init());
} else {
    studioController.init();
}

import type { ISyhPlugin } from '../../modules/plugin_registry';

export const SYH_STUDIO_PLUGIN: ISyhPlugin = {
    id: 'syh_studio_module',
    name: 'YouTube Studio Helper',
    enabled: true,
    isSupported: (url = typeof window !== 'undefined' ? window.location.href : '') => url.includes('studio.youtube.com'),
    init: () => {
        studioController.init();
    },
    destroy: () => {
        studioController.stopModule();
    }
};

export { studioController };
