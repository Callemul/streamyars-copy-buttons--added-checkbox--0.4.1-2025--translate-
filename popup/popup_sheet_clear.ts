// popup/popup_sheet_clear.ts
//
// ПРИЗНАЧЕННЯ: Повне очищення стану одного аркуша (sheet) у попапі —
// поля вводу, логи, лічильники, storage та зібрані YouTube-коментарі.
//
// Виділено з popup/popup_listeners.ts, де clearSheetState() була монолітною
// функцією з cyclomatic 9 (CRAP 90) і не піддавалася юніт-тестуванню.

import { POPUP_SHEET_KEYS } from '../modules/storage';
import { $, setTextContent, hideElement } from './popup_dom_utils';
import { CommentService } from '../modules/comment_service';
import { SheetStateService } from '../modules/sheet_state_service';
import { updateCombinedCounters, loadYTCollected } from './popup_telegram';

export const CLEAR_SHEET_CONFIRM_MESSAGE =
    "Очистити всі поля введення та зібрані коментарі з YouTube у цьому аркуші?";

export type SheetLogKind = 'deleted' | 'cleaned';

/** Текстові поля вводу, що скидаються при очищенні аркуша. */
export function buildSheetInputIds(sId: string): string[] {
    return [`oldList__${sId}`, `answeredIds__${sId}`, `newTelegram__${sId}`];
}

/**
 * Повний перелік ключів storage (нових + legacy `tg_*`), які належать аркушу.
 * Чиста функція — основна точка юніт-тестування цього модуля.
 */
export function buildSheetClearStorageKeys(sId: string): string[] {
    return [
        POPUP_SHEET_KEYS.oldList(sId), `tg_oldList__${sId}`,
        POPUP_SHEET_KEYS.answered(sId), `tg_answered__${sId}`,
        POPUP_SHEET_KEYS.newTelegram(sId), `tg_newTelegram__${sId}`,
        POPUP_SHEET_KEYS.finalResultHtml(sId), `tg_finalResultHtml__${sId}`,
        POPUP_SHEET_KEYS.statsHtml(sId), `tg_statsHtml__${sId}`,
        POPUP_SHEET_KEYS.statsVisible(sId), `tg_statsVisible__${sId}`,
        POPUP_SHEET_KEYS.deletedLogHtml(sId), `tg_deletedLogHtml__${sId}`,
        POPUP_SHEET_KEYS.deletedLogCount(sId), `tg_deletedLogCount__${sId}`,
        POPUP_SHEET_KEYS.deletedLogDetailsVisible(sId), `tg_deletedLogDetailsVisible__${sId}`,
        POPUP_SHEET_KEYS.deletedLogDetailsOpen(sId), `tg_deletedLogDetailsOpen__${sId}`,
        POPUP_SHEET_KEYS.cleanedLogHtml(sId), `tg_cleanedLogHtml__${sId}`,
        POPUP_SHEET_KEYS.cleanedLogCount(sId), `tg_cleanedLogCount__${sId}`,
        POPUP_SHEET_KEYS.cleanedLogDetailsVisible(sId), `tg_cleanedLogDetailsVisible__${sId}`,
        POPUP_SHEET_KEYS.cleanedLogDetailsOpen(sId), `tg_cleanedLogDetailsOpen__${sId}`
    ];
}

function clearHtmlById(id: string): void {
    const el = $(id);
    if (el) el.innerHTML = '';
}

export function resetSheetInputFields(sId: string): void {
    buildSheetInputIds(sId).forEach(id => {
        const el = $(id) as HTMLTextAreaElement | HTMLInputElement | null;
        if (el) el.value = '';
    });
}

/** Скидає один блок логів (видалені / очищені): вміст, лічильник, видимість. */
export function resetSheetLogSection(kind: SheetLogKind, sId: string): void {
    clearHtmlById(`${kind}Log__${sId}`);
    setTextContent(`${kind}LogCount__${sId}`, '');
    hideElement(`${kind}LogDetails__${sId}`);
}

/** Скидає всю DOM-частину аркуша без звернень до storage. */
export function resetSheetDom(sId: string): void {
    resetSheetInputFields(sId);
    clearHtmlById(`finalResultDiv__${sId}`);
    hideElement(`statsBar__${sId}`);
    resetSheetLogSection('deleted', sId);
    resetSheetLogSection('cleaned', sId);
    setTextContent(`oldTotalCount__${sId}`, '');
    setTextContent(`tgTotalCountAll__${sId}`, '');
}

export function clearSheetState(sId: string): void {
    if (!confirm(CLEAR_SHEET_CONFIRM_MESSAGE)) return;

    resetSheetDom(sId);
    SheetStateService.clearSheetState(sId).catch(e => console.error('[SYH] Clear sheet state failed:', e));

    CommentService.clearAllCollectedForSheet(sId).then(() => {
        loadYTCollected(sId);
        updateCombinedCounters(sId);
    }).catch(e => console.error('[SYH] Clear failed:', e));
}
