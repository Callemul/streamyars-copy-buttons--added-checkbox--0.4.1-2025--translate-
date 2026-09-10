import type { SelectorValue } from '../../config';

export function handleBannerContextMenu(
    e: MouseEvent,
    selectors: Record<string, SelectorValue> | null
): void {
    const target = e.target as Element | null;
    if (!target || !selectors?.bannerBlock) return;
    const bannerBlock = target.closest(selectors.bannerBlock as string);
    if (!bannerBlock) return;

    const isInputOrCustom = target.closest('input, textarea, .syh-button');
    const isSystemEditOrDelete = target.closest('button:has(svg.lucide-pencil), button:has(svg.lucide-trash-2), button:has(svg.lucide-trash2), [class*="DesktopTopIconRow"] button');

    if (isInputOrCustom || isSystemEditOrDelete) return;

    e.preventDefault();
    e.stopPropagation();
    const checkbox = bannerBlock.querySelector('.syh-checkbox[data-type="banner"]') as HTMLInputElement | null;
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

export function handleBannerMouseDown(e: MouseEvent): void {
    const target = e.target as Element | null;
    if (target?.closest('.syh-button[data-type="banner"], .syh-button[data-action="create-from-text"], .syh-button[data-action="delete-selected-banners"]') && e.button === 1) {
        e.preventDefault();
    }
}

export function isAllowedBannerAction(action?: string, type?: string): boolean {
    if (action === 'create-from-text' || action === 'delete-selected-banners' ||
        action === 'mark-stream' || action === 'mark-audience' || action === 'mark-prayer') {
        return true;
    }
    return type === 'banner';
}