// main.js
(function(window, $) {
    'use strict';

    // ЗАПОБІЖНИК ПОДВІЙНОЇ ІН'ЄКЦІЇ (DOUBLE-INJECTION PREVENTION)
    if (window.SYH_LOADED) {
        console.warn("[SYH] Розширення вже запущене на цій сторінці. Повторну ініціалізацію примусово зупинено.");
        return;
    }
    window.SYH_LOADED = true;

    console.log("StreamYard Helper v0.9.9 [Anti-AFK & Stable] Loaded!");

    const { 
        SYH_CONFIG, 
        SYH_STATE, 
        SYH_UTILS, 
        SYH_UI, 
        SYH_PARSERS, 
        SYH_BANNER_CREATOR, 
        SYH_EVENT_COMMENTS, 
        SYH_EVENT_BANNERS, 
        SYH_VIDEO_COPIER 
    } = window;
    
    const { SELECTORS } = SYH_CONFIG;

    let reminderScheduled = false;

    function checkForStreamEnd() {
        if (reminderScheduled) {
            return;
        }

        const $statusContainer = $(SELECTORS.streamStatusContainer);

        if ($statusContainer.length > 0 && $statusContainer.text().includes('Ended')) {
            reminderScheduled = true;
            setTimeout(() => {
                if(SYH_UI.createTelegramReminder) SYH_UI.createTelegramReminder();
            }, 2 * 60 * 1000);
        }
    }

    // --- ANTI-AFK (АВТОМАТИЧНЕ ЗАКРИТТЯ ВІКНА ТАЙМАУТУ) ---
    function startAntiAfk() {
        console.log("[SYH] Anti-AFK захист активовано.");
        const antiAfkInterval = setInterval(() => {
            // KILL SWITCH: Самознищення таймера, якщо розширення було оновлено
            if (typeof chrome !== 'undefined' && chrome.runtime && !chrome.runtime.id) {
                clearInterval(antiAfkInterval);
                return;
            }
            
            // Шукаємо модальне вікно за aria-label (безпечний спосіб без жорстких класів)
            const modal = document.querySelector('div[role="dialog"][aria-label="Are you still there?"]');
            if (modal) {
                const buttons = Array.from(modal.querySelectorAll('button'));
                const stayBtn = buttons.find(b => b.textContent && b.textContent.trim() === 'Stay in the studio');
                if (stayBtn) {
                    console.log("[SYH] AFK таймаут перехоплено! Натискаю 'Stay in the studio'.");
                    stayBtn.click();
                }
            }
        }, 30000); // 30 секунд
    }

    // --- OBSERVER ---
    const observer = new MutationObserver((mutationsList) => {
        let bannerStateChanged = false;
        let commentStateChanged = false;
        
        for (const mutation of mutationsList) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue;
                const $node = $(node);
                
                $node.find(SELECTORS.commentBlock).addBack($node.filter(SELECTORS.commentBlock)).each((i, el) => SYH_UI.addButtonsToComment(el));
                $node.find(SELECTORS.bannerBlock).addBack($node.filter(SELECTORS.bannerBlock)).each((i, el) => { SYH_UI.addButtonsToBanner(el); bannerStateChanged = true; });
                $node.find(SELECTORS.bannerHeader).addBack($node.filter(SELECTORS.bannerHeader)).each((i, el) => SYH_UI.addBannerHeaderControls(el));
                
                $node.find('.StarredCommentList__HeaderWrap-sc-1qtlqu2-5').addBack($node.filter('.StarredCommentList__HeaderWrap-sc-1qtlqu2-5')).each((i, el) => SYH_UI.addStarredTabControls(el));
                
                if ($node.hasClass('StarredCommentList__ItemWrap-sc-1qtlqu2-6') || $node.closest('.StarredCommentList__List-sc-1qtlqu2-1').length > 0) {
                    commentStateChanged = true;
                }
            }
            
            for (const node of mutation.removedNodes) {
                if (node.nodeType === 1) {
                    if (node.matches(SELECTORS.bannerBlock) || node.querySelector(SELECTORS.bannerBlock)) {
                        bannerStateChanged = true;
                    }
                    if (node.matches(SELECTORS.commentBlock) || node.querySelector(SELECTORS.commentBlock) || node.matches('li[class*="StarredCommentList"]')) {
                        commentStateChanged = true;
                    }
                }
            }
        }
        
        if (bannerStateChanged) {
            SYH_UI.updateMasterCheckboxState();
            if (window.SYH_UI && typeof window.SYH_UI.filterBanners === 'function') {
                clearTimeout(window.SYH_UI._filterBannersTimeout);
                window.SYH_UI._filterBannersTimeout = setTimeout(() => window.SYH_UI.filterBanners(), 150);
            }
        }

        if (commentStateChanged) {
            if (window.SYH_UI && typeof window.SYH_UI.filterStarredComments === 'function') {
                clearTimeout(window.SYH_UI._filterCommentsTimeout);
                window.SYH_UI._filterCommentsTimeout = setTimeout(() => window.SYH_UI.filterStarredComments(), 150);
            }
        }
    });

    // --- ІНІЦІАЛІЗАЦІЯ ---
    // --- ІНІЦІАЛІЗАЦІЯ ---
        function init() {
            console.log("Initializing SYH modules...");

            SYH_UTILS.init(SYH_CONFIG);
            SYH_UI.init(SYH_CONFIG, SYH_STATE);
            SYH_BANNER_CREATOR.init(SYH_CONFIG, SYH_UTILS, SYH_PARSERS);
            
            SYH_EVENT_COMMENTS.init(SYH_CONFIG, SYH_STATE, SYH_UTILS, SYH_UI);
            SYH_EVENT_BANNERS.init(SYH_CONFIG, SYH_STATE, SYH_UTILS, SYH_UI, SYH_BANNER_CREATOR);

            if (window.SYH_VIDEO_COPIER) window.SYH_VIDEO_COPIER.init();
            if (window.SYH_STATS_TRACKER) window.SYH_STATS_TRACKER.init();

            SYH_EVENT_COMMENTS.bindEvents();
            SYH_EVENT_BANNERS.bindEvents();

            // ДВОСТОРОННЯ СИНХРОНІЗАЦІЯ: Прийом сигналів unstar від Попапу в реальному часі
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
                chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
                    if (message && message.action === 'unstar_comment') {
                        const targetText = message.text ? message.text.trim() : "";
                        if (!targetText) return;

                        const commentBlocks = document.querySelectorAll(SELECTORS.commentBlock);
                        for (const block of commentBlocks) {
                            const textNode = block.querySelector(SELECTORS.commentText);
                            if (textNode && textNode.textContent.trim() === targetText) {
                                const starBtnNode = block.querySelector(SELECTORS.starButton);
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

            $(SELECTORS.commentBlock).each((i, el) => SYH_UI.addButtonsToComment(el));
            $(SELECTORS.bannerBlock).each((i, el) => SYH_UI.addButtonsToBanner(el));
            $(SELECTORS.bannerHeader).each((i, el) => SYH_UI.addBannerHeaderControls(el));

            if (SYH_STATE && typeof SYH_STATE.init === 'function') SYH_STATE.init();

            observer.observe(document.body, { childList: true, subtree: true });
            
            console.log("SYH is running.");
        }

    init();

})(window, jQuery);