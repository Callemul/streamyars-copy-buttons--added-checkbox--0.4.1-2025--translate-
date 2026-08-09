/**
 * StreamYard Helper - Centralized Storage Adapter
 * Модуль керування сховищем із захистом від розриву контексту розширення (zombie context).
 * ВАЖЛИВО: localStorage fallback видалено навмисно — він ламає синхронізацію між контент-скриптом і попапом.
 *
 * Чиста логіка ключів та міграцій винесена у `storage_keys.ts`, щоб зменшити
 * розмір цього файлу та уникнути зациклень завантаження. Публічний API
 * (ключі, міграції, типи) реекспортується звідти 1-в-1 для зворотної сумісності.
 */

import {
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
    processGetResult
} from './storage_keys';

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
    processGetResult
};

export interface StorageAdapter {
    isChromeStorageAvailable(): boolean;
    get<T = Record<string, any>>(keys: StorageKeyValues | StorageKeyValues[], cb: (result: T) => void): void;
    set(items: Record<string, any>, cb?: () => void): void;
    remove(keys: StorageKeyValues | StorageKeyValues[], cb?: () => void): void;
    getAsync<T = Record<string, any>>(keys: StorageKeyValues | StorageKeyValues[]): Promise<T>;
    setAsync(items: Record<string, any>): Promise<void>;
    removeAsync(keys: StorageKeyValues | StorageKeyValues[]): Promise<void>;
    updateAsync<T = Record<string, any>>(
        keys: StorageKeyValues | StorageKeyValues[],
        updateFn: (current: T) => T | Promise<T>
    ): Promise<T>;
    onChanged(callback: (changes: Record<string, { oldValue?: any; newValue?: any }>, areaName: string) => void): void;
}

function checkAndLogStorageError(actionName: string): boolean {
    if (chrome.runtime?.lastError) {
        console.error(`[SYH Storage] ${actionName} error:`, chrome.runtime.lastError.message);
        return true;
    }
    return false;
}

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

function migrateLegacyYtCollected(
    allData: Record<string, any>,
    migrated: Record<string, unknown>,
    keysToRemove: string[]
): void {
    const legacyYtItems = (allData[STORAGE_KEYS.YT_COLLECTED] || allData['syh_yt_collected']) as any[] | undefined;
    if (Array.isArray(legacyYtItems) && legacyYtItems.length > 0) {
        const vpSsKey = getSheetCollectedStorageKey('vp_ss');
        const existingVpSs = (migrated[vpSsKey] || allData[vpSsKey]) as any[] | undefined;
        const itemMap = new Map<string | any, any>();

        if (Array.isArray(existingVpSs)) {
            existingVpSs.forEach(item => { itemMap.set(item?.id ?? item, item); });
        }
        legacyYtItems.forEach(item => { itemMap.set(item?.id ?? item, item); });

        migrated[vpSsKey] = Array.from(itemMap.values());
        if (allData[STORAGE_KEYS.YT_COLLECTED]) keysToRemove.push(STORAGE_KEYS.YT_COLLECTED);
    }
}

export async function migrateStorageIfNeeded(): Promise<void> {
    if (!SYH_STORAGE.isChromeStorageAvailable()) return;

    return new Promise((resolve) => {
        chrome.storage.local.get(null, (allData) => {
            if (chrome.runtime.lastError || !allData) {
                resolve();
                return;
            }
            const schemaVersion = allData._schema_version;
            if (typeof schemaVersion === 'number' && schemaVersion >= STORAGE_SCHEMA_VERSION) {
                resolve();
                return;
            }

            const migrated: Record<string, unknown> = {};
            const keysToRemove: string[] = [];

            for (const [oldKey, value] of Object.entries(allData)) {
                if (oldKey === '_schema_version') continue;
                const newKey = migrateKey(oldKey);
                if (newKey !== oldKey) {
                    migrated[newKey] = value;
                    keysToRemove.push(oldKey);
                }
            }

            migrateLegacyYtCollected(allData, migrated, keysToRemove);

            if (keysToRemove.length > 0) {
                chrome.storage.local.set(migrated, () => {
                    chrome.storage.local.remove(keysToRemove, () => {
                        chrome.storage.local.set({ _schema_version: STORAGE_SCHEMA_VERSION }, () => {
                            console.log(`[SYH Storage] Storage migrated: ${keysToRemove.length} keys renamed`);
                            resolve();
                        });
                    });
                });
            } else {
                chrome.storage.local.set({ _schema_version: STORAGE_SCHEMA_VERSION }, () => {
                    resolve();
                });
            }
        });
    });
}


