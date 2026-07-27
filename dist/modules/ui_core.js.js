import { SYH_STORAGE } from "/modules/storage.ts.js";
import { SYH_STATE } from "/modules/state.js.js";
import { SYH_CONFIG } from "/modules/config.ts.js";

export const SYH_UI = {
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
            this.SELECTORS = config ? config.SELECTORS : SYH_CONFIG.SELECTORS;
            this.STATE = state || SYH_STATE;
            
            const self = this;
            if (this.STATE) {
                this.STATE.onStateLoaded = () => self.restoreDomCheckboxes();
            }

            this.validateSelectorsSyntax();
            
            const storage = SYH_STORAGE || window.SYH_STORAGE;

            if (storage) {
                storage.get(['syh_prayers', 'syh_banner_categories'], function(result) {
                    self.prayersCache = result.syh_prayers || [];
                    self.bannerCategoriesCache = result.syh_banner_categories || {};
                });
            } else {
                console.warn("[SYH] Сховище недоступне під час первинної ініціалізації кешу UI.");
            }

            if (storage && typeof storage.onChanged === 'function') {
                storage.onChanged(function(changes) {
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
    },

    restoreDomCheckboxes: function() {
        const selectors = this.SELECTORS || (window.SYH_CONFIG ? window.SYH_CONFIG.SELECTORS : (SYH_CONFIG ? SYH_CONFIG.SELECTORS : null));
        const itemStates = (SYH_STATE ? SYH_STATE.itemStates : (window.SYH_STATE ? window.SYH_STATE.itemStates : {}));
        
        if (!selectors) {
            console.warn("[SYH_UI] Конфігурація SELECTORS ще не завантажена.");
            return;
        }

        console.log("[SYH_UI] Примусове відновлення стану чекбоксів у DOM для вирішення Race Condition.");
        
        $('.syh-checkbox').each(function() {
            const $checkbox = $(this);
            const type = $checkbox.data('type');
            let textKey = "";

            if (type === 'comment') {
                const $commentBlock = $checkbox.closest(selectors.commentBlock || '[class*="PlatformComment__Wrap"]');
                textKey = $commentBlock.find(selectors.commentText || '[class*="PlatformCommentShell__ContentSpan"]').text();
            } else if (type === 'banner') {
                const $bannerBlock = $checkbox.closest(selectors.bannerBlock || '[class*="Banner__LiWrap"]');
                textKey = $bannerBlock.find(selectors.bannerText || '[class*="Banner__BannerText"]').text();
            }

            if (textKey) {
                $checkbox.prop('checked', !!itemStates[textKey]);
            }
        });
    }
};

if (typeof window !== 'undefined') {
    window.SYH_UI = SYH_UI;
}