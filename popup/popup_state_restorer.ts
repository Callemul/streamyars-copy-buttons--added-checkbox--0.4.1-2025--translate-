import { SYH_STORAGE, STORAGE_KEYS, POPUP_SHEET_KEYS, getSheetCollectedStorageKey } from '../modules/storage';
import { getAllSheetIds, SHEET_LABELS } from '../modules/sheets';
import { updateOldInputStats, updateNewInputStats, loadYTCollected, ensureStatsBarRows } from './popup_telegram';
import { $, setTextContent, setElementText } from './popup_dom_utils';

const SHEET_IDS = getAllSheetIds();

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

export function restoreDbState(result: Record<string, any>): void {
    if (result[STORAGE_KEYS.DB]) {
        Object.assign(db, result[STORAGE_KEYS.DB]);
        const sschoolName = $(`sschoolName`) as HTMLInputElement | null;
        if (db.newTitleSS && sschoolName) sschoolName.value = db.newTitleSS as string;
        const preachName = $(`preachNameInput`) as HTMLInputElement | null;
        if (db.newTitlePreach && preachName) preachName.value = db.newTitlePreach as string;
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

function resolveDeletedLogCount(sId: string, delHtml: string | undefined, rawCount: any): number {
    if (rawCount !== undefined && rawCount !== null) {
        return Number(rawCount);
    }
    if (!delHtml) return 0;
    const delLogEl = $(`deletedLog__${sId}`);
    return delLogEl?.querySelectorAll('.del-row').length || 0;
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

function resolveCleanedLogCount(sId: string, cleanHtml: string | undefined, rawCount: any): number {
    if (rawCount !== undefined && rawCount !== null) {
        return Number(rawCount);
    }
    if (!cleanHtml) return 0;
    const cleanLogEl = $(`cleanedLog__${sId}`);
    const rows = cleanLogEl?.querySelectorAll('.clean-table tr').length;
    return rows ? Math.max(0, rows - 1) : 0;
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

export function restoreActiveTabUI(result: Record<string, any>): void {
    const activeTabVal = result[STORAGE_KEYS.POPUP_ACTIVE_TAB] ?? result.tg_active_tab;
    if (activeTabVal) {
        document.querySelectorAll('.tab-link').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeTabLink = document.querySelector<HTMLButtonElement>(`.tab-link[data-tab="${activeTabVal}"]`);
        if (activeTabLink) {
            activeTabLink.classList.add('active');
            activeTabLink.setAttribute('aria-selected', 'true');
        }
        const activeTabContent = document.getElementById(activeTabVal);
        if (activeTabContent) activeTabContent.classList.add('active');
    }
}

export function restoreActiveSubtabUI(result: Record<string, any>): void {
    const activeSubtabVal = result[STORAGE_KEYS.POPUP_ACTIVE_SUBTAB] ?? result.tg_active_subtab;
    if (activeSubtabVal && SHEET_IDS.includes(activeSubtabVal)) {
        document.querySelectorAll('.subtab-button').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.sheet-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeSubtab = document.querySelector<HTMLButtonElement>(`.subtab-button[data-sheet="${activeSubtabVal}"]`);
        if (activeSubtab) {
            activeSubtab.classList.add('active');
            activeSubtab.setAttribute('aria-selected', 'true');
        }
        const activeSheet = document.getElementById(`sheet-content-${activeSubtabVal}`);
        if (activeSheet) activeSheet.classList.add('active');
    }
}

export function restoreTextareaSizesUI(result: Record<string, any>): void {
    const textareaSizes = result[STORAGE_KEYS.POPUP_TEXTAREA_SIZES] ?? result.tg_textarea_sizes;
    if (textareaSizes) {
        for (const id in textareaSizes) {
            const el = document.getElementById(id);
            if (el && el instanceof HTMLElement) {
                if (textareaSizes[id].width) el.style.width = textareaSizes[id].width;
                if (textareaSizes[id].height) el.style.height = textareaSizes[id].height;
            }
        }
    }
}

export function restoreTranslitStateUI(result: Record<string, any>): void {
    const translitOldVal = result[STORAGE_KEYS.POPUP_TRANSLIT_OLD] ?? result.tg_translit_old;
    if (translitOldVal) {
        const el = $(`textArea1_oldText`) as HTMLTextAreaElement | null;
        if (el) el.value = translitOldVal;
    }

    const translitNewVal = result[STORAGE_KEYS.POPUP_TRANSLIT_NEW] ?? result.tg_translit_new;
    if (translitNewVal) {
        const el = $(`textArea2_generatedRuText`) as HTMLTextAreaElement | null;
        if (el) el.value = translitNewVal;
    }
}

export function restoreScrollPositionsUI(result: Record<string, any>): void {
    const scrollPositions = result[STORAGE_KEYS.POPUP_SCROLL_POSITIONS] ?? result.tg_scroll_positions;
    if (scrollPositions) {
        const scrolls = scrollPositions;
        setTimeout(() => {
            if (scrolls.window !== undefined) window.scrollTo(0, scrolls.window);
            const prayersResultDiv = $(`prayersResultDiv`) as HTMLElement | null;
            if (prayersResultDiv) prayersResultDiv.scrollTop = scrolls.prayersResultDiv || 0;
            const ta1 = $(`textArea1_oldText`) as HTMLTextAreaElement | null;
            if (ta1) ta1.scrollTop = scrolls.textArea1_oldText || 0;
            const ta2 = $(`textArea2_generatedRuText`) as HTMLTextAreaElement | null;
            if (ta2) ta2.scrollTop = scrolls.textArea2_generatedRuText || 0;

            SHEET_IDS.forEach(sId => {
                const fr = $(`finalResultDiv__${sId}`) as HTMLElement | null;
                if (fr) fr.scrollTop = scrolls[`finalResultDiv__${sId}`] || 0;
                const dl = $(`deletedLog__${sId}`) as HTMLElement | null;
                if (dl) dl.scrollTop = scrolls[`deletedLog__${sId}`] || 0;
                const ol = $(`oldList__${sId}`) as HTMLElement | null;
                if (ol) ol.scrollTop = scrolls[`oldList__${sId}`] || 0;
                const nt = $(`newTelegram__${sId}`) as HTMLElement | null;
                if (nt) nt.scrollTop = scrolls[`newTelegram__${sId}`] || 0;
            });
        }, 100);
    }
}

export const db: Record<string, unknown> = {};

export function saveDataToStorage(): void {
    SYH_STORAGE.set({ [STORAGE_KEYS.DB]: db });
}

export async function loadData(key: string): Promise<unknown> {
    const res = await SYH_STORAGE.getAsync<Record<string, unknown>>([key]);
    return res[key];
}

export async function saveData(key: string, value: unknown): Promise<void> {
    await SYH_STORAGE.setAsync({ [key]: value });
}