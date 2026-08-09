// Характеристичні тести для auto_heal.ts (modules/event_comments/auto_heal).
//
// Тести створюють DOM-елементи, викликають bindAutoHealScanner (який
// викликає runAutoHeal у кінці), та перевіряють side-effects:
// - check сканування кнопок "Показати" (cover buttons) → checked
// - check фікс "привидів" → видалення з БД
// - chrome.runtime.id guard → пропуск сканування

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

const { bindAutoHealScanner } = await import('../modules/event_comments/auto_heal.ts');
const { SYH_STATE } = await import('../modules/state.ts');

const TEST_SELECTORS = {
    commentBlock: '.test-comment-block',
    commentText: '.test-comment-text',
    commentAuthor: '.test-comment-author',
    starButton: '.test-star-button',
};

let currentSelf = null;

function createMockSelf(overrides = {}) {
    const calls = {
        removeFromDatabase: [],
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
        unregisterAutoHeal: null,
        removeFromDatabase: (text) => {
            calls.removeFromDatabase.push(text);
            return Promise.resolve();
        },
        saveToDatabase: (author, text, type, icon) => Promise.resolve(),
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
            if (self.unregisterAutoHeal) { self.unregisterAutoHeal(); self.unregisterAutoHeal = null; }
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

describe('event_comments auto_heal — bindAutoHealScanner cover button marking', () => {
    test('1. cover button з "Hide" текстом → чекбокс встановлюється в checked', () => {
        document.body.innerHTML = `
            <div class="test-comment-block">
                <div class="test-comment-text">Some prayer</div>
                <button data-testid="show-comment-button">Hide</button>
                <input class="syh-checkbox" data-type="comment" type="checkbox">
            </div>
        `;
        const self = createMockSelf();
        bindAutoHealScanner(self);

        const cb = document.querySelector('.syh-checkbox');
        assert.equal(cb.checked, true, 'чекбокс має бути встановлений у checked');
        assert.equal(SYH_STATE.getState('Some prayer'), true);
    });

    test('2. cover button з .lucide-circle-minus → чекбокс встановлюється в checked', () => {
        document.body.innerHTML = `
            <div class="test-comment-block">
                <div class="test-comment-text">Prayer text 2</div>
                <button data-testid="show-comment-button"><span class="lucide-circle-minus"></span>Menu</button>
                <input class="syh-checkbox" data-type="comment" type="checkbox">
            </div>
        `;
        const self = createMockSelf();
        bindAutoHealScanner(self);

        const cb = document.querySelector('.syh-checkbox');
        assert.equal(cb.checked, true);
    });

    test('3. cover button без "Hide" та без .lucide → жодних змін', () => {
        document.body.innerHTML = `
            <div class="test-comment-block">
                <button data-testid="show-comment-button">Show</button>
                <input class="syh-checkbox" data-type="comment" type="checkbox">
            </div>
        `;
        const self = createMockSelf();
        bindAutoHealScanner(self);

        const cb = document.querySelector('.syh-checkbox');
        assert.equal(cb.checked, false);
    });

    test('4. чекбокс вже checked → жодних змін', () => {
        document.body.innerHTML = `
            <div class="test-comment-block">
                <div class="test-comment-text">Already checked</div>
                <button data-testid="show-comment-button">Hide</button>
                <input class="syh-checkbox" data-type="comment" type="checkbox" checked>
            </div>
        `;
        const self = createMockSelf();
        bindAutoHealScanner(self);

        const cb = document.querySelector('.syh-checkbox');
        assert.equal(cb.checked, true);
    });
});

// ---------------------------------------------------------------------------

describe('event_comments auto_heal — bindAutoHealScanner ghost removal', () => {
    test('5. коментар без зірки (aria-selected=false) → видалення з БД + оновлення візуалу', async () => {
        document.body.innerHTML = `
            <div class="test-comment-block" data-syh-type="prayer">
                <div class="test-comment-text">Ghost prayer</div>
                <button class="test-star-button" aria-selected="false"></button>
            </div>
        `;
        const self = createMockSelf();
        bindAutoHealScanner(self);

        assert.equal(self.calls.removeFromDatabase.length, 1);
        assert.equal(self.calls.removeFromDatabase[0], 'Ghost prayer');
        assert.equal(self.calls.updateCommentVisuals.length, 1);
        assert.equal(self.calls.updateCommentVisuals[0].type, 'none');

        await new Promise(r => setTimeout(r, 110));
        assert.ok(self.calls.filterStarredComments >= 1);
    });

    test('6. коментар з зіркою (aria-selected=true) → жодного видалення', () => {
        document.body.innerHTML = `
            <div class="test-comment-block" data-syh-type="question">
                <div class="test-comment-text">Starred question</div>
                <button class="test-star-button" aria-selected="true"></button>
            </div>
        `;
        const self = createMockSelf();
        bindAutoHealScanner(self);

        assert.equal(self.calls.removeFromDatabase.length, 0);
    });

    test('7. новий коментар (data-syh-just-added) без зірки → жодного видалення', () => {
        document.body.innerHTML = `
            <div class="test-comment-block" data-syh-type="question" data-syh-just-added="true">
                <div class="test-comment-text">Just added</div>
                <button class="test-star-button" aria-selected="false"></button>
            </div>
        `;
        const self = createMockSelf();
        bindAutoHealScanner(self);

        assert.equal(self.calls.removeFromDatabase.length, 0);
    });

    test('8. коментар без star кнопки → жодного видалення', () => {
        document.body.innerHTML = `
            <div class="test-comment-block" data-syh-type="prayer">
                <div class="test-comment-text">No star button</div>
            </div>
        `;
        const self = createMockSelf();
        bindAutoHealScanner(self);

        assert.equal(self.calls.removeFromDatabase.length, 0);
    });
});

// ---------------------------------------------------------------------------

describe('event_comments auto_heal — UI оптимізація', () => {
    test('9. без UI → видалення з БД, але без оновлення візуалу', () => {
        document.body.innerHTML = `
            <div class="test-comment-block" data-syh-type="prayer">
                <div class="test-comment-text">No UI prayer</div>
                <button class="test-star-button" aria-selected="false"></button>
            </div>
        `;
        const self = createMockSelf({ UI: null });
        bindAutoHealScanner(self);

        assert.equal(self.calls.removeFromDatabase.length, 1);
        assert.equal(self.calls.updateCommentVisuals.length, 0);
    });
});
