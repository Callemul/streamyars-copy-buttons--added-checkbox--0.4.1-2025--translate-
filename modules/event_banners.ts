import { SYH_CONFIG, type SyhConfig, type SelectorValue } from './config';
import { SYH_STATE, type SyhState } from './state';
import { SYH_UTILS, type SyhUtils } from './utils';
import { SYH_UI, type SyhUi } from './ui_core';
import { SYH_BANNER_CREATOR, type SyhBannerCreator } from './banner_creator';
import { CommentService } from './comment_service';
import type { ISyhPlugin } from './plugin_registry';
import { bindBannersFilterControls } from './ui_banners';

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

export function handleCreateBannersAction(bannerCreator: SyhBannerCreator | null): void {
    const text = prompt("Вставте список питань для створення банерів:", "");
    if (text && bannerCreator) {
        bannerCreator.processAndCreateBanners(text);
    }
}

export function handleDeleteSelectedBannersAction(
    selectors: Record<string, SelectorValue> | null,
    ui: SyhUi | null
): void {
    const checkedBanners = document.querySelectorAll<HTMLInputElement>('.syh-checkbox[data-type="banner"]:checked');
    if (checkedBanners.length === 0) return;

    const activeFilter = ui ? ui.bannerActiveFilter : 'all';
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
            const bannerBlock = checkbox.closest((selectors?.bannerBlock as string) || '');
            const textKey = bannerBlock?.querySelector((selectors?.bannerText as string) || '')?.textContent || '';
            const commentType = (ui && ui.bannerCategoriesCache) ? (ui.bannerCategoriesCache[textKey] || 'none') : 'none';
            
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
            const bannerBlock = checkbox.closest((selectors?.bannerBlock as string) || '');
            const deleteButton = bannerBlock?.querySelector((selectors?.bannerDeleteButton as string) || '') as HTMLElement | null;
            if (deleteButton) deleteButton.click();
        });
    }
}

export function handleCopyBannerAction(
    button: HTMLElement,
    selectors: Record<string, SelectorValue> | null,
    utils: SyhUtils | null
): void {
    const bannerBlock = button.closest((selectors?.bannerBlock as string) || '');
    const bannerText = bannerBlock?.querySelector((selectors?.bannerText as string) || '')?.textContent || '';

    const utilObj = utils || SYH_UTILS;
    utilObj.copyAndShowBanner(bannerText, "Текст з Банера 🗞");
    const checkbox = bannerBlock?.querySelector<HTMLInputElement>('.syh-checkbox');
    if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

export function handleMarkBannerCategoryAction(
    button: HTMLElement,
    action: string,
    selectors: Record<string, SelectorValue> | null,
    ui: SyhUi | null,
    utils: SyhUtils | null
): void {
    const bannerBlock = button.closest((selectors?.bannerBlock as string) || '');
    const bannerText = bannerBlock?.querySelector((selectors?.bannerText as string) || '')?.textContent || '';
    const targetType = action.replace('mark-', '');

    const currentType = (ui && ui.bannerCategoriesCache && ui.bannerCategoriesCache[bannerText] === targetType) ? 'none' : targetType;
    const utilObj = utils || SYH_UTILS;
    utilObj.saveBannerCategory(bannerText, currentType).then(() => {
        if (ui) {
            ui.bannerCategoriesCache[bannerText] = currentType;
            ui.filterBanners();
        }
    });
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
                handleCreateBannersAction(self.BANNER_CREATOR);
                return;
            }

            if (action === 'delete-selected-banners') {
                handleDeleteSelectedBannersAction(self.SELECTORS, self.UI);
                return;
            }

            if (type === 'banner' && action === 'copy-banner') {
                handleCopyBannerAction(button, self.SELECTORS, self.UTILS);
                return;
            }

            if (action === 'mark-stream' || action === 'mark-audience' || action === 'mark-prayer') {
                handleMarkBannerCategoryAction(button, action, self.SELECTORS, self.UI, self.UTILS);
                return;
            }
        });

        document.addEventListener('change', function(e: Event) {
            const target = e.target as Element | null;
            const checkbox = target?.closest('.syh-checkbox[data-type="banner"]') as HTMLInputElement | null;
            if (checkbox) {
                const bannerBlock = checkbox.closest((self.SELECTORS?.bannerBlock as string) || '');
                const textKey = bannerBlock?.querySelector((self.SELECTORS?.bannerText as string) || '')?.textContent || '';
                CommentService.setStreamYardCheckboxState(textKey, checkbox.checked);
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
        bindBannersFilterControls();
    }
};

// Pure ESM Module Export
