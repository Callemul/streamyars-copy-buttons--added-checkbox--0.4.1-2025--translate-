import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';

// ---------------------------------------------------------------------------
// Мінімальні DOM/chrome-моки (jsdom у проєкті не використовується)
// ---------------------------------------------------------------------------

function makeButton(id, label) {
    return {
        id,
        textContent: label,
        _clicks: [],
        addEventListener(type, handler) { this._clicks.push({ type, handler }); },
        async click() {
            for (const entry of this._clicks.filter(c => c.type === 'click')) {
                await entry.handler.call(this, { type: 'click' });
            }
        }
    };
}

/**
 * Повноцінний мок елемента: `renderPrayers` — реальний, тож контейнер результату
 * має підтримувати весь набір DOM-операцій, які той викликає.
 */
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
        setAttribute(name, value) { this.attrs[name] = String(value); },
        getAttribute(name) { return name in this.attrs ? this.attrs[name] : null; },
        removeAttribute(name) { delete this.attrs[name]; },
        insertAdjacentHTML(position, html) { this.insertedHtml.push({ position, html }); },
        appendChild(node) { this.children.push(node); return node; },
        append(...nodes) { this.children.push(...nodes); },
        remove() {}
    };
}

function makeOutputDiv(rawText) {
    const el = makeElement('div');
    if (rawText !== null) el.setAttribute('data-raw-text', rawText);
    return el;
}

let elements = {};
let storage = {};
let alerts = [];
let confirmAnswer = true;
let clipboardWrites = [];
let clipboardShouldFail = false;
let activeTabResponse = null;

global.window = global;
global.document = {
    getElementById: (id) => elements[id] || null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    body: null,
    createElement: (tag) => makeElement(tag),
    createDocumentFragment: () => makeElement('#fragment')
};
global.alert = (msg) => alerts.push(msg);
global.confirm = () => confirmAnswer;
global.setTimeout = (fn) => { fn(); return 0; };
global.clearTimeout = () => {};

Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
        clipboard: {
            writeText: async (text) => {
                if (clipboardShouldFail) throw new Error('clipboard denied');
                clipboardWrites.push(text);
            }
        }
    }
});

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock({
    storageImpl: {
        get(keys, cb) {
            const list = Array.isArray(keys) ? keys : [keys];
            const out = {};
            for (const k of list) { if (k in storage) out[k] = storage[k]; }
            cb(out);
        },
        set(items, cb) { Object.assign(storage, items); if (cb) cb(); },
        remove(_k, cb) { if (cb) cb(); }
    }
});

global.chrome.tabs = {
    query(_opts, cb) { cb([{ id: 1, url: 'https://streamyard.com/room' }]); },
    sendMessage(_id, _msg, cb) { cb(activeTabResponse); }
};

const {
    CLEAR_PRAYERS_CONFIRM_MESSAGE,
    COPY_FAILURE_LABEL,
    COPY_SUCCESS_LABEL,
    FETCH_PRAYERS_FAILED_MESSAGE,
    NO_NEW_PRAYERS_MESSAGE,
    buildFetchSummaryMessage,
    copyResultLabel,
    isPrayerListPayload,
    mergeFetchedPrayers,
    readElementLabel,
    readRawPrayerText,
    readStoredPrayers,
    removePrayerEntries
} = await import('../popup/prayer_toolbar_actions.ts');

const { STORAGE_KEYS } = await import('../modules/storage.ts');
const { bindPrayerToolbarListeners } = await import('../popup/prayer_handlers_toolbar.ts');

const PRAYERS_KEY = STORAGE_KEYS.PRAYERS;

function prayer(author, text, type = 'prayer') {
    return { id: `${author}-${text}`, author, text, type };
}

// ---------------------------------------------------------------------------
// Чисті хелпери
// ---------------------------------------------------------------------------

