import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';

// ---------------------------------------------------------------------------
// Мінімальні DOM/chrome-моки (jsdom у проєкті не використовується).
// Обробники кліків реєструються на `document`, тому мок мусить їх запам'ятовувати.
// ---------------------------------------------------------------------------

function makeElement(tag = 'div') {
    return {
        tagName: String(tag).toUpperCase(),
        attrs: {},
        style: {},
        className: '',
        textContent: '',
        innerHTML: '',
        children: [],
        insertedHtml: [],
        focusCount: 0,
        setAttribute(name, value) { this.attrs[name] = String(value); },
        getAttribute(name) { return name in this.attrs ? this.attrs[name] : null; },
        removeAttribute(name) { delete this.attrs[name]; },
        insertAdjacentHTML(position, html) { this.insertedHtml.push({ position, html }); },
        appendChild(node) { this.children.push(node); return node; },
        append(...nodes) { this.children.push(...nodes); },
        focus() { this.focusCount++; },
        remove() {}
    };
}

/** Кнопка списку: `closest` віддає саму себе лише для «свого» селектора. */
function makeClickTarget(selector, attrs = {}) {
    const el = makeElement('button');
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    el.closest = (sel) => (sel === selector ? el : null);
    return el;
}

let elements = {};
let storage = {};
let documentListeners = {};
let confirmAnswer = true;
let confirmMessages = [];
let unstarTexts = [];
let activeTabUrl = 'https://streamyard.com/abc-def-ghi';
let selectionOps = [];

global.window = global;
global.document = {
    getElementById: (id) => elements[id] || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: (type, handler) => {
        (documentListeners[type] = documentListeners[type] || []).push(handler);
    },
    createElement: (tag) => makeElement(tag),
    createDocumentFragment: () => makeElement('#fragment'),
    createRange: () => ({
        selectNodeContents: (node) => selectionOps.push(['selectNodeContents', node]),
        collapse: (toStart) => selectionOps.push(['collapse', toStart])
    }),
    body: null
};
global.getSelection = () => ({
    removeAllRanges: () => selectionOps.push(['removeAllRanges']),
    addRange: () => selectionOps.push(['addRange'])
});
global.alert = () => {};
global.confirm = (msg) => { confirmMessages.push(msg); return confirmAnswer; };
global.setTimeout = (fn) => { fn(); return 0; };
global.clearTimeout = () => {};
global.requestAnimationFrame = undefined;

global.chrome = {
    runtime: { id: 'test-extension-id', lastError: null, onMessage: { addListener() {} } },
    storage: {
        local: {
            get(keys, cb) {
                const list = Array.isArray(keys) ? keys : [keys];
                const out = {};
                for (const k of list) { if (k in storage) out[k] = storage[k]; }
                cb(out);
            },
            set(items, cb) { Object.assign(storage, items); if (cb) cb(); },
            remove(_k, cb) { if (cb) cb(); }
        },
        onChanged: { addListener() {} }
    },
    tabs: {
        query(_opts, cb) { cb(activeTabUrl === null ? [] : [{ id: 1, url: activeTabUrl }]); },
        sendMessage(_id, msg, cb) {
            if (msg && msg.action === 'unstar_comment') unstarTexts.push(msg.text);
            cb(null);
        }
    }
};

const {
    PRAYER_CLICK_ROUTES,
    WIPE_PRAYERS_CONFIRM_MESSAGE,
    buildDeleteAuthorConfirm,
    extractRoomIdFromUrl,
    readActiveTabUrl,
    readAuthorAttribute,
    readPrayerIdAttribute,
    resolvePrayerClickRoute,
    splitPrayersByAuthor,
    splitPrayersById,
    stampPrayersWithRoom
} = await import('../popup/prayer_click_rules.ts');

const { STORAGE_KEYS } = await import('../modules/storage/storage.ts');
const {
    bindPrayerClickListeners,
    handleEditPrayerAuthor,
    initPopupPrayersListeners
} = await import('../popup/prayer_handlers_click.ts');

