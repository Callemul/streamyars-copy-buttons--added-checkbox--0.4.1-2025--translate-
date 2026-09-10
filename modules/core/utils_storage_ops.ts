/**
 * StreamYard Helper — операції зі сховищем банерів.
 *
 * Винесено з `modules/utils.ts`. Мінімальний, чітко окреслений шматок стану:
 * збереження обраної категорії банера у `STORAGE_KEYS.CATEGORIES`.
 *
 * Поведінка збережена 1-в-1: `storageAdapter` передається параметром (фасад
 * підставляє `this.storage`, який без `SYH_STORAGE` усе одно впаде на
 * `get is not a function` — той самий виняток, що й в оригіналі).
 */

import type { StorageReadResult } from '../storage_keys';
import { STORAGE_KEYS } from '../storage';

/**
 * Зберігає пару `text → type` у базу категорій банерів.
 * Наявні записи не перезатираються, а доповнюються.
 */
export function saveBannerCategory(
    text: string,
    type: string,
    storageAdapter: { get(keys: any, cb: (res: any) => void): void; set(items: any, cb?: () => void): void }
): Promise<void> {
    return new Promise(resolve => {
        storageAdapter.get([STORAGE_KEYS.CATEGORIES], (result: StorageReadResult) => {
            const db = result[STORAGE_KEYS.CATEGORIES] || {};
            db[text] = type;
            storageAdapter.set({ [STORAGE_KEYS.CATEGORIES]: db }, resolve);
        });
    });
}
