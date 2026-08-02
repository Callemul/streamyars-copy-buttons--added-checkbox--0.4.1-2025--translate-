import { SYH_CONFIG, SyhConfig, SelectorValue } from './config';
import { SYH_STATE, SyhState } from './state';
import { SYH_UTILS, SyhUtils } from './utils';
import { SYH_UI, SyhUi } from './ui_core';
import { SYH_BANNER_CREATOR, SyhBannerCreator } from './banner_creator';
import type { ISyhPlugin } from './plugin_registry';

export interface SyhEventBanners {
    SELECTORS: Record<string, SelectorValue> | null;
    STATE: SyhState | null;
    UTILS: SyhUtils | null;
    UI: SyhUi | null;
    BANNER_CREATOR: SyhBannerCreator | null;

    init(config?: SyhConfig, state?: SyhState, utils?: SyhUtils, ui?: SyhUi, bannerCreator?: SyhBannerCreator): void;
    bindEvents(): void;
    bindBannersFilterControls(): void;
}

export const SYH_EVENT_BANNERS_PLUGIN: ISyhPlugin = {
    id: 'syh_event_banners',
    name: 'StreamYard Banners Handler',
    enabled: true,
    isSupported: (url = typeof window !== 'undefined' ? window.location.href : '') => url.includes('streamyard.com'),
    init: () => {
        SYH_EVENT_BANNERS.init();
        SYH_EVENT_BANNERS.bindEvents();
    }
};

