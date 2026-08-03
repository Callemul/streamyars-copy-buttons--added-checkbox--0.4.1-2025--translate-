/**
 * StreamYard Helper - Centralized Storage Adapter
 * Модуль керування сховищем із захистом від розриву контексту розширення (zombie context).
 * ВАЖЛИВО: localStorage fallback видалено навмисно — він ламає синхронізацію між контент-скриптом і попапом.
 */

export const STORAGE_SCHEMA_VERSION = 2;

export interface StoredOptions {
    newTitleSS?: string;
    newTitlePreach?: string;
    ui_locale?: string;
    anti_afk_enabled?: boolean;
    anti_afk_interval_sec?: number;
    auto_heal_enabled?: boolean;
    text_truncation_length?: number;
    show_copy_buttons?: boolean;
    youtube_enabled?: boolean;
    studio_enabled?: boolean;
}

import type { PrayerItem, YTCollectedItem } from './types';

export interface StorageSchema {
    [STORAGE_KEYS.OPTIONS]?: StoredOptions;
    [STORAGE_KEYS.DB]?: Record<string, any>;
    [STORAGE_KEYS.CATEGORIES]?: Record<string, string>;
    [STORAGE_KEYS.CHECKBOX_STATE]?: { date?: string; data?: Record<string, boolean> };
    [STORAGE_KEYS.PRAYERS]?: PrayerItem[];
    [STORAGE_KEYS.YT_COLLECTED]?: YTCollectedItem[];
    [STORAGE_KEYS.STUDIO_ENABLED]?: boolean;
}

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

/**
 * Type-safe helper to build sheet-specific storage keys
 */
export function getSheetStorageKey(sheetId: string, suffix: string): string {
    return `syh:popup:sheet:${sheetId}:${suffix}`;
}

export function getSheetCollectedStorageKey(sheetId: string): string {
    return `syh:popup:collected:${sheetId}`;
}

export const POPUP_SHEET_KEYS = {
    oldList: (sheetId: string) => getSheetStorageKey(sheetId, 'oldList'),
    answered: (sheetId: string) => getSheetStorageKey(sheetId, 'answered'),
    newTelegram: (sheetId: string) => getSheetStorageKey(sheetId, 'newTelegram'),
    finalResultHtml: (sheetId: string) => getSheetStorageKey(sheetId, 'finalResultHtml'),
    statsHtml: (sheetId: string) => getSheetStorageKey(sheetId, 'statsHtml'),
    statsVisible: (sheetId: string) => getSheetStorageKey(sheetId, 'statsVisible'),
    deletedLogHtml: (sheetId: string) => getSheetStorageKey(sheetId, 'deletedLogHtml'),
    deletedLogCount: (sheetId: string) => getSheetStorageKey(sheetId, 'deletedLogCount'),
    deletedLogDetailsVisible: (sheetId: string) => getSheetStorageKey(sheetId, 'deletedLogDetailsVisible'),
    deletedLogDetailsOpen: (sheetId: string) => getSheetStorageKey(sheetId, 'deletedLogDetailsOpen'),
    cleanedLogHtml: (sheetId: string) => getSheetStorageKey(sheetId, 'cleanedLogHtml'),
    cleanedLogCount: (sheetId: string) => getSheetStorageKey(sheetId, 'cleanedLogCount'),
    cleanedLogDetailsVisible: (sheetId: string) => getSheetStorageKey(sheetId, 'cleanedLogDetailsVisible'),
    cleanedLogDetailsOpen: (sheetId: string) => getSheetStorageKey(sheetId, 'cleanedLogDetailsOpen'),
    dividerPos: (sheetId: string) => `syh:popup:divider_pos:${sheetId}`,
};

