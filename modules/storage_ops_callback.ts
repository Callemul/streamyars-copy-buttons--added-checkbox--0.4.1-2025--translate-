/**
 * StreamYard Helper — Storage callback-based operations.
 *
 * Виділено зі `storage.ts`. Тут — «класичний» колбечний контракт
 * (`get` / `set` / `remove`), який історично використовує більшість
 * контент-скриптів.
 *
 * Спільний інваріант усіх трьох операцій: за недоступного Chrome-сховища або
 * будь-якого винятку вони НЕ кидають помилку, а тихо викликають колбек
 * (порожній результат для читання). Це навмисна поведінка — вона рятує UI від
 * "Extension context invalidated" під час перезавантаження розширення.
 *
 * Функції оголошені з `this: StorageAdapter`, щоб динамічний диспатч
 * (`this.isChromeStorageAvailable()`) лишався ідентичним до розділення файлу.
 */

import type { StorageWriteItems } from './storage_keys';
import { checkAndLogStorageError } from './storage_migration';
import {
    prepareQueryKeys,
    processGetResult,
    migrateItemKeys,
    migrateKeys,
    type StorageKeyValues,
    type StorageAdapter
} from './storage_keys';

export function storageGet<T = Record<string, unknown>>(
    this: StorageAdapter,
    keys: StorageKeyValues | StorageKeyValues[],
    cb: (result: T) => void
): void {
    if (!this.isChromeStorageAvailable()) {
        if (cb) cb({} as T);
        return;
    }
    try {
        const { origKeys, queryKeys } = prepareQueryKeys(keys);
        chrome.storage.local.get(queryKeys, (result) => {
            if (checkAndLogStorageError('get')) {
                if (cb) cb({} as T);
                return;
            }
            if (cb) cb(processGetResult<T>(origKeys, result || {}));
        });
    } catch {
        if (cb) cb({} as T);
    }
}

export function storageSet(
    this: StorageAdapter,
    items: StorageWriteItems,
    cb?: () => void
): void {
    if (!this.isChromeStorageAvailable()) {
        if (cb) cb();
        return;
    }
    try {
        chrome.storage.local.set(migrateItemKeys(items), () => {
            checkAndLogStorageError('set');
            if (cb) cb();
        });
    } catch {
        if (cb) cb();
    }
}

export function storageRemove(
    this: StorageAdapter,
    keys: StorageKeyValues | StorageKeyValues[],
    cb?: () => void
): void {
    if (!this.isChromeStorageAvailable()) {
        if (cb) cb();
        return;
    }
    try {
        chrome.storage.local.remove(migrateKeys(keys), () => {
            checkAndLogStorageError('remove');
            if (cb) cb();
        });
    } catch {
        if (cb) cb();
    }
}
