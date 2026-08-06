import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { validateImportedConfig } from '../options/options.ts';

describe('options/options.ts validateImportedConfig Tests', () => {
    test('1. validateImportedConfig returns true for valid JSON config with db and options', () => {
        const validConfig = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            db: { newTitleSS: 'Test SS' },
            syh_options: { show_copy_buttons: true }
        };
        assert.equal(validateImportedConfig(validConfig), true);
    });

    test('2. validateImportedConfig returns true for full storage state export', () => {
        const fullStateConfig = {
            'syh:core:options': { show_copy_buttons: true },
            'syh:core:db': { newTitleSS: 'Test' }
        };
        assert.equal(validateImportedConfig(fullStateConfig), true);
    });

    test('3. validateImportedConfig returns false for invalid structure or null', () => {
        assert.equal(validateImportedConfig(null), false);
        assert.equal(validateImportedConfig([]), false);
        assert.equal(validateImportedConfig('invalid string'), false);
        assert.equal(validateImportedConfig({ unknown_key: 123 }), false);
    });
});
