// Characterization tests for the public `SYH_STORAGE` adapter contract.
//
// `modules/storage.ts` is fallow's #1 refactoring target (fan-in 68), so the
// adapter surface is pinned here BEFORE the split: every behaviour asserted in
// this file must stay byte-for-byte identical afterwards. In particular the
// suite locks the *dynamic `this` dispatch* of the adapter object — methods call
// `this.isChromeStorageAvailable()` / `this.remove()` / `this.getAsync()`, so a
// consumer may shadow one method and expect the others to honour the override.

import assert from 'node:assert';
import { test, describe, beforeEach } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock();

const { SYH_STORAGE } = await import('../modules/storage/storage.ts');

/** Run `fn` with console.error silenced, returning everything it logged. */
function captureConsoleError(fn) {
    const original = console.error;
    const logged = [];
    console.error = (...args) => { logged.push(args); };
    try {
        return { result: fn(), logged };
    } finally {
        console.error = original;
    }
}

describe('SYH_STORAGE — availability guard', () => {
    beforeEach(() => { installChromeMock(); });

    test('1: доступне, коли є chrome.runtime.id та chrome.storage.local', () => {
        assert.strictEqual(SYH_STORAGE.isChromeStorageAvailable(), true);
    });

    test('2: недоступне без chrome.storage', () => {
        delete global.chrome.storage;
        assert.strictEqual(SYH_STORAGE.isChromeStorageAvailable(), false);
    });

    test('3: недоступне без chrome.runtime.id (контекст інвалідовано)', () => {
        global.chrome.runtime.id = undefined;
        assert.strictEqual(SYH_STORAGE.isChromeStorageAvailable(), false);
    });

    test('4: недоступне, коли chrome взагалі відсутній', () => {
        const orig = global.chrome;
        delete global.chrome;
        try {
            assert.strictEqual(SYH_STORAGE.isChromeStorageAvailable(), false);
        } finally {
            global.chrome = orig;
        }
    });

    test('4b: throwing getter chrome.runtime.id дає false без винятку', () => {
        const runtime = {};
        Object.defineProperty(runtime, 'id', {
            configurable: true,
            get() { throw new Error('Extension context invalidated.'); }
        });
        Object.defineProperty(globalThis, 'chrome', {
            value: { runtime, storage: { local: {} } },
            configurable: true,
            writable: true
        });

        assert.doesNotThrow(() => SYH_STORAGE.isChromeStorageAvailable());
        assert.strictEqual(SYH_STORAGE.isChromeStorageAvailable(), false);
    });
});

