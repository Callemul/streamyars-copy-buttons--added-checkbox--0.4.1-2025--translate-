import assert from 'node:assert';
import { test, describe, beforeEach, afterEach, mock } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

// NOTE: This suite runs under the Happy DOM global registrator (see tests/setup/happy-dom.ts).
// It used to overwrite `global.document` / `global.navigator` with partial stubs, which broke
// (`Cannot read properties of undefined (reading 'writeText')`) and also hid the real rendering
// behaviour. We now render into a real DOM and stub only the true external boundaries:
// chrome.* , SYH_MESSAGING and the clipboard.

/** @type {Record<string, any>} */
let storageStore = {};

installChromeMock({
    storageImpl: {
        get: (keys, cb) => {
            const list = Array.isArray(keys) ? keys : [keys];
            /** @type {Record<string, any>} */
            const res = {};
            for (const k of list) {
                if (k in storageStore) res[k] = storageStore[k];
            }
            if (cb) cb(res);
        },
        set: (items, cb) => {
            Object.assign(storageStore, items);
            if (cb) cb();
        },
        remove: (keys, cb) => {
            const list = Array.isArray(keys) ? keys : [keys];
            for (const k of list) delete storageStore[k];
            if (cb) cb();
        }
    }
});

globalThis.chrome.tabs = {
    query: mock.fn((queryInfo, callback) => {
        callback([{ url: 'https://streamyard.com/room123' }]);
    }),
    sendMessage: () => {}
};

const { STORAGE_KEYS } = await import('../modules/storage/storage.ts');
const { SYH_MESSAGING } = await import('../modules/messaging/messaging.ts');
const { RetentionService } = await import('../modules/sheets/retention_service.ts');

const {
    sendUnstarMessage,
    sendUnstarMessagesForList,
    renderPrayers,
    initPopupPrayersListeners
} = await import('../popup/popup_prayers.ts');

const EMPTY_LIST_HTML =
    '<span style="color:#999; font-style:italic;">Список порожній. Натисніть кнопку 🔄 "Підтягнути", ' +
    'щоб завантажити зіркові коментарі з ефіру, або маркуйте їх вручну.</span>';

const PRAYERS_DOM = `
<span id="prayersTotalCount"></span>
<div id="prayersResultDiv"></div>
<button id="copyPrayersBtn">Копіювати</button>
<button id="clearPrayersBtn">Очистити</button>
<button id="fetchPrayersBtn">Підтягнути</button>
`;

