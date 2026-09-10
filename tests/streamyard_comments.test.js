import assert from 'node:assert';
import { test, describe, beforeEach } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

// happy-dom provides window; back chrome.storage.local with an in-memory store.
let mockStorageStore = {};

installChromeMock({
    runtimeImpl: { id: 'test-id' },
    storageImpl: {
        get: (keys, cb) => {
            const res = {};
            const arr = Array.isArray(keys) ? keys : [keys];
            arr.forEach(k => { res[k] = mockStorageStore[k]; });
            if (cb) cb(res);
        },
        set: (items, cb) => {
            Object.assign(mockStorageStore, items);
            if (cb) cb();
        }
    }
});

const { getPrayerIcon, stripLeadingAt, formatCopyPayload, SYH_STREAMYARD_COMMENTS } = await import('../modules/streamyard/comments/index.ts');

describe('SYH_STREAMYARD_COMMENTS Helper Tests', () => {
    beforeEach(() => {
        mockStorageStore = {};
        if (typeof globalThis.window.location === 'undefined') {
            globalThis.window.location = { pathname: '/studio/test-room' };
        }
    });

    test('getPrayerIcon returns correct emoji set for button index', () => {
        assert.strictEqual(getPrayerIcon(0), "🙏🙏🙏");
        assert.strictEqual(getPrayerIcon(1), "🙏❤️🙏");
        assert.strictEqual(getPrayerIcon(2), "❤️❤️❤️");
        assert.strictEqual(getPrayerIcon(3), "🙏🙏🙏");
    });

    test('stripLeadingAt strips leading @ symbols and trims author name', () => {
        assert.strictEqual(stripLeadingAt('@JohnDoe'), 'JohnDoe');
        assert.strictEqual(stripLeadingAt('@@@JaneDoe  '), 'JaneDoe');
        assert.strictEqual(stripLeadingAt('PlainAuthor'), 'PlainAuthor');
        assert.strictEqual(stripLeadingAt(null), '');
        assert.strictEqual(stripLeadingAt(undefined), '');
    });

    test('formatCopyPayload creates correct payload structure for copy-comment', () => {
        const result = formatCopyPayload('copy-comment', 'John', 'Hello world', 0);
        assert.deepStrictEqual(result, {
            header: "📄 Комент (без автора)",
            textToCopy: "Hello world",
            actionType: 'copy'
        });
    });

    test('formatCopyPayload creates correct payload for copy-author-comment', () => {
        const result = formatCopyPayload('copy-author-comment', 'John', 'Hello world', 0);
        assert.deepStrictEqual(result, {
            header: "📑 Автор і його ❓ питання",
            textToCopy: "@John\n\nHello world",
            actionType: 'question'
        });
    });

    test('formatCopyPayload creates correct payload for copy-prayer', () => {
        const result = formatCopyPayload('copy-prayer', 'John', 'Prayer request', 1);
        assert.deepStrictEqual(result, {
            header: "📑 Автор і його 🙏❤️🙏",
            textToCopy: "\n\n\n🙏❤️🙏 @John\n\nPrayer request",
            actionType: 'prayer',
            prayerIcon: "🙏❤️🙏"
        });
    });

    test('formatCopyPayload returns empty defaults for unknown action', () => {
        const result = formatCopyPayload('unknown', 'John', 'Test', 0);
        assert.deepStrictEqual(result, { header: '', textToCopy: '', actionType: null });
    });

    test('saveToDatabase and removeFromDatabase manage prayer records in storage', async () => {
        SYH_STREAMYARD_COMMENTS.init();
        await SYH_STREAMYARD_COMMENTS.saveToDatabase('John', 'Need prayer for health', 'prayer', '🙏🙏🙏');
        const stored = mockStorageStore['syh:popup:prayers'];
        assert.ok(Array.isArray(stored));
        assert.strictEqual(stored.length, 1);
        assert.strictEqual(stored[0].author, 'John');
        assert.strictEqual(stored[0].text, 'Need prayer for health');

        await SYH_STREAMYARD_COMMENTS.removeFromDatabase('Need prayer for health');
        const storedAfter = mockStorageStore['syh:popup:prayers'];
        assert.strictEqual(storedAfter.length, 0);
    });

    test('bindEvents and destroy attach and detach document event listeners', () => {
        const listeners = [];
        global.document = {
            hidden: false,
            body: {},
            querySelectorAll: () => [],
            querySelector: () => null,
            addEventListener: (type, fn, capture) => listeners.push({ type, fn, capture }),
            removeEventListener: (type, fn, capture) => {
                const idx = listeners.findIndex(l => l.type === type && l.fn === fn);
                if (idx !== -1) listeners.splice(idx, 1);
            }
        };

        SYH_STREAMYARD_COMMENTS.init();
        SYH_STREAMYARD_COMMENTS.bindEvents();
        assert.ok(SYH_STREAMYARD_COMMENTS.isBound);
        assert.ok(listeners.length > 0);

        SYH_STREAMYARD_COMMENTS.destroy();
        assert.strictEqual(SYH_STREAMYARD_COMMENTS.isBound, false);
    });
});