describe('SYH_STORAGE — get / set / remove (callback API)', () => {
    beforeEach(() => { installChromeMock(); });

    test('5: get() віддає {} синхронно, коли сховище недоступне', () => {
        delete global.chrome.storage;
        let called = false;
        SYH_STORAGE.get('any_key', (res) => {
            called = true;
            assert.deepStrictEqual(res, {});
        });
        assert.strictEqual(called, true, 'callback має бути викликаний синхронно');
    });

    test('6: get() віддає {} при chrome.runtime.lastError', () => {
        global.chrome.storage.local.get = (_keys, cb) => {
            global.chrome.runtime.lastError = { message: 'boom' };
            cb({ 'k': 'v' });
        };
        let seen;
        SYH_STORAGE.get('k', (res) => { seen = res; });
        assert.deepStrictEqual(seen, {});
    });

    test('7: get() запитує і легасі-ключ, і мігрований, а результат містить обидва', () => {
        let askedFor = null;
        global.chrome.storage.local.get = (keys, cb) => {
            askedFor = keys;
            cb({ 'syh:core:options': { youtube_enabled: true } });
        };

        let seen;
        SYH_STORAGE.get('syh_options', (res) => { seen = res; });

        assert.deepStrictEqual(askedFor, ['syh_options', 'syh:core:options']);
        assert.deepStrictEqual(seen['syh_options'], { youtube_enabled: true });
        assert.deepStrictEqual(seen['syh:core:options'], { youtube_enabled: true });
    });

    test('8: get() не кидає, якщо chrome.storage.local.get кинув виняток', () => {
        global.chrome.storage.local.get = () => { throw new Error('context invalidated'); };
        let seen;
        assert.doesNotThrow(() => {
            SYH_STORAGE.get('k', (res) => { seen = res; });
        });
        assert.deepStrictEqual(seen, {});
    });

    test('9: set() мігрує легасі-ключі перед записом', () => {
        let written = null;
        global.chrome.storage.local.set = (items, cb) => { written = items; cb(); };

        SYH_STORAGE.set({ 'syh_options': { a: 1 }, 'db': { b: 2 } });

        assert.deepStrictEqual(written, {
            'syh:core:options': { a: 1 },
            'syh:core:db': { b: 2 }
        });
    });

    test('10: set() кличе callback навіть коли сховище недоступне', () => {
        delete global.chrome.storage;
        let called = false;
        SYH_STORAGE.set({ x: 1 }, () => { called = true; });
        assert.strictEqual(called, true);
    });

    test('11: set() кличе callback, якщо chrome кинув виняток', () => {
        global.chrome.storage.local.set = () => { throw new Error('nope'); };
        let called = false;
        SYH_STORAGE.set({ x: 1 }, () => { called = true; });
        assert.strictEqual(called, true);
    });

    test('12: remove() мігрує ключі (масив і одиничний)', () => {
        const removed = [];
        global.chrome.storage.local.remove = (keys, cb) => { removed.push(keys); cb(); };

        SYH_STORAGE.remove(['syh_options', 'syh_prayers']);
        SYH_STORAGE.remove('db');

        assert.deepStrictEqual(removed[0], ['syh:core:options', 'syh:popup:prayers']);
        assert.strictEqual(removed[1], 'syh:core:db');
    });

    test('13: remove() кличе callback при недоступному сховищі та при винятку', () => {
        delete global.chrome.storage;
        let a = false;
        SYH_STORAGE.remove('k', () => { a = true; });
        assert.strictEqual(a, true);

        installChromeMock();
        global.chrome.storage.local.remove = () => { throw new Error('nope'); };
        let b = false;
        SYH_STORAGE.remove('k', () => { b = true; });
        assert.strictEqual(b, true);
    });
});

describe('SYH_STORAGE — promise API', () => {
    beforeEach(() => { installChromeMock(); });

    test('14: getAsync() резолвиться в {} коли недоступно / lastError', async () => {
        delete global.chrome.storage;
        assert.deepStrictEqual(await SYH_STORAGE.getAsync('k'), {});

        installChromeMock();
        global.chrome.storage.local.get = (_keys, cb) => {
            global.chrome.runtime.lastError = { message: 'boom' };
            cb({ k: 1 });
        };
        assert.deepStrictEqual(await SYH_STORAGE.getAsync('k'), {});
    });

    test('15: getAsync() логує та резолвиться в {} при винятку', async () => {
        global.chrome.storage.local.get = () => { throw new Error('context invalidated'); };
        const { result, logged } = captureConsoleError(() => SYH_STORAGE.getAsync('k'));
        assert.deepStrictEqual(await result, {});
        assert.strictEqual(logged.length, 1);
        assert.match(String(logged[0][0]), /SYH Storage/);
    });

    test('16: setAsync() резолвиться при недоступному сховищі та при винятку', async () => {
        delete global.chrome.storage;
        await SYH_STORAGE.setAsync({ a: 1 });

        installChromeMock();
        global.chrome.storage.local.set = () => { throw new Error('nope'); };
        const { result, logged } = captureConsoleError(() => SYH_STORAGE.setAsync({ a: 1 }));
        await result;
        assert.strictEqual(logged.length, 1);
    });

    test('17: setAsync() мігрує ключі так само, як set()', async () => {
        let written = null;
        global.chrome.storage.local.set = (items, cb) => { written = items; cb(); };
        await SYH_STORAGE.setAsync({ 'tg_active_tab': 'tab-telegram' });
        assert.deepStrictEqual(written, { 'syh:popup:active_tab': 'tab-telegram' });
    });

    test('18: removeAsync() делегує у this.remove (динамічний диспатч)', async () => {
        const calls = [];
        const proxy = Object.create(SYH_STORAGE);
        proxy.remove = function (keys, cb) { calls.push(keys); cb(); };

        await proxy.removeAsync('syh:test:key');

        assert.deepStrictEqual(calls, ['syh:test:key']);
    });

    test('19: updateAsync() читає -> трансформує -> пише і повертає новий стан', async () => {
        const store = { 'syh:test:counter': 5 };
        global.chrome.storage.local.get = (keys, cb) => {
            const out = {};
            for (const k of (Array.isArray(keys) ? keys : [keys])) {
                if (store[k] !== undefined) out[k] = store[k];
            }
            cb(out);
        };
        global.chrome.storage.local.set = (items, cb) => { Object.assign(store, items); cb(); };

        const updated = await SYH_STORAGE.updateAsync('syh:test:counter', (cur) => ({
            'syh:test:counter': (cur['syh:test:counter'] || 0) + 1
        }));

        assert.strictEqual(updated['syh:test:counter'], 6);
        assert.strictEqual(store['syh:test:counter'], 6);
    });

    test('20: updateAsync() підтримує async-трансформер', async () => {
        global.chrome.storage.local.get = (_keys, cb) => cb({ 'syh:test:v': 1 });
        let written = null;
        global.chrome.storage.local.set = (items, cb) => { written = items; cb(); };

        const updated = await SYH_STORAGE.updateAsync('syh:test:v', async (cur) => ({
            'syh:test:v': cur['syh:test:v'] + 41
        }));

        assert.strictEqual(updated['syh:test:v'], 42);
        assert.deepStrictEqual(written, { 'syh:test:v': 42 });
    });
});

