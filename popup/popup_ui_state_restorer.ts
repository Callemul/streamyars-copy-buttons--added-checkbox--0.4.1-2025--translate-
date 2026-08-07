// popup/popup_ui_state_restorer.ts
// UI state restoration (tabs, subtabs, textarea sizes, translit, scroll)

import { STORAGE_KEYS } from '../modules/storage';
import { getAllSheetIds } from '../modules/sheets';
import { $ } from './popup_dom_utils';

const SHEET_IDS = getAllSheetIds();

export function restoreDbState(result: Record<string, any>): void {
    if (result[STORAGE_KEYS.DB]) {
        Object.assign(db, result[STORAGE_KEYS.DB]);
        const sschoolName = $(`sschoolName`) as HTMLInputElement | null;
        if (db.newTitleSS && sschoolName) sschoolName.value = db.newTitleSS as string;
        const preachName = $(`preachNameInput`) as HTMLInputElement | null;
        if (db.newTitlePreach && preachName) preachName.value = db.newTitlePreach as string;
    }
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