/**
 * StreamYard Helper — Storage runtime plumbing.
 *
 * Виділено зі `storage.ts` (топ-1 ціль рефакторингу за fallow: fan-in 68).
 * Тут живе все, що стосується *середовища* виконання, а не самих операцій
 * читання/запису: перевірка живучості Chrome-контексту та підписка на зміни
 * сховища.
 *
 * ВАЖЛИВО: `storageOnChanged` навмисно оголошено через `this: StorageAdapter`,
 * щоб зберегти динамічний диспатч адаптера 1-в-1. Споживач може підмінити
 * `isChromeStorageAvailable` на власному об'єкті-нащадку, і решта методів
 * зобов'язані поважати цю підміну (див. `tests/storage_adapter.test.js`).
 */

import type { StorageAdapter } from './storage_keys';

export function isChromeStorageAvailable(): boolean {
    try {
        return typeof chrome !== 'undefined' &&
               !!chrome.runtime &&
               !!chrome.runtime.id &&
               !!chrome.storage &&
               !!chrome.storage.local;
    } catch {
        return false;
    }
}

export function storageOnChanged(
    this: StorageAdapter,
    callback: (changes: Record<string, any>, areaName: string) => void
): void {
    if (this.isChromeStorageAvailable() && chrome.storage.onChanged) {
        try {
            chrome.storage.onChanged.addListener(callback);
        } catch (e: any) {
            console.warn('[SYH Storage] Failed to add onChanged listener:', e?.message || e);
        }
    }
}
