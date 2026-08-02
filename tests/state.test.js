import assert from 'node:assert';
import { test, describe, beforeEach } from 'node:test';

// Мокаємо global.window для Node.js
global.window = global;

// Створюємо мок сховища SYH_STORAGE
let mockStorageStore = {};

const mockStorageAdapter = {
    get: function(keys, callback) {
        const result = {};
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) {
            if (k in mockStorageStore) {
                result[k] = JSON.parse(JSON.stringify(mockStorageStore[k]));
            }
        }
        if (callback) callback(result);
        return Promise.resolve(result);
    },
    set: function(obj, callback) {
        for (const k in obj) {
            mockStorageStore[k] = JSON.parse(JSON.stringify(obj[k]));
        }
        if (callback) callback();
        return Promise.resolve();
    },
    remove: function(keys, callback) {
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) {
            delete mockStorageStore[k];
        }
        if (callback) callback();
        return Promise.resolve();
    }
};

global.chrome = {
    runtime: { id: 'test-extension-id' },
    storage: {
        local: {
            get: (keys, cb) => mockStorageAdapter.get(keys, cb),
            set: (items, cb) => mockStorageAdapter.set(items, cb),
            remove: (keys, cb) => mockStorageAdapter.remove(keys, cb)
        }
    }
};

global.SYH_STORAGE = mockStorageAdapter;
global.window.SYH_STORAGE = mockStorageAdapter;

const { SYH_STATE } = await import('../modules/state.ts');
const { SYH_UTILS } = await import('../modules/utils.ts');
const { STORAGE_KEYS } = await import('../modules/storage.ts');