describe('SYH_STORAGE — onChanged', () => {
    beforeEach(() => { installChromeMock(); });

    test('21: реєструє слухача, коли сховище доступне', () => {
        const added = [];
        global.chrome.storage.onChanged.addListener = (cb) => added.push(cb);

        const listener = () => {};
        SYH_STORAGE.onChanged(listener);

        assert.deepStrictEqual(added, [listener]);
    });

    test('22: мовчазний no-op, коли сховище недоступне', () => {
        delete global.chrome.storage;
        assert.doesNotThrow(() => SYH_STORAGE.onChanged(() => {}));
    });

    test('23: перехоплює виняток addListener і лише попереджає', () => {
        global.chrome.storage.onChanged.addListener = () => { throw new Error('detached'); };
        const originalWarn = console.warn;
        const warnings = [];
        console.warn = (...args) => warnings.push(args);
        try {
            assert.doesNotThrow(() => SYH_STORAGE.onChanged(() => {}));
        } finally {
            console.warn = originalWarn;
        }
        assert.strictEqual(warnings.length, 1);
    });

    test('23b: повертає ідемпотентний unsubscribe, що викликає removeListener', () => {
        const removed = [];
        global.chrome.storage.onChanged.addListener = () => {};
        global.chrome.storage.onChanged.removeListener = (cb) => removed.push(cb);

        const listener = () => {};
        const unsubscribe = SYH_STORAGE.onChanged(listener);

        assert.strictEqual(typeof unsubscribe, 'function');
        unsubscribe();
        assert.deepStrictEqual(removed, [listener]);

        // Повторний виклик unsubscribe не робить нічого (ідемпотентність)
        unsubscribe();
        assert.strictEqual(removed.length, 1);
    });

    test('23c: безпечний unsubscribe при відсутності chrome.storage', () => {
        delete global.chrome.storage;
        let unsubscribe;
        assert.doesNotThrow(() => {
            unsubscribe = SYH_STORAGE.onChanged(() => {});
        });
        assert.strictEqual(typeof unsubscribe, 'function');
        assert.doesNotThrow(() => unsubscribe());
    });

    test('23d: перехоплює виняток removeListener без падіння', () => {
        global.chrome.storage.onChanged.addListener = () => {};
        global.chrome.storage.onChanged.removeListener = () => { throw new Error('context invalidated'); };

        const unsubscribe = SYH_STORAGE.onChanged(() => {});
        assert.doesNotThrow(() => unsubscribe());
    });
});

