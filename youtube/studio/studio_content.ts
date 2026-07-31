// youtube/studio/studio_content.ts
import { SYH_STORAGE } from '../../modules/storage.ts';
import { getStudioChannelInfo, StudioChannelInfo } from './studio_channel.ts';
import { getCommentThreads } from './studio_selectors.ts';
import { bindStudioCommentEvents, StudioEventCaches } from './studio_events.ts';
import { getStudioVideoSheetMap, VIDEO_MAP_STORAGE_KEY } from './studio_video_map.ts';
import { cleanupStudioState, STUDIO_BUTTON_STATE_KEY, STUDIO_CHECKBOX_STATE_KEY } from './studio_comment_key.ts';

const STUDIO_ENABLED_KEY = 'syh_studio_enabled';

class StudioModuleController {
    private enabled: boolean = true;
    private isInitialized: boolean = false;
    private observer: MutationObserver | null = null;
    private channelInfo: StudioChannelInfo | null = null;
    private lastPath: string = '';
    private frameId: number | null = null;
    private caches: StudioEventCaches = {
        videoSheetMap: {},
        buttonStates: {},
        checkboxStates: {}
    };

    public async init(): Promise<void> {
        console.log('[SYH Studio] Initializing Studio Module...');

        // 1. Run 30-day state cleanup
        cleanupStudioState().catch((err) => console.warn('[SYH Studio] Cleanup error:', err));

        // 2. Load storage state
        await this.loadStorageData();

        // 3. Listen for storage changes (e.g. syh_studio_enabled toggle from Options)
        SYH_STORAGE.onChanged((changes) => {
            if (changes[STUDIO_ENABLED_KEY]) {
                this.enabled = changes[STUDIO_ENABLED_KEY].newValue ?? true;
                console.log('[SYH Studio] syh_studio_enabled changed to:', this.enabled);
                this.handleStateChange();
            }
            if (changes[VIDEO_MAP_STORAGE_KEY]) {
                this.caches.videoSheetMap = changes[VIDEO_MAP_STORAGE_KEY].newValue || {};
                this.scheduleProcessComments(true);
            }
        });

        // 4. Initial check & start SPA listeners
        this.lastPath = window.location.pathname;
        this.handleStateChange();
        this.setupSPAListeners();
    }

    private async loadStorageData(): Promise<void> {
        return new Promise((resolve) => {
            SYH_STORAGE.get(
                [STUDIO_ENABLED_KEY, VIDEO_MAP_STORAGE_KEY, STUDIO_BUTTON_STATE_KEY, STUDIO_CHECKBOX_STATE_KEY],
                (res) => {
                    this.enabled = res[STUDIO_ENABLED_KEY] ?? true;
                    this.caches.videoSheetMap = res[VIDEO_MAP_STORAGE_KEY] || {};
                    this.caches.buttonStates = res[STUDIO_BUTTON_STATE_KEY] || {};
                    this.caches.checkboxStates = res[STUDIO_CHECKBOX_STATE_KEY] || {};
                    resolve();
                }
            );
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

        // Observer for dynamic virtualized comment lists
        if (!this.observer) {
            this.observer = new MutationObserver((mutations) => {
                if (!this.enabled || !this.isCommentsPage()) return;

                let hasCommentNodes = false;
                for (const mutation of mutations) {
                    for (const node of Array.from(mutation.addedNodes)) {
                        if (node.nodeType !== Node.ELEMENT_NODE) continue;
                        const el = node as Element;

                        if (
                            (el.matches && (el.matches('.ytcp-comment-thread') || el.matches('#comments-content') || el.matches('#items'))) ||
                            (el.querySelector && el.querySelector('.ytcp-comment-thread'))
                        ) {
                            hasCommentNodes = true;
                            break;
                        }
                    }
                    if (hasCommentNodes) break;
                }

                if (hasCommentNodes) {
                    this.scheduleProcessComments(false);
                }
            });

            this.observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    private stopModule(): void {
        if (!this.isInitialized) return;
        console.log('[SYH Studio] Stopping Studio module (disabled or left /comments/)...');
        this.isInitialized = false;

        if (this.frameId !== null) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }

        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        // Cleanup injected UI elements
        document.querySelectorAll('.syh-studio-btn, .syh-studio-video-meta').forEach((el) => el.remove());
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

        const threads = getCommentThreads();
        threads.forEach((threadEl) => {
            bindStudioCommentEvents(threadEl, channelKey, channelLabel, this.caches, forceUpdate);
        });
    }

    private setupSPAListeners(): void {
        window.addEventListener('popstate', () => this.checkPathChange());
        window.addEventListener('yt-navigate-finish', () => this.checkPathChange());

        // Polling fallback for SPA url changes
        setInterval(() => {
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

if (typeof window !== 'undefined') {
    (window as any).studioController = studioController;
}
