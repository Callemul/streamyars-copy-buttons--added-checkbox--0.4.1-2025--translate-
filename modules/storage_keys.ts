/**
 * StreamYard Helper - Storage Key Definitions & Key Migration
 * Винесено з `storage.ts`, щоб ізолювати чисту логіку ключів та міграцій
 * від адаптера сховища (`SYH_STORAGE`). Це знижує розмір `storage.ts` і
 * усуває зациклення навантаження (ключі/міграції не залежать від адаптера).
 */

import type { PrayerItem, YTCollectedItem } from './types';

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
    onChanged(callback: (changes: Record<string, { oldValue?: any; newValue?: any }>, areaName: string) => void): () => void;
}

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
    compact_secondary_tabs_default?: boolean;
}

export interface StorageSchema {
    [STORAGE_KEYS.OPTIONS]?: StoredOptions;
    [STORAGE_KEYS.DB]?: Record<string, any>;
    [STORAGE_KEYS.CATEGORIES]?: Record<string, string>;
    [STORAGE_KEYS.CHECKBOX_STATE]?: { date?: string; data?: Record<string, boolean> };
    [STORAGE_KEYS.PRAYERS]?: PrayerItem[];
    [STORAGE_KEYS.YT_COLLECTED]?: YTCollectedItem[];
    [STORAGE_KEYS.STUDIO_ENABLED]?: boolean;
    [STORAGE_KEYS.COLLAPSED_TABS]?: string[];
    [STORAGE_KEYS.STUDIO_BUTTON_STATE]?: Record<string, string>;
    [STORAGE_KEYS.STUDIO_CHECKBOX_STATE]?: Record<string, boolean>;
    [STORAGE_KEYS.STUDIO_VIDEO_SHEET_MAP]?: Record<string, string>;
    [STORAGE_KEYS.STUDIO_OVERRIDE_LOG]?: Record<string, any>;
    [STORAGE_KEYS.POPUP_ACTIVE_TAB]?: string;
    [STORAGE_KEYS.POPUP_ACTIVE_SUBTAB]?: string;
    [STORAGE_KEYS.POPUP_SCROLL_POSITIONS]?: Record<string, number>;
    [STORAGE_KEYS.POPUP_TEXTAREA_SIZES]?: Record<string, { width?: number; height?: number }>;
    [STORAGE_KEYS.INSTALLED_AT]?: number;
    [STORAGE_KEYS.VERSION]?: string;
    [STORAGE_KEYS.AUTO_BACKUP_SNAPSHOT]?: { timestamp: number; timestampIso: string; data: Record<string, any> };
    [key: string]: any;
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

    // StreamYard UI
    COLLAPSED_TABS: 'syh:streamyard:collapsed_tabs',

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
    STATS_CHARTS: 'syh:stats:charts',

    // Popup UI State
    POPUP_ACTIVE_TAB: 'syh:popup:active_tab',
    POPUP_ACTIVE_SUBTAB: 'syh:popup:active_subtab',
    POPUP_SCROLL_POSITIONS: 'syh:popup:scroll_positions',
    POPUP_TEXTAREA_SIZES: 'syh:popup:textarea_sizes',
    POPUP_TRANSLIT_OLD: 'syh:popup:translit_old',
    POPUP_TRANSLIT_NEW: 'syh:popup:translit_new',
    // Retention & Backup
    AUTO_BACKUP_SNAPSHOT: 'syh:retention:auto_backup_snapshot',
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

const _createSheetKey = (suffix: string) => (sheetId: string): string => getSheetStorageKey(sheetId, suffix);

export const POPUP_SHEET_KEYS = {
    oldList: _createSheetKey('oldList'),
    answered: _createSheetKey('answered'),
    newTelegram: _createSheetKey('newTelegram'),
    finalResultHtml: _createSheetKey('finalResultHtml'),
    statsHtml: _createSheetKey('statsHtml'),
    statsVisible: _createSheetKey('statsVisible'),
    deletedLogHtml: _createSheetKey('deletedLogHtml'),
    deletedLogCount: _createSheetKey('deletedLogCount'),
    deletedLogDetailsVisible: _createSheetKey('deletedLogDetailsVisible'),
    deletedLogDetailsOpen: _createSheetKey('deletedLogDetailsOpen'),
    cleanedLogHtml: _createSheetKey('cleanedLogHtml'),
    cleanedLogCount: _createSheetKey('cleanedLogCount'),
    cleanedLogDetailsVisible: _createSheetKey('cleanedLogDetailsVisible'),
    cleanedLogDetailsOpen: _createSheetKey('cleanedLogDetailsOpen'),
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
    'studio_comment_state': 'syh:studio:state',

    // Popup state key migrations
    'tg_active_tab': STORAGE_KEYS.POPUP_ACTIVE_TAB,
    'syh:popup:legacy:active_tab': STORAGE_KEYS.POPUP_ACTIVE_TAB,
    'tg_active_subtab': STORAGE_KEYS.POPUP_ACTIVE_SUBTAB,
    'syh:popup:legacy:active_subtab': STORAGE_KEYS.POPUP_ACTIVE_SUBTAB,
    'tg_scroll_positions': STORAGE_KEYS.POPUP_SCROLL_POSITIONS,
    'syh:popup:legacy:scroll_positions': STORAGE_KEYS.POPUP_SCROLL_POSITIONS,
    'tg_textarea_sizes': STORAGE_KEYS.POPUP_TEXTAREA_SIZES,
    'syh:popup:legacy:textarea_sizes': STORAGE_KEYS.POPUP_TEXTAREA_SIZES,
    'tg_translit_old': STORAGE_KEYS.POPUP_TRANSLIT_OLD,
    'syh:popup:legacy:translit_old': STORAGE_KEYS.POPUP_TRANSLIT_OLD,
    'tg_translit_new': STORAGE_KEYS.POPUP_TRANSLIT_NEW,
    'syh:popup:legacy:translit_new': STORAGE_KEYS.POPUP_TRANSLIT_NEW,
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

export function migrateItemKeys(items: Record<string, any>): Record<string, any> {
    const migratedItems: Record<string, any> = {};
    for (const [k, v] of Object.entries(items)) {
        migratedItems[migrateKey(k)] = v;
    }
    return migratedItems;
}

export function migrateKeys(keys: StorageKeyValues | StorageKeyValues[]): string | string[] {
    return Array.isArray(keys) ? (keys as string[]).map(migrateKey) : migrateKey(keys as string);
}

export function prepareQueryKeys(keys: StorageKeyValues | StorageKeyValues[]): { origKeys: string[]; queryKeys: string[] } {
    const origKeys = Array.isArray(keys) ? (keys as string[]) : [keys as string];
    const keySet = new Set<string>();
    origKeys.forEach(k => {
        if (k) {
            keySet.add(k);
            const m = migrateKey(k);
            if (m) keySet.add(m);
        }
    });
    return { origKeys, queryKeys: Array.from(keySet) };
}

export function processGetResult<T>(origKeys: string[], rawResult: Record<string, any>): T {
    const out: Record<string, any> = { ...rawResult };
    if (rawResult) {
        origKeys.forEach(k => {
            const m = migrateKey(k);
            const val = rawResult[k] ?? (m ? rawResult[m] : undefined);
            if (val !== undefined) {
                out[k] = val;
                if (m) out[m] = val;
            }
        });
    }
    return out as T;
}
