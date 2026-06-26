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
        try {
            this.SELECTORS = config.SELECTORS;
            this.STATE = state;
            
            const self = this;

            this.validateSelectorsSyntax();
            
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

                    /* ФІКС: Надійне виділення БУДЬ-ЯКОГО активного коментаря на екрані (Жовта обводка) */
                    div[class*="PlatformComment__Wrap"]:has(.lucide-circle-minus) > div[class*="PlatformCommentShell__Wrap"] {
                        outline: 3px solid #ffcc00 !important;
                        outline-offset: -3px;
                        box-shadow: 0 0 15px rgba(255, 204, 0, 0.6) !important;
                        animation: syhActiveCommentPulse 2s infinite alternate;
                    }

                    /* Звичайний стан банерів: напівпрозора заливка за категоріями */
                    [class*="Banner__LiWrap"][data-syh-banner-type="stream"], li[data-syh-banner-type="stream"] {
                        border-left: 12px solid #8e44ad !important;
                        background: rgba(142, 68, 173, 0.12) !important;
                    }
                    [class*="Banner__LiWrap"][data-syh-banner-type="audience"], li[data-syh-banner-type="audience"] {
                        border-left: 12px solid #f39c12 !important;
                        background: rgba(243, 156, 18, 0.12) !important;
                    }
                    [class*="Banner__LiWrap"][data-syh-banner-type="prayer"], li[data-syh-banner-type="prayer"] {
                        border-left: 12px solid #005DF7 !important;
                        background: rgba(0, 93, 247, 0.12) !important;
                    }

                    /* Активний стан банерів на екрані (повна заливка) */
                    [class*="Banner__LiWrap"][data-syh-banner-type="stream"]:has(svg.lucide-eye-off), li[data-syh-banner-type="stream"]:has(svg.lucide-eye-off) {
                        background: #8e44ad !important;
                        color: white !important;
                    }
                    [class*="Banner__LiWrap"][data-syh-banner-type="audience"]:has(svg.lucide-eye-off), li[data-syh-banner-type="audience"]:has(svg.lucide-eye-off) {
                        background: #f39c12 !important;
                        color: white !important;
                    }
                    [class*="Banner__LiWrap"][data-syh-banner-type="prayer"]:has(svg.lucide-eye-off), li[data-syh-banner-type="prayer"]:has(svg.lucide-eye-off) {
                        background: #005DF7 !important;
                        color: white !important;
                    }

                    /* Спільна анімація пульсації для активних коментарів (Золота) */
                    @keyframes syhActiveCommentPulse {
                        0% { box-shadow: 0 0 10px rgba(255, 204, 0, 0.4); }
                        100% { box-shadow: 0 0 20px rgba(255, 204, 0, 0.8); }
                    }
                `;
                document.head.appendChild(style);
            }

            const storage = (window.SYH_UTILS && window.SYH_UTILS.storage)
                ? window.SYH_UTILS.storage
                : (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local ? chrome.storage.local : null);

            if (storage) {
                storage.get(['syh_prayers', 'syh_banner_categories'], function(result) {
                    self.prayersCache = result.syh_prayers || [];
                    self.bannerCategoriesCache = result.syh_banner_categories || {};
                });
            } else {
                console.warn("[SYH] Сховище недоступне під час первинної ініціалізації кешу UI.");
            }

            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
                chrome.storage.onChanged.addListener(function(changes) {
                    try {
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
                    } catch (e) {
                        console.error("[SYH] Помилка синхронізації сховища в UI:", e);
                    }
                });
            }
        } catch (error) {
            console.error("[SYH] Критичний збій ініціалізації модуля UI Core. Запущено авто-відновлення:", error);
        }
    },  

    // Метод захисної валідації синтаксису селекторів (захист від невалідних запусків)
    validateSelectorsSyntax: function() {
        if (!this.SELECTORS) return;
        console.log("[SYH] Запуск синтаксичного сканування CSS-селекторів...");
        for (const key in this.SELECTORS) {
            const selector = this.SELECTORS[key];
            if (!selector) continue;
            try {
                document.querySelector(selector);
            } catch (e) {
                console.error(`[SYH] Виявлено критично невалідний CSS селектор у конфігу для ключа [${key}]:`, selector, e);
            }
        }
    },

    createTelegramReminder: function() {
        const $container = $(this.SELECTORS.reminderTargetContainer);
        if ($container.length === 0) {
            console.warn("[SYH] Контейнер для нагадування не знайдено!");
            return;
        }

        if ($('.syh-telegram-reminder').length > 0) return;

        const $reminder = $(`
            <div class="syh-telegram-reminder">
                <span>Не забудьте опублікувати результати трансляції в Telegram! 🚀</span>
                <label class="syh-reminder-dismiss-label">
                    Закрити
                    <input type="checkbox" class="syh-telegram-reminder-checkbox">
                </label>
            </div>
        `);

        $reminder.find('.syh-telegram-reminder-checkbox').on('change', function() {
            if ($(this).is(':checked')) {
                $reminder.fadeOut(300, function() {
                    $reminder.remove();
                });
            }
        });

        $container.append($reminder);
    }
};