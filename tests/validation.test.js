import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const STORAGE_KEYS = {
    OPTIONS: 'syh:core:options',
    DB: 'syh:core:db',
    CATEGORIES: 'syh:core:categories',
    STUDIO_ENABLED: 'syh:core:studio_enabled',
    STUDIO_VIDEO_SHEET_MAP: 'syh:studio:video_sheet_map',
    COLLAPSED_TABS: 'syh:streamyard:collapsed_tabs',
};

function isSectionValid(section) {
    return !section || (typeof section === 'object' && !Array.isArray(section));
}

function validateImportedConfig(data) {
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

function extractImportedItems(imported) {
    const itemsToSave = {};

    const mapKey = (stdKey, ...fallbackKeys) => {
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

describe('validation.ts - isSectionValid', () => {
    test('returns true for null', () => {
        assert.strictEqual(isSectionValid(null), true);
    });

    test('returns true for undefined', () => {
        assert.strictEqual(isSectionValid(undefined), true);
    });

    test('returns true for empty object', () => {
        assert.strictEqual(isSectionValid({}), true);
    });

    test('returns true for valid object', () => {
        assert.strictEqual(isSectionValid({ key: 'value' }), true);
    });

    test('returns false for array', () => {
        assert.strictEqual(isSectionValid([]), false);
        assert.strictEqual(isSectionValid([1, 2, 3]), false);
    });

    test('returns false for primitive values', () => {
        assert.strictEqual(isSectionValid('string'), false);
        assert.strictEqual(isSectionValid(123), false);
        assert.strictEqual(isSectionValid(true), false);
    });
});

describe('validation.ts - validateImportedConfig', () => {
    test('returns false for null', () => {
        assert.strictEqual(validateImportedConfig(null), false);
    });

    test('returns false for undefined', () => {
        assert.strictEqual(validateImportedConfig(undefined), false);
    });

    test('returns false for non-object', () => {
        assert.strictEqual(validateImportedConfig('string'), false);
        assert.strictEqual(validateImportedConfig(123), false);
        assert.strictEqual(validateImportedConfig(true), false);
    });

    test('returns false for array', () => {
        assert.strictEqual(validateImportedConfig([]), false);
    });

    test('returns false for empty object', () => {
        assert.strictEqual(validateImportedConfig({}), false);
    });

    test('returns true when has db key', () => {
        assert.strictEqual(validateImportedConfig({ db: {} }), true);
    });

    test('returns true when has syh_options key', () => {
        assert.strictEqual(validateImportedConfig({ syh_options: {} }), true);
    });

    test('returns true when has options key', () => {
        assert.strictEqual(validateImportedConfig({ options: {} }), true);
    });

    test('returns true when has categories key', () => {
        assert.strictEqual(validateImportedConfig({ categories: {} }), true);
    });

    test('returns true when has studio_enabled key', () => {
        assert.strictEqual(validateImportedConfig({ studio_enabled: true }), true);
    });

    test('returns false when all sections are invalid (arrays)', () => {
        assert.strictEqual(validateImportedConfig({ syh_options: [] }), false);
        assert.strictEqual(validateImportedConfig({ db: [] }), false);
    });

    test('returns true with STORAGE_KEYS.DB', () => {
        assert.strictEqual(validateImportedConfig({ 'syh:core:db': {} }), true);
    });

    test('returns true with STORAGE_KEYS.OPTIONS', () => {
        assert.strictEqual(validateImportedConfig({ 'syh:core:options': {} }), true);
    });

    test('returns true with STORAGE_KEYS.CATEGORIES', () => {
        assert.strictEqual(validateImportedConfig({ 'syh:core:categories': {} }), true);
    });

    test('returns true with STORAGE_KEYS.STUDIO_ENABLED', () => {
        assert.strictEqual(validateImportedConfig({ 'syh:core:studio_enabled': true }), true);
    });

    test('returns false when opts is array but has valid key', () => {
        assert.strictEqual(validateImportedConfig({ syh_options: [], db: {} }), false);
    });

    test('returns false when db is array but has valid key', () => {
        assert.strictEqual(validateImportedConfig({ db: [], syh_options: {} }), false);
    });
});

describe('validation.ts - extractImportedItems', () => {
    test('returns empty object for empty input', () => {
        const result = extractImportedItems({});
        assert.deepStrictEqual(result, {});
    });

    test('maps db key from standard key', () => {
        const result = extractImportedItems({ 'syh:core:db': { data: 'test' } });
        assert.deepStrictEqual(result, { 'syh:core:db': { data: 'test' } });
    });

    test('maps db key from fallback key', () => {
        const result = extractImportedItems({ db: { data: 'test' } });
        assert.deepStrictEqual(result, { 'syh:core:db': { data: 'test' } });
    });

    test('maps options from syh_options', () => {
        const result = extractImportedItems({ syh_options: { foo: 'bar' } });
        assert.deepStrictEqual(result, { 'syh:core:options': { foo: 'bar' } });
    });

    test('maps options from options fallback', () => {
        const result = extractImportedItems({ options: { foo: 'bar' } });
        assert.deepStrictEqual(result, { 'syh:core:options': { foo: 'bar' } });
    });

    test('maps studio_enabled', () => {
        const result = extractImportedItems({ studio_enabled: true });
        assert.deepStrictEqual(result, { 'syh:core:studio_enabled': true });
    });

    test('maps categories', () => {
        const result = extractImportedItems({ categories: { 'a': 'b' } });
        assert.deepStrictEqual(result, { 'syh:core:categories': { 'a': 'b' } });
    });

    test('maps studio_video_sheet_map', () => {
        const result = extractImportedItems({ studio_video_sheet_map: { 'video1': 'sheet1' } });
        assert.deepStrictEqual(result, { 'syh:studio:video_sheet_map': { 'video1': 'sheet1' } });
    });

    test('maps collapsed_tabs', () => {
        const result = extractImportedItems({ collapsed_tabs: ['tab1', 'tab2'] });
        assert.deepStrictEqual(result, { 'syh:streamyard:collapsed_tabs': ['tab1', 'tab2'] });
    });

    test('preserves syh: prefixed keys', () => {
        const result = extractImportedItems({ 'syh:custom:key': 'value' });
        assert.deepStrictEqual(result, { 'syh:custom:key': 'value' });
    });

    test('does not preserve non-syh keys', () => {
        const result = extractImportedItems({ 'other:key': 'value' });
        assert.deepStrictEqual(result, {});
    });

    test('handles multiple keys correctly', () => {
        const input = {
            db: { data: 1 },
            syh_options: { opt: 2 },
            studio_enabled: false,
            'syh:custom': 'custom'
        };
        const result = extractImportedItems(input);
        assert.strictEqual(result['syh:core:db'].data, 1);
        assert.strictEqual(result['syh:core:options'].opt, 2);
        assert.strictEqual(result['syh:core:studio_enabled'], false);
        assert.strictEqual(result['syh:custom'], 'custom');
    });

    test('standard key takes precedence over fallback', () => {
        const result = extractImportedItems({
            'syh:core:db': { standard: true },
            db: { fallback: true }
        });
        assert.strictEqual(result['syh:core:db'].standard, true);
        assert.strictEqual(result['syh:core:db'].fallback, undefined);
    });
});