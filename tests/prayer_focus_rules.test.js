import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';

// ---------------------------------------------------------------------------
// Мінімальні DOM/chrome-моки (jsdom у проєкті не використовується).
// ---------------------------------------------------------------------------

/** Інлайн-редаговане поле: `closest` віддає себе лише для «свого» селектора. */
function makeEditable(selector, { text = '', attrs = {} } = {}) {
    const el = {
        style: {},
        textContent: text,
        attrs: { ...attrs },
        setAttribute(name, value) { this.attrs[name] = String(value); },
        getAttribute(name) { return name in this.attrs ? this.attrs[name] : null; },
        closest(sel) { return sel === selector ? this : null; }
    };
    return el;
}

let storage = {};
let documentListeners = {};
let storageWrites = 0;

global.window = global;
global.document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: (type, handler) => {
        (documentListeners[type] = documentListeners[type] || []).push(handler);
    },
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, append() {} }),
    body: null
};

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock({
    storageImpl: {
        get(keys, cb) {
            const list = Array.isArray(keys) ? keys : [keys];
            const out = {};
            for (const k of list) { if (k in storage) out[k] = storage[k]; }
            cb(out);
        },
        set(items, cb) { storageWrites++; Object.assign(storage, items); if (cb) cb(); },
        remove(_k, cb) { if (cb) cb(); }
    }
});

global.chrome.tabs = { query(_o, cb) { cb([]); } };

const {
    AUTHOR_OLD_VALUE_ATTR,
    BLUR_BORDER,
    EDITABLE_AUTHOR_SELECTOR,
    EDITABLE_PRAYER_SELECTOR,
    FOCUS_BORDER,
    applyAuthorRename,
    applyPrayerTextEdit,
    readTrimmedText,
    resolveEditableTarget,
    shouldRenameAuthor
} = await import('../popup/prayer_focus_rules.ts');

const { STORAGE_KEYS } = await import('../modules/storage.ts');
const { bindPrayerFocusListeners } = await import('../popup/prayer_handlers_focus.ts');

const PRAYERS_KEY = STORAGE_KEYS.PRAYERS;

function prayer(id, author, text) {
    return { id, author, text, type: 'prayer', icon: '🙏🙏🙏', roomId: 'room', timestamp: Date.now() };
}

/** Проганяє подію фокуса крізь усі зареєстровані на документі обробники. */
function fire(type, target) {
    for (const handler of documentListeners[type] || []) handler({ target });
}

// ---------------------------------------------------------------------------
// Чисті правила
// ---------------------------------------------------------------------------

describe('prayer_focus_rules — маршрутизація фокуса', () => {
    test('1. без цілі події поле не визначається', () => {
        assert.equal(resolveEditableTarget(null, EDITABLE_PRAYER_SELECTOR), null);
        assert.equal(resolveEditableTarget(undefined, EDITABLE_AUTHOR_SELECTOR), null);
    });

    test('2. поле автора не сплутується з полем прохання', () => {
        const author = makeEditable(EDITABLE_AUTHOR_SELECTOR);

        assert.equal(resolveEditableTarget(author, EDITABLE_AUTHOR_SELECTOR), author);
        assert.equal(resolveEditableTarget(author, EDITABLE_PRAYER_SELECTOR), null);
    });

    test('3. підкреслення у фокусі та поза ним відрізняються', () => {
        assert.notEqual(FOCUS_BORDER, BLUR_BORDER);
        assert.match(BLUR_BORDER, /transparent/);
    });
});

describe('prayer_focus_rules — читання тексту', () => {
    test('4. readTrimmedText прибирає крайні пробіли', () => {
        assert.equal(readTrimmedText({ textContent: '  молюсь  ' }), 'молюсь');
    });

    test('5. порожній/відсутній текст -> ""', () => {
        assert.equal(readTrimmedText({ textContent: '   ' }), '');
        assert.equal(readTrimmedText({ textContent: null }), '');
        assert.equal(readTrimmedText(null), '');
    });
});

describe('prayer_focus_rules — правка тексту прохання', () => {
    test('6. новий текст записується і повідомляє про зміну', () => {
        const list = [prayer('p1', 'Іван', 'старий')];
        assert.equal(applyPrayerTextEdit(list, 'p1', 'новий'), true);
        assert.equal(list[0].text, 'новий');
    });

    test('7. незмінний текст не вважається правкою (запису у сховище не буде)', () => {
        const list = [prayer('p1', 'Іван', 'той самий')];
        assert.equal(applyPrayerTextEdit(list, 'p1', 'той самий'), false);
    });

    test('8. невідомий id нічого не змінює', () => {
        const list = [prayer('p1', 'Іван', 'старий')];
        assert.equal(applyPrayerTextEdit(list, 'відсутній', 'новий'), false);
        assert.equal(applyPrayerTextEdit(list, null, 'новий'), false);
        assert.equal(list[0].text, 'старий');
    });

    test('9. очищення поля зберігається як порожній текст', () => {
        const list = [prayer('p1', 'Іван', 'старий')];
        assert.equal(applyPrayerTextEdit(list, 'p1', ''), true);
        assert.equal(list[0].text, '');
    });
});

