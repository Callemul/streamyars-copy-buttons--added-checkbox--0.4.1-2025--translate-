/**
 * StreamYard Helper — чисті правила первинного завантаження YouTube-модуля.
 *
 * Винесено з `youtube/yt_init.ts` (CRAP 42 за звітом Fallow).
 * Тут немає ані `chrome.storage`, ані DOM: лише список ключів, які треба
 * прочитати, і перетворення сирої відповіді сховища у стан модуля.
 *
 * Прапорець «модуль увімкнено» та захист від `null` беруться з
 * `./yt_storage_rules` — це той самий Single Source of Truth, який
 * використовує реактивний обробник змін сховища.
 *
 * Поведінка збережена 1-в-1 з оригінальним `loadStorageAndInitialize`.
 */

import type { StorageReadResult, SheetCollectedKey } from '../modules/storage';
import { STORAGE_KEYS } from '../modules/storage';
import { orEmptyRecord, readYoutubeEnabled } from './yt_storage_rules';
import type { StateCache } from './yt_state';
import type { YTCollectedItem } from '../modules/types';

/** Ключі сховища, потрібні YouTube-модулю на старті (порядок як в оригіналі). */
export function buildYtInitStorageKeys(collectedKey: SheetCollectedKey): string[] {
    return [
        STORAGE_KEYS.OPTIONS,
        STORAGE_KEYS.YT_BUTTON_STATES,
        STORAGE_KEYS.YT_CHECKBOX_STATE,
        collectedKey
    ];
}

/** Стан модуля, відновлений зі сховища. */
export type YtInitState = StateCache;

/**
 * Перетворює сиру відповідь сховища на стан модуля.
 *
 * Порожні/відсутні значення дають порожні колекції — саме так поводились
 * оригінальні `res[...] || {}` та `res[...] || []`.
 */
export function resolveYtInitState(
    res: StorageReadResult | null | undefined,
    collectedKey: SheetCollectedKey
): YtInitState {
    const raw = res || {};

    return {
        youtubeEnabled: readYoutubeEnabled(orEmptyRecord(raw[STORAGE_KEYS.OPTIONS])),
        buttonStates: orEmptyRecord(raw[STORAGE_KEYS.YT_BUTTON_STATES]),
        checkboxStates: orEmptyRecord(raw[STORAGE_KEYS.YT_CHECKBOX_STATE]),
        collectedList: (raw[collectedKey] || []) as YTCollectedItem[]
    };
}

/**
 * Переносить відновлений стан у кеш модуля.
 *
 * УВАГА: прапорець `youtubeEnabled` сюди НЕ входить — оригінал виставляв його
 * окремо і раніше, ніж вирішував, чи взагалі читати решту станів.
 */
export function applyYtInitState(cache: StateCache, next: YtInitState): void {
    cache.buttonStates = next.buttonStates;
    cache.checkboxStates = next.checkboxStates;
    cache.collectedList = next.collectedList;
}
