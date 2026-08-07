import type { SelectorValue } from '../config';

/**
 * Виконує видалення банерів через клік на кнопки видалення.
 * Функція з DOM-залежностями.
 */
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