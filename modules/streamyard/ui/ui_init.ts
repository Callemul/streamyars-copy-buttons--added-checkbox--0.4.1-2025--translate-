/**
 * StreamYard Helper — ініціалізація UI-модуля та синхронізація кешів зі сховищем.
 *
 * Винесено з `modules/ui.ts` (ціль №1 у `fallow health --targets`). Раніше вся
 * ця проводка жила всередині однієї 40-рядкової `init` з анонімним обробником
 * `onChanged` усередині — його не можна було викликати з тесту напряму.
 *
 * Поведінка збережена 1-в-1, включно з порядком кроків:
 *   SELECTORS/STATE -> onStateLoaded -> валідація селекторів ->
 *   первинне наповнення кешів -> підписка на storage -> підписка на шину подій.
 * Увесь `init` так само загорнутий у try/catch, який лише логує збій.
 */

import { SYH_STORAGE, STORAGE_KEYS } from '../../storage';
import { SYH_STATE, type SyhState } from '../../core/state';
import { SYH_CONFIG, type SyhConfig } from '../../config';
import { SYH_UI_STATE } from './ui_state';
import { SYH_BUS } from '../../core/event_bus';
import { updateCommentVisuals } from './ui_comments';
import { filterStarredComments } from './ui_starred_controls';
import { filterBanners } from './ui_banners';
import { validateSelectorsSyntax } from './ui_selector_validator';
import { restoreDomCheckboxes } from './ui_checkbox_restorer';
import type { PrayerItem } from '../../core/types';

type UiStorageChanges = Record<string, { oldValue?: unknown; newValue?: unknown }>;

interface UiCacheSnapshot {
    [STORAGE_KEYS.PRAYERS]?: PrayerItem[];
    [STORAGE_KEYS.CATEGORIES]?: Record<string, string>;
}

/**
 * Реакція на зміну `chrome.storage`. Оновлюємо кеш і перемальовуємо відповідний
 * список лише тоді, коли ключ реально був у зміні та має визначене `newValue`.
 * Виняток гаситься тут, щоб не спливти назад у слухач `chrome.storage`.
 */
export function applyStorageChangesToUiCaches(changes: UiStorageChanges): void {
    try {
        const prayersChange = changes[STORAGE_KEYS.PRAYERS];
        if (prayersChange && prayersChange.newValue !== undefined) {
            SYH_UI_STATE.prayersCache = (prayersChange.newValue as PrayerItem[]) || [];
            filterStarredComments();
        }
        const categoriesChange = changes[STORAGE_KEYS.CATEGORIES];
        if (categoriesChange && categoriesChange.newValue !== undefined) {
            SYH_UI_STATE.bannerCategoriesCache = (categoriesChange.newValue as Record<string, string>) || {};
            filterBanners();
        }
    } catch (e) {
        console.error("[SYH] Помилка синхронізації сховища в UI:", e);
    }
}

/** Первинне наповнення кешів. Свідомо fire-and-forget, як і в оригіналі. */
function primeUiCachesFromStorage(): void {
    SYH_STORAGE.getAsync<UiCacheSnapshot>([STORAGE_KEYS.PRAYERS, STORAGE_KEYS.CATEGORIES])
        .then((result) => {
            SYH_UI_STATE.prayersCache = result[STORAGE_KEYS.PRAYERS] || [];
            SYH_UI_STATE.bannerCategoriesCache = result[STORAGE_KEYS.CATEGORIES] || {};
        })
        .catch(e => console.error("[SYH UI] Error loading initial storage cache:", e));
}

export function initUiModule(config?: SyhConfig, state?: SyhState): void {
    try {
        SYH_UI_STATE.SELECTORS = config ? config.SELECTORS : SYH_CONFIG.SELECTORS;
        SYH_UI_STATE.STATE = state || SYH_STATE;

        if (SYH_UI_STATE.STATE) {
            SYH_UI_STATE.STATE.onStateLoaded = () => restoreDomCheckboxes();
        }

        validateSelectorsSyntax();

        primeUiCachesFromStorage();

        SYH_STORAGE.onChanged(applyStorageChangesToUiCaches);

        // Підписка на події від інших модулів через шину подій
        SYH_BUS.on('COMMENT_MARKED', (event) => {
            updateCommentVisuals(event.element, event.type);
        });

    } catch (error) {
        console.error("[SYH] Критичний збій ініціалізації модуля UI:", error);
    }
}
