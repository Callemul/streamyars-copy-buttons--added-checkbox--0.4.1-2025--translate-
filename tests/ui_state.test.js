import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

// Global mocks for Node.js environment
global.window = global;
global.document = {
    querySelector: () => null,
    querySelectorAll: () => []
};

const { SYH_UI_STATE } = await import('../modules/ui_state.ts');
const { SYH_UI } = await import('../modules/ui_core.ts');

describe('UI State & Decoupling Tests', () => {
    test('1. SYH_UI proxies properties to SYH_UI_STATE correctly', () => {
        SYH_UI.activeFilter = 'prayer';
        assert.equal(SYH_UI_STATE.activeFilter, 'prayer');
        assert.equal(SYH_UI.activeFilter, 'prayer');

        SYH_UI.searchQuery = 'тестовий запит';
        assert.equal(SYH_UI_STATE.searchQuery, 'тестовий запит');
        assert.equal(SYH_UI.searchQuery, 'тестовий запит');
    });

    test('2. SYH_UI_STATE maintains isolated prayer and category caches', () => {
        SYH_UI.prayersCache = [{ author: 'Іван', text: 'Молитва про мир', type: 'prayer' }];
        assert.equal(SYH_UI_STATE.prayersCache.length, 1);
        assert.equal(SYH_UI_STATE.prayersCache[0].author, 'Іван');

        SYH_UI.bannerCategoriesCache = { 'Питання #1': 'stream' };
        assert.equal(SYH_UI_STATE.bannerCategoriesCache['Питання #1'], 'stream');
    });
});