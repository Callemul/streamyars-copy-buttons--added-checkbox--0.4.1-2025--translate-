import type { SelectorValue } from '../config';
import type { SyhUi } from '../ui';
import { calculateBannerDeletionCounts, buildBannerDeleteConfirmMessage } from './deletion_calculations';
import { executeBannerDeletion } from './deletion_execution';

/**
 * Обробник події видалення вибраних банерів.
 * Координує розрахунки, підтвердження та виконання.
 */
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