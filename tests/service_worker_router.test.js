// Characterization tests for the background service worker's *pure* badge logic
// and its message router.
//
// `background/service-worker.ts` has the highest complexity density (0.37) of any
// substantial production file in the fallow report. Before splitting it into
// badge-counting / badge-rendering / message-routing units, this suite pins the
// observable contract: badge colour thresholds, the 99+ clamp, the guard clauses
// that keep the worker silent outside a Chrome runtime, and the router's
// sync-vs-async `sendResponse` channel semantics.

import assert from 'node:assert';
import { test, describe, beforeEach } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

let badgeText = '';
let badgeColor = '';
let badgeColorCalls = 0;
let mockStorageData = {};
let onMessageCb = null;

installChromeMock({
    runtimeImpl: {
        id: 'test-extension-id',
        lastError: null,
        getManifest: () => ({ version: '9.9.9', name: 'SYH Test' }),
        onInstalled: { addListener() {} },
        onMessage: { addListener: (cb) => { onMessageCb = cb; } }
    },
    storageImpl: {
        get: (_keys, cb) => cb(mockStorageData),
        set: (items, cb) => { Object.assign(mockStorageData, items); if (cb) cb(); },
        remove: (_keys, cb) => { if (cb) cb(); }
    }
});
global.chrome.action = {
    setBadgeText: async ({ text }) => { badgeText = text; },
    setBadgeBackgroundColor: async ({ color }) => { badgeColor = color; badgeColorCalls++; }
};

const {
    countCheckedItems,
    calculateBadgeCounts,
    applyBadgeTextAndColor,
    updateExtensionBadge,
    SW_ROUTER
} = await import('../background/service-worker.ts');

function resetBadge() {
    badgeText = '';
    badgeColor = '';
    badgeColorCalls = 0;
    mockStorageData = {};
}

describe('service worker — countCheckedItems', () => {
    test('1: не-обʼєкти дають 0', () => {
        assert.strictEqual(countCheckedItems(null), 0);
        assert.strictEqual(countCheckedItems(undefined), 0);
        assert.strictEqual(countCheckedItems('рядок'), 0);
        assert.strictEqual(countCheckedItems(42), 0);
    });

    test('2: рахує булеві true та обʼєкти { checked: true }', () => {
        assert.strictEqual(countCheckedItems({ a: true, b: false, c: { checked: true }, d: { checked: false } }), 2);
    });

    test('3: розгортає вкладений { date, data } і пропускає службовий ключ date', () => {
        assert.strictEqual(countCheckedItems({ date: '2026-08-10', data: { a: true, b: true, c: false } }), 2);
    });

    test('4: ключ "date" не рахується навіть у плоскому обʼєкті', () => {
        assert.strictEqual(countCheckedItems({ date: true, a: true }), 1);
    });

    test('5: порожній обʼєкт -> 0', () => {
        assert.strictEqual(countCheckedItems({}), 0);
    });
});

describe('service worker — calculateBadgeCounts', () => {
    test('6: підсумовує масиви зібраних по префіксу syh:popup:collected:', () => {
        const res = calculateBadgeCounts({
            'syh:popup:collected:vp_ss': [1, 2],
            'syh:popup:collected:preach': [3]
        });
        assert.deepStrictEqual(res, { collectedCount: 3, checkedCount: 0 });
    });

    test('7: враховує YT_COLLECTED та PRAYERS', () => {
        const res = calculateBadgeCounts({
            'syh:popup:yt:collected': [1, 2],
            'syh:popup:prayers': [1]
        });
        assert.strictEqual(res.collectedCount, 3);
    });

    test('8: немасивні значення зібраних ігноруються', () => {
        const res = calculateBadgeCounts({ 'syh:popup:collected:x': { not: 'array' } });
        assert.strictEqual(res.collectedCount, 0);
    });

    test('9: рахує вибрані з трьох джерел стану чекбоксів', () => {
        const res = calculateBadgeCounts({
            'syh:core:checkbox_state': { a: true },
            'syh:yt:checkbox_state': { b: { checked: true } },
            'syh:studio:checkbox_state': { c: true, d: true }
        });
        assert.deepStrictEqual(res, { collectedCount: 0, checkedCount: 4 });
    });

    test('10: сторонні ключі не впливають на лічильники', () => {
        const res = calculateBadgeCounts({ 'syh:core:options': { a: 1 }, 'random': [1, 2, 3] });
        assert.deepStrictEqual(res, { collectedCount: 0, checkedCount: 0 });
    });
});

