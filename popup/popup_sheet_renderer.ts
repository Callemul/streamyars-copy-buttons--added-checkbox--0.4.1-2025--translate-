// popup/popup_sheet_renderer.ts
// Sheet template rendering and key building

import { STORAGE_KEYS, POPUP_SHEET_KEYS, getSheetCollectedStorageKey } from '../modules/storage';
import { getAllSheetIds, SHEET_LABELS } from '../modules/sheets';

export function renderSheetTemplates(): void {
    const template = document.getElementById('sheet-content-template') as HTMLTemplateElement | null;
    const container = document.getElementById('sheet-contents-container');
    if (!template || !container) return;

    const sheetIds = getAllSheetIds();
    sheetIds.forEach((sId, idx) => {
        const clone = template.content.firstElementChild?.cloneNode(true) as HTMLElement | null;
        if (!clone) return;

        clone.id = `sheet-content-${sId}`;
        clone.setAttribute('aria-label', SHEET_LABELS[sId] || sId);
        if (idx === 0) clone.classList.add('active');

        const setAttrId = (selector: string, newId: string) => {
            const el = clone.querySelector(selector);
            if (el) el.id = newId;
        };

        setAttrId('.js-old-total-count', `oldTotalCount__${sId}`);
        setAttrId('.js-old-list', `oldList__${sId}`);
        setAttrId('.js-answered-ids', `answeredIds__${sId}`);
        setAttrId('.js-tg-total-count-all', `tgTotalCountAll__${sId}`);
        setAttrId('.js-step3-columns', `step3Columns__${sId}`);
        setAttrId('.js-step3-left', `step3Left__${sId}`);
        setAttrId('.js-tg-total-count-left', `tgTotalCountLeft__${sId}`);
        setAttrId('.js-tg-total-count-right', `tgTotalCountRight__${sId}`);
        setAttrId('.js-new-telegram', `newTelegram__${sId}`);
        setAttrId('.js-step3-divider', `step3Divider__${sId}`);
        setAttrId('.js-step3-right', `step3Right__${sId}`);
        setAttrId('.js-tg-total-count-left', `tgTotalCountLeft__${sId}`);
        setAttrId('.js-tg-total-count-right', `tgTotalCountRight__${sId}`);
        setAttrId('.js-clear-yt-collected', `clearYTCollected__${sId}`);
        setAttrId('.js-yt-collected-list', `ytCollectedList__${sId}`);
        setAttrId('.js-process-btn', `processTelegramBtn__${sId}`);
        setAttrId('.js-clear-state-btn', `clearStateBtn__${sId}`);
        setAttrId('.js-stats-bar', `statsBar__${sId}`);
        setAttrId('.js-count-old', `countOld__${sId}`);
        setAttrId('.js-count-del', `countDel__${sId}`);
        setAttrId('.js-count-new-left', `countNewLeft__${sId}`);
        setAttrId('.js-count-new-yt', `countNewYT__${sId}`);
        setAttrId('.js-count-total', `countTotal__${sId}`);
        setAttrId('.js-copy-result-btn', `copyResultBtn__${sId}`);
        setAttrId('.js-final-result-div', `finalResultDiv__${sId}`);
        setAttrId('.js-deleted-log-details', `deletedLogDetails__${sId}`);
        setAttrId('.js-deleted-log-count', `deletedLogCount__${sId}`);
        setAttrId('.js-deleted-log', `deletedLog__${sId}`);
        setAttrId('.js-cleaned-log-details', `cleanedLogDetails__${sId}`);
        setAttrId('.js-cleaned-log-count', `cleanedLogCount__${sId}`);
        setAttrId('.js-cleaned-log', `cleanedLog__${sId}`);

        container.appendChild(clone);
    });
}

export function buildPopupKeysToLoad(sheetIds: string[]): string[] {
    const keysToLoad = [
        STORAGE_KEYS.DB,
        STORAGE_KEYS.OPTIONS,
        STORAGE_KEYS.PRAYERS,
        STORAGE_KEYS.POPUP_ACTIVE_TAB,
        STORAGE_KEYS.POPUP_ACTIVE_SUBTAB,
        STORAGE_KEYS.POPUP_TEXTAREA_SIZES,
        STORAGE_KEYS.POPUP_TRANSLIT_OLD,
        STORAGE_KEYS.POPUP_TRANSLIT_NEW,
        STORAGE_KEYS.POPUP_SCROLL_POSITIONS,
        'tg_active_tab',
        'tg_active_subtab',
        'tg_textarea_sizes',
        'tg_translit_old',
        'tg_translit_new',
        'tg_scroll_positions'
    ];

    sheetIds.forEach(sId => {
        keysToLoad.push(
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
            POPUP_SHEET_KEYS.cleanedLogDetailsOpen(sId), `tg_cleanedLogDetailsOpen__${sId}`,
            POPUP_SHEET_KEYS.dividerPos(sId), `syh:popup:divider_pos:${sId}`,
            getSheetCollectedStorageKey(sId), `syh:popup:collected:${sId}`
        );
    });

    return keysToLoad;
}