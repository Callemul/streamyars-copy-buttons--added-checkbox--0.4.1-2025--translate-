import { SYH_STORAGE, STORAGE_KEYS, POPUP_SHEET_KEYS } from '../modules/storage';
import { getAllSheetIds } from '../modules/sheets';
import { updateOldInputStats, updateNewInputStats, updateCombinedCounters, clearFinalResult, clearAllYTCollected, loadYTCollected } from './popup_telegram';
import { $, setTextContent, hideElement } from './popup_dom_utils';
import { CommentService } from '../modules/comment_service';
import { db, saveDataToStorage } from './popup_state_restorer';

const SHEET_IDS = getAllSheetIds();

export function setupPopupTabListeners(): void {
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

export function setupSheetInputListeners(): void {
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

export function setupTranslitListeners(): void {
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

export function setupTitleAndOptionsListeners(): void {
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

export function clearSheetState(sId: string): void {
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