// popup/popup_ui_state_restorer.ts
// UI state restoration (tabs, subtabs, textarea sizes, translit, scroll)
//
// Файл свідомо тонкий: чисті правила живуть у `popup_ui_state_rules.ts`,
// точкові DOM-записи — у `popup_ui_state_appliers.ts`, а перемикання вкладок —
// у спільному `popup_dom_utils.restoreActiveTabState` (раніше ця логіка була
// продубльована тут двічі — для вкладок і для підвкладок).

import { STORAGE_KEYS, type StorageReadResult } from '../modules/storage/storage';
import { getAllSheetIds } from '../modules/registry/sheets';
import { db } from './popup_storage';
import { restoreActiveTabState } from './popup_dom_utils';
import { readStoredValue, buildScrollTargetIds } from './popup_ui_state_rules';
import {
    applyStoredElementSizes,
    applyScrollTop,
    applyInputValue,
    type StoredElementSize
} from './popup_ui_state_appliers';

const SHEET_IDS = getAllSheetIds();
const SCROLL_TARGET_IDS = buildScrollTargetIds(SHEET_IDS);

/** Затримка перед відновленням скролу: дає розмітці домалюватися. */
const SCROLL_RESTORE_DELAY_MS = 100;

export function restoreDbState(result: StorageReadResult): void {
    if (result[STORAGE_KEYS.DB]) {
        Object.assign(db, result[STORAGE_KEYS.DB]);
        applyInputValue('sschoolName', db.newTitleSS as string | undefined);
        applyInputValue('preachNameInput', db.newTitlePreach as string | undefined);
    }
}

export function restoreActiveTabUI(result: StorageReadResult): void {
    const activeTabVal = readStoredValue<string>(result, STORAGE_KEYS.POPUP_ACTIVE_TAB, 'tg_active_tab');
    if (!activeTabVal) return;

    restoreActiveTabState({
        tabSelector: '.tab-link',
        contentSelector: '.tab-content',
        dataAttr: 'data-tab',
        activeId: activeTabVal
    });
}

export function restoreActiveSubtabUI(result: StorageReadResult): void {
    const activeSubtabVal = readStoredValue<string>(result, STORAGE_KEYS.POPUP_ACTIVE_SUBTAB, 'tg_active_subtab');
    if (!activeSubtabVal || !SHEET_IDS.includes(activeSubtabVal)) return;

    restoreActiveTabState({
        tabSelector: '.subtab-button',
        contentSelector: '.sheet-content',
        dataAttr: 'data-sheet',
        activeId: activeSubtabVal,
        buildContentId: (sId) => `sheet-content-${sId}`
    });
}

export function restoreTextareaSizesUI(result: StorageReadResult): void {
    const textareaSizes = readStoredValue<Record<string, StoredElementSize>>(
        result, STORAGE_KEYS.POPUP_TEXTAREA_SIZES, 'tg_textarea_sizes'
    );
    if (!textareaSizes) return;

    applyStoredElementSizes(textareaSizes);
}

export function restoreTranslitStateUI(result: StorageReadResult): void {
    applyInputValue(
        'textArea1_oldText',
        readStoredValue<string>(result, STORAGE_KEYS.POPUP_TRANSLIT_OLD, 'tg_translit_old')
    );
    applyInputValue(
        'textArea2_generatedRuText',
        readStoredValue<string>(result, STORAGE_KEYS.POPUP_TRANSLIT_NEW, 'tg_translit_new')
    );
}

export function restoreScrollPositionsUI(result: StorageReadResult): void {
    const scrolls = readStoredValue<Record<string, number>>(
        result, STORAGE_KEYS.POPUP_SCROLL_POSITIONS, 'tg_scroll_positions'
    );
    if (!scrolls) return;

    setTimeout(() => {
        if (scrolls.window !== undefined) window.scrollTo(0, scrolls.window);
        SCROLL_TARGET_IDS.forEach(id => applyScrollTop(id, scrolls[id]));
    }, SCROLL_RESTORE_DELAY_MS);
}
