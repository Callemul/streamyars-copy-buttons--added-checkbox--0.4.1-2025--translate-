import { SYH_CONFIG } from './modules/config';
import { SYH_STORAGE } from './modules/storage';
import { SYH_STATE } from './modules/state';
import { SYH_UTILS } from './modules/utils';
import { SYH_UI } from './modules/ui_core';
import './modules/ui_comments';
import './modules/ui_banners';
import { SYH_PARSERS } from './modules/parsers';
import { SYH_BANNER_CREATOR } from './modules/banner_creator';
import { SYH_EVENT_COMMENTS } from './modules/event_comments';
import { SYH_EVENT_BANNERS } from './modules/event_banners';
import { SYH_VIDEO_COPIER } from './modules/video_copier';
import { SYH_STATS_TRACKER } from './modules/stats_tracker';
import { SYH_STATS_EXPORTER } from './modules/stats_exporter';
import { SYH_INFO_MODAL } from './modules/info_modal';
import { SYH_I18N } from './modules/i18n';
import { SYH_ANTI_AFK } from './modules/anti_afk';
import { SYH_COMMENT_ASSISTANT } from './modules/comment_assistant';

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

    
    const { SELECTORS, TIMINGS } = SYH_CONFIG;

    // --- ANTI-AFK (АВТОМАТИЧНЕ ЗАКРИТТЯ ВІКНА ТАЙМАУТУ) ---
    function startAntiAfk(): void {
        SYH_ANTI_AFK.startAntiAfk(SYH_CONFIG, SYH_STORAGE, SYH_I18N);
    }

    import { SYH_DOM_OBSERVER } from './modules/dom_observer';

    function setupDomRegistration(): void {
        const commentSelector = Array.isArray(SELECTORS.commentBlock) ? SELECTORS.commentBlock[0] : SELECTORS.commentBlock;
        const bannerSelector = Array.isArray(SELECTORS.bannerBlock) ? SELECTORS.bannerBlock[0] : SELECTORS.bannerBlock;
        const bannerHeaderSelector = Array.isArray(SELECTORS.bannerHeader) ? SELECTORS.bannerHeader[0] : SELECTORS.bannerHeader;
        const starredHeaderSelector = Array.isArray(SELECTORS.starredHeaderWrap) ? SELECTORS.starredHeaderWrap[0] : SELECTORS.starredHeaderWrap;

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
    }

    // --- ІНІЦІАЛІЗАЦІЯ ---
    function init(): void {
        console.log("Initializing SYH modules...");

        SYH_UTILS.init(SYH_CONFIG);
        SYH_UI.init(SYH_CONFIG, SYH_STATE);
        SYH_BANNER_CREATOR.init(SYH_CONFIG, SYH_UTILS, SYH_PARSERS);
        
        SYH_EVENT_COMMENTS.init(SYH_CONFIG, SYH_STATE, SYH_UTILS, SYH_UI);
        SYH_EVENT_BANNERS.init(SYH_CONFIG, SYH_STATE, SYH_UTILS, SYH_UI, SYH_BANNER_CREATOR);
        SYH_COMMENT_ASSISTANT.init(SYH_CONFIG);
        SYH_COMMENT_ASSISTANT.processAllComments();

        if (window.SYH_VIDEO_COPIER) window.SYH_VIDEO_COPIER.init();
        if (window.SYH_STATS_TRACKER) window.SYH_STATS_TRACKER.init();

        SYH_EVENT_COMMENTS.bindEvents();
        SYH_EVENT_BANNERS.bindEvents();

        // ДВОСТОРОННЯ СИНХРОНІЗАЦІЯ: Прийом сигналів unstar від Попапу в реальному часі
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
            chrome.runtime.onMessage.addListener(function(message: any, _sender: any, _sendResponse: any) {
                if (message && message.action === 'unstar_comment') {
                    const targetText = message.text ? message.text.trim() : "";
                    if (!targetText) return;

                    const commentBlocks = document.querySelectorAll(SELECTORS.commentBlock);
                    for (const block of Array.from(commentBlocks)) {
                        const textNode = block.querySelector(SELECTORS.commentText);
                        if (textNode && textNode.textContent?.trim() === targetText) {
                            const starBtnNode = block.querySelector(SELECTORS.starButton) as HTMLElement | null;
                            if (starBtnNode && starBtnNode.getAttribute('aria-selected') === 'true') {
                                console.log("[SYH] Отримано сигнал від Попапу. Автоматично знімаю зірку з:", targetText);
                                starBtnNode.click();
                            }
                            break;
                        }
                    }
                }
            });
        }

        // Запуск захисту від AFK
        startAntiAfk();

        document.querySelectorAll(SELECTORS.commentBlock).forEach((el) => SYH_UI.addButtonsToComment(el as HTMLElement));
        document.querySelectorAll(SELECTORS.bannerBlock).forEach((el) => SYH_UI.addButtonsToBanner(el as HTMLElement));
        document.querySelectorAll(SELECTORS.bannerHeader).forEach((el) => SYH_UI.addBannerHeaderControls(el as HTMLElement));

        if (SYH_STATE && typeof SYH_STATE.init === 'function') SYH_STATE.init();

        setupDomRegistration();

        const targetContainer = document.querySelector('[data-testid="chat-container"]')
            || document.querySelector('.chat-container')
            || document.querySelector('#app')
            || document.querySelector('#root')
            || document.body;

        SYH_DOM_OBSERVER.start(targetContainer);
        
        console.log("SYH is running.");
    }

    init();

})(window);
