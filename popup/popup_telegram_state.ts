// popup/popup_telegram_state.ts
//
// Єдине джерело мутабельного стану вкладки Telegram у попапі.
//
// Виділено з `popup/popup_telegram.ts` (hotspot №1 за Fallow: churn-score 51.2,
// 616 рядків, fan-in 6). Раніше `syh_collected_by_sheet` та `activeBatchCancel`
// були модульними змінними, до яких зверталися всі частини файлу напряму, що й
// робило неможливим його поділ. Тепер це явний, найнижчий рівень залежностей:
// цей модуль НЕ імпортує жодного іншого popup_telegram_*-модуля, тож розбиття
// не створює циклічних імпортів.

import { SHEET_REGISTRY } from '../modules/sheets';
import type { YTCollectedItem } from '../modules/core/types';
import { getSheetCollectedStorageKey } from '../modules/storage_keys';

/** Кеш зібраних з YouTube коментарів у розрізі аркушів. */
const syh_collected_by_sheet: Record<string, YTCollectedItem[]> = SHEET_REGISTRY.createSheetRecordMap(() => []);

/** Активні (незавершені) пакетні рендери — щоб скасовувати їх перед новим. */
const activeBatchCancel: Record<string, () => void> = {};

/** Ключ storage, під яким зберігаються зібрані коментарі аркуша (SSOT: storage_keys.ts). */
export { getSheetCollectedStorageKey, getSheetCollectedStorageKey as getSheetCollectedKey };

export function getCollectedItemsForSheet(sheetId: string): YTCollectedItem[] {
    return syh_collected_by_sheet[sheetId] || [];
}

export function setCollectedItemsForSheet(sheetId: string, items: YTCollectedItem[]): void {
    syh_collected_by_sheet[sheetId] = items;
}

/** Скасовує попередній пакетний рендер за ключем, якщо він ще виконується. */
export function cancelActiveBatch(cancelKey: string): void {
    if (activeBatchCancel[cancelKey]) {
        activeBatchCancel[cancelKey]();
        delete activeBatchCancel[cancelKey];
    }
}

export function registerActiveBatch(cancelKey: string, cancel: () => void): void {
    activeBatchCancel[cancelKey] = cancel;
}
