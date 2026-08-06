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

export interface BannerDeleteCounts {
    all: number;
    stream: number;
    audience: number;
    prayer: number;
}

export function handleCreateBannersAction(bannerCreator: SyhBannerCreator | null): void {
    const text = prompt("Вставте список питань для створення банерів:", "");
    if (text && bannerCreator) {
        bannerCreator.processAndCreateBanners(text);
    }
}

export function calculateBannerDeletionCounts(
    checkedBanners: NodeListOf<HTMLInputElement> | HTMLInputElement[],
    selectors: Record<string, SelectorValue> | null,
    ui: SyhUi | null,
    activeFilter: string
): { counts: BannerDeleteCounts; currentTabCount: number } {
    let currentTabCount = 0;
    const counts: BannerDeleteCounts = {
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

    return { counts, currentTabCount };
}

export function buildBannerDeleteConfirmMessage(
    activeFilter: string,
    currentTabCount: number,
    counts: BannerDeleteCounts
): string {
    const filterNames: Record<string, string> = {
        'stream': 'Ефір',
        'audience': 'Глядачі',
        'prayer': 'Молитви'
    };
    const tabName = filterNames[activeFilter] || activeFilter;

    if (currentTabCount > 0) {
        return `Ви впевнені, що хочете видалити ${currentTabCount} банер(ів) з вкладки "${tabName}"?\n\n` +
               `Зверніть увагу: ці банери будуть видалені не тільки з поточної вкладки, а й з усіх інших вкладок, і з вкладки "Всі" також.\n\n` +
               `Буде видалено:\n` +
               `- Всі: ${counts.all}\n` +
               `- Ефір: ${counts.stream}\n` +
               `- Глядачі: ${counts.audience}\n` +
               `- Молитви: ${counts.prayer}`;
    } else {
        return `Увага! На поточній вкладці "${tabName}" не вибрано жодного банера, але вибрано банери на інших вкладках.\n\n` +
               `Зверніть увагу: ці банери будуть видалені назавжди з усіх вкладок, і з вкладки "Всі" також.\n\n` +
               `Буде видалено:\n` +
               `- Всі: ${counts.all}\n` +
               `- Ефір: ${counts.stream}\n` +
               `- Глядачі: ${counts.audience}\n` +
               `- Молитви: ${counts.prayer}`;
    }
}

export function executeBannerDeletion(
    checkedBanners: NodeListOf<HTMLInputElement> | HTMLInputElement[],
    selectors: Record<string, SelectorValue> | null
): void {
    checkedBanners.forEach((checkbox) => {
        const bannerBlock = checkbox.closest((selectors?.bannerBlock as string) || '');
        const deleteButton = bannerBlock?.querySelector((selectors?.bannerDeleteButton as string) || '') as HTMLElement | null;
        if (deleteButton) deleteButton.click();
    });
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
        const { counts, currentTabCount } = calculateBannerDeletionCounts(checkedBanners, selectors, ui, activeFilter);
        const confirmMessage = buildBannerDeleteConfirmMessage(activeFilter, currentTabCount, counts);
        proceed = confirm(confirmMessage);
    } else {
        proceed = confirm(`Ви впевнені, що хочете видалити ${checkedBanners.length} банер(ів)?`);
    }

    if (proceed) {
        executeBannerDeletion(checkedBanners, selectors);
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

export function handleBannerContextMenu(
    e: MouseEvent,
    selectors: Record<string, SelectorValue> | null
): void {
    const target = e.target as Element | null;
    if (!target || !selectors?.bannerBlock) return;
    const bannerBlock = target.closest(selectors.bannerBlock as string);
    if (!bannerBlock) return;

    const isInputOrCustom = target.closest('input, textarea, .syh-button');
    const isSystemEditOrDelete = target.closest('button:has(svg.lucide-pencil), button:has(svg.lucide-trash-2), button:has(svg.lucide-trash2), [class*="DesktopTopIconRow"] button');

    if (isInputOrCustom || isSystemEditOrDelete) return;

    e.preventDefault();
    e.stopPropagation();
    const checkbox = bannerBlock.querySelector('.syh-checkbox[data-type="banner"]') as HTMLInputElement | null;
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

export function handleBannerMouseDown(e: MouseEvent): void {
    const target = e.target as Element | null;
    if (target?.closest('.syh-button[data-type="banner"], .syh-button[data-action="create-from-text"], .syh-button[data-action="delete-selected-banners"]') && e.button === 1) {
        e.preventDefault();
    }
}

export function handleBannerMouseUp(
    e: MouseEvent,
    instance: SyhEventBanners
): void {
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
        handleCreateBannersAction(instance.BANNER_CREATOR);
        return;
    }

    if (action === 'delete-selected-banners') {
        handleDeleteSelectedBannersAction(instance.SELECTORS, instance.UI);
        return;
    }

    if (type === 'banner' && action === 'copy-banner') {
        handleCopyBannerAction(button, instance.SELECTORS, instance.UTILS);
        return;
    }

    if (action === 'mark-stream' || action === 'mark-audience' || action === 'mark-prayer') {
        handleMarkBannerCategoryAction(button, action, instance.SELECTORS, instance.UI, instance.UTILS);
        return;
    }
}

export function handleSingleBannerCheckboxChange(
    checkbox: HTMLInputElement,
    selectors: Record<string, SelectorValue> | null,
    ui: SyhUi | null
): void {
    const bannerBlock = checkbox.closest((selectors?.bannerBlock as string) || '');
    const textKey = bannerBlock?.querySelector((selectors?.bannerText as string) || '')?.textContent || '';
    CommentService.setStreamYardCheckboxState(textKey, checkbox.checked);
    if (ui) ui.updateMasterCheckboxState();
}

export function handleMasterCheckboxChange(
    masterCheckbox: HTMLInputElement,
    selectors: Record<string, SelectorValue> | null
): void {
    const isChecked = masterCheckbox.checked;
    masterCheckbox.indeterminate = false;
    const bannerBlocks = document.querySelectorAll((selectors?.bannerBlock as string) || '');
    bannerBlocks.forEach(block => {
        const cb = block.querySelector('.syh-checkbox[data-type="banner"]') as HTMLInputElement | null;
        if (cb) {
            cb.checked = isChecked;
            cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
}

export function handleBannerChange(
    e: Event,
    selectors: Record<string, SelectorValue> | null,
    ui: SyhUi | null
): void {
    const target = e.target as Element | null;
    const checkbox = target?.closest('.syh-checkbox[data-type="banner"]') as HTMLInputElement | null;
    if (checkbox) {
        handleSingleBannerCheckboxChange(checkbox, selectors, ui);
        return;
    }

    const masterCheckbox = target?.closest('.syh-master-checkbox') as HTMLInputElement | null;
    if (masterCheckbox) {
        handleMasterCheckboxChange(masterCheckbox, selectors);
    }
}

let eventsBound = false;

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
        if (eventsBound) return;
        eventsBound = true;

        const self = this;

        document.addEventListener('contextmenu', (e: MouseEvent) => handleBannerContextMenu(e, self.SELECTORS), true);
        document.addEventListener('mousedown', handleBannerMouseDown);
        document.addEventListener('mouseup', (e: MouseEvent) => handleBannerMouseUp(e, self));
        document.addEventListener('change', (e: Event) => handleBannerChange(e, self.SELECTORS, self.UI));
    },

    bindBannersFilterControls: function(): void {
        bindBannersFilterControls();
    }
};

// Pure ESM Module Export
