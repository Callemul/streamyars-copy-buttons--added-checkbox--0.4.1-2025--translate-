// Характеристичні тести публічного API handlers.ts (modules/event_comments/handlers).
//
// Тести проходять через bind-функції: створюють DOM-елементи, реєструють
// обробники через bind*, розпилюють події та перевіряють side-effects.
// Після рефакторингу (виділення анонімних функцій у named-експорти) поведінка
// має залишитися 1-в-1.

import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach, mock } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

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
        },
        remove: (keys, cb) => {
            const arr = Array.isArray(keys) ? keys : [keys];
            arr.forEach(k => { delete mockStorageStore[k]; });
            if (cb) cb();
        }
    }
});

const {
    bindStarButtonClickHandler,
    bindMiddleClickHandler,
    bindContextMenuHandlers,
    bindSyhButtonMouseHandlers,
    bindCheckboxChangeHandler,
} = await import('../modules/event_comments/handlers');

const { SYH_STATE } = await import('../modules/state.ts');

// Selectors for test DOM
const TEST_SELECTORS = {
    commentBlock: '.test-comment-block',
    commentText: '.test-comment-text',
    commentAuthor: '.test-comment-author',
    starButton: '.test-star-button',
};

/** Трекер для cleanup event listeners між тестами */
let currentSelf = null;

/** Створює мінімальний mock SyhEventComments для тестів */
function createMockSelf(overrides = {}) {
    const calls = {
        removeFromDatabase: [],
        saveToDatabase: [],
        updateCommentVisuals: [],
        filterStarredComments: 0,
    };

    const ui = {
        updateCommentVisuals: (block, type) => calls.updateCommentVisuals.push({ block, type }),
        filterStarredComments: () => { calls.filterStarredComments++; },
        prayersCache: [],
    };

    const self = {
        SELECTORS: TEST_SELECTORS,
        STATE: {},
        UTILS: { copyAndShowBanner: mock.fn() },
        UI: ui,
        TIMINGS: { FILTER_DEBOUNCE: 150 },
        isBound: false,
        calls,
        _clickHandler: undefined,
        _middleClickHandler: undefined,
        _contextHandler: undefined,
        _copyPrayerContextHandler: undefined,
        _syhButtonMouseDownHandler: undefined,
        _mouseupHandler: undefined,
        _changeHandler: undefined,
        autoHealObserver: null,
        removeFromDatabase: (text) => {
            calls.removeFromDatabase.push(text);
            return Promise.resolve();
        },
        saveToDatabase: (author, text, type, icon) => {
            calls.saveToDatabase.push({ author, text, type, icon });
            return Promise.resolve();
        },
        init: () => {},
        bindEvents: () => {},
        destroy: () => {
            if (self._clickHandler) document.removeEventListener('click', self._clickHandler, true);
            if (self._middleClickHandler) document.removeEventListener('mousedown', self._middleClickHandler, true);
            if (self._contextHandler) document.removeEventListener('contextmenu', self._contextHandler, true);
            if (self._copyPrayerContextHandler) document.removeEventListener('contextmenu', self._copyPrayerContextHandler);
            if (self._syhButtonMouseDownHandler) document.removeEventListener('mousedown', self._syhButtonMouseDownHandler);
            if (self._mouseupHandler) document.removeEventListener('mouseup', self._mouseupHandler);
            if (self._changeHandler) document.removeEventListener('change', self._changeHandler);
        },
        bindAutoHealScanner: () => {},
        bindStarButtonClickHandler: () => {},
        bindMiddleClickHandler: () => {},
        bindContextMenuHandlers: () => {},
        bindSyhButtonMouseHandlers: () => {},
        bindCheckboxChangeHandler: () => {},
        ...overrides,
    };
    currentSelf = self;
    return self;
}

beforeEach(() => {
    mockStorageStore = {};
    SYH_STATE.itemStates = {};
    document.body.innerHTML = '';
});

afterEach(() => {
    if (currentSelf) {
        currentSelf.destroy();
        currentSelf = null;
    }
});

// ---------------------------------------------------------------------------