describe('prayer_focus_rules — перейменування автора', () => {
    test('10. перейменування має сенс лише між двома різними непорожніми іменами', () => {
        assert.equal(shouldRenameAuthor('Іван', 'Іванна'), true);
        assert.equal(shouldRenameAuthor('Іван', 'Іван'), false);
        assert.equal(shouldRenameAuthor('', 'Іван'), false);
        assert.equal(shouldRenameAuthor(null, 'Іван'), false);
        assert.equal(shouldRenameAuthor('Іван', ''), false, 'стерте ім’я не застосовується');
    });

    test('11. applyAuthorRename торкається всіх прохань автора', () => {
        const list = [
            prayer('p1', 'Іван', 'a'),
            prayer('p2', 'Марія', 'b'),
            prayer('p3', 'Іван', 'c')
        ];

        assert.equal(applyAuthorRename(list, 'Іван', 'Іванна'), true);
        assert.deepEqual(list.map(i => i.author), ['Іванна', 'Марія', 'Іванна']);
    });

    test('12. відсутній автор -> false, список недоторканий', () => {
        const list = [prayer('p1', 'Іван', 'a')];
        assert.equal(applyAuthorRename(list, 'Хтось', 'Новий'), false);
        assert.equal(list[0].author, 'Іван');
    });
});

// ---------------------------------------------------------------------------
// Публічний API: bindPrayerFocusListeners
// ---------------------------------------------------------------------------

describe('prayer_handlers_focus — публічний API bindPrayerFocusListeners', () => {
    beforeEach(() => {
        storage = { [PRAYERS_KEY]: [prayer('p1', 'Іван', 'молюсь 1'), prayer('p2', 'Марія', 'молюсь 2')] };
        documentListeners = {};
        storageWrites = 0;
        bindPrayerFocusListeners();
    });

    test('13. реєструє по два focusin і focusout (прохання + автор)', () => {
        assert.equal(documentListeners.focusin.length, 2);
        assert.equal(documentListeners.focusout.length, 2);
    });

    test('14. фокус на проханні підсвічує поле', () => {
        const el = makeEditable(EDITABLE_PRAYER_SELECTOR, { text: 'молюсь 1', attrs: { 'data-id': 'p1' } });
        fire('focusin', el);

        assert.equal(el.style.borderBottom, FOCUS_BORDER);
    });

    test('15. фокус на авторі запам’ятовує старе ім’я', () => {
        const el = makeEditable(EDITABLE_AUTHOR_SELECTOR, { text: '  Іван  ' });
        fire('focusin', el);

        assert.equal(el.style.borderBottom, FOCUS_BORDER);
        assert.equal(el.getAttribute(AUTHOR_OLD_VALUE_ATTR), 'Іван');
    });

    test('16. втрата фокуса знімає підсвітку', () => {
        const el = makeEditable(EDITABLE_PRAYER_SELECTOR, { text: 'молюсь 1', attrs: { 'data-id': 'p1' } });
        fire('focusout', el);

        assert.equal(el.style.borderBottom, BLUR_BORDER);
    });

    test('17. правка прохання зберігається у сховище', () => {
        const el = makeEditable(EDITABLE_PRAYER_SELECTOR, { text: '  оновлений текст  ', attrs: { 'data-id': 'p1' } });
        fire('focusout', el);

        assert.equal(storage[PRAYERS_KEY].find(i => i.id === 'p1').text, 'оновлений текст');
        assert.equal(storageWrites, 1);
    });

    test('18. правка без змін не звертається до сховища на запис', () => {
        const el = makeEditable(EDITABLE_PRAYER_SELECTOR, { text: 'молюсь 1', attrs: { 'data-id': 'p1' } });
        fire('focusout', el);

        assert.equal(storageWrites, 0);
    });

    test('19. повний цикл focusin -> focusout перейменовує автора всюди', () => {
        storage[PRAYERS_KEY] = [prayer('p1', 'Іван', 'a'), prayer('p2', 'Іван', 'b'), prayer('p3', 'Марія', 'c')];

        const el = makeEditable(EDITABLE_AUTHOR_SELECTOR, { text: 'Іван' });
        fire('focusin', el);
        el.textContent = 'Іванна';
        fire('focusout', el);

        assert.deepEqual(storage[PRAYERS_KEY].map(i => i.author), ['Іванна', 'Іванна', 'Марія']);
        assert.equal(storageWrites, 1);
    });

    test('20. без focusin (немає data-old-val) перейменування не відбувається', () => {
        const el = makeEditable(EDITABLE_AUTHOR_SELECTOR, { text: 'Іванна' });
        fire('focusout', el);

        assert.deepEqual(storage[PRAYERS_KEY].map(i => i.author), ['Іван', 'Марія']);
        assert.equal(storageWrites, 0);
    });

    test('21. ім’я без змін не пише у сховище', () => {
        const el = makeEditable(EDITABLE_AUTHOR_SELECTOR, { text: 'Іван' });
        fire('focusin', el);
        fire('focusout', el);

        assert.equal(storageWrites, 0);
    });

    test('22. подія повз інлайн-поля ігнорується всіма обробниками', () => {
        const foreign = { closest: () => null, style: {} };

        fire('focusin', foreign);
        fire('focusout', foreign);

        assert.equal(storageWrites, 0);
        assert.deepEqual(storage[PRAYERS_KEY].map(i => i.author), ['Іван', 'Марія']);
    });
});
