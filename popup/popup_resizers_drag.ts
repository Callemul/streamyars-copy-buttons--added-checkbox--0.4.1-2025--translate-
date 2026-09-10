import { SYH_STORAGE, POPUP_SHEET_KEYS } from '../modules/storage/storage';
import { getAllSheetIds } from '../modules/registry/sheets';
import { $ } from './popup_dom_utils';

const SHEET_IDS = getAllSheetIds();

let activeResizer: { sId: string, divider: HTMLElement, left: HTMLElement, right: HTMLElement } | null = null;

export function calculateDragPercent(e: MouseEvent, divider: HTMLElement): number {
    const container = divider.parentElement;
    if (!container) return 50;
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    if (containerWidth <= 0) return 50;

    const leftWidth = e.clientX - containerRect.left;
    let percent = (leftWidth / containerWidth) * 100;
    if (percent < 15) percent = 15;
    if (percent > 85) percent = 85;
    return percent;
}

export function applyDragPercent(left: HTMLElement, right: HTMLElement, percent: number): void {
    left.style.flex = `${percent}%`;
    right.style.flex = `${100 - percent}%`;
}

export function saveDividerPosition(sId: string, left: HTMLElement, right: HTMLElement): void {
    const flexLeft = parseFloat(left.style.flexBasis) || 1;
    const flexRight = parseFloat(right.style.flexBasis) || 1;
    const total = flexLeft + flexRight;
    const posPercent = (flexLeft / total) * 100;

    SYH_STORAGE.set({
        [POPUP_SHEET_KEYS.dividerPos(sId)]: posPercent,
        [`syh:popup:divider_pos:${sId}`]: posPercent
    });
}

export function setupStep3ResizerEvents(): void {
    document.addEventListener('mousemove', function (e) {
        if (!activeResizer) return;
        const { divider, left, right } = activeResizer;
        const percent = calculateDragPercent(e, divider);
        applyDragPercent(left, right, percent);
    });

    document.addEventListener('mouseup', function () {
        if (activeResizer) {
            const { sId, divider, left, right } = activeResizer;
            divider.classList.remove('is-dragging');
            document.body.style.userSelect = '';
            saveDividerPosition(sId, left, right);
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

export function getActiveResizer() {
    return activeResizer;
}

export function setActiveResizer(resizer: typeof activeResizer): void {
    activeResizer = resizer;
}