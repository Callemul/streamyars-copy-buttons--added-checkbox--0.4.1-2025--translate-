// main.js
(function(window, $) {
    'use strict';

    console.log("StreamYard Helper v0.9.7 [Reminder Feature] Loaded!");

    // Отримуємо доступ до всіх наших модулів
    const { SYH_CONFIG, SYH_STATE, SYH_UTILS, SYH_UI, SYH_PARSERS, SYH_BANNER_CREATOR, SYH_EVENT_HANDLERS, SYH_VIDEO_COPIER } = window;
    
    const { SELECTORS } = SYH_CONFIG;

    // Стан для відстеження, чи було заплановано нагадування
    let reminderScheduled = false;

    /**
     * Перевіряє, чи завершився стрім, і планує нагадування.
     */
    function checkForStreamEnd() {
        if (reminderScheduled) {
            return;
        }

        const $statusContainer = $(SELECTORS.streamStatusContainer);

        if ($statusContainer.length > 0 && $statusContainer.text().includes('Ended')) {
            reminderScheduled = true;
            
            console.log("SYH: Стрім завершено. Нагадування буде показано через 2 хвилини.");

            // Встановлюємо таймер на 2 хвилини (120,000 мілісекунд)
            setTimeout(() => {
                console.log("SYH: Показ нагадування про публікацію.");
                SYH_UI.createTelegramReminder();
            }, 2 * 60 * 1000);
        }
    }

    // --- OBSERVER ---
    const observer = new MutationObserver((mutationsList) => {
        let bannerStateChanged = false;
        for (const mutation of mutationsList) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue;
                const $node = $(node);
                $node.find(SELECTORS.commentBlock).addBack($node.filter(SELECTORS.commentBlock)).each((i, el) => SYH_UI.addButtonsToComment(el));
                $node.find(SELECTORS.bannerBlock).addBack($node.filter(SELECTORS.bannerBlock)).each((i, el) => { SYH_UI.addButtonsToBanner(el); bannerStateChanged = true; });
                $node.find(SELECTORS.bannerHeader).addBack($node.filter(SELECTORS.bannerHeader)).each((i, el) => SYH_UI.addBannerHeaderControls(el));
                
                // Ловимо заголовок Starred коментарів
                $node.find('.StarredCommentList__HeaderWrap-sc-1qtlqu2-5').addBack($node.filter('.StarredCommentList__HeaderWrap-sc-1qtlqu2-5')).each((i, el) => SYH_UI.addStarredTabControls(el));
                
                // Якщо додано коментар у Starred - застосовуємо поточні фільтри
                if ($node.hasClass('StarredCommentList__ItemWrap-sc-1qtlqu2-6') || $node.closest('.StarredCommentList__List-sc-1qtlqu2-1').length > 0) {
                    if (window.SYH_UI && typeof window.SYH_UI.filterStarredComments === 'function') {
                        setTimeout(() => window.SYH_UI.filterStarredComments(), 50);
                    }
                }
            }
            if (mutation.removedNodes.length > 0) bannerStateChanged = true;
        }
        if (bannerStateChanged) SYH_UI.updateMasterCheckboxState();

        // При кожній зміні в DOM перевіряємо статус стріму
        // checkForStreamEnd();
    });

    // --- ІНІЦІАЛІЗАЦІЯ ---
    function init() {
        console.log("Initializing SYH modules...");

        // Ініціалізуємо кожен модуль
        SYH_UTILS.init(SYH_CONFIG);
        SYH_UI.init(SYH_CONFIG, SYH_STATE);
        SYH_BANNER_CREATOR.init(SYH_CONFIG, SYH_UTILS, SYH_PARSERS);
        SYH_EVENT_HANDLERS.init(SYH_CONFIG, SYH_STATE, SYH_UTILS, SYH_UI, SYH_BANNER_CREATOR);

        // Запуск копіювальника відео
        if (window.SYH_VIDEO_COPIER) {
            window.SYH_VIDEO_COPIER.init();
        }

        // Запуск трекера статистики
        if (window.SYH_STATS_TRACKER) window.SYH_STATS_TRACKER.init();

        // Прив'язуємо обробники подій
        SYH_EVENT_HANDLERS.bindEvents();

        // Початкове сканування сторінки
        $(SELECTORS.commentBlock).each((i, el) => SYH_UI.addButtonsToComment(el));
        $(SELECTORS.bannerBlock).each((i, el) => SYH_UI.addButtonsToBanner(el));
        $(SELECTORS.bannerHeader).each((i, el) => SYH_UI.addBannerHeaderControls(el));
        
        // Перша перевірка статусу стріму на випадок, якщо сторінка завантажилась вже після завершення
        // checkForStreamEnd();

        // Ініціалізація та завантаження локального стану перед запуском спостерігача
        if (SYH_STATE && typeof SYH_STATE.init === 'function') {
            SYH_STATE.init();
        }

        // Запускаємо спостерігач
        observer.observe(document.body, { childList: true, subtree: true });
        
        console.log("SYH is running.");
    }

    init();

})(window, jQuery);