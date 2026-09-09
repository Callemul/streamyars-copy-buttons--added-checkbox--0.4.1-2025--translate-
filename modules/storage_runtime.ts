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

import type { StorageChanges } from './storage_keys';
import type { StorageAdapter } from './storage_keys';
import { isExtensionContextValid } from './messaging_context';

export function isChromeStorageAvailable(): boolean {
    if (!isExtensionContextValid()) return false;

    try {
        return !!chrome.storage &&
               !!chrome.storage.local;
    } catch {
        return false;
    }
}

export function storageOnChanged(
    this: StorageAdapter,
    callback: (changes: StorageChanges, areaName: string) => void
): () => void {
    let active = false;

    if (this.isChromeStorageAvailable() && chrome?.storage?.onChanged) {
        try {
            chrome.storage.onChanged.addListener(callback);
            active = true;
        } catch (e: any) {
            console.warn('[SYH Storage] Failed to add onChanged listener:', e?.message || e);
        }
    }

    return () => {
        if (!active) return;
        active = false;
        if (typeof chrome !== 'undefined' && chrome?.storage?.onChanged?.removeListener) {
            try {
                chrome.storage.onChanged.removeListener(callback);
            } catch (e: any) {
                console.warn('[SYH Storage] Failed to remove onChanged listener:', e?.message || e);
            }
        }
    };
}
