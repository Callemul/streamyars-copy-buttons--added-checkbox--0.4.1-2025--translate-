/**
 * Badge counting rules (pure).
 *
 * Виділено з `service-worker.ts`. Тут немає жодного звернення до `chrome.action`
 * чи `chrome.storage` — лише детерміновані правила «що саме рахується у бейдж».
 *
 * Раніше перелік «цікавих» ключів був продубльований двічі: у розрахунку
 * лічильників і в слухачі `chrome.storage.onChanged`. Через це додавання нового
 * джерела даних вимагало правки у двох місцях, і вони легко розсинхронізовувались.
 * Тепер обидва споживачі спираються на ті самі предикати.
 */

import type { StorageRawResult } from '../modules/storage/storage';
import { STORAGE_KEYS } from '../modules/storage/storage';

const COLLECTED_KEY_PREFIX = 'syh:popup:collected:';

/** Ключі, значення яких є масивами зібраних елементів. */
function isCollectedKey(key: string): boolean {
    return key.startsWith(COLLECTED_KEY_PREFIX) ||
           key === STORAGE_KEYS.YT_COLLECTED ||
           key === STORAGE_KEYS.PRAYERS;
}

/** Ключі, значення яких є мапами стану чекбоксів. */
function isCheckedStateKey(key: string): boolean {
    return key === STORAGE_KEYS.CHECKBOX_STATE ||
           key === STORAGE_KEYS.YT_CHECKBOX_STATE ||
           key === STORAGE_KEYS.STUDIO_CHECKBOX_STATE;
}

/** Чи впливає зміна цього ключа на вміст бейджа. */
export function isBadgeRelevantKey(key: string): boolean {
    return isCollectedKey(key) || isCheckedStateKey(key);
}

/**
 * Підраховує кількість вибраних (checked) чекбоксів із об'єкта стану.
 * Підтримує як плоску мапу, так і обгортку `{ date, data }`; службовий ключ
 * `date` ніколи не рахується як елемент.
 */
export function countCheckedItems(obj: any): number {
    if (!obj || typeof obj !== 'object') return 0;
    const target = (obj.data && typeof obj.data === 'object') ? obj.data : obj;
    let count = 0;
    for (const key of Object.keys(target)) {
        if (key === 'date') continue;
        const val = target[key];
        if (val === true || (val && typeof val === 'object' && val.checked === true)) {
            count++;
        }
    }
    return count;
}

/** Зводить увесь дамп сховища до двох чисел, які визначають вигляд бейджа. */
export function calculateBadgeCounts(allData: StorageRawResult): { collectedCount: number; checkedCount: number } {
    let collectedCount = 0;
    let checkedCount = 0;

    for (const key of Object.keys(allData)) {
        if (isCollectedKey(key)) {
            const val = allData[key];
            if (Array.isArray(val)) {
                collectedCount += val.length;
            }
        } else if (isCheckedStateKey(key)) {
            checkedCount += countCheckedItems(allData[key]);
        }
    }

    return { collectedCount, checkedCount };
}