describe('service worker — applyBadgeTextAndColor', () => {
    beforeEach(resetBadge);

    test('11: виставляє текст без кольору, коли колір не переданий', async () => {
        await applyBadgeTextAndColor('7');
        assert.strictEqual(badgeText, '7');
        assert.strictEqual(badgeColorCalls, 0);
    });

    test('12: виставляє і текст, і колір', async () => {
        await applyBadgeTextAndColor('7', '#123456');
        assert.strictEqual(badgeText, '7');
        assert.strictEqual(badgeColor, '#123456');
    });

    test('13: не падає, якщо setBadgeBackgroundColor відсутній', async () => {
        const orig = global.chrome.action.setBadgeBackgroundColor;
        delete global.chrome.action.setBadgeBackgroundColor;
        try {
            await applyBadgeTextAndColor('7', '#123456');
            assert.strictEqual(badgeText, '7');
        } finally {
            global.chrome.action.setBadgeBackgroundColor = orig;
        }
    });
});

describe('service worker — updateExtensionBadge', () => {
    beforeEach(resetBadge);

    test('14: вибрані мають пріоритет над зібраними (оранжевий)', async () => {
        mockStorageData = {
            'syh:popup:collected:vp_ss': [1, 2, 3],
            'syh:core:checkbox_state': { a: true }
        };
        await updateExtensionBadge();
        assert.strictEqual(badgeText, '1');
        assert.strictEqual(badgeColor, '#E67E22');
    });

    test('15: лише зібрані -> зелений', async () => {
        mockStorageData = { 'syh:popup:collected:vp_ss': [1, 2] };
        await updateExtensionBadge();
        assert.strictEqual(badgeText, '2');
        assert.strictEqual(badgeColor, '#27AE60');
    });

    test('16: нічого -> порожній бейдж без зміни кольору', async () => {
        mockStorageData = {};
        await updateExtensionBadge();
        assert.strictEqual(badgeText, '');
        assert.strictEqual(badgeColorCalls, 0);
    });

    test('17: обрізає лічильник вибраних до "99+"', async () => {
        const many = {};
        for (let i = 0; i < 150; i++) many['k' + i] = true;
        mockStorageData = { 'syh:core:checkbox_state': many };
        await updateExtensionBadge();
        assert.strictEqual(badgeText, '99+');
        assert.strictEqual(badgeColor, '#E67E22');
    });

    test('18: обрізає лічильник зібраних до "99+"', async () => {
        mockStorageData = { 'syh:popup:collected:vp_ss': new Array(120).fill(0) };
        await updateExtensionBadge();
        assert.strictEqual(badgeText, '99+');
        assert.strictEqual(badgeColor, '#27AE60');
    });

    test('19: мовчазний no-op без chrome.action', async () => {
        const orig = global.chrome.action;
        delete global.chrome.action;
        try {
            await assert.doesNotReject(() => updateExtensionBadge());
        } finally {
            global.chrome.action = orig;
        }
    });

    test('20: мовчазний no-op без chrome.storage', async () => {
        const orig = global.chrome.storage;
        delete global.chrome.storage;
        try {
            await assert.doesNotReject(() => updateExtensionBadge());
            assert.strictEqual(badgeText, '');
        } finally {
            global.chrome.storage = orig;
        }
    });

    test('21: помилка сховища логується, але не кидається', async () => {
        const origGet = global.chrome.storage.local.get;
        const origErr = console.error;
        const logged = [];
        console.error = (...a) => logged.push(a);
        global.chrome.storage.local.get = () => { throw new Error('context invalidated'); };
        try {
            await assert.doesNotReject(() => updateExtensionBadge());
            assert.strictEqual(logged.length, 1);
        } finally {
            global.chrome.storage.local.get = origGet;
            console.error = origErr;
        }
    });
});

