// popup/popup_sheet_state_restorer.ts
// Sheet-specific state restoration functions

import { STORAGE_KEYS, POPUP_SHEET_KEYS, getSheetCollectedStorageKey } from '../modules/storage';
import { $, setTextContent, setElementText } from './popup_dom_utils';
import { updateOldInputStats, updateNewInputStats, loadYTCollected, ensureStatsBarRows } from './popup_telegram';

interface LogRestoreConfig {
    visibleKey: (sId: string) => string;
    legacyVisibleKey: string;
    htmlKey: (sId: string) => string;
    legacyHtmlKey: string;
    countKey: (sId: string) => string;
    legacyCountKey: string;
    openKey: (sId: string) => string;
    legacyOpenKey: string;
    targetHtmlId: string;
    targetCountId: string;
    targetDetailsId: string;
    countResolver: (sId: string, html?: string, rawCount?: any) => number;
}

function resolveDeletedLogCount(sId: string, delHtml: string | undefined, rawCount: any): number {
    if (rawCount !== undefined && rawCount !== null) {
        return Number(rawCount);
    }
    if (!delHtml) return 0;
    const delLogEl = $(`deletedLog__${sId}`);
    return delLogEl?.querySelectorAll('.del-row').length || 0;
}

function restoreSheetLog(
    sId: string,
    result: Record<string, any>,
    config: LogRestoreConfig
): void {
    const isVisible = Boolean(result[config.visibleKey(sId)] ?? result[`${config.legacyVisibleKey}${sId}`]);
    if (isVisible) {
        const html = result[config.htmlKey(sId)] ?? result[`${config.legacyHtmlKey}${sId}`];
        if (html) setElementText(`${config.targetHtmlId}${sId}`, html);
        const rawCount = result[config.countKey(sId)] ?? result[`${config.legacyCountKey}${sId}`];
        const count = config.countResolver(sId, html, rawCount);
        const isOpen = Boolean(result[config.openKey(sId)] ?? result[`${config.legacyOpenKey}${sId}`]);

        if (count > 0) {
            setTextContent(`${config.targetCountId}${sId}`, `(${count})`);
        }
        const detailsEl = $(`${config.targetDetailsId}${sId}`) as HTMLDetailsElement | null;
        if (detailsEl) {
            if (isOpen) detailsEl.setAttribute('open', 'open');
            else detailsEl.removeAttribute('open');
            detailsEl.style.display = '';
        }
    } else {
        setTextContent(`${config.targetCountId}${sId}`, '');
    }
}

function resolveCleanedLogCount(sId: string, cleanHtml: string | undefined, rawCount: any): number {
    if (rawCount !== undefined && rawCount !== null) {
        return Number(rawCount);
    }
    if (!cleanHtml) return 0;
    const cleanLogEl = $(`cleanedLog__${sId}`);
    const rows = cleanLogEl?.querySelectorAll('.clean-table tr').length;
    return rows ? Math.max(0, rows - 1) : 0;
}

function restoreSheetDeletedLog(sId: string, result: Record<string, any>): void {
    restoreSheetLog(sId, result, {
        visibleKey: POPUP_SHEET_KEYS.deletedLogDetailsVisible,
        legacyVisibleKey: 'tg_deletedLogDetailsVisible__',
        htmlKey: POPUP_SHEET_KEYS.deletedLogHtml,
        legacyHtmlKey: 'tg_deletedLogHtml__',
        countKey: POPUP_SHEET_KEYS.deletedLogCount,
        legacyCountKey: 'tg_deletedLogCount__',
        openKey: POPUP_SHEET_KEYS.deletedLogDetailsOpen,
        legacyOpenKey: 'tg_deletedLogDetailsOpen__',
        targetHtmlId: 'deletedLog__',
        targetCountId: 'deletedLogCount__',
        targetDetailsId: 'deletedLogDetails__',
        countResolver: resolveDeletedLogCount
    });
}

