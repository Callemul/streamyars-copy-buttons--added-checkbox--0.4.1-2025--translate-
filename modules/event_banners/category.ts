import type { SyhUi, SyhUtils } from './types';
import type { SelectorValue } from '../config';

export function handleCreateBannersAction(bannerCreator: any): void {
    const text = prompt("Вставте список питань для створення банерів:", "");
    if (text && bannerCreator) {
        bannerCreator.processAndCreateBanners(text);
    }
}

export function handleCopyBannerAction(
    button: HTMLElement,
    selectors: Record<string, SelectorValue> | null,
    utils: SyhUtils | null
): void {
    const bannerBlock = button.closest((selectors?.bannerBlock as string) || '');
    const bannerText = bannerBlock?.querySelector((selectors?.bannerText as string) || '')?.textContent || '';

    const utilObj = utils;
    if (utilObj) {
        utilObj.copyAndShowBanner(bannerText, "Текст з Банера 🗞");
    }
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
    const utilObj = utils;
    if (utilObj) {
        utilObj.saveBannerCategory(bannerText, currentType).then(() => {
            if (ui) {
                ui.bannerCategoriesCache[bannerText] = currentType;
                ui.filterBanners();
            }
        });
    }
}