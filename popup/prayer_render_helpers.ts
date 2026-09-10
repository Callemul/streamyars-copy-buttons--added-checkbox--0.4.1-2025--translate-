// popup/prayer_render_helpers.ts
//
// ПРИЗНАЧЕННЯ: Тонкий оркестратор рендер-хелперів попапа молитов.
//
// СКЛАД (після декомпозиції):
//   ./prayer_room_guard    — чиста логіка визначення кімнати та чужих молитов
//   ./prayer_dom_builders  — збірка DOM-вузлів (шапка автора, рядок прохання)
//
// Публічний API (checkRoomWarning / buildAuthorHeader / buildPrayerRow)
// збережено без змін для зворотної сумісності.

import { SYH_MESSAGING } from '../modules/messaging/messaging';
import { ROOM_WARNING_HTML, shouldWarnAboutForeignPrayers } from './prayer_room_guard';

import type { PrayerItem } from '../modules/core/types';

export {
    NON_ROOM_PATHS,
    ROOM_WARNING_HTML,
    extractRoomId,
    isRoomPath,
    resolveRoomContext,
    findForeignPrayers,
    shouldWarnAboutForeignPrayers
} from './prayer_room_guard';

export { buildAuthorHeader, buildPrayerRow } from './prayer_dom_builders';

/** chrome.tabs доступний у поточному контексті виконання. */
export function canQueryActiveTab(): boolean {
    if (!SYH_MESSAGING.isExtensionValid()) return false;
    if (typeof chrome === 'undefined') return false;
    return typeof chrome.tabs?.query === 'function';
}

function readFirstTabUrl(tabs: chrome.tabs.Tab[] | undefined): string {
    if (!Array.isArray(tabs)) return '';
    const first = tabs[0];
    if (!first) return '';
    return first.url || '';
}

/** Вставляє банер-попередження, якщо у списку є молитви з іншої кімнати. */
export function renderRoomWarning(prayersList: PrayerItem[], outputDiv: HTMLElement, tabUrl: string): void {
    if (!shouldWarnAboutForeignPrayers(tabUrl, prayersList)) return;
    outputDiv.insertAdjacentHTML('beforebegin', ROOM_WARNING_HTML);
}

function handleActiveTabs(
    tabs: chrome.tabs.Tab[] | undefined,
    prayersList: PrayerItem[],
    outputDiv: HTMLElement
): void {
    try {
        const url = readFirstTabUrl(tabs);
        if (!url) return;
        renderRoomWarning(prayersList, outputDiv, url);
    } catch (e) {
        console.error("[SYH] Room check error", e);
    }
}

export function checkRoomWarning(prayersList: PrayerItem[], outputDiv: HTMLElement): void {
    if (!canQueryActiveTab()) return;
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        handleActiveTabs(tabs, prayersList, outputDiv);
    });
}
