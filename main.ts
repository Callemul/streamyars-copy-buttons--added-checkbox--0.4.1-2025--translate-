import { SYH_CONFIG } from './modules/config.ts';
import { SYH_STORAGE } from './modules/storage.ts';
import { SYH_STATE } from './modules/state.ts';
import { SYH_UTILS } from './modules/utils.ts';
import { SYH_UI } from './modules/ui_core.ts';
import './modules/ui_comments.ts';
import './modules/ui_banners.ts';
import { SYH_PARSERS } from './modules/parsers.ts';
import { SYH_BANNER_CREATOR } from './modules/banner_creator.ts';
import { SYH_EVENT_COMMENTS } from './modules/event_comments.ts';
import { SYH_EVENT_BANNERS } from './modules/event_banners.ts';
import { SYH_VIDEO_COPIER } from './modules/video_copier.ts';
import { SYH_STATS_TRACKER } from './modules/stats_tracker.ts';
import { SYH_STATS_EXPORTER } from './modules/stats_exporter.ts';
import { SYH_INFO_MODAL } from './modules/info_modal.ts';
import { SYH_I18N } from './modules/i18n.ts';
import { SYH_ANTI_AFK } from './modules/anti_afk.ts';
import { SYH_COMMENT_ASSISTANT } from './modules/comment_assistant.ts';