describe('popup_prayers tests', () => {
    /** @type {ReturnType<typeof mock.method>} */
    let sendToActiveTab;
    /** @type {ReturnType<typeof mock.method>} */
    let filterFreshPrayers;
    /** @type {ReturnType<typeof mock.method>} */
    let documentAddEventListener;

    beforeEach(() => {
        storageStore = {};
        globalThis.chrome.runtime.lastError = null;
        globalThis.chrome.storage.local.get.mock.resetCalls();
        globalThis.chrome.storage.local.set.mock.resetCalls();
        globalThis.chrome.storage.local.remove.mock.resetCalls();
        globalThis.chrome.tabs.query.mock.resetCalls();

        document.body.innerHTML = PRAYERS_DOM;

        // Stub the real external boundaries.
        sendToActiveTab = mock.method(SYH_MESSAGING, 'sendToActiveTab', async () => undefined);
        filterFreshPrayers = mock.method(RetentionService, 'filterFreshPrayers', (list) => list);
        documentAddEventListener = mock.method(document, 'addEventListener');
    });

    afterEach(() => {
        // initPopupPrayersListeners() never detaches its document listeners.
        for (const call of documentAddEventListener.mock.calls) {
            const [type, handler, options] = call.arguments;
            document.removeEventListener(type, handler, options);
        }
        mock.restoreAll();
        document.body.innerHTML = '';
    });

    describe('sendUnstarMessage', () => {
        test('should not send if text is empty', () => {
            sendUnstarMessage('');
            sendUnstarMessage(null);
            sendUnstarMessage(undefined);

            assert.strictEqual(sendToActiveTab.mock.calls.length, 0);
        });

        test('should send unstar_comment action with text', () => {
            sendUnstarMessage('test prayer');

            assert.strictEqual(sendToActiveTab.mock.calls.length, 1);
            assert.deepStrictEqual(sendToActiveTab.mock.calls[0].arguments[0], {
                action: 'unstar_comment',
                text: 'test prayer'
            });
        });
    });

    describe('sendUnstarMessagesForList', () => {
        test('should not send if list is empty', () => {
            sendUnstarMessagesForList([]);
            sendUnstarMessagesForList(null);
            sendUnstarMessagesForList(undefined);

            assert.strictEqual(sendToActiveTab.mock.calls.length, 0);
        });

        test('should send unstar for each item with text', () => {
            sendUnstarMessagesForList([
                { id: '1', author: 'author1', text: 'prayer 1', type: 'prayer' },
                { id: '2', author: 'author2', text: 'prayer 2', type: 'prayer' },
                { id: '3', author: 'author3', text: '', type: 'prayer' }
            ]);

            assert.strictEqual(sendToActiveTab.mock.calls.length, 2);
            assert.strictEqual(sendToActiveTab.mock.calls[0].arguments[0].text, 'prayer 1');
            assert.strictEqual(sendToActiveTab.mock.calls[1].arguments[0].text, 'prayer 2');
        });
    });

    describe('renderPrayers', () => {
        const outputDiv = () => document.getElementById('prayersResultDiv');
        const totalCount = () => document.getElementById('prayersTotalCount');

        test('should do nothing when the output container is missing', () => {
            document.body.innerHTML = '';
            assert.doesNotThrow(() => renderPrayers([{ id: '1', author: 'a', text: 't', type: 'prayer' }]));
        });

        test('should handle empty prayers list', () => {
            renderPrayers([]);

            assert.strictEqual(outputDiv().innerHTML, EMPTY_LIST_HTML);
            assert.strictEqual(outputDiv().getAttribute('data-raw-text'), '');
            assert.strictEqual(totalCount().textContent, '0 люд. - 0 прохань');
        });

        test('should handle null prayers list', () => {
            renderPrayers(null);

            assert.ok(outputDiv().innerHTML.includes('Список порожній'));
        });

        test('should generate IDs for items without IDs', () => {
            const prayersList = [
                { author: 'author1', text: 'prayer 1', type: 'prayer' },
                { author: 'author2', text: 'prayer 2', type: 'prayer' }
            ];

            renderPrayers(prayersList);

            assert.ok(prayersList[0].id?.startsWith('p_'));
            assert.ok(prayersList[1].id?.startsWith('p_'));
            // Newly minted ids are persisted back to storage
            assert.strictEqual(storageStore[STORAGE_KEYS.PRAYERS], prayersList);
        });

        test('should not re-save when every item already has an id', () => {
            renderPrayers([
                { id: '1', author: 'author1', text: 'prayer 1', type: 'prayer' }
            ]);

            assert.strictEqual(storageStore[STORAGE_KEYS.PRAYERS], undefined);
        });

        test('should call RetentionService.filterFreshPrayers', () => {
            const prayersList = [
                { id: '1', author: 'author1', text: 'prayer 1', type: 'prayer', timestamp: Date.now() },
                { id: '2', author: 'author2', text: 'prayer 2', type: 'prayer', timestamp: Date.now() }
            ];
            filterFreshPrayers.mock.mockImplementation(() => [prayersList[0]]);

            renderPrayers(prayersList);

            assert.strictEqual(filterFreshPrayers.mock.calls.length, 1);
            assert.strictEqual(filterFreshPrayers.mock.calls[0].arguments[0], prayersList);
            // A shortened list is written back to storage and used for rendering
            assert.deepStrictEqual(storageStore[STORAGE_KEYS.PRAYERS], [prayersList[0]]);
            assert.strictEqual(totalCount().textContent, '1 люд. - 1 прохань');
        });

        test('should update total count element', () => {
            renderPrayers([
                { id: '1', author: 'author1', text: 'prayer 1', type: 'prayer' },
                { id: '2', author: 'author2', text: 'prayer 2', type: 'prayer' }
            ]);

            assert.strictEqual(totalCount().textContent, '2 люд. - 2 прохань');
        });

        test('should set data-raw-text attribute with formatted text', () => {
            renderPrayers([
                { id: '1', author: 'author1', text: 'prayer 1', type: 'prayer', icon: '🙏🙏🙏' },
                { id: '2', author: 'author2', text: 'prayer 2', type: 'prayer', icon: '❤️❤️❤️' }
            ]);

            const rawText = outputDiv().getAttribute('data-raw-text');
            assert.ok(rawText);
            assert.ok(rawText.includes('🙏🙏🙏 МОЛИТВЕННЫЕ ПРОСЬБЫ'));
            assert.ok(rawText.includes('@author1'));
            assert.ok(rawText.includes('prayer 1'));
            assert.ok(rawText.includes('@author2'));
            assert.ok(rawText.includes('prayer 2'));
        });

        test('should group prayers by author', () => {
            renderPrayers([
                { id: '1', author: 'author1', text: 'prayer 1', type: 'prayer', icon: '🙏🙏🙏' },
                { id: '2', author: 'author1', text: 'prayer 2', type: 'prayer', icon: '🙏🙏🙏' },
                { id: '3', author: 'author2', text: 'prayer 3', type: 'prayer', icon: '❤️❤️❤️' }
            ]);

            assert.strictEqual(totalCount().textContent, '2 люд. - 3 прохань');

            // Two author blocks are rendered, and the multi-item author is numbered
            const blocks = outputDiv().querySelectorAll('.q-block');
            assert.strictEqual(blocks.length, 2);

            const rawText = outputDiv().getAttribute('data-raw-text');
            assert.ok(rawText.includes('1) prayer 1'));
            assert.ok(rawText.includes('2) prayer 2'));
        });

        test('should ignore non-prayer entries when grouping', () => {
            renderPrayers([
                { id: '1', author: 'author1', text: 'prayer 1', type: 'prayer', icon: '🙏🙏🙏' },
                { id: '2', author: 'author2', text: 'a question', type: 'question', icon: '❓' }
            ]);

            assert.strictEqual(totalCount().textContent, '1 люд. - 1 прохань');
            assert.ok(!outputDiv().getAttribute('data-raw-text').includes('a question'));
        });
    });

    describe('initPopupPrayersListeners', () => {
        test('should bind focus, click, and toolbar listeners', () => {
            initPopupPrayersListeners();

            const eventTypes = documentAddEventListener.mock.calls.map(c => c.arguments[0]);
            assert.ok(eventTypes.length >= 3);
            assert.ok(eventTypes.includes('focusin'));
            assert.ok(eventTypes.includes('focusout'));
            assert.ok(eventTypes.includes('click'));
        });

        test('should wire the toolbar buttons that exist in the DOM', () => {
            const copySpy = mock.method(document.getElementById('copyPrayersBtn'), 'addEventListener');
            const clearSpy = mock.method(document.getElementById('clearPrayersBtn'), 'addEventListener');
            const fetchSpy = mock.method(document.getElementById('fetchPrayersBtn'), 'addEventListener');

            initPopupPrayersListeners();

            for (const spy of [copySpy, clearSpy, fetchSpy]) {
                assert.ok(spy.mock.calls.some(c => c.arguments[0] === 'click'));
            }
        });

        test('should not throw when the toolbar buttons are missing', () => {
            document.body.innerHTML = '';
            assert.doesNotThrow(() => initPopupPrayersListeners());
        });
    });
});
