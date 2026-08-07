// popup/popup_sheet_bindings.ts
//
// ПРИЗНАЧЕННЯ: Прив'язка DOM-слухачів для ОДНОГО аркуша (sheet) у попапі:
// текстові поля з debounce, contenteditable-результат, <details>-тогли та кнопки.
//
// Виділено з popup/popup_listeners.ts, де вся ця логіка була одним
// 98-рядковим колбеком SHEET_IDS.forEach (CRAP 56).

import { SYH_STORAGE, POPUP_SHEET_KEYS } from '../modules/storage';
import { $, bindDebouncedInput } from './popup_dom_utils';
import {
    updateOldInputStats,
    updateNewInputStats,
    updateCombinedCounters,
    clearFinalResult,
    clearAllYTCollected
} from './popup_telegram';
import { clearSheetState } from './popup_sheet_clear';

export type SheetTimers = Map<string, ReturnType<typeof setTimeout>>;

export interface SheetBindingTimers {
    oldList: SheetTimers;
    newTelegram: SheetTimers;
    answeredIds: SheetTimers;
    finalResult: SheetTimers;
}

export const SHEET_INPUT_DEBOUNCE_MS = 300;

export function createSheetBindingTimers(): SheetBindingTimers {
    return {
        oldList: new Map(),
        newTelegram: new Map(),
        answeredIds: new Map(),
        finalResult: new Map()
    };
}

/**
 * Дублює значення в новий та legacy (`tg_*`) ключі storage.
 * Чиста обгортка над SYH_STORAGE — єдине місце запису для аркуша.
 */
export function persistSheetValue(canonicalKey: string, legacyKey: string, value: unknown): void {
    SYH_STORAGE.set({ [canonicalKey]: value, [legacyKey]: value });
}

function bindOldListInput(sId: string, timers: SheetTimers): void {
    bindDebouncedInput($(`oldList__${sId}`), sId, timers, SHEET_INPUT_DEBOUNCE_MS, (val) => {
        persistSheetValue(POPUP_SHEET_KEYS.oldList(sId), `tg_oldList__${sId}`, val);
        updateOldInputStats(sId);
    });
}

function bindNewTelegramInput(sId: string, timers: SheetTimers): void {
    bindDebouncedInput($(`newTelegram__${sId}`), sId, timers, SHEET_INPUT_DEBOUNCE_MS, (val) => {
        persistSheetValue(POPUP_SHEET_KEYS.newTelegram(sId), `tg_newTelegram__${sId}`, val);
        updateNewInputStats(sId);
        clearFinalResult(sId);
    });
}

function bindAnsweredIdsInput(sId: string, timers: SheetTimers): void {
    bindDebouncedInput($(`answeredIds__${sId}`), sId, timers, SHEET_INPUT_DEBOUNCE_MS, (val) => {
        persistSheetValue(POPUP_SHEET_KEYS.answered(sId), `tg_answered__${sId}`, val);
        updateCombinedCounters(sId);
        clearFinalResult(sId);
    });
}

/** contenteditable-блок фінального результату: зберігає innerHTML з debounce. */
export function bindFinalResultPersistence(sId: string, timers: SheetTimers): void {
    const finalResultEl = $(`finalResultDiv__${sId}`);
    if (!finalResultEl) return;

    const handler = function (this: HTMLElement): void {
        const html = this.innerHTML;
        const existing = timers.get(sId);
        if (existing) clearTimeout(existing);
        timers.set(sId, setTimeout(() => {
            persistSheetValue(POPUP_SHEET_KEYS.finalResultHtml(sId), `tg_finalResultHtml__${sId}`, html);
        }, SHEET_INPUT_DEBOUNCE_MS));
    };

    finalResultEl.addEventListener('input', handler);
    finalResultEl.addEventListener('blur', handler);
}

/** Запам'ятовує розгорнутий/згорнутий стан <details> для логів аркуша. */
export function bindSheetDetailsToggle(kind: 'deleted' | 'cleaned', sId: string): void {
    const detailsEl = $(`${kind}LogDetails__${sId}`) as HTMLDetailsElement | null;
    if (!detailsEl) return;

    const canonicalKey = kind === 'deleted'
        ? POPUP_SHEET_KEYS.deletedLogDetailsOpen(sId)
        : POPUP_SHEET_KEYS.cleanedLogDetailsOpen(sId);

    detailsEl.addEventListener('toggle', function (this: HTMLDetailsElement) {
        persistSheetValue(canonicalKey, `tg_${kind}LogDetailsOpen__${sId}`, this.open);
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
    bindOldListInput(sId, timers.oldList);
    bindNewTelegramInput(sId, timers.newTelegram);
    bindAnsweredIdsInput(sId, timers.answeredIds);
    bindFinalResultPersistence(sId, timers.finalResult);
    bindSheetDetailsToggle('deleted', sId);
    bindSheetDetailsToggle('cleaned', sId);
    bindSheetActionButtons(sId);
}