describe('prayer_toolbar_actions — читання тексту для копіювання', () => {
    test('1. readRawPrayerText бере data-raw-text контейнера', () => {
        assert.equal(readRawPrayerText(makeOutputDiv('Іван: молюсь')), 'Іван: молюсь');
    });

    test('2. readRawPrayerText -> "" без контейнера і без атрибута', () => {
        assert.equal(readRawPrayerText(null), '');
        assert.equal(readRawPrayerText(makeOutputDiv(null)), '');
        assert.equal(readRawPrayerText(makeOutputDiv('')), '');
    });

    test('3. readElementLabel повертає підпис або "" для порожнього елемента', () => {
        assert.equal(readElementLabel({ textContent: '📋 Копіювати' }), '📋 Копіювати');
        assert.equal(readElementLabel({ textContent: null }), '');
        assert.equal(readElementLabel(null), '');
    });

    test('4. copyResultLabel розрізняє успіх і помилку', () => {
        assert.equal(copyResultLabel(true), COPY_SUCCESS_LABEL);
        assert.equal(copyResultLabel(false), COPY_FAILURE_LABEL);
    });
});

describe('prayer_toolbar_actions — робота зі списком', () => {
    test('5. readStoredPrayers -> [] для порожнього/відсутнього ключа', () => {
        assert.deepEqual(readStoredPrayers({}, PRAYERS_KEY), []);
        assert.deepEqual(readStoredPrayers(null, PRAYERS_KEY), []);
        assert.deepEqual(readStoredPrayers({ [PRAYERS_KEY]: null }, PRAYERS_KEY), []);
    });

    test('6. removePrayerEntries прибирає лише type="prayer"', () => {
        const list = [
            prayer('A', 'молитва'),
            prayer('B', 'питання', 'question'),
            { author: 'C', text: 'без типу' }
        ];

        const rest = removePrayerEntries(list);

        assert.equal(rest.length, 2);
        assert.deepEqual(rest.map(i => i.author), ['B', 'C']);
        assert.equal(list.length, 3, 'вхідний масив не мутується');
    });

    test('7. isPrayerListPayload приймає лише масив', () => {
        assert.equal(isPrayerListPayload([]), true);
        assert.equal(isPrayerListPayload([prayer('A', 'x')]), true);
        assert.equal(isPrayerListPayload(null), false);
        assert.equal(isPrayerListPayload(undefined), false);
        assert.equal(isPrayerListPayload({ 0: 'x' }), false);
        assert.equal(isPrayerListPayload('[]'), false);
    });

    test('8. mergeFetchedPrayers додає лише нові тексти й рахує їх', () => {
        const list = [prayer('A', 'вже є')];
        const { list: merged, addedCount } = mergeFetchedPrayers(list, [
            prayer('A', 'вже є'),
            prayer('B', 'нова 1'),
            prayer('C', 'нова 2')
        ]);

        assert.equal(addedCount, 2);
        assert.deepEqual(merged.map(i => i.text), ['вже є', 'нова 1', 'нова 2']);
        assert.equal(merged, list, 'повертається той самий масив (мутація навмисна)');
    });

    test('9. mergeFetchedPrayers дедуплікує за текстом, ігноруючи автора', () => {
        const { addedCount } = mergeFetchedPrayers(
            [prayer('Іван', 'спільний текст')],
            [prayer('Марія', 'спільний текст')]
        );
        assert.equal(addedCount, 0);
    });

    test('10. mergeFetchedPrayers на порожньому вході нічого не додає', () => {
        const { list, addedCount } = mergeFetchedPrayers([], []);
        assert.deepEqual(list, []);
        assert.equal(addedCount, 0);
    });

    test('11. buildFetchSummaryMessage розрізняє «додано N» та «нічого нового»', () => {
        assert.match(buildFetchSummaryMessage(3), /нових молитов: 3/);
        assert.equal(buildFetchSummaryMessage(0), NO_NEW_PRAYERS_MESSAGE);
    });
});

// ---------------------------------------------------------------------------
// Публічний API: bindPrayerToolbarListeners
// ---------------------------------------------------------------------------

