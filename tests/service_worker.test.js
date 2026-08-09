import assert from 'node:assert';
import { test, describe, beforeEach } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

let badgeText = '';
let badgeColor = '';
let mockStorageData = {};
let storageOnChangedCb = null;

installChromeMock({
    runtimeImpl: { id: 'test-extension-id', getManifest: () => ({ version: '1.0.0', name: 'Test' }) },
    storageImpl: {
        get: (keys, cb) => cb(mockStorageData),
        set: (items, cb) => { Object.assign(mockStorageData, items); if (cb) cb(); },
        remove: (keys, cb) => { if (cb) cb(); }
    }
});
global.chrome.action = {
    setBadgeText: async ({ text }) => { badgeText = text; },
    setBadgeBackgroundColor: async ({ color }) => { badgeColor = color; }
};
global.chrome.storage.onChanged.addListener = (cb) => { storageOnChangedCb = cb; };

const { countCheckedItems, updateExtensionBadge } = await import('../background/service-worker.ts');

describe('Service Worker Badge Tests', () => {
    beforeEach(() => {
        badgeText = '';
        badgeColor = '';
        mockStorageData = {};
    });

    test('1: countCheckedItems рахує тільки вибрані (true) елементи', () => {
        const data1 = { 'k1': true, 'k2': false, 'k3': { checked: true }, 'k4': { checked: false } };
        assert.strictEqual(countCheckedItems(data1), 2);

        const data2 = { date: '2026-08-06', data: { 'b1': true, 'b2': false } };
        assert.strictEqual(countCheckedItems(data2), 1);
    });

    test('2: updateExtensionBadge виставляє оранжевий бейдж якщо є вибрані коментарі', async () => {
        mockStorageData = {
            'syh:popup:collected:vp_ss': [{ id: '1' }],
            'syh:yt:checkbox_state': { 'c1': { checked: true } }
        };
        await updateExtensionBadge();
        assert.strictEqual(badgeText, '1');
        assert.strictEqual(badgeColor, '#E67E22');
    });

    test('3: updateExtensionBadge виставляє зелений бейдж якщо є зібрані коментарі, але немає вибраних', async () => {
        mockStorageData = {
            'syh:popup:collected:vp_ss': [{ id: '1' }, { id: '2' }]
        };
        await updateExtensionBadge();
        assert.strictEqual(badgeText, '2');
        assert.strictEqual(badgeColor, '#27AE60');
    });

    test('4: updateExtensionBadge очищає бейдж якщо немає ні зібраних, ні вибраних коментарів', async () => {
        mockStorageData = {};
        await updateExtensionBadge();
        assert.strictEqual(badgeText, '');
    });

    test('5: chrome.storage.onChanged автоматично тригерить оновлення бейджа', async () => {
        assert.strictEqual(typeof storageOnChangedCb, 'function');
        mockStorageData = {
            'syh:popup:collected:vp_ss': [{ id: '1' }]
        };
        storageOnChangedCb({ 'syh:popup:collected:vp_ss': { newValue: mockStorageData['syh:popup:collected:vp_ss'] } }, 'local');
        // Почекаємо мікротаску
        await new Promise((r) => setTimeout(r, 50));
        assert.strictEqual(badgeText, '1');
    });
});
