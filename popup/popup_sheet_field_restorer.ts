// popup/popup_sheet_field_restorer.ts
//
// Відновлення простих полів аркуша: текстові поля кроків 1–3, підсумковий
// результат, панель статистики та позиція роздільника колонок.
//
// Виділено з `popup_sheet_state_restorer.ts` разом із журналами
// (`popup_sheet_log_restorer.ts`), щоб орієнтований на storage «оркестратор»
// лишався тонким. Поведінка збережена 1-в-1: значення читаються з фолбеком на
// легасі-ключі, а порожній рядок трактується як «немає даних» (`if (val)`).

import { POPUP_SHEET_KEYS } from '../modules/storage';
import { $, setElementText } from './popup_dom_utils';
import { updateOldInputStats, updateNewInputStats, ensureStatsBarRows } from './popup_telegram';
import { readSheetValue } from './popup_sheet_keys';

export function restoreSheetOldList(sheetId: string, result: Record<string, any>): void {
    const oldListEl = $(`oldList__${sheetId}`) as HTMLTextAreaElement | null;
    const oldListVal = readSheetValue(result, sheetId, POPUP_SHEET_KEYS.oldList, 'tg_oldList__');
    if (oldListVal && oldListEl) {
        oldListEl.value = oldListVal;
        updateOldInputStats(sheetId);
    }
}

export function restoreSheetAnswered(sheetId: string, result: Record<string, any>): void {
    const answeredEl = $(`answeredIds__${sheetId}`) as HTMLInputElement | null;
    const answeredVal = readSheetValue(result, sheetId, POPUP_SHEET_KEYS.answered, 'tg_answered__');
    if (answeredVal && answeredEl) {
        answeredEl.value = answeredVal;
    }
}

export function restoreSheetNewTelegram(sheetId: string, result: Record<string, any>): void {
    const newTgEl = $(`newTelegram__${sheetId}`) as HTMLTextAreaElement | null;
    const newTgVal = readSheetValue(result, sheetId, POPUP_SHEET_KEYS.newTelegram, 'tg_newTelegram__');
    if (newTgVal && newTgEl) {
        newTgEl.value = newTgVal;
        updateNewInputStats(sheetId);
    }
}

export function restoreSheetFinalHtml(sheetId: string, result: Record<string, any>): void {
    const finalHtml = readSheetValue(result, sheetId, POPUP_SHEET_KEYS.finalResultHtml, 'tg_finalResultHtml__');
    if (finalHtml) {
        setElementText(`finalResultDiv__${sheetId}`, finalHtml);
    }
}

export function restoreSheetStats(sheetId: string, result: Record<string, any>): void {
    const statsVisible = readSheetValue(result, sheetId, POPUP_SHEET_KEYS.statsVisible, 'tg_statsVisible__');
    if (!statsVisible) return;

    const statsHtml = readSheetValue(result, sheetId, POPUP_SHEET_KEYS.statsHtml, 'tg_statsHtml__');
    if (statsHtml) setElementText(`statsBar__${sheetId}`, statsHtml);

    ensureStatsBarRows(sheetId);

    const statsBar = $(`statsBar__${sheetId}`);
    if (statsBar && statsBar instanceof HTMLElement) statsBar.style.display = '';
}

/**
 * Позиція роздільника колонок кроку 3.
 *
 * КВІРК 1-в-1: «легасі»-фолбек `syh:popup:divider_pos:<id>` збігається з тим,
 * що повертає `POPUP_SHEET_KEYS.dividerPos`, тож другий доданок `??` мертвий.
 * Лишено як є, щоб рефакторинг не змінював поведінку.
 */
export function restoreSheetDividerPos(sheetId: string, result: Record<string, any>): void {
    const divPos = readSheetValue(result, sheetId, POPUP_SHEET_KEYS.dividerPos, 'syh:popup:divider_pos:');
    if (!divPos) return;

    const leftEl = $(`step3Left__${sheetId}`);
    const rightEl = $(`step3Right__${sheetId}`);
    if (leftEl && leftEl instanceof HTMLElement) leftEl.style.flex = `${divPos}%`;
    if (rightEl && rightEl instanceof HTMLElement) rightEl.style.flex = `${100 - divPos}%`;
}