const PRAYERS_KEY = STORAGE_KEYS.PRAYERS;

function prayer(id, author, text, type = 'prayer') {
    return { id, author, text, type, icon: '🙏🙏🙏', roomId: 'old-room', timestamp: Date.now() };
}

/** Проганяє клік крізь усі зареєстровані на документі обробники. */
function fireClick(target) {
    for (const handler of documentListeners.click || []) handler({ target });
}

// ---------------------------------------------------------------------------
// Чисті правила
// ---------------------------------------------------------------------------

describe('prayer_click_rules — маршрутизація кліку', () => {
    test('1. без цілі кліку маршрут не визначається', () => {
        assert.equal(resolvePrayerClickRoute(null), null);
        assert.equal(resolvePrayerClickRoute(undefined), null);
    });

    test('2. клік повз кнопки списку не дає маршруту', () => {
        assert.equal(resolvePrayerClickRoute({ closest: () => null }), null);
    });

    test('3. кожен селектор веде до своєї дії', () => {
        for (const route of PRAYER_CLICK_ROUTES) {
            const el = makeClickTarget(route.selector);
            assert.deepEqual(resolvePrayerClickRoute(el), { action: route.action, element: el });
        }
    });

    test('4. порядок правил зафіксовано: перший збіг виграє', () => {
        assert.deepEqual(
            PRAYER_CLICK_ROUTES.map(r => r.action),
            ['edit-author', 'delete-author', 'wipe-all', 'keep-room', 'delete-one']
        );

        // Ціль підходить одразу під два селектори — виграє той, що вище у списку.
        const both = makeElement('button');
        both.closest = (sel) => (sel === '.edit-prayer-btn' || sel === '.del-prayer-btn' ? both : null);
        assert.equal(resolvePrayerClickRoute(both).action, 'edit-author');
    });
});

