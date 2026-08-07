// options/validation.ts
import { STORAGE_KEYS } from '../modules/storage';

export function isSectionValid(section: any): boolean {
    return !section || (typeof section === 'object' && !Array.isArray(section));
}

export function validateImportedConfig(data: any): boolean {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return false;
    }
    const hasDb = 'db' in data || STORAGE_KEYS.DB in data;
    const hasOptions = 'syh_options' in data || STORAGE_KEYS.OPTIONS in data || 'options' in data;
    const hasCategories = 'categories' in data || STORAGE_KEYS.CATEGORIES in data;
    const hasStudioEnabled = 'studio_enabled' in data || STORAGE_KEYS.STUDIO_ENABLED in data;

    if (!hasDb && !hasOptions && !hasCategories && !hasStudioEnabled) {
        return false;
    }

    const opts = data.syh_options || data[STORAGE_KEYS.OPTIONS] || data.options;
    if (!isSectionValid(opts)) return false;

    const db = data.db || data[STORAGE_KEYS.DB];
    if (!isSectionValid(db)) return false;

    return true;
}

export function extractImportedItems(imported: Record<string, any>): Record<string, any> {
    const itemsToSave: Record<string, any> = {};

    const mapKey = (stdKey: string, ...fallbackKeys: string[]) => {
        const foundKey = [stdKey, ...fallbackKeys].find(k => k in imported);
        if (foundKey !== undefined) {
            itemsToSave[stdKey] = imported[foundKey];
        }
    };

    mapKey(STORAGE_KEYS.DB, 'db');
    mapKey(STORAGE_KEYS.OPTIONS, 'syh_options', 'options');
    mapKey(STORAGE_KEYS.STUDIO_ENABLED, 'studio_enabled');
    mapKey(STORAGE_KEYS.CATEGORIES, 'categories');
    mapKey(STORAGE_KEYS.STUDIO_VIDEO_SHEET_MAP, 'studio_video_sheet_map');
    mapKey(STORAGE_KEYS.COLLAPSED_TABS, 'collapsed_tabs');

    for (const key of Object.keys(imported)) {
        if (key.startsWith('syh:')) {
            itemsToSave[key] = imported[key];
        }
    }

    return itemsToSave;
}