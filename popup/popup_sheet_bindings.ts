// popup/popup_sheet_bindings.ts
//
// ПРИЗНАЧЕННЯ: Прив'язка DOM-слухачів для ОДНОГО аркуша (sheet) у попапі:
// текстові поля з debounce, contenteditable-результат, <details>-тогли та кнопки.
//
// Виділено з popup/popup_listeners.ts, де вся ця логіка була одним
// 98-рядковим колбеком SHEET_IDS.forEach (CRAP 56).
//
// Після T8 збереження полів генерується з реєстру `popup_sheet_fields.ts`:
// раніше кожне поле мало власну `bind<Field>Input()` з окремо вписаним
// легасі-ключем, і саме тут найлегше було забути новододане поле — воно
// відновлювалось, але не зберігалось.

import { SYH_STORAGE } from '../modules/storage';
import { SheetStateService } from '../modules/sheet_state_service';
import { $, bindDebouncedInput } from './popup_dom_utils';
import {
    updateOldInputStats,
    updateNewInputStats,
    updateCombinedCounters,
    clearFinalResult,
    clearAllYTCollected
} from './popup_telegram';
import { clearSheetState } from './popup_sheet_clear';
import {
    persistedValueFields,
    getSheetStateBinding,
    sheetFieldId,
    sheetStateKeys,
    type SheetFieldDescriptor,
    type SheetStateBinding
} from './popup_sheet_fields';

export type SheetTimers = Map<string, ReturnType<typeof setTimeout>>;

/**
 * Мапи таймерів debounce — по одній на поле, що зберігається.
 *
 * Ключ — префікс id поля з реєстру (`oldList`, `answeredIds`, `newTelegram`,
 * `finalResultDiv`). До T8 це був інтерфейс із чотирма іменованими полями, і
 * нове поле аркуша вимагало ще й нового рядка тут.
 */
export type SheetBindingTimers = Record<string, SheetTimers>;

export const SHEET_INPUT_DEBOUNCE_MS = 300;

export function createSheetBindingTimers(): SheetBindingTimers {
    const timers: SheetBindingTimers = {};
    persistedValueFields().forEach(field => { timers[field.idPrefix] = new Map(); });
    return timers;
}

/**
 * Зберігає значення поля аркуша.
 * Делегує виклик у SheetStateService.saveSheetState() як єдине джерело правди (SSOT).
 * Якщо ключ не відповідає формату стану аркуша — фолбечить на прямий запис у SYH_STORAGE.
 */
export function persistSheetValue(canonicalKey: string, legacyKey: string, value: unknown): Promise<void> | void {
    const match = canonicalKey.match(/^syh:popup:sheet:([^:]+):(.+)$/);
    const [, sheetId, field] = match ?? [];
    if (sheetId && field) {
        return SheetStateService.saveSheetState(sheetId, { [field]: value });
    }
    SYH_STORAGE.set({ [canonicalKey]: value, [legacyKey]: value });
}

/** Зберігає значення поля за його прив'язкою з реєстру. */
function persistBinding(binding: SheetStateBinding, sId: string, value: unknown): void {
    const [canonicalKey, legacyKey] = sheetStateKeys(binding, sId);
    persistSheetValue(canonicalKey, legacyKey, value);
}

/**
 * Побічні ефекти після збереження, за префіксом id поля.
 *
 * Тримаються тут, а не в реєстрі: реєстр — чиста таблиця даних і не має знати
 * про `popup_telegram`. Поле без побічного ефекту рядка тут не потребує.
 */
const AFTER_PERSIST: Readonly<Record<string, (sId: string) => void>> = {
    oldList: (sId) => updateOldInputStats(sId),
    newTelegram: (sId) => { updateNewInputStats(sId); clearFinalResult(sId); },
    answeredIds: (sId) => { updateCombinedCounters(sId); clearFinalResult(sId); }
};

/** `<textarea>` / `<input>`: debounce по `input`, значення з `.value`. */
function bindValueInput(
    field: SheetFieldDescriptor & { value: SheetStateBinding },
    sId: string,
    timers: SheetTimers
): void {
    bindDebouncedInput($(sheetFieldId(field, sId)), sId, timers, SHEET_INPUT_DEBOUNCE_MS, (val) => {
        persistBinding(field.value, sId, val);
        AFTER_PERSIST[field.idPrefix]?.(sId);
    });
}

/**
 * `contenteditable`-блок: власний debounce по `input` і `blur`, значення —
 * `innerHTML`. Окремий механізм, бо в contenteditable немає `.value`.
 */
function bindHtmlInput(
    field: SheetFieldDescriptor & { value: SheetStateBinding },
    sId: string,
    timers: SheetTimers
): void {
    const el = $(sheetFieldId(field, sId));
    if (!el) return;

    const handler = function (this: HTMLElement): void {
        const html = this.innerHTML;
        const existing = timers.get(sId);
        if (existing) clearTimeout(existing);
        timers.set(sId, setTimeout(() => {
            persistBinding(field.value, sId, html);
            AFTER_PERSIST[field.idPrefix]?.(sId);
        }, SHEET_INPUT_DEBOUNCE_MS));
    };

    el.addEventListener('input', handler);
    el.addEventListener('blur', handler);
}

/** Прив'язує збереження всіх полів аркуша — циклом по реєстру. */
export function bindSheetValueFields(sId: string, timers: SheetBindingTimers): void {
    persistedValueFields().forEach(field => {
        const fieldTimers = timers[field.idPrefix];
        if (!fieldTimers) return;

        if (field.kind === 'html') bindHtmlInput(field, sId, fieldTimers);
        else bindValueInput(field, sId, fieldTimers);
    });
}

/** Запам'ятовує розгорнутий/згорнутий стан <details> для логів аркуша. */
export function bindSheetDetailsToggle(kind: 'deleted' | 'cleaned', sId: string): void {
    const detailsEl = $(`${kind}LogDetails__${sId}`) as HTMLDetailsElement | null;
    if (!detailsEl) return;

    const binding = getSheetStateBinding(`${kind}LogDetailsOpen`);

    detailsEl.addEventListener('toggle', function (this: HTMLDetailsElement) {
        persistBinding(binding, sId, this.open);
    });
}

function bindClickById(id: string, handler: () => void): void {
    const el = $(id);
    if (el) el.addEventListener('click', handler);
}

export function bindSheetActionButtons(sId: string): void {
    bindClickById(`clearStateBtn__${sId}`, () => clearSheetState(sId));
    bindClickById(`clearYTCollected__${sId}`, () => clearAllYTCollected(sId));
}

/** Єдина точка входу: підключає всі слухачі одного аркуша. */
export function bindSheetListeners(sId: string, timers: SheetBindingTimers): void {
    bindSheetValueFields(sId, timers);
    bindSheetDetailsToggle('deleted', sId);
    bindSheetDetailsToggle('cleaned', sId);
    bindSheetActionButtons(sId);
}