describe('event_comments handlers — bindStarButtonClickHandler', () => {
    test('1. клік по не-star елементу → жодної дії', () => {
        document.body.innerHTML = `
            <div class="other-content">
                <div class="test-comment-text">Hello</div>
            </div>
        `;
        const self = createMockSelf();
        bindStarButtonClickHandler(self);

        const btn = document.querySelector('.other-content');
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));

        assert.equal(self.calls.removeFromDatabase.length, 0);
    });

    test('2. клік по star кнопці з aria-selected="false" → жодної дії', () => {
        document.body.innerHTML = `
            <div class="test-comment-block">
                <div class="test-comment-text">Some text</div>
                <button class="test-star-button" aria-selected="false"></button>
            </div>
        `;
        const self = createMockSelf();
        bindStarButtonClickHandler(self);

        const btn = document.querySelector('.test-star-button');
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));

        assert.equal(self.calls.removeFromDatabase.length, 0);
    });

    test('3. клік по star кнопці з aria-selected="true" → видалення з БД, оновлення візуалу, приховання li', async () => {
        document.body.innerHTML = `
            <li>
                <div class="test-comment-block">
                    <div class="test-comment-text">Prayer text</div>
                    <button class="test-star-button" aria-selected="true"></button>
                </div>
            </li>
        `;
        const self = createMockSelf();
        bindStarButtonClickHandler(self);

        const btn = document.querySelector('.test-star-button');
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));

        assert.equal(self.calls.removeFromDatabase.length, 1);
        assert.equal(self.calls.removeFromDatabase[0], 'Prayer text');

        assert.equal(self.calls.updateCommentVisuals.length, 1);
        assert.equal(self.calls.updateCommentVisuals[0].type, 'none');

        const li = document.querySelector('li');
        assert.equal(li.getAttribute('data-syh-deleted'), 'true');
        assert.equal(li.style.display, 'none');

        await new Promise(r => setTimeout(r, 60));
        assert.ok(self.calls.filterStarredComments >= 1);
    });

    test('4. клік по star кнопці без commentBlock → жодної дії після перевірки star', () => {
        document.body.innerHTML = `
            <button class="test-star-button" aria-selected="true"></button>
        `;
        const self = createMockSelf();
        bindStarButtonClickHandler(self);

        const btn = document.querySelector('.test-star-button');
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));

        assert.equal(self.calls.removeFromDatabase.length, 0);
        assert.equal(self.calls.updateCommentVisuals.length, 0);
    });

    test('5. клік по star кнопці без UI → видалення з БД, але без оновлення візуалу', () => {
        document.body.innerHTML = `
            <div class="test-comment-block">
                <div class="test-comment-text">Some text</div>
                <button class="test-star-button" aria-selected="true"></button>
            </div>
        `;
        const self = createMockSelf({ UI: null });
        bindStarButtonClickHandler(self);

        const btn = document.querySelector('.test-star-button');
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));

        assert.equal(self.calls.removeFromDatabase.length, 1);
        assert.equal(self.calls.removeFromDatabase[0], 'Some text');
        assert.equal(self.calls.updateCommentVisuals.length, 0);
    });
});

// ---------------------------------------------------------------------------

describe('event_comments handlers — bindMiddleClickHandler', () => {
    test('6. лівий клік (button 0) → жодної дії', () => {
        document.body.innerHTML = `
            <div class="test-comment-block">
                <button class="test-star-button" aria-selected="true"></button>
            </div>
        `;
        const self = createMockSelf();
        bindMiddleClickHandler(self);

        document.querySelector('.test-comment-block').dispatchEvent(
            new MouseEvent('mousedown', { bubbles: true, button: 0 })
        );
    });

    test('7. середній клік по commentBlock → імітує клік по star кнопці', () => {
        document.body.innerHTML = `
            <div class="test-comment-block">
                <button class="test-star-button" aria-selected="true"></button>
            </div>
        `;
        const self = createMockSelf();
        let starClicked = false;
        const starBtn = document.querySelector('.test-star-button');
        starBtn.click = () => { starClicked = true; };
        bindMiddleClickHandler(self);

        document.querySelector('.test-comment-block').dispatchEvent(
            new MouseEvent('mousedown', { bubbles: true, button: 1 })
        );

        assert.ok(starClicked, 'star button .click() має бути викликаний');
    });

    test('8. середній клік по syh-button → жодної дії (перехоплення)', () => {
        document.body.innerHTML = `
            <div class="test-comment-block">
                <button class="syh-button">SYH</button>
                <button class="test-star-button" aria-selected="true"></button>
            </div>
        `;
        const self = createMockSelf();
        let starClicked = false;
        const starBtn = document.querySelector('.test-star-button');
        starBtn.click = () => { starClicked = true; };
        bindMiddleClickHandler(self);

        // Подію розпилюємо саме на syh-button — тоді target.closest('.syh-button') дасть збіг
        document.querySelector('.syh-button').dispatchEvent(
            new MouseEvent('mousedown', { bubbles: true, button: 1 })
        );

        assert.equal(starClicked, false);
    });
});

// ---------------------------------------------------------------------------