describe('SYH_STORAGE — динамічний this-диспатч (контракт для рефакторингу)', () => {
    beforeEach(() => { installChromeMock(); });

    test('24: перевизначений isChromeStorageAvailable впливає на get/set/remove', () => {
        const proxy = Object.create(SYH_STORAGE);
        proxy.isChromeStorageAvailable = () => false;

        let touchedChrome = false;
        global.chrome.storage.local.get = () => { touchedChrome = true; };
        global.chrome.storage.local.set = () => { touchedChrome = true; };
        global.chrome.storage.local.remove = () => { touchedChrome = true; };

        let getRes;
        proxy.get('k', (r) => { getRes = r; });
        let setDone = false;
        proxy.set({ k: 1 }, () => { setDone = true; });
        let removeDone = false;
        proxy.remove('k', () => { removeDone = true; });

        assert.deepStrictEqual(getRes, {});
        assert.strictEqual(setDone, true);
        assert.strictEqual(removeDone, true);
        assert.strictEqual(touchedChrome, false, 'chrome.storage не має бути зачеплений');
    });

    test('25: перевизначений isChromeStorageAvailable впливає на getAsync/setAsync', async () => {
        const proxy = Object.create(SYH_STORAGE);
        proxy.isChromeStorageAvailable = () => false;

        assert.deepStrictEqual(await proxy.getAsync('k'), {});
        await proxy.setAsync({ k: 1 });
    });

    test('26: updateAsync використовує перевизначені getAsync/setAsync', async () => {
        const proxy = Object.create(SYH_STORAGE);
        const seen = {};
        proxy.getAsync = async () => ({ 'syh:test:x': 10 });
        proxy.setAsync = async (items) => { Object.assign(seen, items); };

        const updated = await proxy.updateAsync('syh:test:x', (cur) => ({
            'syh:test:x': cur['syh:test:x'] * 2
        }));

        assert.strictEqual(updated['syh:test:x'], 20);
        assert.deepStrictEqual(seen, { 'syh:test:x': 20 });
    });
});

describe('updateAsync — атомарність (race condition)', () => {
    function mockStore(store) {
        global.chrome.storage.local.get = (keys, cb) => {
            const res = {};
            const list = Array.isArray(keys) ? keys : [keys];
            for (const k of list) if (k in store) res[k] = store[k];
            cb(res);
        };
        global.chrome.storage.local.set = (items, cb) => { Object.assign(store, items); cb(); };
    }

    test('100 паралельних інкрементів одного ключа дають рівно +100 (без втрати оновлень)', async () => {
        const store = { 'syh:race:counter': 5 };
        mockStore(store);

        const promises = [];
        for (let i = 0; i < 100; i++) {
            promises.push(SYH_STORAGE.updateAsync('syh:race:counter', (cur) => ({
                'syh:race:counter': (cur['syh:race:counter'] || 0) + 1
            })));
        }
        await Promise.all(promises);

        assert.strictEqual(store['syh:race:counter'], 105);
    });

    test('updateAsync([a,b]) із зміною лише a не перезаписує b (без write-amplification)', async () => {
        const store = { a: 1, b: 2 };
        let written = null;
        global.chrome.storage.local.get = (keys, cb) => {
            const res = {};
            for (const k of (Array.isArray(keys) ? keys : [keys])) if (k in store) res[k] = store[k];
            cb(res);
        };
        global.chrome.storage.local.set = (items, cb) => { written = items; Object.assign(store, items); cb(); };

        await SYH_STORAGE.updateAsync(['a', 'b'], (cur) => ({ a: cur.a + 1, b: cur.b }));

        assert.deepStrictEqual(written, { a: 2 }, 'записується лише змінений ключ');
        assert.strictEqual(store.a, 2);
        assert.strictEqual(store.b, 2, 'сусідній ключ не затерто');
    });

    test('виняток у updateFn реджектить проміс і не блокує наступні виклики', async () => {
        const store = { k: 1 };
        mockStore(store);

        await assert.rejects(
            SYH_STORAGE.updateAsync('k', () => { throw new Error('boom'); }),
            /boom/
        );

        const updated = await SYH_STORAGE.updateAsync('k', (cur) => ({ k: cur.k + 10 }));
        assert.strictEqual(updated.k, 11);
        assert.strictEqual(store.k, 11, 'черга не «залипла» після помилки');
    });

    test('два updateAsync на різні ключі обидва завершуються коректно', async () => {
        const store = { x: 1, y: 1 };
        mockStore(store);

        await Promise.all([
            SYH_STORAGE.updateAsync('x', (cur) => ({ x: cur.x + 1 })),
            SYH_STORAGE.updateAsync('y', (cur) => ({ y: cur.y + 1 }))
        ]);

        assert.strictEqual(store.x, 2);
        assert.strictEqual(store.y, 2);
    });
});
