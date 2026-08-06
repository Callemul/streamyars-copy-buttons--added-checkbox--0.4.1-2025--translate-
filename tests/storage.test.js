import assert from 'node:assert';
import { test, describe, beforeEach } from 'node:test';

// Мокаємо global.window для Node.js
global.window = global;

global.chrome = {
    runtime: { id: 'test-extension-id', lastError: null },
    storage: {
        local: {
            get: (keys, cb) => {},
            set: (items, cb) => {},
            remove: (keys, cb) => {}
        }
    }
};

const { SYH_STORAGE, STORAGE_KEYS, migrateKey, migrateStorageIfNeeded, STORAGE_SCHEMA_VERSION } = await import('../modules/storage.ts');

describe('SYH_STORAGE tests', () => {

    beforeEach(() => {
        global.chrome.runtime.lastError = null;
        global.chrome.storage.local.get = (keys, cb) => {};
        global.chrome.storage.local.set = (items, cb) => {};
        global.chrome.storage.local.remove = (keys, cb) => {};
        
        // Mock localStorage to ensure it's not being used and throws if it is
        global.localStorage = {
            setItem: () => { throw new Error('localStorage is strictly mocked disabled'); },
            getItem: () => { throw new Error('localStorage is strictly mocked disabled'); },
            removeItem: () => { throw new Error('localStorage is strictly mocked disabled'); }
        };
    });

    test('1: isChromeStorageAvailable() повертає true без chrome.runtime.id', () => {
        assert.strictEqual(SYH_STORAGE.isChromeStorageAvailable(), true);
    });

    test('2: isChromeStorageAvailable() повертає false якщо chrome.storage відсутній', () => {
        const origStorage = global.chrome.storage;
        delete global.chrome.storage;
        assert.strictEqual(SYH_STORAGE.isChromeStorageAvailable(), false);
        global.chrome.storage = origStorage;
    });

    test('3: get() повертає {} при помилці lastError — без звернення до localStorage', () => {
        let callbackCalled = false;
        
        global.chrome.storage.local.get = (keys, cb) => {
            global.chrome.runtime.lastError = { message: 'Fake error' };
            cb();
        };

        SYH_STORAGE.get('test_key', (result) => {
            callbackCalled = true;
            assert.deepStrictEqual(result, {});
        });
        
        assert.strictEqual(callbackCalled, true);
    });

    test('4: set() при недоступному chrome — log error, НЕ пише в localStorage', () => {
        const origChrome = global.chrome;
        delete global.chrome;
        
        let callbackCalled = false;

        SYH_STORAGE.set({ 'test': 1 }, () => {
            callbackCalled = true;
        });

        assert.strictEqual(callbackCalled, true);
        
        global.chrome = origChrome;
    });

    test('5: get() успішно читає дані через мок chrome.storage.local', () => {
        let callbackCalled = false;
        
        global.chrome.storage.local.get = (keys, cb) => {
            cb({ 'test_key': 'hello' });
        };

        SYH_STORAGE.get('test_key', (result) => {
            callbackCalled = true;
            assert.deepStrictEqual(result, { 'test_key': 'hello' });
        });
        
        assert.strictEqual(callbackCalled, true);
    });

    test('6: set() успішно записує дані через мок chrome.storage.local', () => {
        let callbackCalled = false;
        let setItem = null;
        
        global.chrome.storage.local.set = (items, cb) => {
            setItem = items;
            cb();
        };

        SYH_STORAGE.set({ 'test_key': 'hello' }, () => {
            callbackCalled = true;
        });

        assert.strictEqual(callbackCalled, true);
        assert.deepStrictEqual(setItem, { 'test_key': 'hello' });
    });

    test('7: migrateKey() коректно трансформує старі ключі у схему syh:*', () => {
        assert.strictEqual(migrateKey('syh_yt_collected'), 'syh:popup:yt:collected');
        assert.strictEqual(migrateKey('syh_options'), 'syh:core:options');
        assert.strictEqual(migrateKey('db'), 'syh:core:db');
        assert.strictEqual(migrateKey('syh_prayers'), 'syh:popup:prayers');
        assert.strictEqual(migrateKey('syh_banner_categories'), 'syh:core:categories');
        assert.strictEqual(migrateKey('syh_checkbox_state'), 'syh:core:checkbox_state');
        assert.strictEqual(migrateKey('syh_stream_charts'), 'syh:stats:charts');
        assert.strictEqual(migrateKey('syh_installed_at'), 'syh:core:installed_at');
        assert.strictEqual(migrateKey('syh_version'), 'syh:core:version');
        assert.strictEqual(migrateKey('syh_studio_enabled'), 'syh:core:studio_enabled');
        assert.strictEqual(migrateKey('syh_studio_button_state'), 'syh:studio:button_state');
        assert.strictEqual(migrateKey('syh_studio_checkbox_state'), 'syh:studio:checkbox_state');
        assert.strictEqual(migrateKey('syh_studio_video_sheet_map'), 'syh:studio:video_sheet_map');
        assert.strictEqual(migrateKey('syh_studio_manual_override_log'), 'syh:studio:override_log');
        
        // Ключі стану попапу
        assert.strictEqual(migrateKey('tg_active_tab'), 'syh:popup:active_tab');
        assert.strictEqual(migrateKey('tg_active_subtab'), 'syh:popup:active_subtab');
        assert.strictEqual(migrateKey('tg_scroll_positions'), 'syh:popup:scroll_positions');
        
        // Префіксні динамічні ключі
        assert.strictEqual(migrateKey('syh_telegram_data__vp_ss'), 'syh:popup:telegram:data:vp_ss');
        assert.strictEqual(migrateKey('syh_old_input__vp_ss'), 'syh:popup:telegram:oldInput:vp_ss');
        assert.strictEqual(migrateKey('studio_comment_state__v123'), 'syh:studio:state:v123');
        assert.strictEqual(migrateKey('syh_popup_divider_pos__vp_ss'), 'syh:popup:divider_pos:vp_ss');
        assert.strictEqual(migrateKey('syh_collected__vp_ss'), 'syh:popup:collected:vp_ss');
    });

    test('8: migrateStorageIfNeeded() переносить старі ключі у нові, видаляє старі та встановлює _schema_version', async () => {
        let store = {
            'syh_yt_collected': ['item1'],
            'syh_options': { youtube_enabled: true },
            'syh_telegram_data__vp_ss': 'data1',
            'db': { title: 'test' }
        };

        global.chrome.storage.local.get = (keys, cb) => cb(store);
        global.chrome.storage.local.set = (items, cb) => {
            Object.assign(store, items);
            if (cb) cb();
        };
        global.chrome.storage.local.remove = (keys, cb) => {
            const arr = Array.isArray(keys) ? keys : [keys];
            arr.forEach(k => delete store[k]);
            if (cb) cb();
        };

        await migrateStorageIfNeeded();

        // Перевіряємо створення нових ключів
        assert.deepStrictEqual(store['syh:popup:yt:collected'], ['item1']);
        assert.deepStrictEqual(store['syh:core:options'], { youtube_enabled: true });
        assert.strictEqual(store['syh:popup:telegram:data:vp_ss'], 'data1');
        assert.deepStrictEqual(store['syh:core:db'], { title: 'test' });
        assert.strictEqual(store['_schema_version'], STORAGE_SCHEMA_VERSION);

        // Перевіряємо видалення старих ключів
        assert.strictEqual(store['syh_yt_collected'], undefined);
        assert.strictEqual(store['syh_options'], undefined);
        assert.strictEqual(store['syh_telegram_data__vp_ss'], undefined);
        assert.strictEqual(store['db'], undefined);
    });

    test('9: migrateStorageIfNeeded() є ідемпотентною (повторний запуск — no-op)', async () => {
        let store = {
            '_schema_version': STORAGE_SCHEMA_VERSION,
            'syh:core:options': { youtube_enabled: true }
        };

        let setCalled = false;
        let removeCalled = false;

        global.chrome.storage.local.get = (keys, cb) => cb(store);
        global.chrome.storage.local.set = (items, cb) => {
            setCalled = true;
            if (cb) cb();
        };
        global.chrome.storage.local.remove = (keys, cb) => {
            removeCalled = true;
            if (cb) cb();
        };

        await migrateStorageIfNeeded();

        assert.strictEqual(setCalled, false);
        assert.strictEqual(removeCalled, false);
    });

    test('10: getAsync(), setAsync(), removeAsync() work correctly with promises', async () => {
        let store = {};

        global.chrome.storage.local.get = (keys, cb) => {
            const res = {};
            const keysArr = Array.isArray(keys) ? keys : [keys];
            keysArr.forEach(k => { if (store[k] !== undefined) res[k] = store[k]; });
            cb(res);
        };
        global.chrome.storage.local.set = (items, cb) => {
            Object.assign(store, items);
            if (cb) cb();
        };
        global.chrome.storage.local.remove = (keys, cb) => {
            const arr = Array.isArray(keys) ? keys : [keys];
            arr.forEach(k => delete store[k]);
            if (cb) cb();
        };

        await SYH_STORAGE.setAsync({ 'syh:test:key': 42 });
        const res = await SYH_STORAGE.getAsync('syh:test:key');
        assert.strictEqual(res['syh:test:key'], 42);

        await SYH_STORAGE.removeAsync('syh:test:key');
        const emptyRes = await SYH_STORAGE.getAsync('syh:test:key');
        assert.strictEqual(emptyRes['syh:test:key'], undefined);
    });

    test('11: updateAsync() atomically modifies storage value', async () => {
        let store = { 'syh:test:counter': 5 };

        global.chrome.storage.local.get = (keys, cb) => {
            const res = {};
            const keysArr = Array.isArray(keys) ? keys : [keys];
            keysArr.forEach(k => { if (store[k] !== undefined) res[k] = store[k]; });
            cb(res);
        };
        global.chrome.storage.local.set = (items, cb) => {
            Object.assign(store, items);
            if (cb) cb();
        };

        const updated = await SYH_STORAGE.updateAsync('syh:test:counter', (current) => {
            const val = current['syh:test:counter'] || 0;
            return { 'syh:test:counter': val + 1 };
        });

        assert.strictEqual(updated['syh:test:counter'], 6);
        assert.strictEqual(store['syh:test:counter'], 6);
    });

});
