import assert from 'node:assert/strict';
import test, { describe, beforeEach, mock } from 'node:test';

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

const { CommentInjector } = await import('../modules/comment_injector.ts');
const { CommentService } = await import('../modules/comment_service.ts');
const { SYH_BUS } = await import('../modules/event_bus.ts');

/**
 * Характеризаційні тести публічного API `CommentInjector`.
 *
 * Єдина публічна точка входу класу — `bindCommentEvents()`; уся логіка
 * (`handleAction`, cyc=13, 85 LOC — CRAP-хотспот за звітом Fallow) доступна
 * лише через навішані нею слухачі. Тому тести дістають слухач через
 * перехоплений `addEventListener` і викликають його напряму, щоб детерміновано
 * дочекатися асинхронного ланцюжка без гонок на таймерах.
 *
 * Тести фіксують ПОТОЧНУ поведінку 1-в-1, включно з порядком побічних ефектів.
 */

const realFormatForClipboard = CommentService.formatForClipboard;

/** Журнал викликів CommentService у порядку їх надходження. */
let svcCalls = [];

function stubCommentService() {
    svcCalls = [];
    CommentService.copyToClipboard = async (text) => { svcCalls.push(['copyToClipboard', text]); return true; };
    CommentService.saveButtonState = async (key, cache, commentKey, state) => {
        svcCalls.push(['saveButtonState', key, commentKey, state]);
        cache[commentKey] = state;
    };
    CommentService.saveCheckboxState = async (key, cache, commentKey, checked) => {
        svcCalls.push(['saveCheckboxState', key, commentKey, checked]);
        cache[commentKey] = { checked, timestamp: 0 };
    };
    CommentService.saveCollectedComment = async (sheetId, item) => {
        svcCalls.push(['saveCollectedComment', sheetId, item]);
    };
    CommentService.removeCollectedComment = async (sheetId, commentKey, author, text) => {
        svcCalls.push(['removeCollectedComment', sheetId, commentKey, author, text]);
    };
}

const names = () => svcCalls.map(c => c[0]);
const findCall = (name) => svcCalls.find(c => c[0] === name);

/** Перехоплює addEventListener, зберігаючи реальну поведінку елемента. */
function captureListeners(el, label, sink) {
    const orig = el.addEventListener.bind(el);
    el.addEventListener = (evt, fn, opts) => {
        sink.set(`${label}:${evt}`, fn);
        orig(evt, fn, opts);
    };
    return el;
}

function createHarness(adapterOverrides = {}, caches) {
    const sink = new Map();
    const adapterCalls = [];

    const element = document.createElement('div');
    const questionBtn = captureListeners(document.createElement('button'), 'question', sink);
    const prayerBtn = captureListeners(document.createElement('button'), 'prayer', sink);
    const copyBtn = captureListeners(document.createElement('button'), 'copy', sink);
    const checkboxEl = captureListeners(document.createElement('input'), 'checkbox', sink);
    checkboxEl.type = 'checkbox';
    const bodyEl = captureListeners(document.createElement('div'), 'body', sink);

    const buttons = { questionBtn, prayerBtn, copyBtn, checkboxEl, bodyEl };

    const ctx = { id: 'c1', author: 'Іван', text: 'Текст коментаря', videoId: 'v1', videoTitle: 'Заголовок' };

    let bound = false;
    const adapter = {
        isEventsBound: () => bound,
        markEventsBound: () => { bound = true; adapterCalls.push(['markEventsBound']); },
        getCommentContext: () => ctx,
        getButtons: () => buttons,
        getSheetId: (c, el) => { adapterCalls.push(['getSheetId', c.id]); return 'sheet-1'; },
        getButtonStatesKey: () => 'btn_key',
        getCheckboxStatesKey: () => 'cb_key',
        applyButtonState: (b, state, sheetId) => { adapterCalls.push(['applyButtonState', state, sheetId]); },
        applyCheckboxState: (b, checked) => { adapterCalls.push(['applyCheckboxState', checked]); },
        markChecked: async (el, key) => { adapterCalls.push(['markChecked', key]); },
        buildCollectedItem: (key, c, type) => {
            adapterCalls.push(['buildCollectedItem', key, type]);
            return { id: key, author: c.author, text: c.text, type };
        },
        ...adapterOverrides
    };

    const state = caches || { buttonStates: {}, checkboxStates: {} };
    const injector = new CommentInjector(adapter, state);
    injector.bindCommentEvents(element, 'c1');

    const fire = (key, evt = {}) => sink.get(key)({ stopPropagation() {}, preventDefault() {}, ...evt });

    return { injector, adapter, adapterCalls, caches: state, buttons, element, ctx, sink, fire };
}

