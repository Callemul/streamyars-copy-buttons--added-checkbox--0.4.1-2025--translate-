import { SYH_STORAGE } from '../modules/storage';
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