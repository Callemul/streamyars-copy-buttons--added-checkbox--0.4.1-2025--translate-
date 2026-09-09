import type { StorageReadResult } from '../modules/storage';
import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage';
import { getAllSheetIds } from '../modules/sheets';

const SHEET_IDS = getAllSheetIds();

export function getTextareaIds(): string[] {
    const textareas: string[] = ['textArea1_oldText', 'textArea2_generatedRuText'];
    SHEET_IDS.forEach(sId => {
        textareas.push(`oldList__${sId}`, `newTelegram__${sId}`);
    });
    return textareas;
}

export function setupResizeObserver(isStorageLoaded: () => boolean): void {
    const textareas = getTextareaIds();

    const resizeObserver = new ResizeObserver(entries => {
        if (!isStorageLoaded()) return;
        SYH_STORAGE.get([STORAGE_KEYS.POPUP_TEXTAREA_SIZES], function (res: StorageReadResult) {
            const sizes = res[STORAGE_KEYS.POPUP_TEXTAREA_SIZES] || {};
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
                SYH_STORAGE.set({ [STORAGE_KEYS.POPUP_TEXTAREA_SIZES]: sizes });
            }
        });
    });
    textareas.forEach(id => {
        const el = document.getElementById(id);
        if (el && el instanceof HTMLElement) resizeObserver.observe(el);
    });
}