export const SYH_EVENT_BANNERS: SyhEventBanners = {
    SELECTORS: null,
    STATE: null,
    UTILS: null,
    UI: null,
    BANNER_CREATOR: null,

    init: function(config?: SyhConfig, state?: SyhState, utils?: SyhUtils, ui?: SyhUi, bannerCreator?: SyhBannerCreator): void {
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
            const bannerBlock = target.closest(self.SELECTORS.bannerBlock as string);
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
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }, true);

        document.addEventListener('mousedown', function(e: MouseEvent) {
            const target = e.target as Element | null;
            if (target?.closest('.syh-button[data-type="banner"], .syh-button[data-action="create-from-text"], .syh-button[data-action="delete-selected-banners"]') && e.button === 1) {
                e.preventDefault();
            }
        });

        document.addEventListener('mouseup', function(e: MouseEvent) {
            const target = e.target as Element | null;
            const button = target?.closest('.syh-button') as HTMLElement | null;
            if (!button) return;

            const action = button.dataset.action;
            const type = button.dataset.type;
            const buttonNum = e.button;

            if (type !== 'banner' && action !== 'create-from-text' && action !== 'delete-selected-banners' && action !== 'mark-stream' && action !== 'mark-audience' && action !== 'mark-prayer') return;

            e.preventDefault();
            e.stopPropagation();

            if (buttonNum !== 0) return;

            if (action === 'create-from-text') {
                const text = prompt("Вставте список питань для створення банерів:", "");
                if (text && self.BANNER_CREATOR) self.BANNER_CREATOR.processAndCreateBanners(text);
                return;
            }
            
            if (action === 'delete-selected-banners') {
                const checkedBanners = document.querySelectorAll<HTMLInputElement>('.syh-checkbox[data-type="banner"]:checked');
                if (checkedBanners.length === 0) return;

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
                        all: checkedBanners.length,
                        stream: 0,
                        audience: 0,
                        prayer: 0
                    };

                    checkedBanners.forEach((checkbox) => {
                        const bannerBlock = checkbox.closest((self.SELECTORS?.bannerBlock as string) || '');
                        const textKey = bannerBlock?.querySelector((self.SELECTORS?.bannerText as string) || '')?.textContent || '';
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
                    proceed = confirm(`Ви впевнені, що хочете видалити ${checkedBanners.length} банер(ів)?`);
                }

                if (proceed) {
                    checkedBanners.forEach((checkbox) => {
                        const bannerBlock = checkbox.closest((self.SELECTORS?.bannerBlock as string) || '');
                        const deleteButton = bannerBlock?.querySelector((self.SELECTORS?.bannerDeleteButton as string) || '') as HTMLElement | null;
                        if (deleteButton) deleteButton.click();
                    });
                }
                return;
            }

            if (type === 'banner' && action === 'copy-banner') {
                const bannerBlock = button.closest((self.SELECTORS?.bannerBlock as string) || '');
                const bannerText = bannerBlock?.querySelector((self.SELECTORS?.bannerText as string) || '')?.textContent || '';
                const utils = self.UTILS || SYH_UTILS;
                utils.copyAndShowBanner(bannerText, "Текст з Банера 🗞");
                const checkbox = bannerBlock?.querySelector<HTMLInputElement>('.syh-checkbox');
                if (checkbox) {
                    checkbox.checked = true;
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                }
                return;
            }

            if (action === 'mark-stream' || action === 'mark-audience' || action === 'mark-prayer') {
                const bannerBlock = button.closest((self.SELECTORS?.bannerBlock as string) || '');
                const bannerText = bannerBlock?.querySelector((self.SELECTORS?.bannerText as string) || '')?.textContent || '';
                const targetType = action.replace('mark-', '');
                
                const currentType = (self.UI && self.UI.bannerCategoriesCache[bannerText] === targetType) ? 'none' : targetType;
                const utils = self.UTILS || SYH_UTILS;
                utils.saveBannerCategory(bannerText, currentType).then(() => {
                    if (self.UI) {
                        self.UI.bannerCategoriesCache[bannerText] = currentType;
                        self.UI.filterBanners();
                    }
                });
                return;
            }
        });

        document.addEventListener('change', function(e: Event) {
            const target = e.target as Element | null;
            const checkbox = target?.closest('.syh-checkbox[data-type="banner"]') as HTMLInputElement | null;
            if (checkbox) {
                const bannerBlock = checkbox.closest((self.SELECTORS?.bannerBlock as string) || '');
                const textKey = bannerBlock?.querySelector((self.SELECTORS?.bannerText as string) || '')?.textContent || '';
                if (self.STATE) {
                    self.STATE.updateState(textKey, checkbox.checked);
                }
                if (self.UI) self.UI.updateMasterCheckboxState();
                return;
            }

            const masterCheckbox = target?.closest('.syh-master-checkbox') as HTMLInputElement | null;
            if (masterCheckbox) {
                const isChecked = masterCheckbox.checked;
                masterCheckbox.indeterminate = false;
                const bannerBlocks = document.querySelectorAll((self.SELECTORS?.bannerBlock as string) || '');
                bannerBlocks.forEach(block => {
                    const cb = block.querySelector('.syh-checkbox[data-type="banner"]') as HTMLInputElement | null;
                    if (cb) {
                        cb.checked = isChecked;
                        cb.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
            }
        });
    },

    bindBannersFilterControls: function(): void {
        const self = this;
        const searchInput = document.querySelector<HTMLInputElement>('#syh-banner-search');
        const clearBtn = document.querySelector<HTMLElement>('#syh-clear-banner-search-btn');

        if (searchInput) {
            searchInput.oninput = function() {
                if (self.UI) {
                    self.UI.bannerSearchQuery = searchInput.value ? searchInput.value.toLowerCase() : '';
                    if (clearBtn) clearBtn.style.display = self.UI.bannerSearchQuery ? 'flex' : 'none';
                    self.UI.filterBanners();
                }
            };
        }

        if (clearBtn) {
            clearBtn.onclick = function() {
                if (searchInput) searchInput.value = '';
                if (self.UI) {
                    self.UI.bannerSearchQuery = '';
                    clearBtn.style.display = 'none';
                    self.UI.filterBanners();
                }
            };
        }

        const scrollBtn = document.querySelector('#syh-scroll-to-active-banner-btn');
        if (scrollBtn) {
            scrollBtn.onclick = function(e) {
                e.preventDefault();
                if (self.UI) self.UI.scrollToActiveBanner();
            };
        }

        document.addEventListener('click', function(e: MouseEvent) {
            const target = e.target as Element | null;
            if (target?.closest('#syh-banner-empty-clear-link')) {
                e.preventDefault();
                if (searchInput) searchInput.value = '';
                if (self.UI) {
                    self.UI.bannerSearchQuery = '';
                    if (clearBtn) clearBtn.style.display = 'none';
                    self.UI.filterBanners();
                }
                return;
            }

            const filterBtn = target?.closest('.syh-banner-filter-btn') as HTMLElement | null;
            if (filterBtn) {
                document.querySelectorAll<HTMLElement>('.syh-banner-filter-btn').forEach(btn => {
                    btn.style.background = 'transparent';
                    btn.style.fontWeight = 'normal';
                    btn.style.boxShadow = 'none';
                    btn.style.color = '#666';
                    btn.classList.remove('active');
                    btn.setAttribute('aria-selected', 'false');
                });

                filterBtn.style.background = '#fff';
                filterBtn.style.fontWeight = 'bold';
                filterBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                filterBtn.style.color = '#000';
                filterBtn.classList.add('active');
                filterBtn.setAttribute('aria-selected', 'true');

                if (self.UI) {
                    self.UI.bannerActiveFilter = filterBtn.dataset.filter || 'all';
                    self.UI.filterBanners();
                }

                if (self.UI && self.UI.bannerSearchQuery && searchInput) {
                    searchInput.classList.remove('syh-banner-search-pulse');
                    void searchInput.offsetWidth;
                    searchInput.classList.add('syh-banner-search-pulse');
                }
            }
        });
    }
};

// Pure ESM Module Export
