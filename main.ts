import { SYH_CONFIG, resolveFirstSelector } from './modules/config';
import { SYH_STATE } from './modules/state';
import { SYH_UTILS } from './modules/utils';
import { SYH_UI } from './modules/ui';
import { SYH_PARSERS } from './modules/parsers';
import { SYH_BANNER_CREATOR } from './modules/banner_creator';
import { SYH_EVENT_COMMENTS_PLUGIN } from './modules/event_comments';
import { SYH_EVENT_BANNERS_PLUGIN } from './modules/event_banners';
import { SYH_VIDEO_COPIER_PLUGIN } from './modules/video_copier';
import { SYH_STATS_TRACKER } from './modules/stats_tracker';
import { SYH_ANTI_AFK_PLUGIN } from './modules/anti_afk';
import { SYH_COMMENT_ASSISTANT } from './modules/comment_assistant';
import { SYH_RIGHT_TABS_COMPACT } from './modules/right_tabs_compact';
import { SYH_MESSAGING } from './modules/messaging';
import { SYH_PLUGINS } from './modules/plugin_registry';
import { SYH_DOM_OBSERVER } from './modules/dom_observer';

(() => {
    'use strict';

    const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;

    // ЗАПОБІЖНИК ПОДВІЙНОЇ ІН'ЄКЦІЇ
    if ((globalScope as any).__SYH_INITIALIZED__) {
        console.warn("[SYH] Розширення вже запущене на цій сторінці. Повторну ініціалізацію примусово зупинено.");
        return;
    }
    (globalScope as any).__SYH_INITIALIZED__ = true;

    const syhVersion = chrome?.runtime?.getManifest?.()?.version ?? '1.0.0';
    console.log(`StreamYard Helper v${syhVersion} [Anti-AFK & Modular Architecture] Loaded!`);

    
    const { SELECTORS } = SYH_CONFIG;

    function setupDomRegistration(): void {
        const commentSelector = resolveFirstSelector(SELECTORS.commentBlock)!;
        const bannerSelector = resolveFirstSelector(SELECTORS.bannerBlock)!;
        const bannerHeaderSelector = resolveFirstSelector(SELECTORS.bannerHeader)!;
        const starredHeaderSelector = resolveFirstSelector(SELECTORS.starredHeaderWrap)!;
        const starredTabSelector = resolveFirstSelector(SELECTORS.starredTabButton)!;
        const rightTabSelector = resolveFirstSelector(SELECTORS.rightTabButtons)!;

        SYH_DOM_OBSERVER.register(commentSelector, (el) => {
            SYH_UI.addButtonsToComment(el);
            SYH_COMMENT_ASSISTANT.processComment(el);
        }, () => {
            SYH_UI.filterStarredComments();
        });

        SYH_DOM_OBSERVER.register(bannerSelector, (el) => {
            SYH_UI.addButtonsToBanner(el);
            SYH_UI.updateMasterCheckboxState();
            SYH_UI.filterBanners();
        }, () => {
            SYH_UI.updateMasterCheckboxState();
            SYH_UI.filterBanners();
        });

        SYH_DOM_OBSERVER.register(bannerHeaderSelector, (el) => {
            SYH_UI.addBannerHeaderControls(el);
        });

        SYH_DOM_OBSERVER.register(starredHeaderSelector, (el) => {
            SYH_UI.addStarredTabControls(el);
        });

        SYH_DOM_OBSERVER.register(starredTabSelector, (el) => {
            SYH_UI.addStarredTabCopyButton(el);
        });

        SYH_DOM_OBSERVER.register(rightTabSelector, (el) => {
            SYH_RIGHT_TABS_COMPACT.processTabButton(el as HTMLElement);
        });
    }

    function handleUnstarCommentMessage(targetText: string, selectors: Record<string, any>): void {
        if (!targetText) return;
        const commentBlocks = document.querySelectorAll(selectors.commentBlock);
        for (const block of Array.from(commentBlocks)) {
            const textNode = block.querySelector(selectors.commentText);
            if (textNode && textNode.textContent?.trim() === targetText) {
                const starBtnNode = block.querySelector(selectors.starButton) as HTMLElement | null;
                if (starBtnNode && starBtnNode.getAttribute('aria-selected') === 'true') {
                    console.log("[SYH] Отримано сигнал від Попапу. Автоматично знімаю зірку з:", targetText);
                    starBtnNode.click();
                }
                break;
            }
        }
    }

    function handleFetchPrayersMessage(sendResponse?: (response?: unknown) => void): boolean {
        const currentRoomId = window.location.pathname.replace(/\//g, '');
        const comments = document.querySelectorAll('[class*="PlatformComment__Wrap"][data-syh-type="prayer"]');
        const newPrayers: any[] = [];
        const now = Date.now();

        comments.forEach(block => {
            const starBtn = block.querySelector('[class*="PlatformCommentShell__StarButton"]');
            if (starBtn && starBtn.getAttribute('aria-selected') === 'true') {
                let author = block.querySelector('[class*="PlatformCommentShell__NameText"]')?.textContent?.trim() || "Глядач";
                while (author.startsWith('@')) author = author.substring(1);

                const text = block.querySelector('[class*="PlatformCommentShell__ContentSpan"]')?.textContent || "";

                if (text) {
                    newPrayers.push({
                        id: 'p_' + now + '_' + Math.random().toString(36).substring(2, 9),
                        author: author,
                        text: text,
                        type: "prayer",
                        icon: "🙏🙏🙏",
                        roomId: currentRoomId,
                        timestamp: now
                    });
                }
            }
        });

        if (sendResponse) sendResponse(newPrayers);
        return true;
    }

    // --- ІНІЦІАЛІЗАЦІЯ ---
    function init(): void {
        console.log("Initializing SYH modules...");

        SYH_UTILS.init(SYH_CONFIG);
        SYH_UI.init(SYH_CONFIG, SYH_STATE);
        SYH_BANNER_CREATOR.init(SYH_CONFIG, SYH_UTILS, SYH_PARSERS);

        SYH_COMMENT_ASSISTANT.init(SYH_CONFIG);
        SYH_COMMENT_ASSISTANT.processAllComments();
        SYH_RIGHT_TABS_COMPACT.init();

        if (SYH_STATE && typeof SYH_STATE.init === 'function') SYH_STATE.init();

        // Реєстрація та автоматичний запуск плагінів через SYH_PLUGINS
        SYH_PLUGINS.register(SYH_EVENT_COMMENTS_PLUGIN);
        SYH_PLUGINS.register(SYH_EVENT_BANNERS_PLUGIN);
        SYH_PLUGINS.register(SYH_ANTI_AFK_PLUGIN);
        SYH_PLUGINS.register(SYH_VIDEO_COPIER_PLUGIN);

        SYH_PLUGINS.initSupportedPlugins();

        if (SYH_STATS_TRACKER && typeof SYH_STATS_TRACKER.init === 'function') {
            SYH_STATS_TRACKER.init();
        }

        setupDomRegistration();

        const targetContainer = document.querySelector('[data-testid="chat-container"]')
            || document.querySelector('.chat-container')
            || document.querySelector('#app')
            || document.querySelector('#root')
            || document.body;

        SYH_DOM_OBSERVER.start(targetContainer);

        // ДВОСТОРОННЯ СИНХРОНІЗАЦІЯ: Прийом сигналів від Попапу в реальному часі через SYH_MESSAGING
        SYH_MESSAGING.onMessage((message, sender, sendResponse) => {
            if (message?.action === 'unstar_comment') {
                handleUnstarCommentMessage(message.text ? message.text.trim() : "", SELECTORS);
            } else if (message?.action === 'FETCH_PRAYERS') {
                return handleFetchPrayersMessage(sendResponse);
            }
        });

        console.log("SYH is running.");
    }

    init();

})(window);
