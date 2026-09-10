/**
 * StreamYard Helper — чисті операції тулбара молитовних прохань.
 *
 * Винесено з `popup/prayer_handlers_toolbar.ts` (CRAP 42 / 30 за звітом Fallow).
 * Тут немає DOM-подій, сховища та messaging — лише детерміновані перетворення
 * даних і тексти повідомлень, які легко покрити тестами.
 *
 * Поведінка збережена 1-в-1 з оригінальними обробниками.
 */

import type { StorageRawResult } from '../modules/storage/storage';
import type { StorageReadResult } from '../modules/storage/storage';
import type { PrayerItem } from '../modules/core/types';

export const CLEAR_PRAYERS_CONFIRM_MESSAGE =
    'Очистити список молитовних прохань? Це не видалить їх зі Стрімярду.';
export const FETCH_PRAYERS_FAILED_MESSAGE =
    '[SYH] Не вдалося підтягнути молитви з активної вкладки StreamYard.';
export const NO_NEW_PRAYERS_MESSAGE =
    '[SYH] Зіркових МОЛИТОВ не знайдено (або вони всі вже є в списку).';

export const COPY_SUCCESS_LABEL = 'Скопійовано! ✅';
export const COPY_FAILURE_LABEL = 'Помилка ❌';
export const FETCH_PENDING_LABEL = '⌛...';

/** Скільки тримати підпис-відповідь на кнопці копіювання, мс. */
export const COPY_LABEL_RESET_DELAY_MS = 2000;

/** Тип запису, який вважається молитовним проханням. */
export const PRAYER_ENTRY_TYPE = 'prayer';

/**
 * Готовий до копіювання текст лежить в атрибуті `data-raw-text` контейнера.
 * Без контейнера або без атрибута — порожній рядок (копіювання не запускається).
 */
export function readRawPrayerText(outputDiv: HTMLElement | null): string {
    if (!outputDiv) return '';
    return outputDiv.getAttribute('data-raw-text') || '';
}

/** Підпис кнопки після спроби копіювання. */
export function copyResultLabel(success: boolean): string {
    return success ? COPY_SUCCESS_LABEL : COPY_FAILURE_LABEL;
}

/** Поточний підпис елемента, який треба відновити після тимчасового статусу. */
export function readElementLabel(el: { textContent: string | null } | null): string {
    return el?.textContent || '';
}

/** Список молитов зі сховища; відсутній ключ означає порожній список. */
export function readStoredPrayers(result: StorageReadResult | null | undefined, key: string): PrayerItem[] {
    return ((result as StorageRawResult | null | undefined)?.[key] as PrayerItem[]) || [];
}

/** Прибирає молитовні прохання, лишаючи решту записів (питання тощо) недоторканими. */
export function removePrayerEntries(list: PrayerItem[]): PrayerItem[] {
    return list.filter(item => item.type !== PRAYER_ENTRY_TYPE);
}

/** Чи відповідь активної вкладки є придатним списком молитов. */
export function isPrayerListPayload(payload: unknown): payload is PrayerItem[] {
    return Boolean(payload) && Array.isArray(payload);
}

export interface PrayerMergeResult {
    /** Той самий масив `list`, доповнений новими записами (мутація навмисна). */
    list: PrayerItem[];
    addedCount: number;
}

/**
 * Додає підтягнуті молитви до наявного списку, ігноруючи дублікати за текстом.
 *
 * УВАГА: масив `list` мутується на місці — саме так поводився оригінальний
 * обробник, і саме цей масив далі записується у сховище.
 */
export function mergeFetchedPrayers(list: PrayerItem[], fetched: PrayerItem[]): PrayerMergeResult {
    let addedCount = 0;

    fetched.forEach(item => {
        if (!list.find(existing => existing.text === item.text)) {
            list.push(item);
            addedCount++;
        }
    });

    return { list, addedCount };
}

/** Підсумкове повідомлення після підтягування молитов. */
export function buildFetchSummaryMessage(addedCount: number): string {
    if (addedCount > 0) {
        return `[SYH] Успішно підтягнуто нових молитов: ${addedCount}`;
    }
    return NO_NEW_PRAYERS_MESSAGE;
}