beforeEach(() => {
    mockStorageStore = {};
    stubCommentService();
    SYH_BUS.clear();
    document.body.innerHTML = '';
});

describe('comment_injector — bindCommentEvents (прив’язка слухачів)', () => {

    test('1. навішує слухачів на всі наявні контроли', () => {
        const h = createHarness();
        for (const k of ['question:click', 'prayer:click', 'copy:click', 'checkbox:change', 'body:contextmenu']) {
            assert.equal(typeof h.sink.get(k), 'function', `має бути слухач ${k}`);
        }
    });

    test('2. позначає елемент як зв’язаний рівно один раз (ідемпотентність)', () => {
        const h = createHarness();
        assert.equal(h.adapterCalls.filter(c => c[0] === 'markEventsBound').length, 1);

        h.injector.bindCommentEvents(h.element, 'c1');
        assert.equal(h.adapterCalls.filter(c => c[0] === 'markEventsBound').length, 1);
    });

    test('3. якщо isEventsBound=true — не позначає і не навішує нічого', () => {
        const h = createHarness({ isEventsBound: () => true });
        assert.equal(h.adapterCalls.length, 0);
        assert.equal(h.sink.size, 0);
    });

    test('4. без контексту коментаря слухачі не навішуються (але markEventsBound уже стався)', () => {
        const h = createHarness({ getCommentContext: () => null });
        assert.deepEqual(h.adapterCalls, [['markEventsBound']]);
        assert.equal(h.sink.size, 0);
    });

    test('5. відсутні кнопки (null) не ламають прив’язку', () => {
        const h = createHarness({
            getButtons: () => ({ questionBtn: null, prayerBtn: null, copyBtn: null, checkboxEl: null, bodyEl: null })
        });
        assert.equal(h.sink.size, 0);
    });

    test('6. contextmenu навішується лише коли є І bodyEl, І checkboxEl', () => {
        const sinkless = createHarness({
            getButtons: () => ({
                questionBtn: null, prayerBtn: null, copyBtn: null,
                checkboxEl: null, bodyEl: document.createElement('div')
            })
        });
        assert.equal(sinkless.sink.size, 0);
    });

    test('6b. unbindCommentEvents знімає позначку та викликає unmarkEventsBound', () => {
        let unmarkCalled = false;
        const h = createHarness({
            unmarkEventsBound: () => { unmarkCalled = true; }
        });
        h.injector.unbindCommentEvents(h.element);
        assert.strictEqual(unmarkCalled, true, 'unmarkEventsBound має бути викликано');
    });

    test('6c. повторний bind після unbind працює штатно і не дублює виклики', async () => {
        let isBound = false;
        const h = createHarness({
            isEventsBound: () => isBound,
            markEventsBound: () => { isBound = true; },
            unmarkEventsBound: () => { isBound = false; }
        });
        // Перший bind уже стався у createHarness
        assert.strictEqual(isBound, true);

        // unbind
        h.injector.unbindCommentEvents(h.element);
        assert.strictEqual(isBound, false);

        // Повторний bind
        h.injector.bindCommentEvents(h.element, 'c1');
        assert.strictEqual(isBound, true);
    });
});

describe('comment_injector — handleAction: вибір sheetId', () => {

    test('7. beforeAction має пріоритет над getSheetId', async () => {
        const h = createHarness({ beforeAction: async () => ({ sheetId: 'from-before' }) });
        await h.fire('question:click');

        assert.equal(h.adapterCalls.filter(c => c[0] === 'getSheetId').length, 0, 'getSheetId не має викликатись');
        assert.deepEqual(findCall('saveCollectedComment').slice(0, 2), ['saveCollectedComment', 'from-before']);
    });

    test('8. beforeAction === null скасовує дію повністю', async () => {
        const h = createHarness({ beforeAction: async () => null });
        await h.fire('question:click');

        assert.deepEqual(svcCalls, [], 'жодного запису в CommentService');
        assert.equal(h.adapterCalls.filter(c => c[0] === 'applyButtonState').length, 0);
    });

    test('9. beforeAction без sheetId також скасовує дію', async () => {
        const h = createHarness({ beforeAction: async () => ({ sheetId: '' }) });
        await h.fire('question:click');
        assert.deepEqual(svcCalls, []);
    });

    test('10. без beforeAction використовується getSheetId', async () => {
        const h = createHarness();
        await h.fire('question:click');

        assert.equal(h.adapterCalls.filter(c => c[0] === 'getSheetId').length, 1);
        assert.deepEqual(findCall('saveCollectedComment').slice(0, 2), ['saveCollectedComment', 'sheet-1']);
    });

    test('11. порожній getSheetId зупиняє дію', async () => {
        const h = createHarness({ getSheetId: () => '' });
        await h.fire('question:click');
        assert.deepEqual(svcCalls, []);
    });

    test('12. відсутній контекст на момент кліку зупиняє дію', async () => {
        let ctx = { id: 'c1', author: 'A', text: 'T' };
        const h = createHarness({ getCommentContext: () => ctx });
        ctx = null;
        await h.fire('question:click');
        assert.deepEqual(svcCalls, []);
    });
});

