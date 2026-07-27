/**
 * StreamYard Helper - Centralized Storage Adapter
 * Модуль керування сховищем із захистом від розриву контексту розширення (zombie context) та fallback до localStorage.
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
        return typeof chrome !== 'undefined' && 
               !!chrome.storage && 
               !!chrome.storage.local && 
               !!chrome.runtime && 
               !!chrome.runtime.id;
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
                        console.warn('[SYH Storage] chrome.storage.local.get error:', chrome.runtime.lastError.message);
                        const res: Record<string, any> = {};
                        const arr = Array.isArray(keys) ? keys : [keys];
                        arr.forEach(k => {
                            try {
                                const val = localStorage.getItem(k);
                                res[k] = val !== null ? JSON.parse(val) : undefined;
                            } catch (e: any) {
                                console.warn('[SYH Storage] localStorage.getItem error:', e?.message || e);
                                res[k] = undefined;
                            }
                        });
                        if (cb) cb(res);
                        return;
                    }
                    if (cb) cb(result);
                });
                return;
            } catch (e: any) {
                console.warn('[SYH Storage] Fallback to localStorage (get):', e?.message || e);
            }
        }
        const res: Record<string, any> = {};
        const arr = Array.isArray(keys) ? keys : [keys];
        arr.forEach(k => {
            try {
                const val = localStorage.getItem(k);
                res[k] = val !== null ? JSON.parse(val) : undefined;
            } catch (e: any) {
                console.warn('[SYH Storage] localStorage.getItem error:', e?.message || e);
                res[k] = undefined;
            }
        });
        if (cb) cb(res);
    },

    /**
     * Зберегти об'єкт пар ключ-значення
     */
    set: function(items: Record<string, any>, cb?: () => void): void {
        if (this.isChromeStorageAvailable()) {
            try {
                chrome.storage.local.set(items, () => {
                    if (chrome.runtime.lastError) {
                        console.warn('[SYH Storage] chrome.storage.local.set error:', chrome.runtime.lastError.message);
                    }
                    if (cb) cb();
                });
                return;
            } catch (e: any) {
                console.warn('[SYH Storage] Fallback to localStorage (set):', e?.message || e);
            }
        }
        Object.keys(items).forEach(k => {
            try {
                localStorage.setItem(k, JSON.stringify(items[k]));
            } catch (e: any) {
                console.warn('[SYH Storage] localStorage.setItem error:', e?.message || e);
            }
        });
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
                        console.warn('[SYH Storage] chrome.storage.local.remove error:', chrome.runtime.lastError.message);
                    }
                    if (cb) cb();
                });
                return;
            } catch (e: any) {
                console.warn('[SYH Storage] Fallback to localStorage (remove):', e?.message || e);
            }
        }
        const arr = Array.isArray(keys) ? keys : [keys];
        arr.forEach(k => {
            try {
                localStorage.removeItem(k);
            } catch (e: any) {
                console.warn('[SYH Storage] localStorage.removeItem error:', e?.message || e);
            }
        });
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
