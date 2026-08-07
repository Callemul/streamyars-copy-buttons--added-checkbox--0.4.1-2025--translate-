import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const { validateImportedConfig } = await import('../options/options.ts');

describe('options.ts - validateImportedConfig', () => {
    test('returns false for null/undefined', () => {
        assert.strictEqual(validateImportedConfig(null), false);
        assert.strictEqual(validateImportedConfig(undefined), false);
    });

    test('returns false for non-object', () => {
        assert.strictEqual(validateImportedConfig('string'), false);
        assert.strictEqual(validateImportedConfig(123), false);
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
});