(function(window: any, $: any) {
    'use strict';

    // ЗАПОБІЖНИК ПОДВІЙНОЇ ІН'ЄКЦІЇ (DOUBLE-INJECTION PREVENTION)
    if (window.SYH_LOADED) {
        console.warn("[SYH] Розширення вже запущене на цій сторінці. Повторну ініціалізацію примусово зупинено.");
        return;
    }
    window.SYH_LOADED = true;

    const syhVersion = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) 
        ? chrome.runtime.getManifest().version 
        : '1.0.0';
    console.log(`StreamYard Helper v${syhVersion} [Anti-AFK & Stable] Loaded!`);

    
    const { SELECTORS, TIMINGS } = SYH_CONFIG;

    // --- ANTI-AFK (АВТОМАТИЧНЕ ЗАКРИТТЯ ВІКНА ТАЙМАУТУ) ---
    function startAntiAfk(): void {
        SYH_ANTI_AFK.startAntiAfk(SYH_CONFIG, SYH_STORAGE, SYH_I18N);
    }

    // --- OBSERVER ---
    const MAX_PENDING_MUTATIONS = 500;
    let pendingMutations: MutationRecord[] = [];
    let rafScheduled = false;

    function processMutations(mutationsList: MutationRecord[]): void {
        let bannerStateChanged = false;
        let commentStateChanged = false;
        
        for (const mutation of mutationsList) {
            for (const node of Array.from(mutation.addedNodes)) {
                if (node.nodeType !== 1) continue;
                const element = node as Element;
                
                if (element.matches(SELECTORS.commentBlock)) {
                    SYH_UI.addButtonsToComment(element);
                    SYH_COMMENT_ASSISTANT.processComment(element);
                } else if (element.querySelector(SELECTORS.commentBlock)) {
                    element.querySelectorAll(SELECTORS.commentBlock).forEach((el: Element) => {
                        SYH_UI.addButtonsToComment(el);
                        SYH_COMMENT_ASSISTANT.processComment(el);
                    });
                }
                
                if (element.matches(SELECTORS.bannerBlock)) {
                    SYH_UI.addButtonsToBanner(element);
                    bannerStateChanged = true;
                } else if (element.querySelector(SELECTORS.bannerBlock)) {
                    element.querySelectorAll(SELECTORS.bannerBlock).forEach((el: Element) => {
                        SYH_UI.addButtonsToBanner(el);
                        bannerStateChanged = true;
                    });
                }
                
                if (element.matches(SELECTORS.bannerHeader)) {
                    SYH_UI.addBannerHeaderControls(element);
                } else if (element.querySelector(SELECTORS.bannerHeader)) {
                    element.querySelectorAll(SELECTORS.bannerHeader).forEach((el: Element) => SYH_UI.addBannerHeaderControls(el));
                }
                
                if (element.matches(SELECTORS.starredHeaderWrap)) {
                    SYH_UI.addStarredTabControls(element);
                } else if (element.querySelector(SELECTORS.starredHeaderWrap)) {
                    element.querySelectorAll(SELECTORS.starredHeaderWrap).forEach((el: Element) => SYH_UI.addStarredTabControls(el));
                }
                
                if (element.matches(SELECTORS.starredItemWrap) || (element.closest && element.closest(SELECTORS.starredList))) {
                    commentStateChanged = true;
                }
            }
            
            for (const node of Array.from(mutation.removedNodes)) {
                if (node.nodeType === 1) {
                    const element = node as Element;
                    if (element.matches(SELECTORS.bannerBlock) || element.querySelector(SELECTORS.bannerBlock)) {
                        bannerStateChanged = true;
                    }
                    if (element.matches(SELECTORS.commentBlock) || element.querySelector(SELECTORS.commentBlock) || element.matches(SELECTORS.starredCommentItem)) {
                        commentStateChanged = true;
                    }
                }
            }
        }
        
        if (bannerStateChanged) {
            SYH_UI.updateMasterCheckboxState();
            if (window.SYH_UI && typeof window.SYH_UI.filterBanners === 'function') {
                clearTimeout(window.SYH_UI._filterBannersTimeout);
                window.SYH_UI._filterBannersTimeout = setTimeout(() => window.SYH_UI.filterBanners(), TIMINGS.FILTER_DEBOUNCE);
            }
        }

        if (commentStateChanged) {
            if (window.SYH_UI && typeof window.SYH_UI.filterStarredComments === 'function') {
                clearTimeout(window.SYH_UI._filterCommentsTimeout);
                window.SYH_UI._filterCommentsTimeout = setTimeout(() => window.SYH_UI.filterStarredComments(), TIMINGS.FILTER_DEBOUNCE);
            }
        }
    }

    function flushMutations(): void {
        const mutationsToProcess = pendingMutations;
        pendingMutations = [];
        rafScheduled = false;
        if (mutationsToProcess.length > 0) {
            processMutations(mutationsToProcess);
        }
    }

    let currentTargetContainer: Element | null = null;

    function checkAndReattachObserver(): void {
        if (!currentTargetContainer || currentTargetContainer === document.body || !currentTargetContainer.isConnected) {
            const specificContainer = document.querySelector('[data-testid="chat-container"]')
                || document.querySelector('.chat-container')
                || document.querySelector('#app')
                || document.querySelector('#root');

            if (specificContainer && specificContainer !== currentTargetContainer) {
                console.log("[SYH] Чат-контейнер знайдено. Перепідключаю main MutationObserver з body до конкретного контейнера.");
                observer.disconnect();
                currentTargetContainer = specificContainer;
                observer.observe(currentTargetContainer, { childList: true, subtree: true });
            }
        }
    }

    const observer = new MutationObserver((mutationsList: MutationRecord[]) => {
        checkAndReattachObserver();
        pendingMutations.push(...mutationsList);

        if (pendingMutations.length >= MAX_PENDING_MUTATIONS) {
            flushMutations();
            return;
        }

        if (!rafScheduled) {
            rafScheduled = true;
            if (document.hidden) {
                setTimeout(flushMutations, 200);
            } else {
                requestAnimationFrame(flushMutations);
            }
        }
    });

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

        $(SELECTORS.commentBlock).each((_i: number, el: HTMLElement) => SYH_UI.addButtonsToComment(el));
        $(SELECTORS.bannerBlock).each((_i: number, el: HTMLElement) => SYH_UI.addButtonsToBanner(el));
        $(SELECTORS.bannerHeader).each((_i: number, el: HTMLElement) => SYH_UI.addBannerHeaderControls(el));

        if (SYH_STATE && typeof SYH_STATE.init === 'function') SYH_STATE.init();

        const targetContainer = document.querySelector('[data-testid="chat-container"]')
            || document.querySelector('.chat-container')
            || document.querySelector('#app')
            || document.querySelector('#root')
            || document.body;

        observer.observe(targetContainer, { childList: true, subtree: true });
        
        console.log("SYH is running.");
    }

    init();

})(window, (window as any).jQuery || (window as any).$);
