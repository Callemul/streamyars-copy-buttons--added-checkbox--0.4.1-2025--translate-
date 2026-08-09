import assert from 'node:assert';
import { test, describe, beforeEach, afterEach, mock } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

// NOTE: These tests run under the Happy DOM global registrator (see tests/setup/happy-dom.ts).
// `popup_scroll.ts` reaches for `window.addEventListener`, `document.getElementById` and
// `el instanceof HTMLElement`, none of which can be faked by overwriting `global.window` /
// `global.document` (Happy DOM installs them as getter-only globals). We therefore drive the
// real DOM: build real elements, dispatch real `scroll` events, and spy with `mock.method`.

/** @type {Array<Record<string, any>>} */
const storageWrites = [];

installChromeMock({
    storageImpl: {
        get: (keys, cb) => cb && cb({}),
        set: (items, cb) => {
            storageWrites.push(items);
            if (cb) cb();
        },
        remove: (keys, cb) => cb && cb()
    }
});

const { STORAGE_KEYS } = await import('../modules/storage.ts');
const { getAllSheetIds } = await import('../modules/sheets.ts');
const { setupScrollListeners } = await import('../popup/popup_scroll.ts');

const SHEET_IDS = getAllSheetIds();
const BASE_SCROLL_IDS = ['prayersResultDiv', 'textArea1_oldText', 'textArea2_generatedRuText'];
const SHEET_SCROLL_PREFIXES = ['finalResultDiv', 'deletedLog', 'oldList', 'newTelegram'];
const SHEET_SCROLL_IDS = SHEET_IDS.flatMap(sId => SHEET_SCROLL_PREFIXES.map(prefix => `${prefix}__${sId}`));
const ALL_SCROLL_IDS = [...BASE_SCROLL_IDS, ...SHEET_SCROLL_IDS];

// popup_scroll debounces saves by 150ms.
const DEBOUNCE_MS = 150;
const flushDebounce = () => new Promise(resolve => setTimeout(resolve, DEBOUNCE_MS + 80));

/**
 * Creates a real scrollable div per id and gives each one a distinct scrollTop
 * so we can prove the saved payload maps id -> scrollTop correctly.
 */
function buildScrollDom(ids = ALL_SCROLL_IDS) {
    /** @type {Record<string, HTMLElement>} */
    const elements = {};
    ids.forEach((id, index) => {
        const el = document.createElement('div');
        el.id = id;
        el.scrollTop = (index + 1) * 10;
        document.body.appendChild(el);
        elements[id] = el;
    });
    return elements;
}

describe('popup_scroll tests', () => {
    /** @type {ReturnType<typeof mock.method>} */
    let windowAddEventListener;

    beforeEach(() => {
        storageWrites.length = 0;
        globalThis.chrome.runtime.lastError = null;
        globalThis.chrome.storage.local.get.mock.resetCalls();
        globalThis.chrome.storage.local.set.mock.resetCalls();
        document.body.innerHTML = '';
        document.documentElement.scrollTop = 0;
        // Spy but keep the real implementation so dispatched events still reach handlers.
        windowAddEventListener = mock.method(window, 'addEventListener');
    });

    afterEach(() => {
        // setupScrollListeners() never detaches its window listener; strip it so
        // suites/tests do not accumulate handlers on the shared window object.
        for (const call of windowAddEventListener.mock.calls) {
            const [type, handler, options] = call.arguments;
            window.removeEventListener(type, handler, options);
        }
        mock.restoreAll();
        document.body.innerHTML = '';
        document.documentElement.scrollTop = 0;
    });

    describe('setupScrollListeners', () => {
        test('should set up scroll listeners on window and elements', () => {
            const elements = buildScrollDom();
            const elementSpies = Object.fromEntries(
                Object.entries(elements).map(([id, el]) => [id, mock.method(el, 'addEventListener')])
            );

            setupScrollListeners();

            // Verify window scroll listener was added
            assert.ok(
                windowAddEventListener.mock.calls.some(c => c.arguments[0] === 'scroll'),
                'window should get a scroll listener'
            );

            // Verify every known scroll container got a scroll listener
            for (const id of ALL_SCROLL_IDS) {
                assert.ok(
                    elementSpies[id].mock.calls.some(c => c.arguments[0] === 'scroll'),
                    `${id} should get a scroll listener`
                );
            }
        });

        test('should save scroll positions to storage on scroll', async () => {
            const elements = buildScrollDom();
            // window.scrollY is a getter-only in Happy DOM; popup_scroll falls back
            // to document.documentElement.scrollTop, which is writable.
            document.documentElement.scrollTop = 200;

            setupScrollListeners();
            window.dispatchEvent(new Event('scroll'));

            await flushDebounce();

            assert.strictEqual(storageWrites.length, 1, 'exactly one debounced write');
            const storedData = storageWrites[0];

            const scrolls = storedData[STORAGE_KEYS.POPUP_SCROLL_POSITIONS];
            assert.ok(scrolls, 'canonical scroll-positions key must be present');
            assert.strictEqual(scrolls.window, 200);

            for (const id of ALL_SCROLL_IDS) {
                assert.strictEqual(scrolls[id], elements[id].scrollTop, `scrollTop for ${id}`);
            }

            // SYH_STORAGE.set() runs items through migrateItemKeys(), which folds the
            // legacy 'tg_scroll_positions' alias into the canonical key by design.
            assert.strictEqual(storedData['tg_scroll_positions'], undefined);
        });

        test('should save scroll positions when a container scrolls', async () => {
            const elements = buildScrollDom();
            setupScrollListeners();

            elements.prayersResultDiv.scrollTop = 123;
            elements.prayersResultDiv.dispatchEvent(new Event('scroll'));

            await flushDebounce();

            assert.strictEqual(storageWrites.length, 1);
            const scrolls = storageWrites[0][STORAGE_KEYS.POPUP_SCROLL_POSITIONS];
            assert.strictEqual(scrolls.prayersResultDiv, 123);
        });

        test('should debounce rapid scroll events into a single write', async () => {
            buildScrollDom();
            setupScrollListeners();

            for (let i = 0; i < 5; i++) {
                window.dispatchEvent(new Event('scroll'));
            }

            await flushDebounce();

            assert.strictEqual(storageWrites.length, 1, 'bursts collapse into one write');
        });

        test('should handle missing elements gracefully', async () => {
            // No elements in the DOM at all.
            assert.doesNotThrow(() => setupScrollListeners());

            // Should still add window listener
            assert.ok(windowAddEventListener.mock.calls.some(c => c.arguments[0] === 'scroll'));

            window.dispatchEvent(new Event('scroll'));
            await flushDebounce();

            assert.strictEqual(storageWrites.length, 1);
            const scrolls = storageWrites[0][STORAGE_KEYS.POPUP_SCROLL_POSITIONS];
            assert.strictEqual(scrolls.window, 0);
            for (const id of ALL_SCROLL_IDS) {
                assert.strictEqual(scrolls[id], 0, `${id} defaults to 0 when missing`);
            }
        });
    });
});
