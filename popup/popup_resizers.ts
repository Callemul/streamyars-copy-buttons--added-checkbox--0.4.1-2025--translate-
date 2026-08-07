import { SYH_STORAGE, POPUP_SHEET_KEYS } from '../modules/storage';
import { getAllSheetIds } from '../modules/sheets';
import { $ } from './popup_dom_utils';

const SHEET_IDS = getAllSheetIds();

let activeResizer: { sId: string, divider: HTMLElement, left: HTMLElement, right: HTMLElement } | null = null;

export function setupStep3ResizerEvents(): void {
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

export function initStep3Resizers(): void {
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

export function setupResizeObserver(isStorageLoaded: () => boolean): void {
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