describe('SYH_STATE tests', () => {

    beforeEach(() => {
        if (SYH_STATE._saveTimer) {
            clearTimeout(SYH_STATE._saveTimer);
            SYH_STATE._saveTimer = null;
        }
        mockStorageStore = {};
        SYH_STATE.itemStates = {};
        SYH_STATE.lastDate = null;
    });

    test('1. getState повертає false за замовчуванням для неіснуючого ключа', () => {
        assert.strictEqual(SYH_STATE.getState('non_existing_key'), false);
    });

    test('2. updateState оновлює стан у пам’яті та зберігає у storage', () => {
        SYH_STATE.updateState('item_1', true, 0);

        assert.strictEqual(SYH_STATE.getState('item_1'), true);

        const saved = mockStorageStore[STORAGE_KEYS.CHECKBOX_STATE];
        assert.ok(saved);
        assert.strictEqual(saved.data['item_1'], true);
        const today = SYH_UTILS.getTodayDateString();
        assert.strictEqual(saved.date, today);
    });

    test('3. updateState підтримує зняття прапорця (false)', () => {
        SYH_STATE.updateState('item_1', true, 0);
        assert.strictEqual(SYH_STATE.getState('item_1'), true);

        SYH_STATE.updateState('item_1', false, 0);
        assert.strictEqual(SYH_STATE.getState('item_1'), false);

        const saved = mockStorageStore[STORAGE_KEYS.CHECKBOX_STATE];
        assert.strictEqual(saved.data['item_1'], false);
    });

    test('4. init успішно завантажує збережений стан, якщо дата збігається з сьогоднішньою', async () => {
        const today = SYH_UTILS.getTodayDateString();
        mockStorageStore[STORAGE_KEYS.CHECKBOX_STATE] = {
            date: today,
            data: { 'banner_1': true, 'banner_2': false }
        };

        await new Promise(resolve => SYH_STATE.init(resolve));

        assert.strictEqual(SYH_STATE.getState('banner_1'), true);
        assert.strictEqual(SYH_STATE.getState('banner_2'), false);
        assert.strictEqual(SYH_STATE.lastDate, today);
    });

    test('5. init очищає застарілий стан (Cache Invalidation), якщо збережена дата не збігається з сьогоднішньою', async () => {
        const today = SYH_UTILS.getTodayDateString();
        const yesterday = '2026-07-23';

        mockStorageStore[STORAGE_KEYS.CHECKBOX_STATE] = {
            date: yesterday,
            data: { 'old_banner': true }
        };

        await new Promise(resolve => SYH_STATE.init(resolve));

        // Стан має бути очищений
        assert.strictEqual(SYH_STATE.getState('old_banner'), false);
        assert.deepStrictEqual(SYH_STATE.itemStates, {});
        assert.strictEqual(SYH_STATE.lastDate, today);
        // Запис у storage також має бути видалений
        assert.strictEqual(mockStorageStore[STORAGE_KEYS.CHECKBOX_STATE], undefined);
    });

    test('6. init обробляє порожнє або відсутнє сховище без помилок', async () => {
        await new Promise(resolve => SYH_STATE.init(resolve));

        assert.deepStrictEqual(SYH_STATE.itemStates, {});
        const today = SYH_UTILS.getTodayDateString();
        assert.strictEqual(SYH_STATE.lastDate, today);
    });

    test('7. init коректно обробляє пошкоджені дані у сховищі', async () => {
        mockStorageStore[STORAGE_KEYS.CHECKBOX_STATE] = "corrupted_string";

        await new Promise(resolve => SYH_STATE.init(resolve));

        assert.deepStrictEqual(SYH_STATE.itemStates, {});
    });

    test('8. init коректно обробляє відсутність адаптера сховища', async () => {
        const origChrome = global.chrome;
        delete global.chrome;
        delete global.SYH_STORAGE;
        delete global.window.SYH_STORAGE;

        let called = false;
        SYH_STATE.init(() => {
            called = true;
        });

        assert.strictEqual(called, true);

        // Відновлюємо adapter
        global.chrome = origChrome;
        global.SYH_STORAGE = mockStorageAdapter;
        global.window.SYH_STORAGE = mockStorageAdapter;
    });

    test('9. saveState записує правильну структуру (date та data)', () => {
        SYH_STATE.itemStates = { 'test_key': true };
        SYH_STATE.saveState(0);

        const saved = mockStorageStore[STORAGE_KEYS.CHECKBOX_STATE];
        assert.ok(saved);
        assert.ok(saved.date);
        assert.strictEqual(saved.data['test_key'], true);
    });

    test('10. ізоляція дат гарантує локальний часовий пояс YYYY-MM-DD', () => {
        const today = SYH_UTILS.getTodayDateString();
        SYH_STATE.updateState('tz_test', true, 0);
        const saved = mockStorageStore[STORAGE_KEYS.CHECKBOX_STATE];
        assert.strictEqual(saved.date, today);
    });

    test('11. onStateLoaded callback викликається при ініціалізації стану', async () => {
        let callbackTriggered = false;
        SYH_STATE.onStateLoaded = (states) => {
            callbackTriggered = true;
        };

        await new Promise(resolve => SYH_STATE.init(resolve));
        assert.strictEqual(callbackTriggered, true);
        SYH_STATE.onStateLoaded = null;
    });

    test('12. saveState підтримує debounce для затримки викликів', async () => {
        let saveCount = 0;
        const origSet = mockStorageAdapter.set;
        mockStorageAdapter.set = function(obj, cb) {
            saveCount++;
            return origSet.call(this, obj, cb);
        };

        SYH_STATE.itemStates = { 'k1': true };
        SYH_STATE.saveState(50);
        SYH_STATE.itemStates = { 'k1': true, 'k2': true };
        SYH_STATE.saveState(50);

        assert.strictEqual(saveCount, 0, 'Запис у storage ще не відбувся до закінчення debounce');

        await new Promise(resolve => setTimeout(resolve, 80));

        assert.strictEqual(saveCount, 1, 'Відбувся лише 1 запис у storage після дебаунсу');
        assert.strictEqual(mockStorageStore[STORAGE_KEYS.CHECKBOX_STATE].data['k2'], true);

        mockStorageAdapter.set = origSet;
    });

});
