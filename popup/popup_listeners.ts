// popup/popup_listeners.ts
//
// ПРИЗНАЧЕННЯ: Тонкий оркестратор верхнього рівня — підключає слухачі попапа.
//
// СКЛАД (після декомпозиції):
//   ./popup_sheet_bindings — слухачі одного аркуша (інпути, details, кнопки)
//   ./popup_sheet_clear    — очищення стану аркуша (DOM + storage + YT-коментарі)
//
// Публічний API (setupPopupTabListeners / setupSheetInputListeners /
// setupTranslitListeners / setupTitleAndOptionsListeners / clearSheetState)
// збережено без змін для зворотної сумісності.

import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage/storage';
import { getAllSheetIds } from '../modules/registry/sheets';
import { $, bindTabSwitcher, bindDebouncedInput } from './popup_dom_utils';
import { showBanner } from '../modules/core/utils_notify';
import { db, saveDataToStorage } from './popup_state_restorer';
import { bindSheetListeners, createSheetBindingTimers } from './popup_sheet_bindings';

export {
    clearSheetState,
    resetSheetDom,
    resetSheetInputFields,
    resetSheetLogSection,
    buildSheetInputIds,
    buildSheetClearStorageKeys,
    CLEAR_SHEET_CONFIRM_MESSAGE
} from './popup_sheet_clear';

export { bindSheetListeners, createSheetBindingTimers } from './popup_sheet_bindings';

const SHEET_IDS = getAllSheetIds();
const TRANSLIT_DEBOUNCE_MS = 300;

export function setupPopupTabListeners(): void {
    bindTabSwitcher({
        tabSelector: '.tab-link',
        contentSelector: '.tab-content',
        dataAttr: 'data-tab',
        storageKey: STORAGE_KEYS.POPUP_ACTIVE_TAB,
        tgStorageKey: 'tg_active_tab',
        buildContentId: (id) => id
    });

    bindTabSwitcher({
        tabSelector: '.subtab-button',
        contentSelector: '.sheet-content',
        dataAttr: 'data-sheet',
        storageKey: STORAGE_KEYS.POPUP_ACTIVE_SUBTAB,
        tgStorageKey: 'tg_active_subtab',
        buildContentId: (id) => `sheet-content-${id}`
    });
}

export function setupSheetInputListeners(): void {
    const timers = createSheetBindingTimers();
    SHEET_IDS.forEach(sId => bindSheetListeners(sId, timers));
}

export function setupTranslitListeners(): void {
    const translitTimers = new Map<string, ReturnType<typeof setTimeout>>();

    bindDebouncedInput(
        $(`textArea1_oldText`),
        'translitOld',
        translitTimers,
        TRANSLIT_DEBOUNCE_MS,
        (val) => { SYH_STORAGE.set({ [STORAGE_KEYS.POPUP_TRANSLIT_OLD]: val }); }
    );

    bindDebouncedInput(
        $(`textArea2_generatedRuText`),
        'translitNew',
        translitTimers,
        TRANSLIT_DEBOUNCE_MS,
        (val) => { SYH_STORAGE.set({ [STORAGE_KEYS.POPUP_TRANSLIT_NEW]: val }); }
    );
}

function bindClickById(id: string, handler: () => void): void {
    const el = $(id);
    if (el) el.addEventListener('click', handler);
}

function readInputValue(id: string): string {
    const input = $(id) as HTMLInputElement | null;
    if (!input) return '';
    return input.value;
}

/** Зберігає заголовок з поля вводу у popup-БД та storage. */
export function saveTitleFromInput(inputId: string, dbField: 'newTitleSS' | 'newTitlePreach'): void {
    db[dbField] = readInputValue(inputId);
    saveDataToStorage();
    showBanner("Збережено!");
}

export function openExtensionOptionsPage(): void {
    if (chrome.runtime && chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
        return;
    }
    window.open(chrome.runtime.getURL('options/options.html'));
}

export function setupTitleAndOptionsListeners(): void {
    bindClickById('sschoolNameBtn', () => saveTitleFromInput('sschoolName', 'newTitleSS'));
    bindClickById('preachNameBtn', () => saveTitleFromInput('preachNameInput', 'newTitlePreach'));
    bindClickById('openOptionsPageBtn', openExtensionOptionsPage);
}
