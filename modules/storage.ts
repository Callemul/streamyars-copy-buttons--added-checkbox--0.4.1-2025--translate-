/**
 * StreamYard Helper - Centralized Storage Adapter
 * Модуль керування сховищем із захистом від розриву контексту розширення (zombie context).
 * ВАЖЛИВО: localStorage fallback видалено навмисно — він ламає синхронізацію між контент-скриптом і попапом.
 */

export interface StorageAdapter {
    isChromeStorageAvailable(): boolean;
    get(keys: string | string[], cb: (result: Record<string, any>) => void): void;
    set(items: Record<string, any>, cb?: () => void): void;
    remove(keys: string | string[], cb?: () => void): void;
    onChanged(callback: (changes: Record<string, any>, areaName: string) => void): void;
}

export const SYH_STORAGE: StorageAdapter = {
    /**
     * Перевірка доступності chrome.storage.local
     */
    isChromeStorageAvailable: function(): boolean {
        try {
            return typeof chrome !== 'undefined' && 
                   !!chrome.storage && 
                   !!chrome.storage.local;
        } catch {
            return false;
        }
    },

    /**
     * Отримати значення за ключем або масивом ключів
     */
    /**
     * Отримати значення за ключем або масивом ключів
     */
    get: function(keys: string | string[], cb: (result: Record<string, any>) => void): void {
        if (this.isChromeStorageAvailable()) {
            try {
                chrome.storage.local.get(keys, (result) => {
                    if (chrome.runtime.lastError) {
                        console.error('[SYH Storage] get error:', chrome.runtime.lastError.message);
                        if (cb) cb({});
                        return;
                    }
                    if (cb) cb(result);
                });
                return;
            } catch (e: any) {
                console.error('[SYH Storage] Fallback to localStorage removed. Error:', e?.message || e);
            }
        }
        console.error('[SYH Storage] chrome.storage not available. get skipped.');
        if (cb) cb({});
    },

    /**
     * Зберегти об'єкт пар ключ-значення
     */
    set: function(items: Record<string, any>, cb?: () => void): void {
        if (this.isChromeStorageAvailable()) {
            try {
                chrome.storage.local.set(items, () => {
                    if (chrome.runtime.lastError) {
                        console.error('[SYH Storage] chrome.storage.local.set error:', chrome.runtime.lastError.message);
                    }
                    if (cb) cb();
                });
                return;
            } catch (e: any) {
                console.error('[SYH Storage] Fallback to localStorage removed. Error:', e?.message || e);
            }
        }
        console.error('[SYH Storage] chrome.storage not available. Data NOT saved.');
        if (cb) cb();
    },

    /**
     * Видалити значення за ключем або масивом ключів
     */
    remove: function(keys: string | string[], cb?: () => void): void {
        if (this.isChromeStorageAvailable()) {
            try {
                chrome.storage.local.remove(keys, () => {
                    if (chrome.runtime.lastError) {
                        console.error('[SYH Storage] chrome.storage.local.remove error:', chrome.runtime.lastError.message);
                    }
                    if (cb) cb();
                });
                return;
            } catch (e: any) {
                console.error('[SYH Storage] Fallback to localStorage removed. Error:', e?.message || e);
            }
        }
        console.error('[SYH Storage] chrome.storage not available. Remove skipped.');
        if (cb) cb();
    },

    /**
     * Підписка на зміни сховища (якщо доступно chrome.storage.onChanged)
     */
    onChanged: function(callback: (changes: Record<string, any>, areaName: string) => void): void {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
            try {
                chrome.storage.onChanged.addListener(callback);
            } catch (e: any) {
                console.warn('[SYH Storage] Failed to add onChanged listener:', e?.message || e);
            }
        }
    }
};

if (typeof window !== 'undefined') {
    (window as any).SYH_STORAGE = SYH_STORAGE;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SYH_STORAGE;
}
