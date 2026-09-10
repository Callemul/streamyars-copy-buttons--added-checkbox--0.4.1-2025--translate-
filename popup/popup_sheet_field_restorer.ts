// popup/popup_sheet_field_restorer.ts
//
// Відновлення полів аркуша: прості значення (крок 1–3 і результат) —
// універсальним циклом по реєстру `popup_sheet_fields.ts` (T8); панель
// статистики та позиція роздільника — власною логікою, але з ключами
// з того ж реєстру.
//
// До T8 тут лежало шість майже однакових `restoreSheet<Field>()`, у кожній —
// свій рядок з легасі-префіксом. Забути одну з них при додаванні поля було
// найлегшим способом мовчки загубити дані користувача.
//
// Поведінка збережена 1-в-1: значення читаються з фолбеком на легасі-ключі,
// порожній рядок трактується як «немає даних» (`if (val)`), а побічний ефект
// (перерахунок лічильників) виконується тільки коли елемент реально знайдено.

import { $, setElementText } from './popup_dom_utils';
import { updateOldInputStats, updateNewInputStats, ensureStatsBarRows } from './popup_telegram';
import { readSheetBinding } from './popup_sheet_keys';
import type { StorageReadResult } from '../modules/storage/storage';
import {
    persistedValueFields,
    getSheetStateBinding,
    sheetFieldId,
    type SheetFieldDescriptor,
    type SheetStateBinding
} from './popup_sheet_fields';

/**
 * Побічні ефекти після відновлення значення, за префіксом id елемента.
 *
 * Тримаються тут, а не в реєстрі: реєстр — чиста таблиця даних і не має
 * знати про `popup_telegram` (те саме правило, що й для реєстру дій над
 * коментарем). Поле без побічного ефекту не потребує тут жодного рядка.
 */
const AFTER_RESTORE: Readonly<Record<string, (sheetId: string) => void>> = {
    oldList: updateOldInputStats,
    newTelegram: updateNewInputStats
};

function restoreValueField(
    field: SheetFieldDescriptor & { value: SheetStateBinding },
    sheetId: string,
    result: StorageReadResult
): void {
    const val = readSheetBinding(result, sheetId, field.value);
    if (!val) return;

    const id = sheetFieldId(field, sheetId);

    if (field.kind === 'html') {
        setElementText(id, val);
    } else {
        const el = $(id) as HTMLInputElement | HTMLTextAreaElement | null;
        if (!el) return;
        el.value = val;
    }

    AFTER_RESTORE[field.idPrefix]?.(sheetId);
}

/** Усі поля, значення яких зберігається напряму — одним проходом по реєстру. */
export function restoreSheetValueFields(sheetId: string, result: StorageReadResult): void {
    persistedValueFields().forEach(field => restoreValueField(field, sheetId, result));
}

/**
 * Панель статистики. Не потрапляє в універсальний цикл, бо html відновлюється
 * лише коли панель була видима — тому обидва її ключі оголошені в реєстрі як
 * `state`, а не `value`.
 */
export function restoreSheetStats(sheetId: string, result: StorageReadResult): void {
    const statsVisible = readSheetBinding(result, sheetId, getSheetStateBinding('statsVisible'));
    if (!statsVisible) return;

    const statsHtml = readSheetBinding(result, sheetId, getSheetStateBinding('statsHtml'));
    if (statsHtml) setElementText(`statsBar__${sheetId}`, statsHtml);

    ensureStatsBarRows(sheetId);

    const statsBar = $(`statsBar__${sheetId}`);
    if (statsBar && statsBar instanceof HTMLElement) statsBar.style.display = '';
}

/**
 * Позиція роздільника колонок кроку 3 — одне значення на два елементи
 * (`step3Left` / `step3Right`), тому теж поза універсальним циклом.
 *
 * КВІРК 1-в-1: легасі-форма ключа `syh:popup:divider_pos:<id>` збігається з
 * канонічною, тож другий доданок `??` мертвий. Лишено як є (див. коментар
 * до `DIVIDER_POS` у реєстрі).
 */
export function restoreSheetDividerPos(sheetId: string, result: StorageReadResult): void {
    const divPos = readSheetBinding(result, sheetId, getSheetStateBinding('dividerPos'));
    if (!divPos) return;

    const leftEl = $(`step3Left__${sheetId}`);
    const rightEl = $(`step3Right__${sheetId}`);
    if (leftEl && leftEl instanceof HTMLElement) leftEl.style.flex = `${divPos}%`;
    if (rightEl && rightEl instanceof HTMLElement) rightEl.style.flex = `${100 - divPos}%`;
}