describe('comment_injector — handleAction: увімкнення (toggle on)', () => {

    test('13. повний ланцюжок побічних ефектів у фіксованому порядку', async () => {
        const h = createHarness();
        await h.fire('question:click');

        assert.deepEqual(names(), [
            'copyToClipboard',
            'saveButtonState',
            'saveCollectedComment'
        ]);
        assert.deepEqual(
            h.adapterCalls.map(c => c[0]),
            ['markEventsBound', 'getSheetId', 'applyButtonState', 'buildCollectedItem', 'markChecked']
        );
    });

    test('14. у буфер копіюється результат formatForClipboard(author, text)', async () => {
        const h = createHarness();
        await h.fire('question:click');
        assert.equal(findCall('copyToClipboard')[1], realFormatForClipboard(h.ctx.author, h.ctx.text));
    });

    test('15. стан кнопки зберігається під ключем адаптера і типом дії', async () => {
        const h = createHarness();
        await h.fire('prayer:click');
        assert.deepEqual(findCall('saveButtonState'), ['saveButtonState', 'btn_key', 'c1', 'prayer']);
        assert.equal(h.caches.buttonStates.c1, 'prayer');
    });

    test('16. applyButtonState отримує тип і sheetId', async () => {
        const h = createHarness();
        await h.fire('prayer:click');
        assert.deepEqual(h.adapterCalls.find(c => c[0] === 'applyButtonState'), ['applyButtonState', 'prayer', 'sheet-1']);
    });

    test('17. зібраний елемент будується адаптером і зберігається', async () => {
        const h = createHarness();
        await h.fire('question:click');
        const [, sheetId, item] = findCall('saveCollectedComment');
        assert.equal(sheetId, 'sheet-1');
        assert.deepEqual(item, { id: 'c1', author: 'Іван', text: 'Текст коментаря', type: 'question' });
    });

    test('18. подія COMMENT_ACTION емітується з типом, автором і текстом', async () => {
        const seen = [];
        SYH_BUS.on('COMMENT_ACTION', d => seen.push(d));

        const h = createHarness();
        await h.fire('prayer:click');

        assert.deepEqual(seen, [{ type: 'prayer', author: 'Іван', text: 'Текст коментаря' }]);
    });

    test('19. afterAction отримує повний ActionContext', async () => {
        const after = [];
        const h = createHarness({ afterAction: async (a) => after.push(a) });
        await h.fire('question:click');

        assert.deepEqual(after, [{
            type: 'question',
            context: h.ctx,
            sheetId: 'sheet-1',
            commentKey: 'c1'
        }]);
    });

    test('20. відсутній afterAction не ламає ланцюжок', async () => {
        const h = createHarness();
        await h.fire('question:click');
        assert.ok(findCall('saveCollectedComment'));
    });

    test('21. перемикання question -> prayer НЕ вважається вимкненням', async () => {
        const caches = { buttonStates: { c1: 'question' }, checkboxStates: {} };
        const h = createHarness({}, caches);
        await h.fire('prayer:click');

        assert.ok(findCall('saveCollectedComment'), 'має зберегти новий тип');
        assert.equal(findCall('removeCollectedComment'), undefined, 'не має нічого видаляти');
        assert.equal(h.caches.buttonStates.c1, 'prayer');
    });
});

