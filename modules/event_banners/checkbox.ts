import type { SyhUi } from './types';
import type { SelectorValue } from '../config';
import { CommentService } from '../comment_service';
import { resolveBannerContext } from './helpers';

export function handleSingleBannerCheckboxChange(
    checkbox: HTMLInputElement,
    selectors: Record<string, SelectorValue> | null,
    ui: SyhUi | null
): void {
    const { bannerText: textKey } = resolveBannerContext(checkbox, selectors);
    CommentService.setStreamYardCheckboxState(textKey, checkbox.checked);
    if (ui) ui.updateMasterCheckboxState();
}

export function handleMasterCheckboxChange(
    masterCheckbox: HTMLInputElement,
    selectors: Record<string, SelectorValue> | null
): void {
    const isChecked = masterCheckbox.checked;
    masterCheckbox.indeterminate = false;
    const bannerBlocks = document.querySelectorAll((selectors?.bannerBlock as string) || '');
    bannerBlocks.forEach(block => {
        const cb = block.querySelector('.syh-checkbox[data-type="banner"]') as HTMLInputElement | null;
        if (cb) {
            cb.checked = isChecked;
            cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
}

export function handleBannerChange(
    e: Event,
    selectors: Record<string, SelectorValue> | null,
    ui: SyhUi | null
): void {
    const target = e.target as Element | null;
    const checkbox = target?.closest('.syh-checkbox[data-type="banner"]') as HTMLInputElement | null;
    if (checkbox) {
        handleSingleBannerCheckboxChange(checkbox, selectors, ui);
        return;
    }

    const masterCheckbox = target?.closest('.syh-master-checkbox') as HTMLInputElement | null;
    if (masterCheckbox) {
        handleMasterCheckboxChange(masterCheckbox, selectors);
    }
}