describe('prayer_click_rules — читання атрибутів і тексти підтверджень', () => {
    test('5. readAuthorAttribute -> "" за відсутнього data-author', () => {
        assert.equal(readAuthorAttribute(makeClickTarget('.x', { 'data-author': 'Іван' })), 'Іван');
        assert.equal(readAuthorAttribute(makeClickTarget('.x')), '');
    });

    test('6. readPrayerIdAttribute зберігає null, щоб не сплутати з порожнім id', () => {
        assert.equal(readPrayerIdAttribute(makeClickTarget('.x', { 'data-id': 'p1' })), 'p1');
        assert.equal(readPrayerIdAttribute(makeClickTarget('.x')), null);
    });

    test('7. підтвердження іменують саме того автора, якого видаляють', () => {
        assert.equal(buildDeleteAuthorConfirm('Іван'), 'Видалити всі прохання від @Іван?');
        assert.match(WIPE_PRAYERS_CONFIRM_MESSAGE, /пам'яті розширення/);
    });
});

describe('prayer_click_rules — розділення списку', () => {
    const list = () => [
        prayer('p1', 'Іван', 'молюсь 1'),
        prayer('p2', 'Марія', 'молюсь 2'),
        prayer('p3', 'Іван', 'молюсь 3')
    ];

    test('8. splitPrayersByAuthor забирає всі прохання автора', () => {
        const { removed, kept } = splitPrayersByAuthor(list(), 'Іван');
        assert.deepEqual(removed.map(i => i.id), ['p1', 'p3']);
        assert.deepEqual(kept.map(i => i.id), ['p2']);
    });

    test('9. невідомий автор нічого не забирає і нічого не втрачає', () => {
        const { removed, kept } = splitPrayersByAuthor(list(), 'Хтось');
        assert.deepEqual(removed, []);
        assert.equal(kept.length, 3);
    });

    test('10. splitPrayersById забирає рівно одне прохання', () => {
        const { removed, kept } = splitPrayersById(list(), 'p2');
        assert.deepEqual(removed.map(i => i.id), ['p2']);
        assert.deepEqual(kept.map(i => i.id), ['p1', 'p3']);
    });

    test('11. id === null не видаляє нічого (кнопка без data-id)', () => {
        const { removed, kept } = splitPrayersById(list(), null);
        assert.deepEqual(removed, []);
        assert.equal(kept.length, 3);
    });
});

describe('prayer_click_rules — кімната активної вкладки', () => {
    test('12. readActiveTabUrl бере url першої вкладки або null', () => {
        assert.equal(readActiveTabUrl([{ url: 'https://streamyard.com/room' }]), 'https://streamyard.com/room');
        assert.equal(readActiveTabUrl([]), null);
        assert.equal(readActiveTabUrl([{}]), null);
        assert.equal(readActiveTabUrl(undefined), null);
    });

    test('13. extractRoomIdFromUrl прибирає слеші зі шляху', () => {
        assert.equal(extractRoomIdFromUrl('https://streamyard.com/abc-def'), 'abc-def');
        assert.equal(extractRoomIdFromUrl('https://streamyard.com/'), '');
    });

    test('14. невалідний URL -> null (обробник мовчки виходить)', () => {
        assert.equal(extractRoomIdFromUrl('не-урл'), null);
        assert.equal(extractRoomIdFromUrl(''), null);
        assert.equal(extractRoomIdFromUrl(null), null);
    });

    test('15. stampPrayersWithRoom чіпає лише type="prayer" і мутує на місці', () => {
        const source = [prayer('p1', 'Іван', 'молюсь'), prayer('p2', 'Марія', 'питання', 'question')];
        const result = stampPrayersWithRoom(source, 'new-room', 777);

        assert.equal(result, source, 'повертається той самий масив');
        assert.equal(source[0].roomId, 'new-room');
        assert.equal(source[0].timestamp, 777);
        assert.equal(source[1].roomId, 'old-room', 'питання лишається у своїй кімнаті');
    });
});

// ---------------------------------------------------------------------------
// Публічний API: bindPrayerClickListeners + обробники
// ---------------------------------------------------------------------------

describe('prayer_handlers_click — публічний API', () => {
    beforeEach(() => {
        storage = {};
        elements = { prayersResultDiv: makeElement('div') };
        documentListeners = {};
        confirmAnswer = true;
        confirmMessages = [];
        unstarTexts = [];
        activeTabUrl = 'https://streamyard.com/abc-def-ghi';
        selectionOps = [];

        storage[PRAYERS_KEY] = [
            prayer('p1', 'Іван', 'молюсь 1'),
            prayer('p2', 'Марія', 'молюсь 2'),
            prayer('p3', 'Іван', 'молюсь 3'),
            prayer('p4', 'Іван', 'питання', 'question')
        ];
    });

    test('16. вішає рівно один click-слухач на документ', () => {
        bindPrayerClickListeners();
        assert.equal((documentListeners.click || []).length, 1);
    });

    test('17. клік повз кнопки нічого не змінює', () => {
        bindPrayerClickListeners();
        fireClick({ closest: () => null });

        assert.equal(storage[PRAYERS_KEY].length, 4);
        assert.deepEqual(confirmMessages, []);
    });

    test('18. видалення автора прибирає всі його записи і знімає зірочки', () => {
        bindPrayerClickListeners();
        fireClick(makeClickTarget('.del-author-btn', { 'data-author': 'Іван' }));

        assert.deepEqual(confirmMessages, ['Видалити всі прохання від @Іван?']);
        assert.deepEqual(storage[PRAYERS_KEY].map(i => i.id), ['p2']);
        assert.deepEqual(unstarTexts, ['молюсь 1', 'молюсь 3', 'питання']);
    });

    test('19. скасований confirm лишає сховище недоторканим', () => {
        confirmAnswer = false;
        bindPrayerClickListeners();
        fireClick(makeClickTarget('.del-author-btn', { 'data-author': 'Іван' }));

        assert.equal(storage[PRAYERS_KEY].length, 4);
        assert.deepEqual(unstarTexts, []);
    });

    test('20. повне очищення записує порожній список', () => {
        bindPrayerClickListeners();
        fireClick(makeClickTarget('#syh-wipe-prayers'));

        assert.deepEqual(confirmMessages, [WIPE_PRAYERS_CONFIRM_MESSAGE]);
        assert.deepEqual(storage[PRAYERS_KEY], []);
        assert.deepEqual(unstarTexts, [], 'зірочки у Стрімярді не чіпаємо');
    });

    test('21. повне очищення скасовується у confirm', () => {
        confirmAnswer = false;
        bindPrayerClickListeners();
        fireClick(makeClickTarget('#syh-wipe-prayers'));

        assert.equal(storage[PRAYERS_KEY].length, 4);
    });

    test('22. видалення одного прохання знімає рівно одну зірочку', () => {
        bindPrayerClickListeners();
        fireClick(makeClickTarget('.del-prayer-btn', { 'data-id': 'p2' }));

        assert.deepEqual(storage[PRAYERS_KEY].map(i => i.id), ['p1', 'p3', 'p4']);
        assert.deepEqual(unstarTexts, ['молюсь 2']);
        assert.deepEqual(confirmMessages, [], 'видалення одного прохання не питає підтвердження');
    });

    test('23. невідомий data-id нічого не видаляє', () => {
        bindPrayerClickListeners();
        fireClick(makeClickTarget('.del-prayer-btn', { 'data-id': 'відсутній' }));

        assert.equal(storage[PRAYERS_KEY].length, 4);
        assert.deepEqual(unstarTexts, []);
    });

    test('24. «лишити для поточної кімнати» перепризначає лише молитви', () => {
        bindPrayerClickListeners();
        fireClick(makeClickTarget('#syh-keep-prayers'));

        const saved = storage[PRAYERS_KEY];
        assert.deepEqual(
            saved.filter(i => i.type === 'prayer').map(i => i.roomId),
            ['abc-def-ghi', 'abc-def-ghi', 'abc-def-ghi']
        );
        assert.equal(saved.find(i => i.id === 'p4').roomId, 'old-room');
    });

    test('25. без активної вкладки кімната не перепризначається', () => {
        activeTabUrl = null;
        bindPrayerClickListeners();
        fireClick(makeClickTarget('#syh-keep-prayers'));

        assert.deepEqual(storage[PRAYERS_KEY].map(i => i.roomId), ['old-room', 'old-room', 'old-room', 'old-room']);
    });

    test('26. невалідний URL вкладки не ламає обробник', () => {
        activeTabUrl = 'chrome://newtab';
        bindPrayerClickListeners();

        assert.doesNotThrow(() => fireClick(makeClickTarget('#syh-keep-prayers')));
    });

    test('27. редагування автора фокусує поле і ставить курсор у кінець', () => {
        const authorSpan = makeElement('span');
        const block = makeElement('div');
        block.querySelector = (sel) => (sel === '.editable-author' ? authorSpan : null);

        const editBtn = makeElement('button');
        editBtn.closest = (sel) => (sel === '.q-block' ? block : null);

        handleEditPrayerAuthor(editBtn);

        assert.equal(authorSpan.focusCount, 1);
        assert.deepEqual(selectionOps.map(op => op[0]), [
            'selectNodeContents', 'collapse', 'removeAllRanges', 'addRange'
        ]);
    });

    test('28. редагування автора без шапки списку — тихий no-op', () => {
        const editBtn = makeElement('button');
        editBtn.closest = () => null;

        assert.doesNotThrow(() => handleEditPrayerAuthor(editBtn));
        assert.deepEqual(selectionOps, []);
    });

    test('29. initPopupPrayersListeners піднімає focus/click/toolbar разом', () => {
        initPopupPrayersListeners();

        assert.equal((documentListeners.click || []).length, 1);
        assert.equal((documentListeners.focusin || []).length, 2, 'прохання + автор');
        assert.equal((documentListeners.focusout || []).length, 2);
    });
});