describe('comment_injector — handleAction: вимкнення (untoggle)', () => {

    test('22. повторний клік по активній кнопці скидає стан і видаляє зібране', async () => {
        const caches = { buttonStates: { c1: 'question' }, checkboxStates: {} };
        const h = createHarness({}, caches);
        await h.fire('question:click');

        assert.deepEqual(names(), [
            'saveButtonState',
            'removeCollectedComment',
            'saveCheckboxState'
        ]);
        assert.deepEqual(findCall('saveButtonState'), ['saveButtonState', 'btn_key', 'c1', null]);
        assert.deepEqual(
            findCall('removeCollectedComment'),
            ['removeCollectedComment', 'sheet-1', 'c1', 'Іван', 'Текст коментаря']
        );
    });

    test('23. під час вимкнення нічого не копіюється в буфер', async () => {
        const h = createHarness({}, { buttonStates: { c1: 'prayer' }, checkboxStates: {} });
        await h.fire('prayer:click');
        assert.equal(findCall('copyToClipboard'), undefined);
    });

    test('24. під час вимкнення НЕ емітується COMMENT_ACTION', async () => {
        const seen = [];
        SYH_BUS.on('COMMENT_ACTION', d => seen.push(d));

        const h = createHarness({}, { buttonStates: { c1: 'question' }, checkboxStates: {} });
        await h.fire('question:click');

        assert.deepEqual(seen, []);
    });

    test('25. вимкнення знімає чекбокс через applyCheckboxState(false)', async () => {
        const h = createHarness({}, { buttonStates: { c1: 'question' }, checkboxStates: {} });
        await h.fire('question:click');

        assert.deepEqual(h.adapterCalls.find(c => c[0] === 'applyCheckboxState'), ['applyCheckboxState', false]);
        assert.deepEqual(h.adapterCalls.find(c => c[0] === 'applyButtonState'), ['applyButtonState', null, 'sheet-1']);
    });

    test('26. за наявності unmarkChecked використовується він замість saveCheckboxState', async () => {
        const seen = [];
        const h = createHarness(
            { unmarkChecked: async (el, key) => seen.push(key) },
            { buttonStates: { c1: 'question' }, checkboxStates: {} }
        );
        await h.fire('question:click');

        assert.deepEqual(seen, ['c1']);
        assert.equal(findCall('saveCheckboxState'), undefined);
    });

    test('27. без unmarkChecked є фолбек на saveCheckboxState(false)', async () => {
        const h = createHarness({}, { buttonStates: { c1: 'question' }, checkboxStates: {} });
        await h.fire('question:click');
        assert.deepEqual(findCall('saveCheckboxState'), ['saveCheckboxState', 'cb_key', 'c1', false]);
    });

    test('28. afterAction під час вимкнення отримує type === null', async () => {
        const after = [];
        const h = createHarness(
            { afterAction: async (a) => after.push(a) },
            { buttonStates: { c1: 'question' }, checkboxStates: {} }
        );
        await h.fire('question:click');

        assert.equal(after.length, 1);
        assert.equal(after[0].type, null);
        assert.equal(after[0].sheetId, 'sheet-1');
        assert.equal(after[0].commentKey, 'c1');
    });

    test('29. markChecked під час вимкнення не викликається', async () => {
        const h = createHarness({}, { buttonStates: { c1: 'question' }, checkboxStates: {} });
        await h.fire('question:click');
        assert.equal(h.adapterCalls.filter(c => c[0] === 'markChecked').length, 0);
    });
});

describe('comment_injector — handleAction: джерело поточного стану', () => {

    test('30. getButtonState адаптера має пріоритет над кешем', async () => {
        const h = createHarness(
            { getButtonState: () => 'question' },
            { buttonStates: {}, checkboxStates: {} }
        );
        await h.fire('question:click');
        assert.ok(findCall('removeCollectedComment'), 'адаптер повідомив активний стан -> вимкнення');
    });

    test('31. без getButtonState стан береться з caches.buttonStates', async () => {
        const h = createHarness({}, { buttonStates: { c1: 'question' }, checkboxStates: {} });
        await h.fire('question:click');
        assert.ok(findCall('removeCollectedComment'));
    });

    test('32. getButtonState отримує context, commentKey і caches', async () => {
        const args = [];
        const caches = { buttonStates: {}, checkboxStates: {} };
        const h = createHarness({ getButtonState: (...a) => { args.push(a); return null; } }, caches);
        await h.fire('question:click');

        assert.equal(args.length, 1);
        assert.equal(args[0][0].id, 'c1');
        assert.equal(args[0][1], 'c1');
        assert.equal(args[0][2], caches);
    });
});

