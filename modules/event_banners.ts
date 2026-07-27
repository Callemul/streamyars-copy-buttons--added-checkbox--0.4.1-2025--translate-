import { SYH_CONFIG } from './config.ts';
import { SYH_STATE } from './state.ts';
import { SYH_UTILS } from './utils.ts';
import { SYH_UI } from './ui_core.ts';
import { SYH_BANNER_CREATOR } from './banner_creator.ts';

export interface SyhEventBanners {
    SELECTORS: Record<string, string> | null;
    STATE: any;
    UTILS: any;
    UI: any;
    BANNER_CREATOR: any;

    init(config?: any, state?: any, utils?: any, ui?: any, bannerCreator?: any): void;
    bindEvents(): void;
    bindBannersFilterControls(): void;
}

export const SYH_EVENT_BANNERS: SyhEventBanners = {
    SELECTORS: null,
    STATE: null,
    UTILS: null,
    UI: null,
    BANNER_CREATOR: null,

    init: function(config?: any, state?: any, utils?: any, ui?: any, bannerCreator?: any): void {
        this.SELECTORS = config ? config.SELECTORS : (SYH_CONFIG ? SYH_CONFIG.SELECTORS : null);
        this.STATE = state || SYH_STATE;
        this.UTILS = utils || SYH_UTILS;
        this.UI = ui || SYH_UI;
        this.BANNER_CREATOR = bannerCreator || SYH_BANNER_CREATOR;
    },

    bindEvents: function(): void {
        const self = this;

        // --- НАТИВНИЙ ПЕРЕХОПЛЮВАЧ ПКМ ДЛЯ БАНЕРІВ (ПКМ ЧЕКБОКС) ---
        document.addEventListener('contextmenu', function(e: MouseEvent) {
            const target = e.target as Element | null;
            if (!target || !self.SELECTORS?.bannerBlock) return;
            const bannerBlock = target.closest(self.SELECTORS.bannerBlock);
            if (bannerBlock) {
                // Запобігаємо перехопленню, якщо клікнули на текстове поле, чекбокс або кастомні кнопки керування всередині банера
                const isInputOrCustom = target.closest('input, textarea, .syh-button');
                // Окремо захищаємо кнопки редагування та видалення в кутку банера (наприклад, TopIconRow з пензликом та кошиком)
                const isSystemEditOrDelete = target.closest('button:has(svg.lucide-pencil), button:has(svg.lucide-trash-2), button:has(svg.lucide-trash2), [class*="DesktopTopIconRow"] button');

                if (isInputOrCustom || isSystemEditOrDelete) return;

                // Дозволяємо ПКМ на оверлеях та кнопках керування показом (Show/Hide/Off/Показати/Вимкнено)
                e.preventDefault();
                e.stopPropagation();
                const checkbox = bannerBlock.querySelector('.syh-checkbox[data-type="banner"]') as HTMLInputElement | null;
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    const textKey = bannerBlock.querySelector(self.SELECTORS.bannerText || '')?.textContent;
                    if (self.STATE && textKey) {
                        self.STATE.updateState(textKey, checkbox.checked);
                        if (self.UI) {
                            self.UI.updateMasterCheckboxState();
                        }
                    }
                }
            }
        }, true);

        // Блокуємо стандартні дії для коліщатка миші на кнопках банерів
        $(document).on('mousedown', '.syh-button[data-type="banner"], .syh-button[data-action="create-from-text"], .syh-button[data-action="delete-selected-banners"]', function(e: JQuery.TriggeredEvent) {
            const mouseEvent = e.originalEvent as MouseEvent;
            if (mouseEvent && mouseEvent.button === 1) e.preventDefault(); 
        });

        // Обробка натискання ЛКМ на кнопки керування банерами (Оновлено під 3 кнопки маркування)
        $(document).on('mouseup', '.syh-button', function(this: HTMLElement, e: JQuery.TriggeredEvent) {
            const $button = $(this);
            const action = $button.data('action');
            const type = $button.data('type');
            const mouseEvent = e.originalEvent as MouseEvent;
            const buttonNum = mouseEvent ? mouseEvent.button : 0;

            // Якщо подія не пов'язана з банерами, негайно завершуємо
            if (type !== 'banner' && action !== 'create-from-text' && action !== 'delete-selected-banners' && action !== 'mark-stream' && action !== 'mark-audience' && action !== 'mark-prayer') return;

            e.preventDefault();
            e.stopPropagation();

            if (buttonNum !== 0) return;

            // Створення банерів з введеного тексту
            if (action === 'create-from-text') {
                const text = prompt("Вставте список питань для створення банерів:", "");
                if (text && self.BANNER_CREATOR) self.BANNER_CREATOR.processAndCreateBanners(text);
                return;
            }
            
            // Масове видалення відмічених банерів
            if (action === 'delete-selected-banners') {
                const $checkedBanners = $('.syh-checkbox[data-type="banner"]:checked');
                if ($checkedBanners.length === 0) return;

                const activeFilter = self.UI ? self.UI.bannerActiveFilter : 'all';
                let proceed: boolean;

                if (activeFilter && activeFilter !== 'all') {
                    const filterNames: Record<string, string> = {
                        'stream': 'Ефір',
                        'audience': 'Глядачі',
                        'prayer': 'Молитви'
                    };
                    const tabName = filterNames[activeFilter] || activeFilter;

                    let currentTabCount = 0;
                    const counts = {
                        all: $checkedBanners.length,
                        stream: 0,
                        audience: 0,
                        prayer: 0
                    };

                    $checkedBanners.each(function(this: HTMLElement) {
                        const bannerBlock = $(this).closest(self.SELECTORS?.bannerBlock || '');
                        const textKey = bannerBlock.find(self.SELECTORS?.bannerText || '').text();
                        const commentType = (self.UI && self.UI.bannerCategoriesCache) ? (self.UI.bannerCategoriesCache[textKey] || 'none') : 'none';
                        
                        if (commentType === activeFilter) {
                            currentTabCount++;
                        }
                        
                        if (commentType === 'stream') {
                            counts.stream++;
                        } else if (commentType === 'audience') {
                            counts.audience++;
                        } else if (commentType === 'prayer') {
                            counts.prayer++;
                        }
                    });

                    let confirmMessage: string;
                    if (currentTabCount > 0) {
                        confirmMessage = `Ви впевнені, що хочете видалити ${currentTabCount} банер(ів) з вкладки "${tabName}"?\n\n` +
                                         `Зверніть увагу: ці банери будуть видалені не тільки з поточної вкладки, а й з усіх інших вкладок, і з вкладки "Всі" також.\n\n` +
                                         `Буде видалено:\n` +
                                         `- Всі: ${counts.all}\n` +
                                         `- Ефір: ${counts.stream}\n` +
                                         `- Глядачі: ${counts.audience}\n` +
                                         `- Молитви: ${counts.prayer}`;
                    } else {
                        confirmMessage = `Увага! На поточній вкладці "${tabName}" не вибрано жодного банера, але вибрано банери на інших вкладках.\n\n` +
                                         `Зверніть увагу: ці банери будуть видалені назавжди з усіх вкладок, і з вкладки "Всі" також.\n\n` +
                                         `Буде видалено:\n` +
                                         `- Всі: ${counts.all}\n` +
                                         `- Ефір: ${counts.stream}\n` +
                                         `- Глядачі: ${counts.audience}\n` +
                                         `- Молитви: ${counts.prayer}`;
                    }

                    proceed = confirm(confirmMessage);
                } else {
                    proceed = confirm(`Ви впевнені, що хочете видалити ${$checkedBanners.length} банер(ів)?`);
                }

                if (proceed) {
                    $checkedBanners.each(function(this: HTMLElement) {
                        const deleteButton = $(this).closest(self.SELECTORS?.bannerBlock || '').find(self.SELECTORS?.bannerDeleteButton || '')[0] as HTMLElement | undefined;
                        if (deleteButton) deleteButton.click();
                    });
                }
                return;
            }

            // Копіювання тексту конкретного банера в буфер
            if (type === 'banner' && action === 'copy-banner') {
                const $bannerBlock = $button.closest(self.SELECTORS?.bannerBlock || '');
                const bannerText = $bannerBlock.find(self.SELECTORS?.bannerText || '').text();
                if (self.UTILS) {
                    self.UTILS.copyAndShowBanner(bannerText, "Текст з Банера 🗞");
                } else if ((window as any).SYH_UTILS) {
                    (window as any).SYH_UTILS.copyAndShowBanner(bannerText, "Текст з Банера 🗞");
                }
                $bannerBlock.find('.syh-checkbox').prop('checked', true).trigger('change');
                return;
            }

            // Ручне маркування банера як "Питання ефіру" (📺)
            if (action === 'mark-stream') {
                const $bannerBlock = $button.closest(self.SELECTORS?.bannerBlock || '');
                const bannerText = $bannerBlock.find(self.SELECTORS?.bannerText || '').text();
                
                const currentType = (self.UI && self.UI.bannerCategoriesCache[bannerText] === 'stream') ? 'none' : 'stream';
                const saver = (self.UTILS && self.UTILS.saveBannerCategory) ? self.UTILS.saveBannerCategory : (window as any).SYH_UTILS?.saveBannerCategory;
                if (saver) {
                    saver.call(self.UTILS || (window as any).SYH_UTILS, bannerText, currentType).then(() => {
                        if (self.UI) {
                            self.UI.bannerCategoriesCache[bannerText] = currentType;
                            self.UI.filterBanners();
                        }
                    });
                }
                return;
            }

            // Ручне маркування банера як "Питання глядачів" (❓)
            if (action === 'mark-audience') {
                const $bannerBlock = $button.closest(self.SELECTORS?.bannerBlock || '');
                const bannerText = $bannerBlock.find(self.SELECTORS?.bannerText || '').text();
                
                const currentType = (self.UI && self.UI.bannerCategoriesCache[bannerText] === 'audience') ? 'none' : 'audience';
                const saver = (self.UTILS && self.UTILS.saveBannerCategory) ? self.UTILS.saveBannerCategory : (window as any).SYH_UTILS?.saveBannerCategory;
                if (saver) {
                    saver.call(self.UTILS || (window as any).SYH_UTILS, bannerText, currentType).then(() => {
                        if (self.UI) {
                            self.UI.bannerCategoriesCache[bannerText] = currentType;
                            self.UI.filterBanners();
                        }
                    });
                }
                return;
            }

            // Ручне маркування банера як "Молитовне" (🙏)
            if (action === 'mark-prayer') {
                const $bannerBlock = $button.closest(self.SELECTORS?.bannerBlock || '');
                const bannerText = $bannerBlock.find(self.SELECTORS?.bannerText || '').text();
                
                const currentType = (self.UI && self.UI.bannerCategoriesCache[bannerText] === 'prayer') ? 'none' : 'prayer';
                const saver = (self.UTILS && self.UTILS.saveBannerCategory) ? self.UTILS.saveBannerCategory : (window as any).SYH_UTILS?.saveBannerCategory;
                if (saver) {
                    saver.call(self.UTILS || (window as any).SYH_UTILS, bannerText, currentType).then(() => {
                        if (self.UI) {
                            self.UI.bannerCategoriesCache[bannerText] = currentType;
                            self.UI.filterBanners();
                        }
                    });
                }
                return;
            }
        });

        // Слухач зміни стану чекбоксу окремого банера
        $(document).on('change', '.syh-checkbox[data-type="banner"]', function(this: HTMLElement) {
            const $checkbox = $(this);
            const textKey = $checkbox.closest(self.SELECTORS?.bannerBlock || '').find(self.SELECTORS?.bannerText || '').text();
            
            if (self.STATE) {
                self.STATE.updateState(textKey, $checkbox.is(':checked'));
            }
            if (self.UI) self.UI.updateMasterCheckboxState();
        });

        // Клік по головному (майстер) чекбоксу у списку банерів
        $(document).on('change', '.syh-master-checkbox', function(this: HTMLElement) {
            const isChecked = $(this).is(':checked');
            $(this).prop('indeterminate', false);
            $(self.SELECTORS?.bannerBlock || '').find('.syh-checkbox[data-type="banner"]').prop('checked', isChecked).trigger('change');
        });
    },

    // Зв'язування подій текстового пошуку та кнопок фільтрації банерів
    bindBannersFilterControls: function(): void {
        const self = this;
        const $searchInput = $('#syh-banner-search');
        const $clearBtn = $('#syh-clear-banner-search-btn');

        $searchInput.off('input').on('input', function(this: HTMLElement) { 
            if (self.UI) {
                self.UI.bannerSearchQuery = $(this).val() as string ? ($(this).val() as string).toLowerCase() : '';
                $clearBtn.css('display', self.UI.bannerSearchQuery ? 'flex' : 'none');
                self.UI.filterBanners();
            }
        });

        $clearBtn.off('click').on('click', function() {
            $searchInput.val('');
            if (self.UI) {
                self.UI.bannerSearchQuery = '';
                $(this).hide();
                self.UI.filterBanners();
            }
        });

        $('#syh-scroll-to-active-banner-btn').off('click').on('click', function(e: JQuery.TriggeredEvent) {
            e.preventDefault();
            if (self.UI) self.UI.scrollToActiveBanner();
        });

        $(document).off('click', '#syh-banner-empty-clear-link').on('click', '#syh-banner-empty-clear-link', function(e: JQuery.TriggeredEvent) {
            e.preventDefault();
            $searchInput.val('');
            if (self.UI) {
                self.UI.bannerSearchQuery = '';
                $clearBtn.hide();
                self.UI.filterBanners();
            }
        });

        $('.syh-banner-filter-btn').off('click').on('click', function(this: HTMLElement) {
            $('.syh-banner-filter-btn')
                .css({'background': 'transparent', 'font-weight': 'normal', 'box-shadow': 'none', 'color': '#666'})
                .removeClass('active')
                .attr('aria-selected', 'false');
            $(this)
                .css({'background': '#fff', 'font-weight': 'bold', 'box-shadow': '0 1px 3px rgba(0,0,0,0.1)', 'color': '#000'})
                .addClass('active')
                .attr('aria-selected', 'true');
            
            if (self.UI) {
                self.UI.bannerActiveFilter = $(this).data('filter');
                self.UI.filterBanners();
            }

            if (self.UI && self.UI.bannerSearchQuery) {
                $searchInput.removeClass('syh-banner-search-pulse');
                if ($searchInput[0]) {
                    void $searchInput[0].offsetWidth; 
                }
                $searchInput.addClass('syh-banner-search-pulse');
            }
        });
    }
};

if (typeof window !== 'undefined') {
    (window as any).SYH_EVENT_BANNERS = SYH_EVENT_BANNERS;
}
