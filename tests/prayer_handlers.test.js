import test, { describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { installChromeMock } from './setup/chrome_mock.ts';

// NOTE: This suite previously re-implemented every handler inline and asserted against those local
// copies, so popup/prayer_handlers.ts was never executed. It now imports the real handlers and runs
// them against the Happy DOM globals registered in tests/setup/happy-dom.ts, stubbing only true
// external boundaries (chrome.*, SYH_MESSAGING, clipboard, confirm/alert).

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

let activeTabUrl = 'https://streamyard.com/room123';
globalThis.chrome.tabs = {
    query: mock.fn((queryInfo, callback) => callback([{ url: activeTabUrl }])),
    sendMessage: () => {}
};

const { STORAGE_KEYS } = await import('../modules/storage.ts');
const { SYH_MESSAGING } = await import('../modules/messaging.ts');
const { CommentService } = await import('../modules/comment_service.ts');
const { RetentionService } = await import('../modules/retention_service.ts');
const { AUTHOR_OLD_VALUE_ATTR, FOCUS_BORDER, BLUR_BORDER } = await import('../popup/prayer_focus_rules.ts');

const {
    handleEditPrayerAuthor,
    handleDeleteAuthorPrayers,
    handleWipeAllPrayers,
    handleKeepCurrentRoomPrayers,
    handleDeleteSinglePrayer,
    bindPrayerClickListeners,
    bindPrayerFocusListeners,
    bindPrayerToolbarListeners
} = await import('../popup/prayer_handlers.ts');

const basePrayers = () => ([
    { id: 'p1', author: 'John', text: 'Prayer 1', type: 'prayer', icon: '🙏🙏🙏', roomId: 'room1', timestamp: 1 },
    { id: 'p2', author: 'Jane', text: 'Question 1', type: 'question', icon: '❓', roomId: 'room1', timestamp: 2 },
    { id: 'p3', author: 'John', text: 'Prayer 2', type: 'prayer', icon: '🙏🙏🙏', roomId: 'room1', timestamp: 3 }
]);

/** Full prayer-list markup, matching what prayer_render/prayer_dom_builders produce. */
const PRAYERS_DOM = `
<span id="prayersTotalCount"></span>
<div id="prayersResultDiv">
    <div class="q-block q-pray">
        <div class="q-head">
            <span class="editable-author" contenteditable="true" data-author="John">John</span>
            <button class="edit-prayer-btn" data-author="John">✏️</button>
            <button class="del-author-btn" data-author="John">🗑</button>
        </div>
        <div class="q-row">
            <span class="editable-prayer" contenteditable="true" data-id="p1">Prayer 1</span>
            <button class="del-prayer-btn" data-id="p1">✕</button>
        </div>
    </div>
</div>
<button id="syh-wipe-prayers">Wipe</button>
<button id="syh-keep-prayers">Keep</button>
<button id="copyPrayersBtn">Копіювати</button>
<button id="clearPrayersBtn">Очистити</button>
<button id="fetchPrayersBtn">Підтягнути</button>
`;

const readStored = () => storageStore[STORAGE_KEYS.PRAYERS];

describe('prayer_handlers', () => {
    /** @type {ReturnType<typeof mock.method>} */
    let documentAddEventListener;
    /** @type {string[]} */
    let confirmMessages;
    /** @type {string[]} */
    let alertMessages;

    beforeEach(() => {
        storageStore = { [STORAGE_KEYS.PRAYERS]: basePrayers() };
        activeTabUrl = 'https://streamyard.com/room123';
        globalThis.chrome.runtime.lastError = null;
        globalThis.chrome.storage.local.get.mock.resetCalls();
        globalThis.chrome.storage.local.set.mock.resetCalls();
        globalThis.chrome.tabs.query.mock.resetCalls();

        document.body.innerHTML = PRAYERS_DOM;

        confirmMessages = [];
        alertMessages = [];
        globalThis.confirm = (message) => { confirmMessages.push(message); return true; };
        globalThis.alert = (message) => { alertMessages.push(message); };

        // Keep renderPrayers deterministic and away from the retention clock.
        mock.method(RetentionService, 'filterFreshPrayers', (list) => list);
        mock.method(SYH_MESSAGING, 'sendToActiveTab', async () => undefined);
        documentAddEventListener = mock.method(document, 'addEventListener');
    });

    afterEach(() => {
        for (const call of documentAddEventListener.mock.calls) {
            const [type, handler, options] = call.arguments;
            document.removeEventListener(type, handler, options);
        }
        mock.restoreAll();
        document.body.innerHTML = '';
        delete globalThis.confirm;
        delete globalThis.alert;
    });

    describe('handleEditPrayerAuthor', () => {
        test('focuses author span and puts the caret at the end', () => {
            const editBtn = document.querySelector('.edit-prayer-btn');
            const authorSpan = document.querySelector('.editable-author');

            const focus = mock.method(authorSpan, 'focus', () => {});
            const removeAllRanges = mock.fn();
            const addRange = mock.fn();
            const selectNodeContents = mock.fn();
            const collapse = mock.fn();

            mock.method(window, 'getSelection', () => ({ removeAllRanges, addRange }));
            mock.method(document, 'createRange', () => ({ selectNodeContents, collapse }));

            handleEditPrayerAuthor(editBtn);

            assert.equal(focus.mock.calls.length, 1);
            assert.equal(selectNodeContents.mock.calls.length, 1);
            assert.equal(selectNodeContents.mock.calls[0].arguments[0], authorSpan);
            assert.deepEqual(collapse.mock.calls[0].arguments, [false]);
            assert.equal(removeAllRanges.mock.calls.length, 1);
            assert.equal(addRange.mock.calls.length, 1);
        });

        test('does nothing when the button is outside a prayer block', () => {
            const orphan = document.createElement('button');
            orphan.className = 'edit-prayer-btn';
            document.body.appendChild(orphan);

            const createRange = mock.method(document, 'createRange');

            assert.doesNotThrow(() => handleEditPrayerAuthor(orphan));
            assert.equal(createRange.mock.calls.length, 0);
        });
    });

    describe('handleDeleteAuthorPrayers', () => {
        test('filters out author prayers and calls unstar', () => {
            handleDeleteAuthorPrayers(document.querySelector('.del-author-btn'));

            assert.deepEqual(confirmMessages, ['Видалити всі прохання від @John?']);

            const unstarred = SYH_MESSAGING.sendToActiveTab.mock.calls.map(c => c.arguments[0].text);
            assert.deepEqual(unstarred, ['Prayer 1', 'Prayer 2']);

            const list = readStored();
            assert.equal(list.length, 1);
            assert.equal(list[0].author, 'Jane');
        });

        test('does nothing when the confirm is declined', () => {
            globalThis.confirm = () => false;

            handleDeleteAuthorPrayers(document.querySelector('.del-author-btn'));

            assert.equal(readStored().length, 3);
            assert.equal(SYH_MESSAGING.sendToActiveTab.mock.calls.length, 0);
        });
    });

    describe('handleWipeAllPrayers', () => {
        test('clears all prayers', () => {
            handleWipeAllPrayers();

            assert.deepEqual(confirmMessages, ["Повністю очистити старі молитви з пам'яті розширення?"]);
            assert.deepEqual(readStored(), []);
        });

        test('does nothing when the confirm is declined', () => {
            globalThis.confirm = () => false;

            handleWipeAllPrayers();

            assert.equal(readStored().length, 3);
        });
    });

    describe('handleKeepCurrentRoomPrayers', () => {
        test('updates roomId and timestamp for prayers only', () => {
            handleKeepCurrentRoomPrayers();

            const list = readStored();
            const prayers = list.filter(p => p.type === 'prayer');
            const question = list.find(p => p.type === 'question');

            assert.equal(prayers.length, 2);
            for (const prayer of prayers) {
                assert.equal(prayer.roomId, 'room123');
                assert.ok(prayer.timestamp > 1000);
            }
            // Non-prayer entries stay untouched
            assert.equal(question.roomId, 'room1');
            assert.equal(question.timestamp, 2);
        });

        test('bails out when the active tab has no usable URL', () => {
            activeTabUrl = 'not a url';

            handleKeepCurrentRoomPrayers();

            assert.equal(readStored()[0].roomId, 'room1');
        });
    });

    describe('handleDeleteSinglePrayer', () => {
        test('removes the prayer and calls unstar', () => {
            handleDeleteSinglePrayer(document.querySelector('.del-prayer-btn'));

            const unstarred = SYH_MESSAGING.sendToActiveTab.mock.calls.map(c => c.arguments[0].text);
            assert.deepEqual(unstarred, ['Prayer 1']);

            const list = readStored();
            assert.equal(list.length, 2);
            assert.ok(!list.some(p => p.id === 'p1'));
        });

        test('is a no-op for an unknown id', () => {
            const btn = document.createElement('button');
            btn.className = 'del-prayer-btn';
            btn.setAttribute('data-id', 'does-not-exist');

            handleDeleteSinglePrayer(btn);

            assert.equal(readStored().length, 3);
            assert.equal(SYH_MESSAGING.sendToActiveTab.mock.calls.length, 0);
        });
    });

    describe('bindPrayerClickListeners', () => {
        test('routes an edit button click to handleEditPrayerAuthor', () => {
            const authorSpan = document.querySelector('.editable-author');
            const focus = mock.method(authorSpan, 'focus', () => {});
            mock.method(window, 'getSelection', () => ({ removeAllRanges() {}, addRange() {} }));
            mock.method(document, 'createRange', () => ({ selectNodeContents() {}, collapse() {} }));

            bindPrayerClickListeners();
            document.querySelector('.edit-prayer-btn').dispatchEvent(new MouseEvent('click', { bubbles: true }));

            assert.equal(focus.mock.calls.length, 1);
        });

        test('routes a delete-author click to handleDeleteAuthorPrayers', () => {
            bindPrayerClickListeners();
            document.querySelector('.del-author-btn').dispatchEvent(new MouseEvent('click', { bubbles: true }));

            assert.equal(readStored().length, 1);
            assert.equal(readStored()[0].author, 'Jane');
        });

        test('routes a delete-one click to handleDeleteSinglePrayer', () => {
            bindPrayerClickListeners();
            document.querySelector('.del-prayer-btn').dispatchEvent(new MouseEvent('click', { bubbles: true }));

            assert.equal(readStored().length, 2);
            assert.ok(!readStored().some(p => p.id === 'p1'));
        });

        test('routes the wipe button to handleWipeAllPrayers', () => {
            bindPrayerClickListeners();
            document.getElementById('syh-wipe-prayers').dispatchEvent(new MouseEvent('click', { bubbles: true }));

            assert.deepEqual(readStored(), []);
        });

        test('routes the keep-room button to handleKeepCurrentRoomPrayers', () => {
            bindPrayerClickListeners();
            document.getElementById('syh-keep-prayers').dispatchEvent(new MouseEvent('click', { bubbles: true }));

            assert.equal(readStored()[0].roomId, 'room123');
        });

        test('ignores clicks that match no route', () => {
            bindPrayerClickListeners();
            document.getElementById('prayersTotalCount').dispatchEvent(new MouseEvent('click', { bubbles: true }));

            assert.equal(readStored().length, 3);
        });
    });

    describe('bindPrayerFocusListeners', () => {
        test('highlights an editable prayer on focusin and clears it on focusout', () => {
            bindPrayerFocusListeners();
            const el = document.querySelector('.editable-prayer');

            el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
            assert.equal(el.style.borderBottom, FOCUS_BORDER);

            el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
            assert.equal(el.style.borderBottom, BLUR_BORDER);
        });

        test('updates prayer text on focusout', () => {
            bindPrayerFocusListeners();
            const el = document.querySelector('.editable-prayer');
            el.textContent = '  Updated prayer text  ';

            el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

            const updated = readStored().find(p => p.id === 'p1');
            assert.equal(updated.text, 'Updated prayer text');
        });

        test('does not write when the prayer text is unchanged', () => {
            bindPrayerFocusListeners();
            const el = document.querySelector('.editable-prayer');
            el.textContent = 'Prayer 1';

            el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

            assert.equal(globalThis.chrome.storage.local.set.mock.calls.length, 0);
        });

        test('records the old author on focusin and renames on focusout', () => {
            bindPrayerFocusListeners();
            const el = document.querySelector('.editable-author');

            el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
            assert.equal(el.getAttribute(AUTHOR_OLD_VALUE_ATTR), 'John');

            el.textContent = 'NewJohn';
            el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

            const renamed = readStored().filter(p => p.author === 'NewJohn');
            assert.equal(renamed.length, 2);
            assert.ok(!readStored().some(p => p.author === 'John'));
        });

        test('after rename, delete button reflects new author (старий data-author більше не заважає видаленню)', () => {
            bindPrayerFocusListeners();
            const el = document.querySelector('.editable-author');

            el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
            el.textContent = 'NewJohn';
            el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

            // renderPrayers, викликаний після перейменування, синхронно перебудовує
            // перший блок автора з актуальним data-author (див. audit
            // stale-data-author-after-inline-rename).
            const delBtn = document.querySelector('.del-author-btn');
            assert.equal(delBtn.getAttribute('data-author'), 'NewJohn',
                'data-author синхронізовано зі сховищем після перейменування');

            handleDeleteAuthorPrayers(delBtn);
            assert.deepEqual(confirmMessages, ['Видалити всі прохання від @NewJohn?']);
            const list = readStored();
            assert.equal(list.length, 1);
            assert.equal(list[0].author, 'Jane');
        });

        test('skips the rename when the author name did not change', () => {
            bindPrayerFocusListeners();
            const el = document.querySelector('.editable-author');

            el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
            el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

            assert.equal(globalThis.chrome.storage.local.set.mock.calls.length, 0);
        });

        test('skips the rename when the new author name is empty', () => {
            bindPrayerFocusListeners();
            const el = document.querySelector('.editable-author');

            el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
            el.textContent = '   ';
            el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

            assert.equal(globalThis.chrome.storage.local.set.mock.calls.length, 0);
        });
    });

    describe('bindPrayerToolbarListeners', () => {
        test('copy button copies the raw text and restores its label', async () => {
            const copyToClipboard = mock.method(CommentService, 'copyToClipboard', async () => true);
            const outputDiv = document.getElementById('prayersResultDiv');
            outputDiv.setAttribute('data-raw-text', 'Test prayer text');

            const btn = document.getElementById('copyPrayersBtn');
            bindPrayerToolbarListeners();
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 0));

            assert.deepEqual(copyToClipboard.mock.calls[0].arguments, ['Test prayer text']);
            assert.equal(btn.textContent, 'Скопійовано! ✅');

            // The label is restored after the reset delay.
            await new Promise(resolve => setTimeout(resolve, 2100));
            assert.equal(btn.textContent, 'Копіювати');
        });

        test('copy button shows a failure label when the clipboard rejects', async () => {
            mock.method(CommentService, 'copyToClipboard', async () => false);
            document.getElementById('prayersResultDiv').setAttribute('data-raw-text', 'Test prayer text');

            const btn = document.getElementById('copyPrayersBtn');
            bindPrayerToolbarListeners();
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 0));

            assert.equal(btn.textContent, 'Помилка ❌');
        });

        test('copy button does nothing when there is no raw text', async () => {
            const copyToClipboard = mock.method(CommentService, 'copyToClipboard', async () => true);

            const btn = document.getElementById('copyPrayersBtn');
            bindPrayerToolbarListeners();
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 0));

            assert.equal(copyToClipboard.mock.calls.length, 0);
            assert.equal(btn.textContent, 'Копіювати');
        });

        test('clear button filters out prayer entries and keeps questions', () => {
            bindPrayerToolbarListeners();
            document.getElementById('clearPrayersBtn').dispatchEvent(new MouseEvent('click', { bubbles: true }));

            const list = readStored();
            assert.equal(list.length, 1);
            assert.equal(list[0].type, 'question');
        });

        test('clear button does nothing when the confirm is declined', () => {
            globalThis.confirm = () => false;

            bindPrayerToolbarListeners();
            document.getElementById('clearPrayersBtn').dispatchEvent(new MouseEvent('click', { bubbles: true }));

            assert.equal(readStored().length, 3);
        });

        test('fetch button merges newly fetched prayers', async () => {
            SYH_MESSAGING.sendToActiveTab.mock.mockImplementation(async () => ([
                { id: 'p4', author: 'New', text: 'New prayer', type: 'prayer', icon: '🙏🙏🙏', roomId: 'room1', timestamp: 4 },
                // Duplicate text is skipped
                { id: 'p5', author: 'John', text: 'Prayer 1', type: 'prayer', icon: '🙏🙏🙏', roomId: 'room1', timestamp: 5 }
            ]));

            const btn = document.getElementById('fetchPrayersBtn');
            bindPrayerToolbarListeners();
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 10));

            const list = readStored();
            assert.equal(list.length, 4);
            assert.ok(list.some(p => p.text === 'New prayer'));
            assert.equal(btn.textContent, 'Підтягнути');
            assert.equal(alertMessages.length, 1);
        });

        test('fetch button reports a failure for a non-list payload', async () => {
            SYH_MESSAGING.sendToActiveTab.mock.mockImplementation(async () => null);

            const btn = document.getElementById('fetchPrayersBtn');
            bindPrayerToolbarListeners();
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 10));

            assert.equal(btn.textContent, 'Підтягнути');
            assert.equal(readStored().length, 3);
            assert.equal(alertMessages.length, 1);
        });

        test('fetch button restores its label when messaging throws', async () => {
            SYH_MESSAGING.sendToActiveTab.mock.mockImplementation(async () => { throw new Error('boom'); });
            const consoleError = mock.method(console, 'error', () => {});

            const btn = document.getElementById('fetchPrayersBtn');
            bindPrayerToolbarListeners();
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 10));

            assert.equal(btn.textContent, 'Підтягнути');
            assert.ok(consoleError.mock.calls.length > 0);
        });
    });
});
