import { bindPrayerFocusListeners } from './prayer_handlers_focus';
import { bindPrayerToolbarListeners } from './prayer_handlers_toolbar';
import { resolvePrayerClickRoute, type PrayerClickAction } from './prayer_click_rules';
import {
    handleDeleteAuthorPrayers,
    handleDeleteSinglePrayer,
    handleEditPrayerAuthor,
    handleKeepCurrentRoomPrayers,
    handleWipeAllPrayers
} from './prayer_click_actions';

// Публічний API збережено без змін: обробники досі доступні з цього модуля
// (і, через `./prayer_handlers`, з решти попапа).
export {
    handleDeleteAuthorPrayers,
    handleDeleteSinglePrayer,
    handleEditPrayerAuthor,
    handleKeepCurrentRoomPrayers,
    handleWipeAllPrayers
};

/** Побічний ефект для кожної дії; ключі синхронні з `PRAYER_CLICK_ROUTES`. */
const CLICK_EFFECTS: Record<PrayerClickAction, (element: Element) => void> = {
    'edit-author': handleEditPrayerAuthor,
    'delete-author': handleDeleteAuthorPrayers,
    'wipe-all': () => handleWipeAllPrayers(),
    'keep-room': () => handleKeepCurrentRoomPrayers(),
    'delete-one': handleDeleteSinglePrayer
};

export function bindPrayerClickListeners(): void {
    document.addEventListener('click', function(e) {
        const route = resolvePrayerClickRoute(e.target as Element | null);
        if (route) CLICK_EFFECTS[route.action](route.element);
    });
}

export function initPopupPrayersListeners(): void {
    bindPrayerFocusListeners();
    bindPrayerClickListeners();
    bindPrayerToolbarListeners();
}