const EXACT_KEY_MIGRATIONS: Readonly<Record<string, string>> = {
    'syh_yt_collected': STORAGE_KEYS.YT_COLLECTED,
    'syh_yt_button_states': STORAGE_KEYS.YT_BUTTON_STATES,
    'syh_yt_checkbox_state': STORAGE_KEYS.YT_CHECKBOX_STATE,
    'syh_options': STORAGE_KEYS.OPTIONS,
    'db': STORAGE_KEYS.DB,
    'syh_prayers': STORAGE_KEYS.PRAYERS,
    'syh_banner_categories': STORAGE_KEYS.CATEGORIES,
    'syh_checkbox_state': STORAGE_KEYS.CHECKBOX_STATE,
    'syh_stream_charts': STORAGE_KEYS.STATS_CHARTS,
    'syh_installed_at': STORAGE_KEYS.INSTALLED_AT,
    'syh_version': STORAGE_KEYS.VERSION,
    'syh_studio_enabled': STORAGE_KEYS.STUDIO_ENABLED,
    'syh_studio_button_state': STORAGE_KEYS.STUDIO_BUTTON_STATE,
    'syh_studio_checkbox_state': STORAGE_KEYS.STUDIO_CHECKBOX_STATE,
    'syh_studio_video_sheet_map': STORAGE_KEYS.STUDIO_VIDEO_SHEET_MAP,
    'syh_studio_manual_override_log': STORAGE_KEYS.STUDIO_OVERRIDE_LOG,
    'studio_comment_state': 'syh:studio:state'
};

const PREFIX_MIGRATIONS: ReadonlyArray<[string, (suffix: string) => string]> = [
    ['syh_telegram_data__', (suffix) => `${STORAGE_KEYS.TELEGRAM_DATA_PREFIX}${suffix}`],
    ['syh_old_input__', (suffix) => `${STORAGE_KEYS.TELEGRAM_OLD_INPUT_PREFIX}${suffix}`],
    ['studio_comment_state__', (suffix) => `syh:studio:state:${suffix}`],
    ['syh_popup_divider_pos__', (suffix) => `syh:popup:divider_pos:${suffix}`],
    ['syh_collected__', (suffix) => `syh:popup:collected:${suffix}`],
    ['tg_', (suffix) => {
        const parts = suffix.split('__');
        if (parts.length === 2) {
            return `syh:popup:sheet:${parts[1]}:${parts[0]}`;
        }
        return `syh:popup:legacy:${suffix}`;
    }]
];

export function migrateKey(oldKey: string): string {
    if (!oldKey || oldKey.startsWith('syh:')) return oldKey;

    const exactMatch = EXACT_KEY_MIGRATIONS[oldKey];
    if (exactMatch) return exactMatch;

    for (const [prefix, transform] of PREFIX_MIGRATIONS) {
        if (oldKey.startsWith(prefix)) {
            return transform(oldKey.substring(prefix.length));
        }
    }

    return oldKey;
}

export type StorageKeyValues = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS] | string;

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
            const keysArray = Array.isArray(keys) ? keys : [keys];
            chrome.storage.local.get(keysArray, (result) => {
                if (chrome.runtime.lastError) {
                    console.error('[SYH Storage] get error:', chrome.runtime.lastError.message);
                    if (cb) cb({} as T);
                    return;
                }
                if (cb) cb((result || {}) as T);
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
            const migratedItems: Record<string, any> = {};
            for (const [k, v] of Object.entries(items)) {
                migratedItems[migrateKey(k)] = v;
            }
            chrome.storage.local.set(migratedItems, () => {
                if (chrome.runtime.lastError) {
                    console.error('[SYH Storage] set error:', chrome.runtime.lastError.message);
                }
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
            const migratedKeys = Array.isArray(keys) ? (keys as string[]).map(migrateKey) : migrateKey(keys as string);
            chrome.storage.local.remove(migratedKeys, () => {
                if (chrome.runtime.lastError) {
                    console.error('[SYH Storage] remove error:', chrome.runtime.lastError.message);
                }
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
                const keysArray = Array.isArray(keys) ? keys : [keys];
                chrome.storage.local.get(keysArray, (result) => {
                    if (chrome.runtime.lastError) {
                        console.error('[SYH Storage] get error:', chrome.runtime.lastError.message);
                        resolve({} as T);
                        return;
                    }
                    resolve((result || {}) as T);
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
                const migratedItems: Record<string, any> = {};
                for (const [k, v] of Object.entries(items)) {
                    migratedItems[migrateKey(k)] = v;
                }
                chrome.storage.local.set(migratedItems, () => {
                    if (chrome.runtime.lastError) {
                        console.error('[SYH Storage] set error:', chrome.runtime.lastError.message);
                    }
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


