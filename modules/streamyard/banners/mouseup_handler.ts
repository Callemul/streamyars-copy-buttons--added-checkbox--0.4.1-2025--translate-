import type { SyhEventBanners } from './types';
import { isAllowedBannerAction } from './mouse_handlers';
import { handleCreateBannersAction } from './category';
import { handleDeleteSelectedBannersAction } from './deletion';
import { handleCopyBannerAction, handleMarkBannerCategoryAction } from './category';
import { SYH_STATS_TRACKER } from '../../stats_tracker';
import { detectActiveBannerText, checkAutoStartPrayersPhase } from '../../stats_auto_phase';
import { toSelectorList, type SelectorValue } from '../../config';

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

/**
 * `bannerBlock` (`Banner__LiWrap`, елемент списку) і `bannerWrap` (`Banner__Wrap`,
 * вкладений контейнер усередині нього) — це два РІЗНІ рівні DOM, а не
 * альтернативні імена одного вузла: звідси й окремі поля в реєстрі
 * `modules/config.ts`, а не спільний фолбек. Клік по банеру може прилетіти
 * в ціль на будь-якому з двох рівнів, тому тут навмисне CSS-групування
 * («OR» обох селекторів), а не sequential fallback.
 */
function buildBannerHitSelector(selectors: Record<string, SelectorValue> | null): string {
    return [
        ...toSelectorList(selectors?.bannerBlock),
        ...toSelectorList(selectors?.bannerWrap)
    ].join(',');
}

export function handleBannerMouseUp(e: MouseEvent, self: SyhEventBanners): void {
    const target = e.target as Element | null;
    const button = target?.closest('.syh-button') as HTMLElement | null;
    const buttonNum = e.button;

    if (!button) {
        const bannerHitSelector = buttonNum === 0 ? buildBannerHitSelector(self.SELECTORS) : '';
        if (bannerHitSelector && target?.closest(bannerHitSelector)) {
            setTimeout(() => {
                const activeText = detectActiveBannerText();
                if (activeText) {
                    checkAutoStartPrayersPhase(SYH_STATS_TRACKER, activeText);
                }
            }, 150);
        }
        return;
    }

    const action = button.dataset.action;
    const type = button.dataset.type;

    if (!isAllowedBannerAction(action, type) || buttonNum !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    const handler = actionHandlers.find(h => h.canHandle(action, type));
    if (handler) {
        handler.handle(button, self);
    }
}