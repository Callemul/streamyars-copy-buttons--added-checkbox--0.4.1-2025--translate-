// main.js
(function(window, $) {
    'use strict';

    console.log("StreamYard Helper v0.9.6 [Refactored] Loaded!");

    // Отримуємо доступ до всіх наших модулів
    const { SYH_CONFIG, SYH_STATE, SYH_UTILS, SYH_UI, SYH_PARSERS, SYH_BANNER_CREATOR, SYH_EVENT_HANDLERS } = window;
    const { SELECTORS } = SYH_CONFIG;

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
            }
            if (mutation.removedNodes.length > 0) bannerStateChanged = true;
        }
        if (bannerStateChanged) SYH_UI.updateMasterCheckboxState();
    });

    // --- ІНІЦІАЛІЗАЦІЯ ---
    function init() {
        console.log("Initializing SYH modules...");

        // Ініціалізуємо кожен модуль, передаючи необхідні залежності
        SYH_UTILS.init(SYH_CONFIG);
        SYH_UI.init(SYH_CONFIG, SYH_STATE);
        SYH_BANNER_CREATOR.init(SYH_CONFIG, SYH_UTILS, SYH_PARSERS);
        SYH_EVENT_HANDLERS.init(SYH_CONFIG, SYH_STATE, SYH_UTILS, SYH_UI, SYH_BANNER_CREATOR);

        // Прив'язуємо всі обробники подій
        SYH_EVENT_HANDLERS.bindEvents();

        // Початкове сканування сторінки для додавання кнопок
        $(SELECTORS.commentBlock).each((i, el) => SYH_UI.addButtonsToComment(el));
        $(SELECTORS.bannerBlock).each((i, el) => SYH_UI.addButtonsToBanner(el));
        $(SELECTORS.bannerHeader).each((i, el) => SYH_UI.addBannerHeaderControls(el));
        
        // Запускаємо спостерігач
        observer.observe(document.body, { childList: true, subtree: true });
        
        console.log("SYH is running.");
    }

    init();

})(window, jQuery);