describe('event_comments handlers — bindContextMenuHandlers', () => {
    test('9. правий клік по не-action кнопці → жодної дії', () => {
        document.body.innerHTML = `
            <div class="test-comment-block"></div>
        `;
        const self = createMockSelf();
        bindContextMenuHandlers(self);

        document.querySelector('.test-comment-block').dispatchEvent(
            new MouseEvent('contextmenu', { bubbles: true, button: 2 })
        );
    });

    test('10. правий клік по comment actions кнопці → preventDefault + toggle checkbox', () => {
        document.body.innerHTML = `
            <div class="test-comment-block">
                <div class="test-comment-text">Test prayer</div>
                <button data-testid="show-comment-button">Actions</button>
                <input class="syh-checkbox" data-type="comment" type="checkbox" checked>
            </div>
        `;
        const self = createMockSelf();
        bindContextMenuHandlers(self);

        const actionsBtn = document.querySelector('[data-testid="show-comment-button"]');
        const event = new MouseEvent('contextmenu', { bubbles: true, button: 2 });
        let prevented = false;
        event.preventDefault = () => { prevented = true; };
        actionsBtn.dispatchEvent(event);

        assert.ok(prevented, 'preventDefault має бути викликано');
        const checkbox = document.querySelector('.syh-checkbox');
        assert.equal(checkbox.checked, false, 'чекбокс має бути переключений');
    });

    test('11. правий клік по copy-prayer кнопці → preventDefault', () => {
        document.body.innerHTML = `
            <div class="test-comment-block">
                <button class="syh-button" data-action="copy-prayer">Copy</button>
            </div>
        `;
        const self = createMockSelf();
        bindContextMenuHandlers(self);

        const copyBtn = document.querySelector('.syh-button[data-action="copy-prayer"]');
        const event = new MouseEvent('contextmenu', { bubbles: true, button: 2 });
        let prevented = false;
        event.preventDefault = () => { prevented = true; };
        copyBtn.dispatchEvent(event);

        assert.ok(prevented);
    });
});

// ---------------------------------------------------------------------------

describe('event_comments handlers — bindSyhButtonMouseHandlers', () => {
    test('12. середній клік по syh-button[data-type="comment"] → preventDefault', () => {
        document.body.innerHTML = `
            <div class="test-comment-block">
                <button class="syh-button" data-type="comment">SYH</button>
            </div>
        `;
        const self = createMockSelf();
        bindSyhButtonMouseHandlers(self);

        const btn = document.querySelector('.syh-button[data-type="comment"]');
        const event = new MouseEvent('mousedown', { bubbles: true, button: 1 });
        let prevented = false;
        event.preventDefault = () => { prevented = true; };
        btn.dispatchEvent(event);

        assert.ok(prevented);
    });

    test('13. лівий клік по syh-button → без preventDefault', () => {
        document.body.innerHTML = `
            <div class="test-comment-block">
                <button class="syh-button" data-type="comment">SYH</button>
            </div>
        `;
        const self = createMockSelf();
        bindSyhButtonMouseHandlers(self);

        const btn = document.querySelector('.syh-button[data-type="comment"]');
        const event = new MouseEvent('mousedown', { bubbles: true, button: 0 });
        let prevented = false;
        event.preventDefault = () => { prevented = true; };
        btn.dispatchEvent(event);

        assert.equal(prevented, false);
    });

    test('14. mouseup по syh-button → делегує у handleSyhButtonMouseUp', () => {
        document.body.innerHTML = `
            <div class="test-comment-block">
                <div class="test-comment-author">@Author</div>
                <div class="test-comment-text">Text</div>
                <button class="syh-button" data-type="comment" data-action="copy-prayer">Copy</button>
            </div>
        `;
        const self = createMockSelf();
        bindSyhButtonMouseHandlers(self);

        const btn = document.querySelector('.syh-button');
        const event = new MouseEvent('mouseup', { bubbles: true, button: 0 });
        let prevented = false;
        event.preventDefault = () => { prevented = true; };
        btn.dispatchEvent(event);

        assert.ok(prevented);
    });
});

// ---------------------------------------------------------------------------

describe('event_comments handlers — bindCheckboxChangeHandler', () => {
    test('15. зміна чекбокса → збереження стану у SYH_STATE', () => {
        document.body.innerHTML = `
            <div class="test-comment-block">
                <div class="test-comment-text">Check me text</div>
                <input class="syh-checkbox" data-type="comment" type="checkbox" checked>
            </div>
        `;
        const self = createMockSelf();
        bindCheckboxChangeHandler(self);

        const cb = document.querySelector('.syh-checkbox');
        cb.dispatchEvent(new Event('change', { bubbles: true }));

        // Handler reads checkbox.checked and saves via CommentService.setStreamYardCheckboxState
        assert.equal(SYH_STATE.getState('Check me text'), true,
            'стан чекбокса має бути збережений у SYH_STATE');
    });

    test('16. клік не по чекбоксу → жодної дії', () => {
        document.body.innerHTML = `
            <div class="test-comment-block">
                <input class="syh-checkbox" data-type="comment" type="checkbox">
            </div>
        `;
        const self = createMockSelf();
        bindCheckboxChangeHandler(self);

        document.querySelector('.test-comment-block').dispatchEvent(
            new Event('change', { bubbles: true })
        );
    });
});
