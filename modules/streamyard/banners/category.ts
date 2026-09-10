import type { SyhUi, SyhUtils } from './types';
import type { SelectorValue } from '../../config';
import { resolveBannerContext } from './helpers';
import { openBannerCreationModal } from '../../banners/banner_modal';

export function handleCreateBannersAction(bannerCreator: any): void {
    if (bannerCreator) {
        openBannerCreationModal(bannerCreator);
    }
}

export function handleCopyBannerAction(
    button: HTMLElement,
    selectors: Record<string, SelectorValue> | null,
    utils: SyhUtils | null
): void {
    const { bannerBlock, bannerText } = resolveBannerContext(button, selectors);

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
    const { bannerText } = resolveBannerContext(button, selectors);
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