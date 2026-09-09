/**
 * Badge rendering (Chrome `chrome.action` I/O).
 *
 * Виділено з `service-worker.ts`. Відповідає лише за те, ЯК показати вже
 * підраховані числа: пріоритет кольорів і обрізання лічильника.
 *
 * Правило пріоритету збережено 1-в-1: якщо є хоч один вибраний елемент —
 * показуємо оранжевий лічильник вибраних; інакше зелений лічильник зібраних;
 * інакше бейдж очищується (без зміни кольору).
 *
 * Уся функція загорнута в try/catch і мовчазно завершується поза Chrome-рантаймом:
 * service worker не має падати через мертвий контекст.
 */

import type { StorageRawResult } from '../modules/storage';
import { calculateBadgeCounts } from './badge_counter';

const BADGE_COLOR_CHECKED = '#E67E22';
const BADGE_COLOR_COLLECTED = '#27AE60';
const BADGE_MAX_COUNT = 99;

function formatBadgeCount(count: number): string {
    return count > BADGE_MAX_COUNT ? `${BADGE_MAX_COUNT}+` : String(count);
}

function isBadgeApiAvailable(): boolean {
    return typeof chrome !== 'undefined' &&
           !!chrome.action &&
           typeof chrome.action.setBadgeText === 'function' &&
           !!chrome.storage &&
           !!chrome.storage.local;
}

export async function applyBadgeTextAndColor(text: string, color?: string): Promise<void> {
    await chrome.action.setBadgeText({ text });
    if (color && typeof chrome.action.setBadgeBackgroundColor === 'function') {
        await chrome.action.setBadgeBackgroundColor({ color });
    }
}

export async function updateExtensionBadge(): Promise<void> {
    if (!isBadgeApiAvailable()) {
        return;
    }

    try {
        const allData: StorageRawResult = await new Promise((resolve) => {
            chrome.storage.local.get(null, (result) => resolve(result || {}));
        });

        const { collectedCount, checkedCount } = calculateBadgeCounts(allData);

        if (checkedCount > 0) {
            await applyBadgeTextAndColor(formatBadgeCount(checkedCount), BADGE_COLOR_CHECKED);
        } else if (collectedCount > 0) {
            await applyBadgeTextAndColor(formatBadgeCount(collectedCount), BADGE_COLOR_COLLECTED);
        } else {
            await applyBadgeTextAndColor('');
        }
    } catch (err) {
        console.error('[Service Worker] Error updating extension badge:', err);
    }
}