describe('comment_injector — копіювання, чекбокс і контекстне меню', () => {

    test('33. клік по кнопці копіювання копіює відформатований текст і показує ✓', async () => {
        const h = createHarness();
        h.buttons.copyBtn.innerHTML = '📋';
        await h.fire('copy:click');

        assert.equal(findCall('copyToClipboard')[1], realFormatForClipboard('Іван', 'Текст коментаря'));
        assert.equal(h.buttons.copyBtn.innerHTML, '✓');
        assert.ok(h.buttons.copyBtn.classList.contains('syh-copied-flash'));
    });

    test('34. невдале копіювання показує ❌', async () => {
        CommentService.copyToClipboard = async () => false;
        const h = createHarness();
        await h.fire('copy:click');
        assert.equal(h.buttons.copyBtn.innerHTML, '❌');
    });

    test('38. швидкий повторний клік не лишає кнопку на ✓ (rapid-click)', async (t) => {
        t.mock.timers.enable({ apis: ['setTimeout'] });
        CommentService.copyToClipboard = async () => true;
        const h = createHarness();
        h.buttons.copyBtn.innerHTML = '📋';
        await h.fire('copy:click');
        await h.fire('copy:click');
        // Оригінал захоплено лише один раз — спалах (✓) не стає «оригіналом».
        assert.equal(h.buttons.copyBtn.dataset.syhCopyOrigHtml, '📋');
        t.mock.timers.tick(1300);
        assert.equal(h.buttons.copyBtn.innerHTML, '📋', 'кнопка повернула оригінал, не лишилась на ✓');
        t.mock.timers.reset();
    });

    test('39. другий клік → ❌, але після таймерів — оригінал (не брешивий ✓)', async (t) => {
        t.mock.timers.enable({ apis: ['setTimeout'] });
        CommentService.copyToClipboard = async () => true;
        const h = createHarness();
        h.buttons.copyBtn.innerHTML = '📋';
        await h.fire('copy:click');
        assert.equal(h.buttons.copyBtn.innerHTML, '✓');
        CommentService.copyToClipboard = async () => false;
        await h.fire('copy:click');
        assert.equal(h.buttons.copyBtn.innerHTML, '❌');
        t.mock.timers.tick(1300);
        assert.equal(h.buttons.copyBtn.innerHTML, '📋', 'після спалаху показано справжній оригінал');
        t.mock.timers.reset();
    });

    test('35. копіювання без контексту нічого не робить', async () => {
        const h = createHarness({ getCommentContext: () => ({ id: 'c1', author: 'A', text: 'T' }) });
        h.adapter.getCommentContext = () => null;
        await h.fire('copy:click');
        assert.equal(findCall('copyToClipboard'), undefined);
    });

    test('36. зміна чекбокса зберігає стан під ключем адаптера', async () => {
        const h = createHarness();
        h.buttons.checkboxEl.checked = true;
        await h.fire('checkbox:change');

        assert.deepEqual(findCall('saveCheckboxState'), ['saveCheckboxState', 'cb_key', 'c1', true]);
        assert.deepEqual(h.adapterCalls.find(c => c[0] === 'applyCheckboxState'), ['applyCheckboxState', true]);
    });

    test('37. зняття чекбокса зберігає false', async () => {
        const h = createHarness();
        h.buttons.checkboxEl.checked = false;
        await h.fire('checkbox:change');
        assert.deepEqual(findCall('saveCheckboxState'), ['saveCheckboxState', 'cb_key', 'c1', false]);
    });

    test('38. контекстне меню на тілі коментаря перемикає чекбокс', () => {
        const h = createHarness();
        const plain = document.createElement('span');
        h.buttons.bodyEl.appendChild(plain);

        let prevented = 0;
        h.buttons.checkboxEl.checked = false;
        h.fire('body:contextmenu', { target: plain, preventDefault: () => { prevented++; } });

        assert.equal(h.buttons.checkboxEl.checked, true);
        assert.equal(prevented, 1);
    });

    test('39. контекстне меню на інтерактивному елементі ігнорується', () => {
        const h = createHarness();
        const inner = document.createElement('button');
        h.buttons.bodyEl.appendChild(inner);

        let prevented = 0;
        h.buttons.checkboxEl.checked = false;
        h.fire('body:contextmenu', { target: inner, preventDefault: () => { prevented++; } });

        assert.equal(h.buttons.checkboxEl.checked, false);
        assert.equal(prevented, 0);
    });

    test('40. перемикання чекбокса через контекстне меню розсилає подію change', () => {
        const h = createHarness();
        const plain = document.createElement('span');
        h.buttons.bodyEl.appendChild(plain);

        let changes = 0;
        h.buttons.checkboxEl.addEventListener('change', () => { changes++; });
        h.fire('body:contextmenu', { target: plain, preventDefault: () => {} });

        assert.equal(changes, 1);
    });
});
