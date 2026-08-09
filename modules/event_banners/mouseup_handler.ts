import type { SyhEventBanners } from './types';
import { isAllowedBannerAction } from './mouse_handlers';
import { handleCreateBannersAction } from './category';
import { handleDeleteSelectedBannersAction } from './deletion';
import { handleCopyBannerAction, handleMarkBannerCategoryAction } from './category';

interface ButtonActionHandler {
    canHandle: (action: string | undefined, type: string | undefined) => boolean;
    handle: (button: HTMLElement, self: SyhEventBanners) => void;
}

const actionHandlers: ButtonActionHandler[] = [
    {
        canHandle: (action) => action === 'create-from-text',
        handle: (_button, self) => handleCreateBannersAction(self.BANNER_CREATOR)
    },
    {
        canHandle: (action) => action === 'delete-selected-banners',
        handle: (_button, self) => handleDeleteSelectedBannersAction(self.SELECTORS, self.UI)
    },
    {
        canHandle: (action, type) => type === 'banner' && action === 'copy-banner',
        handle: (button, self) => handleCopyBannerAction(button, self.SELECTORS, self.UTILS)
    },
    {
        canHandle: (action) => action === 'mark-stream' || action === 'mark-audience' || action === 'mark-prayer',
        handle: (button, self) => handleMarkBannerCategoryAction(button, button.dataset.action!, self.SELECTORS, self.UI, self.UTILS)
    }
];

export function handleBannerMouseUp(e: MouseEvent, self: SyhEventBanners): void {
    const target = e.target as Element | null;
    const button = target?.closest('.syh-button') as HTMLElement | null;
    if (!button) return;

    const action = button.dataset.action;
    const type = button.dataset.type;
    const buttonNum = e.button;

    if (!isAllowedBannerAction(action, type) || buttonNum !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    const handler = actionHandlers.find(h => h.canHandle(action, type));
    if (handler) {
        handler.handle(button, self);
    }
}