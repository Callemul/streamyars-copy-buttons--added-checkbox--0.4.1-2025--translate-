import assert from 'node:assert';
import { test, describe, beforeEach } from 'node:test';

// Мокаємо global.window для Node.js
global.window = global;

global.chrome = {
    runtime: { lastError: null },
    storage: {
        local: {
            get: (keys, cb) => {},
            set: (items, cb) => {},
            remove: (keys, cb) => {}
        }
    }
};

const { SYH_STORAGE } = await import('../modules/storage.ts');

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

});
