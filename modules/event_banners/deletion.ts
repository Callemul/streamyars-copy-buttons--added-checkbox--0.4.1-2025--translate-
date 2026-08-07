import type { BannerDeleteCounts, SyhUi } from './types';
import type { SelectorValue } from '../config';

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