describe('service worker — маршрутизатор повідомлень', () => {
    beforeEach(resetBadge);

    test('22: listen() зареєстрував слухача chrome.runtime.onMessage', () => {
        assert.strictEqual(typeof onMessageCb, 'function');
    });

    test('23: PING відповідає синхронно і повертає false (канал не тримається)', () => {
        let response = null;
        const kept = onMessageCb({ type: 'PING' }, {}, (r) => { response = r; });
        assert.strictEqual(kept, false);
        assert.strictEqual(response.status, 'ok');
        assert.strictEqual(response.response, 'PONG');
        assert.strictEqual(typeof response.timestamp, 'number');
    });

    test('24: GET_VERSION віддає дані з маніфесту', () => {
        let response = null;
        onMessageCb({ type: 'GET_VERSION' }, {}, (r) => { response = r; });
        assert.deepStrictEqual(response, { version: '9.9.9', name: 'SYH Test' });
    });

    test('25: BACKGROUND_LOG підтверджує запис', () => {
        const origLog = console.log;
        console.log = () => {};
        try {
            let response = null;
            onMessageCb({ type: 'BACKGROUND_LOG', data: 'hi' }, {}, (r) => { response = r; });
            assert.deepStrictEqual(response, { status: 'logged' });
        } finally {
            console.log = origLog;
        }
    });

    test('26: асинхронний хендлер повертає true і відповідає пізніше', async () => {
        mockStorageData = { 'syh:popup:collected:vp_ss': [1] };
        let response = null;
        const kept = onMessageCb({ type: 'UPDATE_BADGE' }, {}, (r) => { response = r; });
        assert.strictEqual(kept, true, 'async-хендлер має тримати канал відкритим');
        await new Promise((r) => setTimeout(r, 50));
        assert.deepStrictEqual(response, { status: 'ok' });
        assert.strictEqual(badgeText, '1');
    });

    test('27: повідомлення розпізнається і за полем action, не тільки type', () => {
        let response = null;
        onMessageCb({ action: 'PING' }, {}, (r) => { response = r; });
        assert.strictEqual(response.response, 'PONG');
    });

    test('28: невідомий тип -> false і жодної відповіді', () => {
        let called = false;
        const kept = onMessageCb({ type: 'NOPE' }, {}, () => { called = true; });
        assert.strictEqual(kept, false);
        assert.strictEqual(called, false);
    });

    test('29: не-обʼєктне повідомлення ігнорується', () => {
        assert.strictEqual(onMessageCb(null, {}, () => {}), false);
        assert.strictEqual(onMessageCb('текст', {}, () => {}), false);
    });

    test('30: синхронний виняток у хендлері перетворюється на { error }', () => {
        SW_ROUTER.register('BOOM_SYNC', () => { throw new Error('вибух'); });
        let response = null;
        const kept = onMessageCb({ type: 'BOOM_SYNC' }, {}, (r) => { response = r; });
        assert.strictEqual(kept, false);
        assert.deepStrictEqual(response, { error: 'вибух' });
    });

    test('31: відхилений проміс у хендлері перетворюється на { error }', async () => {
        SW_ROUTER.register('BOOM_ASYNC', async () => { throw new Error('async вибух'); });
        let response = null;
        const kept = onMessageCb({ type: 'BOOM_ASYNC' }, {}, (r) => { response = r; });
        assert.strictEqual(kept, true);
        await new Promise((r) => setTimeout(r, 20));
        assert.deepStrictEqual(response, { error: 'async вибух' });
    });

    test('32: register() перекриває наявний хендлер', () => {
        SW_ROUTER.register('PING', () => ({ status: 'overridden' }));
        let response = null;
        onMessageCb({ type: 'PING' }, {}, (r) => { response = r; });
        assert.deepStrictEqual(response, { status: 'overridden' });
    });
});
