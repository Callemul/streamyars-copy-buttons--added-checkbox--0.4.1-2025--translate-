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

    test('4. extractImportedItems extracts db, options, studio_enabled, and syh: prefix keys', async () => {
        const { OptionsController } = await import('../options/options.ts');
        const importedData = {
            db: { newTitleSS: 'SS' },
            options: { show_copy_buttons: false },
            'syh:popup:active_tab': 'tab-prayers'
        };
        const controller = Object.create(OptionsController.prototype);
        const extracted = controller.extractImportedItems(importedData);

        assert.deepEqual(extracted['syh:core:db'], { newTitleSS: 'SS' });
        assert.deepEqual(extracted['syh:core:options'], { show_copy_buttons: false });
        assert.equal(extracted['syh:popup:active_tab'], 'tab-prayers');
    });
});
