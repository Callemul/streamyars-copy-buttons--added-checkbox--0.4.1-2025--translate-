/**
 * StreamYard Helper - Centralized Storage Adapter (фасад)
 *
 * Публічний API залишено 1-в-1 для зворотної сумісності (60 залежних файлів).
 * «Важка» логіка міграції винесена у `storage_migration.ts`, а чисті ключі/типи —
 * у `storage_keys.ts` (зокрема канонічний тип `StorageAdapter`). Цей файл
 * тримає лише екземпляр `SYH_STORAGE` та реекспортує символи з тих модулів,
 * не створюючи зайвих ланцюгів імпортів, що ламають розв'язання типів.
 *
 * ВАЖЛИВО: localStorage fallback видалено навмисно — він ламає синхронізацію між
 * контент-скриптом і попапом.
 */

export {
    STORAGE_SCHEMA_VERSION,
    type StoredOptions,
    type StorageSchema,
    STORAGE_KEYS,
    getSheetStorageKey,
    getSheetCollectedStorageKey,
    POPUP_SHEET_KEYS,
    migrateKey,
    type StorageKeyValues,
    migrateItemKeys,
    migrateKeys,
    prepareQueryKeys,
    processGetResult,
    type StorageAdapter
} from './storage_keys';

export {
    checkAndLogStorageError,
    migrateLegacyYtCollected,
    migrateStorageIfNeeded
} from './storage_migration';

import { checkAndLogStorageError } from './storage_migration';
import {
    prepareQueryKeys,
    processGetResult,
    migrateItemKeys,
    migrateKeys,
    type StorageKeyValues,
    type StorageAdapter
} from './storage_keys';

export const SYH_STORAGE: StorageAdapter = {
    isChromeStorageAvailable: function(): boolean {
        try {
            return typeof chrome !== 'undefined' &&
                   !!chrome.runtime &&
                   !!chrome.runtime.id &&
                   !!chrome.storage &&
                   !!chrome.storage.local;
        } catch {
            return false;
        }
    },

    get: function<T = Record<string, unknown>>(
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
    },

    set: function(items: Record<string, any>, cb?: () => void): void {
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
    },

    remove: function(keys: StorageKeyValues | StorageKeyValues[], cb?: () => void): void {
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
    },

    getAsync: function<T = Record<string, any>>(keys: StorageKeyValues | StorageKeyValues[]): Promise<T> {
        return new Promise((resolve) => {
            if (!this.isChromeStorageAvailable()) {
                resolve({} as T);
                return;
            }
            try {
                const { origKeys, queryKeys } = prepareQueryKeys(keys);
                chrome.storage.local.get(queryKeys, (result) => {
                    if (checkAndLogStorageError('get')) {
                        resolve({} as T);
                        return;
                    }
                    resolve(processGetResult<T>(origKeys, result || {}));
                });
            } catch (e: unknown) {
                const err = e as Error;
                console.error('[SYH Storage] Context invalidated or API failed:', err?.message || e);
                resolve({} as T);
            }
        });
    },

    setAsync: function(items: Record<string, any>): Promise<void> {
        return new Promise((resolve) => {
            if (!this.isChromeStorageAvailable()) {
                resolve();
                return;
            }
            try {
                chrome.storage.local.set(migrateItemKeys(items), () => {
                    checkAndLogStorageError('set');
                    resolve();
                });
            } catch (e: unknown) {
                const err = e as Error;
                console.error('[SYH Storage] set failed:', err?.message || e);
                resolve();
            }
        });
    },

    removeAsync: function(keys: StorageKeyValues | StorageKeyValues[]): Promise<void> {
        return new Promise((resolve) => {
            this.remove(keys as any, resolve);
        });
    },

    updateAsync: async function<T = Record<string, any>>(
        keys: StorageKeyValues | StorageKeyValues[],
        updateFn: (current: T) => T | Promise<T>
    ): Promise<T> {
        const currentData = await this.getAsync<T>(keys);
        const updatedData = await updateFn(currentData);
        await this.setAsync(updatedData as Record<string, any>);
        return updatedData;
    },

    onChanged: function(callback: (changes: Record<string, any>, areaName: string) => void): void {
        if (this.isChromeStorageAvailable() && chrome.storage.onChanged) {
            try {
                chrome.storage.onChanged.addListener(callback);
            } catch (e: any) {
                console.warn('[SYH Storage] Failed to add onChanged listener:', e?.message || e);
            }
        }
    }
};
