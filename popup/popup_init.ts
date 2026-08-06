import { SYH_STORAGE, STORAGE_KEYS, POPUP_SHEET_KEYS, getSheetCollectedStorageKey } from '../modules/storage';
import { getAllSheetIds, SHEET_LABELS } from '../modules/sheets';
import { updateOldInputStats, updateNewInputStats, updateCombinedCounters, clearFinalResult, loadYTCollected, ensureStatsBarRows, clearAllYTCollected, initPopupTelegramListeners } from './popup_telegram';
import { renderPrayers, initPopupPrayersListeners } from './popup_prayers';
import { CommentService } from '../modules/comment_service';

export const db: Record<string, unknown> = {};

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

const SHEET_IDS = getAllSheetIds();

function $(id: string): HTMLElement | null {
    return document.getElementById(id);
}

function setTextContent(id: string, text: string): void {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setElementText(id: string, html: string): void {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

function hideElement(id: string): void {
    const el = document.getElementById(id);
    if (el && el instanceof HTMLElement) el.style.display = 'none';
}

function buildPopupKeysToLoad(sheetIds: string[]): string[] {
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

function restoreDbState(result: Record<string, any>): void {
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

function restoreSheetDeletedLog(sId: string, result: Record<string, any>): void {
    const delLogVisible = result[POPUP_SHEET_KEYS.deletedLogDetailsVisible(sId)] ?? result[`tg_deletedLogDetailsVisible__${sId}`];
    if (delLogVisible) {
        const delHtml = result[POPUP_SHEET_KEYS.deletedLogHtml(sId)] ?? result[`tg_deletedLogHtml__${sId}`];
        if (delHtml) setElementText(`deletedLog__${sId}`, delHtml);
        let delCount = result[POPUP_SHEET_KEYS.deletedLogCount(sId)] ?? result[`tg_deletedLogCount__${sId}`];
        if (delCount === undefined && delHtml) {
            const delLogEl = $(`deletedLog__${sId}`);
            delCount = delLogEl?.querySelectorAll('.del-row').length;
        }
        if (delCount) setTextContent(`deletedLogCount__${sId}`, `(${delCount})`);
        const delDetailsEl = $(`deletedLogDetails__${sId}`) as HTMLDetailsElement | null;
        if (delDetailsEl && (result[POPUP_SHEET_KEYS.deletedLogDetailsOpen(sId)] ?? result[`tg_deletedLogDetailsOpen__${sId}`])) {
            delDetailsEl.setAttribute('open', 'open');
        } else if (delDetailsEl) {
            delDetailsEl.removeAttribute('open');
        }
        const delDetails = $(`deletedLogDetails__${sId}`);
        if (delDetails && delDetails instanceof HTMLElement) delDetails.style.display = '';
    } else {
        setTextContent(`deletedLogCount__${sId}`, '');
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

function applyCleanedLogState(sId: string, isVisible: boolean, count: number, isOpen: boolean): void {
    if (isVisible) {
        if (count > 0) {
            setTextContent(`cleanedLogCount__${sId}`, `(${count})`);
        }
        const cleanDetailsEl = $(`cleanedLogDetails__${sId}`) as HTMLDetailsElement | null;
        if (cleanDetailsEl) {
            if (isOpen) {
                cleanDetailsEl.setAttribute('open', 'open');
            } else {
                cleanDetailsEl.removeAttribute('open');
            }
            cleanDetailsEl.style.display = '';
        }
    } else {
        setTextContent(`cleanedLogCount__${sId}`, '');
    }
}

function restoreSheetCleanedLog(sId: string, result: Record<string, any>): void {
    const cleanLogVisible = result[POPUP_SHEET_KEYS.cleanedLogDetailsVisible(sId)] ?? result[`tg_cleanedLogDetailsVisible__${sId}`];
    if (cleanLogVisible) {
        const cleanHtml = result[POPUP_SHEET_KEYS.cleanedLogHtml(sId)] ?? result[`tg_cleanedLogHtml__${sId}`];
        if (cleanHtml) setElementText(`cleanedLog__${sId}`, cleanHtml);
        const rawCount = result[POPUP_SHEET_KEYS.cleanedLogCount(sId)] ?? result[`tg_cleanedLogCount__${sId}`];
        const cleanCount = resolveCleanedLogCount(sId, cleanHtml, rawCount);
        const isOpen = Boolean(result[POPUP_SHEET_KEYS.cleanedLogDetailsOpen(sId)] ?? result[`tg_cleanedLogDetailsOpen__${sId}`]);
        applyCleanedLogState(sId, true, cleanCount, isOpen);
    } else {
        applyCleanedLogState(sId, false, 0, false);
    }
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

function restoreSingleSheetState(sId: string, result: Record<string, any>): void {
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

function restoreActiveTabUI(result: Record<string, any>): void {
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

function restoreActiveSubtabUI(result: Record<string, any>): void {
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

function restoreTextareaSizesUI(result: Record<string, any>): void {
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

function restoreTranslitStateUI(result: Record<string, any>): void {
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

function restoreScrollPositionsUI(result: Record<string, any>): void {
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

function setupPopupTabListeners(): void {
    document.querySelectorAll('.tab-link').forEach(btn => {
        btn.addEventListener('click', function () {
            const tabId = this.getAttribute('data-tab');
            if (!tabId) return;
            document.querySelectorAll('.tab-link').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            this.classList.add('active');
            this.setAttribute('aria-selected', 'true');
            const tabContent = document.getElementById(tabId);
            if (tabContent) tabContent.classList.add('active');
            SYH_STORAGE.set({
                [STORAGE_KEYS.POPUP_ACTIVE_TAB]: tabId,
                'tg_active_tab': tabId
            });
        });
    });

    document.querySelectorAll('.subtab-button').forEach(btn => {
        btn.addEventListener('click', function () {
            const sheetId = this.getAttribute('data-sheet');
            if (!sheetId) return;
            document.querySelectorAll('.subtab-button').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            document.querySelectorAll('.sheet-content').forEach(content => content.classList.remove('active'));
            this.classList.add('active');
            this.setAttribute('aria-selected', 'true');
            const sheetContent = document.getElementById(`sheet-content-${sheetId}`);
            if (sheetContent) sheetContent.classList.add('active');
            SYH_STORAGE.set({
                [STORAGE_KEYS.POPUP_ACTIVE_SUBTAB]: sheetId,
                'tg_active_subtab': sheetId
            });
        });
    });
}

function clearSheetState(sId: string): void {
    if (confirm("Очистити всі поля введення та зібрані коментарі з YouTube у цьому аркуші?")) {
        [`oldList__${sId}`, `answeredIds__${sId}`, `newTelegram__${sId}`].forEach(id => {
            const el = $(id) as HTMLTextAreaElement | HTMLInputElement | null;
            if (el) el.value = '';
        });
        const frEl = $(`finalResultDiv__${sId}`);
        if (frEl) frEl.innerHTML = '';
        hideElement(`statsBar__${sId}`);
        const dlEl = $(`deletedLog__${sId}`);
        if (dlEl) dlEl.innerHTML = '';
        setTextContent(`deletedLogCount__${sId}`, '');
        const dldEl = $(`deletedLogDetails__${sId}`);
        if (dldEl && dldEl instanceof HTMLElement) dldEl.style.display = 'none';
        const clEl = $(`cleanedLog__${sId}`);
        if (clEl) clEl.innerHTML = '';
        setTextContent(`cleanedLogCount__${sId}`, '');
        const cldEl = $(`cleanedLogDetails__${sId}`);
        if (cldEl && cldEl instanceof HTMLElement) cldEl.style.display = 'none';
        setTextContent(`oldTotalCount__${sId}`, '');
        setTextContent(`tgTotalCountAll__${sId}`, '');
        SYH_STORAGE.remove([
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
        ]);
        CommentService.clearAllCollectedForSheet(sId).then(() => {
            loadYTCollected(sId);
            updateCombinedCounters(sId);
        });
    }
}

function setupSheetInputListeners(): void {
    const oldListTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const newTelegramTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const answeredIdsTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const finalResultTimers = new Map<string, ReturnType<typeof setTimeout>>();

    SHEET_IDS.forEach(sId => {
        const oldListEl = $(`oldList__${sId}`) as HTMLTextAreaElement | null;
        if (oldListEl) {
            oldListEl.addEventListener('input', function () {
                const val = this.value;
                const existing = oldListTimers.get(sId);
                if (existing) clearTimeout(existing);
                oldListTimers.set(sId, setTimeout(() => {
                    SYH_STORAGE.set({
                        [POPUP_SHEET_KEYS.oldList(sId)]: val,
                        [`tg_oldList__${sId}`]: val
                    });
                    updateOldInputStats(sId);
                }, 300));
            });
        }

        const newTgEl = $(`newTelegram__${sId}`) as HTMLTextAreaElement | null;
        if (newTgEl) {
            newTgEl.addEventListener('input', function () {
                const val = this.value;
                const existing = newTelegramTimers.get(sId);
                if (existing) clearTimeout(existing);
                newTelegramTimers.set(sId, setTimeout(() => {
                    SYH_STORAGE.set({
                        [POPUP_SHEET_KEYS.newTelegram(sId)]: val,
                        [`tg_newTelegram__${sId}`]: val
                    });
                    updateNewInputStats(sId);
                    clearFinalResult(sId);
                }, 300));
            });
        }

        const answeredEl = $(`answeredIds__${sId}`) as HTMLInputElement | null;
        if (answeredEl) {
            answeredEl.addEventListener('input', function () {
                const val = this.value;
                const existing = answeredIdsTimers.get(sId);
                if (existing) clearTimeout(existing);
                answeredIdsTimers.set(sId, setTimeout(() => {
                    SYH_STORAGE.set({
                        [POPUP_SHEET_KEYS.answered(sId)]: val,
                        [`tg_answered__${sId}`]: val
                    });
                    updateCombinedCounters(sId);
                    clearFinalResult(sId);
                }, 300));
            });
        }

        const finalResultEl = $(`finalResultDiv__${sId}`);
        if (finalResultEl && finalResultEl instanceof HTMLElement) {
            const handler = function () {
                const html = this.innerHTML;
                const existing = finalResultTimers.get(sId);
                if (existing) clearTimeout(existing);
                finalResultTimers.set(sId, setTimeout(() => {
                    SYH_STORAGE.set({
                        [POPUP_SHEET_KEYS.finalResultHtml(sId)]: html,
                        [`tg_finalResultHtml__${sId}`]: html
                    });
                }, 300));
            };
            finalResultEl.addEventListener('input', handler);
            finalResultEl.addEventListener('blur', handler);
        }

        const delDetailsEl = $(`deletedLogDetails__${sId}`) as HTMLDetailsElement | null;
        if (delDetailsEl) {
            delDetailsEl.addEventListener('toggle', function () {
                const isOpen = this.open;
                SYH_STORAGE.set({
                    [POPUP_SHEET_KEYS.deletedLogDetailsOpen(sId)]: isOpen,
                    [`tg_deletedLogDetailsOpen__${sId}`]: isOpen
                });
            });
        }

        const cleanDetailsEl = $(`cleanedLogDetails__${sId}`) as HTMLDetailsElement | null;
        if (cleanDetailsEl) {
            cleanDetailsEl.addEventListener('toggle', function () {
                const isOpen = this.open;
                SYH_STORAGE.set({
                    [POPUP_SHEET_KEYS.cleanedLogDetailsOpen(sId)]: isOpen,
                    [`tg_cleanedLogDetailsOpen__${sId}`]: isOpen
                });
            });
        }

        const clearStateBtn = $(`clearStateBtn__${sId}`);
        if (clearStateBtn) {
            clearStateBtn.addEventListener('click', function () {
                clearSheetState(sId);
            });
        }

        const clearYTBtn = $(`clearYTCollected__${sId}`);
        if (clearYTBtn) {
            clearYTBtn.addEventListener('click', function () {
                clearAllYTCollected(sId);
            });
        }
    });
}

function setupTranslitListeners(): void {
    let translitOldTimer: ReturnType<typeof setTimeout> | null = null;
    let translitNewTimer: ReturnType<typeof setTimeout> | null = null;

    const ta1 = $(`textArea1_oldText`) as HTMLTextAreaElement | null;
    if (ta1) {
        ta1.addEventListener('input', function () {
            const val = this.value;
            if (translitOldTimer) clearTimeout(translitOldTimer);
            translitOldTimer = setTimeout(() => {
                SYH_STORAGE.set({ 'tg_translit_old': val });
            }, 300);
        });
    }

    const ta2 = $(`textArea2_generatedRuText`) as HTMLTextAreaElement | null;
    if (ta2) {
        ta2.addEventListener('input', function () {
            const val = this.value;
            if (translitNewTimer) clearTimeout(translitNewTimer);
            translitNewTimer = setTimeout(() => {
                SYH_STORAGE.set({ 'tg_translit_new': val });
            }, 300);
        });
    }
}

function setupTitleAndOptionsListeners(): void {
    const sschoolNameBtn = $(`sschoolNameBtn`);
    if (sschoolNameBtn) {
        sschoolNameBtn.addEventListener('click', function () {
            const input = $(`sschoolName`) as HTMLInputElement | null;
            db.newTitleSS = input ? input.value : '';
            saveDataToStorage();
            alert("Збережено!");
        });
    }

    const preachNameBtn = $(`preachNameBtn`);
    if (preachNameBtn) {
        preachNameBtn.addEventListener('click', function () {
            const input = $(`preachNameInput`) as HTMLInputElement | null;
            db.newTitlePreach = input ? input.value : '';
            saveDataToStorage();
            alert("Збережено!");
        });
    }

    const openOptionsBtn = $(`openOptionsPageBtn`);
    if (openOptionsBtn) {
        openOptionsBtn.addEventListener('click', function () {
            if (chrome.runtime && chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
            } else {
                window.open(chrome.runtime.getURL('options/options.html'));
            }
        });
    }
}

function setupResizeObserver(isStorageLoaded: () => boolean): void {
    const textareas: string[] = ['textArea1_oldText', 'textArea2_generatedRuText'];
    SHEET_IDS.forEach(sId => {
        textareas.push(`oldList__${sId}`, `newTelegram__${sId}`);
    });

    const resizeObserver = new ResizeObserver(entries => {
        if (!isStorageLoaded()) return;
        SYH_STORAGE.get(['tg_textarea_sizes'], function (res: Record<string, any>) {
            const sizes = res.tg_textarea_sizes || {};
            let updated = false;
            for (const entry of entries) {
                const id = entry.target.id;
                const width = (entry.target as HTMLElement).style.width;
                const height = (entry.target as HTMLElement).style.height;
                if (width || height) {
                    sizes[id] = { width, height };
                    updated = true;
                }
            }
            if (updated) {
                SYH_STORAGE.set({ 'tg_textarea_sizes': sizes });
            }
        });
    });
    textareas.forEach(id => {
        const el = document.getElementById(id);
        if (el && el instanceof HTMLElement) resizeObserver.observe(el);
    });
}

function setupScrollListeners(): void {
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    function saveScrollPosition() {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const scrolls: Record<string, any> = {
                window: window.scrollY || document.documentElement.scrollTop,
                prayersResultDiv: ($(`prayersResultDiv`) as HTMLElement | null)?.scrollTop || 0,
                textArea1_oldText: ($(`textArea1_oldText`) as HTMLElement | null)?.scrollTop || 0,
                textArea2_generatedRuText: ($(`textArea2_generatedRuText`) as HTMLElement | null)?.scrollTop || 0
            };
            SHEET_IDS.forEach(sId => {
                scrolls[`finalResultDiv__${sId}`] = ($(`finalResultDiv__${sId}`) as HTMLElement | null)?.scrollTop || 0;
                scrolls[`deletedLog__${sId}`] = ($(`deletedLog__${sId}`) as HTMLElement | null)?.scrollTop || 0;
                scrolls[`oldList__${sId}`] = ($(`oldList__${sId}`) as HTMLElement | null)?.scrollTop || 0;
                scrolls[`newTelegram__${sId}`] = ($(`newTelegram__${sId}`) as HTMLElement | null)?.scrollTop || 0;
            });
            SYH_STORAGE.set({
                [STORAGE_KEYS.POPUP_SCROLL_POSITIONS]: scrolls,
                'tg_scroll_positions': scrolls
            });
        }, 150);
    }
    window.addEventListener('scroll', saveScrollPosition);
    const scrollTargets: HTMLElement[] = [];
    ['prayersResultDiv', 'textArea1_oldText', 'textArea2_generatedRuText'].forEach(id => {
        const el = $(id);
        if (el && el instanceof HTMLElement) scrollTargets.push(el);
    });
    SHEET_IDS.forEach(sId => {
        ['finalResultDiv__' + sId, 'deletedLog__' + sId, 'oldList__' + sId, 'newTelegram__' + sId].forEach(id => {
            const el = $(id);
            if (el && el instanceof HTMLElement) scrollTargets.push(el);
        });
    });
    scrollTargets.forEach(el => el.addEventListener('scroll', saveScrollPosition));
}

let activeResizer: { sId: string, divider: HTMLElement, left: HTMLElement, right: HTMLElement } | null = null;

function setupStep3ResizerEvents(): void {
    document.addEventListener('mousemove', function (e) {
        if (!activeResizer) return;
        const { divider, left, right } = activeResizer;
        const container = divider.parentElement;
        if (!container) return;
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        if (containerWidth <= 0) return;

        const leftWidth = e.clientX - containerRect.left;
        let percent = (leftWidth / containerWidth) * 100;
        if (percent < 15) percent = 15;
        if (percent > 85) percent = 85;

        left.style.flex = `${percent}%`;
        right.style.flex = `${100 - percent}%`;
    });

    document.addEventListener('mouseup', function () {
        if (activeResizer) {
            const { sId, divider, left, right } = activeResizer;
            divider.classList.remove('is-dragging');
            document.body.style.userSelect = '';

            const flexLeft = parseFloat(left.style.flex) || 1;
            const flexRight = parseFloat(right.style.flex) || 1;
            const total = flexLeft + flexRight;
            const posPercent = (flexLeft / total) * 100;

            SYH_STORAGE.set({
                [POPUP_SHEET_KEYS.dividerPos(sId)]: posPercent,
                [`syh:popup:divider_pos:${sId}`]: posPercent
            });
            activeResizer = null;
        }
    });
}

function initStep3Resizers(): void {
    SHEET_IDS.forEach(sId => {
        const divider = $(`step3Divider__${sId}`);
        const container = $(`step3Columns__${sId}`);
        const left = $(`step3Left__${sId}`);
        const right = $(`step3Right__${sId}`);

        if (!divider || !container || !left || !right) return;

        divider.addEventListener('mousedown', function (e) {
            e.preventDefault();
            activeResizer = {
                sId,
                divider: divider as HTMLElement,
                left: left as HTMLElement,
                right: right as HTMLElement
            };
            divider.classList.add('is-dragging');
            document.body.style.userSelect = 'none';
        });
    });
}

function initPopup() {
    renderSheetTemplates();
    initPopupTelegramListeners();
    initPopupPrayersListeners();

    const keysToLoad = buildPopupKeysToLoad(SHEET_IDS);
    let storageLoaded = false;

    SYH_STORAGE.get(keysToLoad, function (result: Record<string, any>) {
        restoreDbState(result);
        SHEET_IDS.forEach(sId => restoreSingleSheetState(sId, result));
        restoreActiveTabUI(result);
        restoreActiveSubtabUI(result);
        restoreTextareaSizesUI(result);
        restoreTranslitStateUI(result);
        renderPrayers(result[STORAGE_KEYS.PRAYERS] || []);
        restoreScrollPositionsUI(result);

        storageLoaded = true;
        setTimeout(() => setupResizeObserver(() => storageLoaded), 300);
        initStep3Resizers();
    });

    setupPopupTabListeners();
    setupSheetInputListeners();
    setupTranslitListeners();
    setupTitleAndOptionsListeners();
    setupScrollListeners();
    setupStep3ResizerEvents();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPopup);
} else {
    initPopup();
}
