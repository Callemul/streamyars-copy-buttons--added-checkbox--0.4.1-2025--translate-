import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage';
import { RetentionService } from '../modules/retention_service';

import type { PrayerItem } from '../modules/types';
import { generatePrayerId, cleanPrayerAuthorName, getAuthorIcon } from './prayer_utils';

export function ensurePrayerIds(prayersList: PrayerItem[]): boolean {
    let needsSaveId = false;
    prayersList.forEach((p, idx) => {
        if (!p.id) {
            p.id = generatePrayerId(p.timestamp, idx);
            needsSaveId = true;
        }
    });
    return needsSaveId;
}

export function savePrayerIdsIfNeeded(prayersList: PrayerItem[], needsSaveId: boolean): void {
    if (needsSaveId) {
        SYH_STORAGE.set({ [STORAGE_KEYS.PRAYERS]: prayersList });
    }
}

export function filterAndSaveFreshPrayers(prayersList: PrayerItem[]): PrayerItem[] {
    const cleanedList = RetentionService.filterFreshPrayers(prayersList);
    if (cleanedList.length !== prayersList.length) {
        SYH_STORAGE.set({ [STORAGE_KEYS.PRAYERS]: cleanedList });
        return cleanedList;
    }
    return prayersList;
}

export function groupPrayersByAuthor(prayersList: PrayerItem[]): {
    grouped: Record<string, { text: string; icon: string; id: string }[]>;
    totalRequests: number;
} {
    const grouped: Record<string, { text: string; icon: string; id: string }[]> = {};
    let totalRequests = 0;
    const onlyPrayers = prayersList.filter(p => p.type === 'prayer');
    onlyPrayers.forEach((p) => {
        const cleanAuthor = cleanPrayerAuthorName(p.author);
        if (!grouped[cleanAuthor]) grouped[cleanAuthor] = [];
        grouped[cleanAuthor].push({
            text: p.text,
            icon: p.icon || '🙏🙏🙏',
            id: p.id!
        });
        totalRequests++;
    });
    return { grouped, totalRequests };
}

export function buildCopyText(grouped: Record<string, { text: string; icon: string; id: string }[]>): string {
    let fullTextForCopy = "🙏🙏🙏 МОЛИТВЕННЫЕ ПРОСЬБЫ\n\n";
    const authorNames = Object.keys(grouped);

    for (const author of authorNames) {
        const items = grouped[author];
        const authorIcon = getAuthorIcon(items);

        fullTextForCopy += `${authorIcon} @${author}\n`;

        if (items.length === 1) {
            const item = items[0];
            fullTextForCopy += `${item.text}\n\n`;
        } else {
            items.forEach((item, idx) => {
                fullTextForCopy += `${idx + 1}) ${item.text}\n`;
            });
            fullTextForCopy += `\n`;
        }
    }

    return fullTextForCopy.trim();
}

export function updateTotalCount(authorsCount: number, totalRequests: number): void {
    const totalCount = document.getElementById('prayersTotalCount');
    if (totalCount) totalCount.textContent = `${authorsCount} люд. - ${totalRequests} прохань`;
}