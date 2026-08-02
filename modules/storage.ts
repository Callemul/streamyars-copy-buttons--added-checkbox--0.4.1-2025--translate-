/**
 * StreamYard Helper - Centralized Storage Adapter
 * Модуль керування сховищем із захистом від розриву контексту розширення (zombie context).
 * ВАЖЛИВО: localStorage fallback видалено навмисно — він ламає синхронізацію між контент-скриптом і попапом.
 */

declare var module: any;

export const STORAGE_SCHEMA_VERSION = 2;

export const STORAGE_KEYS = {
    // Core
    OPTIONS: 'syh:core:options',
    DB: 'syh:core:db',
    CATEGORIES: 'syh:core:categories',
    CHECKBOX_STATE: 'syh:core:checkbox_state',
    INSTALLED_AT: 'syh:core:installed_at',
    VERSION: 'syh:core:version',
    STUDIO_ENABLED: 'syh:core:studio_enabled',

    // Youtube
    YT_COLLECTED: 'syh:popup:yt:collected',
    YT_BUTTON_STATES: 'syh:yt:button_states',
    YT_CHECKBOX_STATE: 'syh:yt:checkbox_state',
    PRAYERS: 'syh:popup:prayers',
    TELEGRAM_DATA_PREFIX: 'syh:popup:telegram:data:',
    TELEGRAM_OLD_INPUT_PREFIX: 'syh:popup:telegram:oldInput:',

    // Studio
    STUDIO_BUTTON_STATE: 'syh:studio:button_state',
    STUDIO_CHECKBOX_STATE: 'syh:studio:checkbox_state',
    STUDIO_VIDEO_SHEET_MAP: 'syh:studio:video_sheet_map',
    STUDIO_OVERRIDE_LOG: 'syh:studio:override_log',

    // Stats
    STATS_CHARTS: 'syh:stats:charts'
} as const;

export function migrateKey(oldKey: string): string {
    if (oldKey.startsWith('syh:')) return oldKey;

    if (oldKey === 'syh_yt_collected') return STORAGE_KEYS.YT_COLLECTED;
    if (oldKey === 'syh_yt_button_states') return STORAGE_KEYS.YT_BUTTON_STATES;
    if (oldKey === 'syh_yt_checkbox_state') return STORAGE_KEYS.YT_CHECKBOX_STATE;
    if (oldKey === 'syh_options') return STORAGE_KEYS.OPTIONS;
    if (oldKey === 'db') return STORAGE_KEYS.DB;
    if (oldKey === 'syh_prayers') return STORAGE_KEYS.PRAYERS;
    if (oldKey === 'syh_banner_categories') return STORAGE_KEYS.CATEGORIES;
    if (oldKey === 'syh_checkbox_state') return STORAGE_KEYS.CHECKBOX_STATE;
    if (oldKey === 'syh_stream_charts') return STORAGE_KEYS.STATS_CHARTS;
    if (oldKey === 'syh_installed_at') return STORAGE_KEYS.INSTALLED_AT;
    if (oldKey === 'syh_version') return STORAGE_KEYS.VERSION;
    if (oldKey === 'syh_studio_enabled') return STORAGE_KEYS.STUDIO_ENABLED;
    if (oldKey === 'syh_studio_button_state') return STORAGE_KEYS.STUDIO_BUTTON_STATE;
    if (oldKey === 'syh_studio_checkbox_state') return STORAGE_KEYS.STUDIO_CHECKBOX_STATE;
    if (oldKey === 'syh_studio_video_sheet_map') return STORAGE_KEYS.STUDIO_VIDEO_SHEET_MAP;
    if (oldKey === 'syh_studio_manual_override_log') return STORAGE_KEYS.STUDIO_OVERRIDE_LOG;
    if (oldKey === 'studio_comment_state') return 'syh:studio:state';

    if (oldKey.startsWith('syh_telegram_data__')) {
        const brand = oldKey.substring('syh_telegram_data__'.length);
        return `${STORAGE_KEYS.TELEGRAM_DATA_PREFIX}${brand}`;
    }
    if (oldKey.startsWith('syh_old_input__')) {
        const brand = oldKey.substring('syh_old_input__'.length);
        return `${STORAGE_KEYS.TELEGRAM_OLD_INPUT_PREFIX}${brand}`;
    }
    if (oldKey.startsWith('studio_comment_state__')) {
        const videoId = oldKey.substring('studio_comment_state__'.length);
        return `syh:studio:state:${videoId}`;
    }
    if (oldKey.startsWith('syh_popup_divider_pos__')) {
        const sId = oldKey.substring('syh_popup_divider_pos__'.length);
        return `syh:popup:divider_pos:${sId}`;
    }
    if (oldKey.startsWith('syh_collected__')) {
        const sId = oldKey.substring('syh_collected__'.length);
        return `syh:popup:collected:${sId}`;
    }

    return oldKey;
}

export interface StorageAdapter {
    isChromeStorageAvailable(): boolean;
    get(keys: string | string[], cb: (result: Record<string, any>) => void): void;
    set(items: Record<string, any>, cb?: () => void): void;
    remove(keys: string | string[], cb?: () => void): void;
    onChanged(callback: (changes: Record<string, any>, areaName: string) => void): void;
}

export const SYH_STORAGE: StorageAdapter = {
    isChromeStorageAvailable: function(): boolean {
        try {
            return typeof chrome !== 'undefined' && 
                   !!chrome.storage && 
                   !!chrome.storage.local;
        } catch {
            return false;
        }
    },

    get: function(keys: string | string[], cb: (result: Record<string, any>) => void): void {
        if (this.isChromeStorageAvailable()) {
            try {
                const migratedKeys = Array.isArray(keys) ? keys.map(migrateKey) : migrateKey(keys);
                chrome.storage.local.get(migratedKeys, (result) => {
                    if (chrome.runtime.lastError) {
                        console.error('[SYH Storage] get error:', chrome.runtime.lastError.message);
                        if (cb) cb({});
                        return;
                    }
                    if (cb) cb(result || {});
                });
                return;
            } catch (e: any) {
                console.error('[SYH Storage] Fallback to localStorage removed. Error:', e?.message || e);
            }
        }
        console.error('[SYH Storage] chrome.storage not available. get skipped.');
        if (cb) cb({});
    },

    set: function(items: Record<string, any>, cb?: () => void): void {
        if (this.isChromeStorageAvailable()) {
            try {
                const migratedItems: Record<string, any> = {};
                for (const [k, v] of Object.entries(items)) {
                    migratedItems[migrateKey(k)] = v;
                }
                chrome.storage.local.set(migratedItems, () => {
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

    remove: function(keys: string | string[], cb?: () => void): void {
        if (this.isChromeStorageAvailable()) {
            try {
                const migratedKeys = Array.isArray(keys) ? keys.map(migrateKey) : migrateKey(keys);
                chrome.storage.local.remove(migratedKeys, () => {
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

if (typeof window !== 'undefined') {
    (window as any).SYH_STORAGE = SYH_STORAGE;
    (window as any).STORAGE_KEYS = STORAGE_KEYS;
    (window as any).migrateStorageIfNeeded = migrateStorageIfNeeded;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SYH_STORAGE,
        STORAGE_KEYS,
        STORAGE_SCHEMA_VERSION,
        migrateKey,
        migrateStorageIfNeeded
    };
}
