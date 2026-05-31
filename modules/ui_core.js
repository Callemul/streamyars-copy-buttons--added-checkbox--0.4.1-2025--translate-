// ui_core.js
window.SYH_UI = {
    SELECTORS: null,
    STATE: null,
    activeFilter: 'all', 
    searchQuery: '',     
    prayersCache: [],

    // Спільний стан для пошуку та фільтрації банерів
    bannerActiveFilter: 'all',
    bannerSearchQuery: '',
    bannerCategoriesCache: {},

    // Головний метод первинної ініціалізації
    init: function(config, state) {
        this.SELECTORS = config.SELECTORS;
        this.STATE = state;
        
        const self = this;
        
        // Ін'єкція базових стилів та анімацій (спільних для коментарів та банерів)
        if (!document.getElementById('syh-global-styles')) {
            const style = document.createElement('style');
            style.id = 'syh-global-styles';
            style.innerHTML = `
                /* Звичайний стан коментарів: суцільна напівпрозора заливка */
                div[class*="PlatformComment__Wrap"][data-syh-type="prayer"] > div[class*="PlatformCommentShell__Wrap"] {
                    border-left: 12px solid #005DF7 !important;
                    background: rgba(0, 93, 247, 0.15) !important;
                }
                div[class*="PlatformComment__Wrap"][data-syh-type="question"] > div[class*="PlatformCommentShell__Wrap"] {
                    border-left: 12px solid #f39c12 !important;
                    background: rgba(243, 156, 18, 0.15) !important;
                }

                /* Активний стан коментарів на екрані (повна заливка) */
                div[class*="PlatformComment__Wrap"][data-syh-type="prayer"]:has(.lucide-circle-minus) > div[class*="PlatformCommentShell__Wrap"] {
                    background: #005DF7 !important; 
                }
                div[class*="PlatformComment__Wrap"][data-syh-type="question"]:has(.lucide-circle-minus) > div[class*="PlatformCommentShell__Wrap"] {
                    background: #f39c12 !important;
                }

                /* Надійне виділення БУДЬ-ЯКОГО активного коментаря на екрані */
                div[class*="PlatformComment__Wrap"]:has(.lucide-circle-minus) > div[class*="PlatformCommentShell__Wrap"] {
                    outline: 3px solid #ff4757 !important;
                    outline-offset: -3px;
                    box-shadow: 0 0 15px rgba(255, 71, 87, 0.6) !important;
                    animation: syhActivePulse 2s infinite alternate;
                }

                /* Звичайний стан банерів: напівпрозора заливка за категоріями */
                [class*="Banner__LiWrap"][data-syh-banner-type="stream"], li[data-syh-banner-type="stream"] {
                    border-left: 12px solid #8e44ad !important; /* Фіолетовий (Ефір) */
                    background: rgba(142, 68, 173, 0.12) !important;
                }
                [class*="Banner__LiWrap"][data-syh-banner-type="audience"], li[data-syh-banner-type="audience"] {
                    border-left: 12px solid #f39c12 !important; /* Оранжевий (Глядачі) */
                    background: rgba(243, 156, 18, 0.12) !important;
                }
                [class*="Banner__LiWrap"][data-syh-banner-type="prayer"], li[data-syh-banner-type="prayer"] {
                    border-left: 12px solid #005DF7 !important; /* Синій (Молитви) */
                    background: rgba(0, 93, 247, 0.12) !important;
                }

                /* Активний стан банерів на екрані (повна заливка) */
                [class*="Banner__LiWrap"][data-syh-banner-type="stream"]:has(.lucide-circle-minus), li[data-syh-banner-type="stream"]:has(.lucide-circle-minus) {
                    background: #8e44ad !important;
                    color: white !important;
                }
                [class*="Banner__LiWrap"][data-syh-banner-type="audience"]:has(.lucide-circle-minus), li[data-syh-banner-type="audience"]:has(.lucide-circle-minus) {
                    background: #f39c12 !important;
                    color: white !important;
                }
                [class*="Banner__LiWrap"][data-syh-banner-type="prayer"]:has(.lucide-circle-minus), li[data-syh-banner-type="prayer"]:has(.lucide-circle-minus) {
                    background: #005DF7 !important;
                    color: white !important;
                }

                /* Спільна анімація пульсації для активних коментарів та банерів */
                @keyframes syhActivePulse {
                    0% { box-shadow: 0 0 10px rgba(255, 71, 87, 0.4); }
                    100% { box-shadow: 0 0 20px rgba(255, 71, 87, 0.8); }
                }
            `;
            document.head.appendChild(style);
        }

        // Завантаження кешу з chrome.storage.local
        chrome.storage.local.get(['syh_prayers', 'syh_banner_categories'], function(result) {
            self.prayersCache = result.syh_prayers || [];
            self.bannerCategoriesCache = result.syh_banner_categories || {};
        });

        // Синхронізація кешу при будь-яких зовнішніх чи фонових змінах у БД
        chrome.storage.onChanged.addListener(function(changes) {
            if (changes.syh_prayers) {
                self.prayersCache = changes.syh_prayers.newValue || [];
                if (typeof self.filterStarredComments === 'function') {
                    self.filterStarredComments(); 
                }
            }
            if (changes.syh_banner_categories) {
                self.bannerCategoriesCache = changes.syh_banner_categories.newValue || {};
                if (typeof self.filterBanners === 'function') {
                    self.filterBanners();
                }
            }
        });
    }
};