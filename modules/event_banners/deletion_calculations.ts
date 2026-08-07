import type { BannerDeleteCounts } from './types';
import type { SelectorValue } from '../config';

type CommentType = 'stream' | 'audience' | 'prayer' | 'none';

const CATEGORY_SELECTORS = {
    bannerBlock: 'bannerBlock',
    bannerText: 'bannerText'
} as const;

/**
 * Отримує текстовий ключ банера для пошуку в кеші категорій.
 */
function getBannerTextKey(
    checkbox: HTMLInputElement,
    selectors: Record<string, SelectorValue> | null
): string {
    const bannerBlock = checkbox.closest((selectors?.[CATEGORY_SELECTORS.bannerBlock] as string) || '');
    return bannerBlock?.querySelector((selectors?.[CATEGORY_SELECTORS.bannerText] as string) || '')?.textContent || '';
}

/**
 * Визначає тип коментаря банера на основі кешу категорій.
 */
function getCommentType(
    textKey: string,
    ui: { bannerCategoriesCache?: Record<string, string> } | null
): CommentType {
    if (!ui?.bannerCategoriesCache) return 'none';
    return (ui.bannerCategoriesCache[textKey] as CommentType) || 'none';
}

/**
 * Оновлює лічильники категорій.
 */
function incrementCategoryCount(counts: BannerDeleteCounts, commentType: CommentType): void {
    switch (commentType) {
        case 'stream':
            counts.stream++;
            break;
        case 'audience':
            counts.audience++;
            break;
        case 'prayer':
            counts.prayer++;
            break;
    }
}

/**
 * Розраховує кількість банерів для видалення за категоріями.
 * Чиста функція без DOM-залежностей (крім closest/querySelector для отримання тексту).
 */
export function calculateBannerDeletionCounts(
    checkedBanners: NodeListOf<HTMLInputElement> | HTMLInputElement[],
    selectors: Record<string, SelectorValue> | null,
    ui: { bannerCategoriesCache?: Record<string, string> } | null,
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
        const textKey = getBannerTextKey(checkbox, selectors);
        const commentType = getCommentType(textKey, ui);

        if (commentType === activeFilter) {
            currentTabCount++;
        }

        incrementCategoryCount(counts, commentType);
    });

    return { counts, currentTabCount };
}

/**
 * Формує повідомлення підтвердження видалення банерів.
 * Чиста функція без DOM-залежностей.
 */
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

    const summary = `Буде видалено:\n` +
        `- Всі: ${counts.all}\n` +
        `- Ефір: ${counts.stream}\n` +
        `- Глядачі: ${counts.audience}\n` +
        `- Молитви: ${counts.prayer}`;

    if (currentTabCount > 0) {
        return `Ви впевнені, що хочете видалити ${currentTabCount} банер(ів) з вкладки "${tabName}"?\n\n` +
               `Зверніть увагу: ці банери будуть видалені не тільки з поточної вкладки, а й з усіх інших вкладок, і з вкладки "Всі" також.\n\n` +
               summary;
    } else {
        return `Увага! На поточній вкладці "${tabName}" не вибрано жодного банера, але вибрано банери на інших вкладках.\n\n` +
               `Зверніть увагу: ці банери будуть видалені назавжди з усіх вкладок, і з вкладки "Всі" також.\n\n` +
               summary;
    }
}