describe('prayer_handlers_toolbar — публічний API bindPrayerToolbarListeners', () => {
    let copyBtn, clearBtn, fetchBtn, outputDiv;

    beforeEach(() => {
        storage = {};
        alerts = [];
        clipboardWrites = [];
        clipboardShouldFail = false;
        confirmAnswer = true;
        activeTabResponse = null;

        copyBtn = makeButton('copyPrayersBtn', '📋 Копіювати');
        clearBtn = makeButton('clearPrayersBtn', '🗑 Очистити');
        fetchBtn = makeButton('fetchPrayersBtn', '🔄 Підтягнути');
        outputDiv = makeOutputDiv('Іван: молюсь за здоровʼя');

        elements = {
            copyPrayersBtn: copyBtn,
            clearPrayersBtn: clearBtn,
            fetchPrayersBtn: fetchBtn,
            prayersResultDiv: outputDiv
        };
    });

    test('12. вішає рівно один click-слухач на кожну з трьох кнопок', () => {
        bindPrayerToolbarListeners();

        assert.equal(copyBtn._clicks.length, 1);
        assert.equal(clearBtn._clicks.length, 1);
        assert.equal(fetchBtn._clicks.length, 1);
        assert.equal(copyBtn._clicks[0].type, 'click');
    });

    test('13. не падає, коли кнопок тулбара немає в DOM', () => {
        elements = {};
        assert.doesNotThrow(() => bindPrayerToolbarListeners());
    });

    test('14. копіювання кладе data-raw-text у буфер і показує успіх', async () => {
        bindPrayerToolbarListeners();
        await copyBtn.click();

        assert.deepEqual(clipboardWrites, ['Іван: молюсь за здоровʼя']);
        // setTimeout у моці синхронний — підпис уже відновлено
        assert.equal(copyBtn.textContent, '📋 Копіювати');
    });

    test('15. копіювання без тексту — no-op, буфер не чіпаємо', async () => {
        elements.prayersResultDiv = makeOutputDiv('');
        bindPrayerToolbarListeners();
        await copyBtn.click();

        assert.deepEqual(clipboardWrites, []);
        assert.equal(copyBtn.textContent, '📋 Копіювати');
    });

    test('16. очищення прибирає лише молитви, лишаючи питання', async () => {
        storage[PRAYERS_KEY] = [
            prayer('A', 'молитва'),
            prayer('B', 'питання', 'question')
        ];

        bindPrayerToolbarListeners();
        await clearBtn.click();

        assert.deepEqual(storage[PRAYERS_KEY].map(i => i.author), ['B']);
    });

    test('17. очищення скасовано у confirm — сховище недоторкане', async () => {
        confirmAnswer = false;
        storage[PRAYERS_KEY] = [prayer('A', 'молитва')];

        bindPrayerToolbarListeners();
        await clearBtn.click();

        assert.equal(storage[PRAYERS_KEY].length, 1);
    });

    test('18. текст підтвердження очищення попереджає, що StreamYard не чіпаємо', () => {
        assert.match(CLEAR_PRAYERS_CONFIRM_MESSAGE, /не видалить їх зі Стрімярду/);
    });

    test('19. підтягування зливає нові молитви зі сховищем і звітує кількість', async () => {
        storage[PRAYERS_KEY] = [prayer('A', 'вже є')];
        activeTabResponse = [prayer('A', 'вже є'), prayer('B', 'нова')];

        bindPrayerToolbarListeners();
        await fetchBtn.click();

        assert.deepEqual(storage[PRAYERS_KEY].map(i => i.text), ['вже є', 'нова']);
        assert.equal(alerts.length, 1);
        assert.match(alerts[0], /нових молитов: 1/);
        assert.equal(fetchBtn.textContent, '🔄 Підтягнути', 'підпис кнопки відновлено');
    });

    test('20. підтягування без нових молитов повідомляє, що нічого не знайдено', async () => {
        storage[PRAYERS_KEY] = [prayer('A', 'вже є')];
        activeTabResponse = [prayer('A', 'вже є')];

        bindPrayerToolbarListeners();
        await fetchBtn.click();

        assert.deepEqual(alerts, [NO_NEW_PRAYERS_MESSAGE]);
    });

    test('21. відповідь не-масивом трактується як збій підтягування', async () => {
        storage[PRAYERS_KEY] = [prayer('A', 'вже є')];
        activeTabResponse = { unexpected: true };

        bindPrayerToolbarListeners();
        await fetchBtn.click();

        assert.deepEqual(alerts, [FETCH_PRAYERS_FAILED_MESSAGE]);
        assert.equal(storage[PRAYERS_KEY].length, 1, 'сховище не змінилося');
        assert.equal(fetchBtn.textContent, '🔄 Підтягнути');
    });

    test('22. відсутня активна вкладка (null) — теж збій, без запису у сховище', async () => {
        activeTabResponse = null;

        bindPrayerToolbarListeners();
        await fetchBtn.click();

        assert.deepEqual(alerts, [FETCH_PRAYERS_FAILED_MESSAGE]);
        assert.equal(PRAYERS_KEY in storage, false);
    });
});