function restoreSheetCleanedLog(sId: string, result: Record<string, any>): void {
    restoreSheetLog(sId, result, {
        visibleKey: POPUP_SHEET_KEYS.cleanedLogDetailsVisible,
        legacyVisibleKey: 'tg_cleanedLogDetailsVisible__',
        htmlKey: POPUP_SHEET_KEYS.cleanedLogHtml,
        legacyHtmlKey: 'tg_cleanedLogHtml__',
        countKey: POPUP_SHEET_KEYS.cleanedLogCount,
        legacyCountKey: 'tg_cleanedLogCount__',
        openKey: POPUP_SHEET_KEYS.cleanedLogDetailsOpen,
        legacyOpenKey: 'tg_cleanedLogDetailsOpen__',
        targetHtmlId: 'cleanedLog__',
        targetCountId: 'cleanedLogCount__',
        targetDetailsId: 'cleanedLogDetails__',
        countResolver: resolveCleanedLogCount
    });
}

function restoreSheetDividerPos(sId: string, result: Record<string, any>): void {
    const divPos = result[POPUP_SHEET_KEYS.dividerPos(sId)] ?? result[`syh:popup:divider_pos:${sId}`];
    if (divPos) {
        const leftEl = $(`step3Left__${sId}`);
        const rightEl = $(`step3Right__${sId}`);
        if (leftEl && leftEl instanceof HTMLElement) leftEl.style.flex = `${divPos}%`;
        if (rightEl && rightEl instanceof HTMLElement) rightEl.style.flex = `${100 - divPos}%`;
    }
}

function restoreSheetOldList(sId: string, result: Record<string, any>): void {
    const oldListEl = $(`oldList__${sId}`) as HTMLTextAreaElement | null;
    const oldListVal = result[POPUP_SHEET_KEYS.oldList(sId)] ?? result[`tg_oldList__${sId}`];
    if (oldListVal && oldListEl) {
        oldListEl.value = oldListVal;
        updateOldInputStats(sId);
    }
}

function restoreSheetAnswered(sId: string, result: Record<string, any>): void {
    const answeredEl = $(`answeredIds__${sId}`) as HTMLInputElement | null;
    const answeredVal = result[POPUP_SHEET_KEYS.answered(sId)] ?? result[`tg_answered__${sId}`];
    if (answeredVal && answeredEl) {
        answeredEl.value = answeredVal;
    }
}

function restoreSheetNewTelegram(sId: string, result: Record<string, any>): void {
    const newTgEl = $(`newTelegram__${sId}`) as HTMLTextAreaElement | null;
    const newTgVal = result[POPUP_SHEET_KEYS.newTelegram(sId)] ?? result[`tg_newTelegram__${sId}`];
    if (newTgVal && newTgEl) {
        newTgEl.value = newTgVal;
        updateNewInputStats(sId);
    }
}

function restoreSheetFinalHtml(sId: string, result: Record<string, any>): void {
    const finalHtml = result[POPUP_SHEET_KEYS.finalResultHtml(sId)] ?? result[`tg_finalResultHtml__${sId}`];
    if (finalHtml) {
        setElementText(`finalResultDiv__${sId}`, finalHtml);
    }
}

function restoreSheetStats(sId: string, result: Record<string, any>): void {
    const statsVisible = result[POPUP_SHEET_KEYS.statsVisible(sId)] ?? result[`tg_statsVisible__${sId}`];
    if (statsVisible) {
        const statsHtml = result[POPUP_SHEET_KEYS.statsHtml(sId)] ?? result[`tg_statsHtml__${sId}`];
        if (statsHtml) setElementText(`statsBar__${sId}`, statsHtml);
        ensureStatsBarRows(sId);
        const statsBar = $(`statsBar__${sId}`);
        if (statsBar && statsBar instanceof HTMLElement) statsBar.style.display = '';
    }
}

export function restoreSingleSheetState(sId: string, result: Record<string, any>): void {
    restoreSheetOldList(sId, result);
    restoreSheetAnswered(sId, result);
    restoreSheetNewTelegram(sId, result);
    restoreSheetFinalHtml(sId, result);
    restoreSheetStats(sId, result);
    restoreSheetDeletedLog(sId, result);
    restoreSheetCleanedLog(sId, result);
    restoreSheetDividerPos(sId, result);
    loadYTCollected(sId);
}