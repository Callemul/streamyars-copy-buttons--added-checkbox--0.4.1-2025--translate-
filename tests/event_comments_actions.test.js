// tests/event_comments_actions.test.js
//
// Характеристичні тести публічного API `modules/event_comments/actions.ts`.
//
// Навіщо: `applyCommentActionState` — найскладніша за когнітивною складністю
// функція продакшн-коду за звітом Fallow (cyclomatic 12 / cognitive 15, severity
// critical). Наявний `tests/button_handlers.test.js` перевіряє її ЛОКАЛЬНУ КОПІЮ,
// перевизначену прямо у тесті, а не реальний модуль. Ці тести імпортують справжню
// реалізацію, щоб зафіксувати поведінку 1-в-1 перед декомпозицією.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock();

const { applyCommentActionState } = await import('../modules/event_comments/actions.ts');
const { SYH_BUS } = await import('../modules/event_bus.ts');
const { SYH_STATE } = await import('../modules/state.ts');

/**
 * Створює живий DOM-блок коментаря через happy-dom, щоб `querySelector`,
 * `querySelectorAll` і `dispatchEvent` працювали як у браузері.
 */
function createCommentBlock({ checkboxes = 0, typedCheckbox = false, starAriaSelected = null } = {}) {
    const block = document.createElement('div');

    if (typedCheckbox) {
        const typed = document.createElement('input');
        typed.type = 'checkbox';
        typed.className = 'syh-checkbox';
        typed.setAttribute('data-type', 'comment');
        block.appendChild(typed);
    }

    for (let i = 0; i < checkboxes; i++) {
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'syh-checkbox';
        block.appendChild(cb);
    }

    if (starAriaSelected !== null) {
        const star = document.createElement('button');
        star.className = 'star-button';
        star.setAttribute('aria-selected', starAriaSelected);
        block.appendChild(star);
    }

    return block;
}

/** Мінімальний `SyhEventComments`-подібний носій залежностей із записом викликів. */
function createSelf(overrides = {}) {
    const calls = {
        saveToDatabase: [],
        updateCommentVisuals: [],
        copyAndShowBanner: []
    };

    const self = {
        SELECTORS: { starButton: '.star-button' },
        STATE: null,
        TIMINGS: null,
        isBound: true,
        UTILS: {
            copyAndShowBanner: (text, header) => { calls.copyAndShowBanner.push({ text, header }); }
        },
        UI: {
            updateCommentVisuals: (block, type) => { calls.updateCommentVisuals.push({ block, type }); }
        },
        saveToDatabase: async (author, text, type, icon) => {
            calls.saveToDatabase.push({ author, text, type, icon });
        },
        removeFromDatabase: async () => { },
        ...overrides
    };

    return { self, calls };
}

/** Збирає всі події шини за час виконання сценарію. */
function recordBus() {
    const events = [];
    const names = ['COMMENT_ACTION', 'PRAYER_MARKED'];
    const offs = names.map(name => SYH_BUS.on(name, data => events.push({ event: name, data })));
    return { events, restore: () => offs.forEach(off => off()) };
}

/** Перехоплює `SYH_STATE.updateState`, через який працює `CommentService.setStreamYardCheckboxState`. */
function recordStateWrites() {
    const writes = [];
    const original = SYH_STATE.updateState;
    SYH_STATE.updateState = (key, isChecked, delayMs) => { writes.push({ key, isChecked, delayMs }); };
    return { writes, restore: () => { SYH_STATE.updateState = original; } };
}

const QUESTION_PAYLOAD = {
    header: '📑 Автор і його ❓ питання',
    textToCopy: '@Author\n\nText',
    actionType: 'question'
};

const PRAYER_PAYLOAD = {
    header: '📑 Автор і його 🙏🙏🙏',
    textToCopy: '\n\n\n🙏🙏🙏 @Author\n\nText',
    actionType: 'prayer',
    prayerIcon: '🙏🙏🙏'
};

const COPY_PAYLOAD = {
    header: '📄 Комент (без автора)',
    textToCopy: 'Text',
    actionType: 'copy'
};

const EMPTY_PAYLOAD = { header: '', textToCopy: '', actionType: null };

describe('event_comments/actions — applyCommentActionState: гілка збереження за actionType', () => {
    let bus;
    let state;

    beforeEach(() => {
        if (bus) bus.restore();
        if (state) state.restore();
        bus = recordBus();
        state = recordStateWrites();
    });

    test('1. question: пише в БД із іконкою ❓ і малює візуал "question"', () => {
        const { self, calls } = createSelf();
        const block = createCommentBlock();

        applyCommentActionState(self, QUESTION_PAYLOAD, 'Author', 'Text', block);

        assert.deepStrictEqual(calls.saveToDatabase, [
            { author: 'Author', text: 'Text', type: 'question', icon: '❓' }
        ]);
        assert.strictEqual(calls.updateCommentVisuals.length, 1);
        assert.strictEqual(calls.updateCommentVisuals[0].type, 'question');
        assert.strictEqual(calls.updateCommentVisuals[0].block, block);
        bus.restore();
        state.restore();
    });

    test('2. prayer з іконкою: пише в БД, малює візуал і емітить PRAYER_MARKED', () => {
        const { self, calls } = createSelf();
        const block = createCommentBlock();

        applyCommentActionState(self, PRAYER_PAYLOAD, 'Author', 'Text', block);

        assert.deepStrictEqual(calls.saveToDatabase, [
            { author: 'Author', text: 'Text', type: 'prayer', icon: '🙏🙏🙏' }
        ]);
        assert.strictEqual(calls.updateCommentVisuals[0].type, 'prayer');

        const prayerEvents = bus.events.filter(e => e.event === 'PRAYER_MARKED');
        assert.strictEqual(prayerEvents.length, 1);
        assert.deepStrictEqual(prayerEvents[0].data, { author: 'Author', text: 'Text', icon: '🙏🙏🙏' });
        bus.restore();
        state.restore();
    });

    test('3. prayer БЕЗ prayerIcon: гілка не спрацьовує — ні БД, ні візуалу, ні PRAYER_MARKED', () => {
        const { self, calls } = createSelf();
        const block = createCommentBlock();
        const payload = { header: 'h', textToCopy: 'Text', actionType: 'prayer' };

        applyCommentActionState(self, payload, 'Author', 'Text', block);

        assert.strictEqual(calls.saveToDatabase.length, 0);
        assert.strictEqual(calls.updateCommentVisuals.length, 0);
        assert.strictEqual(bus.events.filter(e => e.event === 'PRAYER_MARKED').length, 0);
        // Копіювання при цьому все одно відбувається.
        assert.strictEqual(calls.copyAndShowBanner.length, 1);
        bus.restore();
        state.restore();
    });

    test('4. copy: у БД нічого не пише і візуал не чіпає', () => {
        const { self, calls } = createSelf();
        const block = createCommentBlock();

        applyCommentActionState(self, COPY_PAYLOAD, 'Author', 'Text', block);

        assert.strictEqual(calls.saveToDatabase.length, 0);
        assert.strictEqual(calls.updateCommentVisuals.length, 0);
        bus.restore();
        state.restore();
    });

    test('5. UI === null: збереження в БД відбувається, візуал пропускається без падіння', () => {
        const { self, calls } = createSelf({ UI: null });
        const block = createCommentBlock();

        applyCommentActionState(self, QUESTION_PAYLOAD, 'Author', 'Text', block);

        assert.strictEqual(calls.saveToDatabase.length, 1);
        assert.strictEqual(calls.updateCommentVisuals.length, 0);
        bus.restore();
        state.restore();
    });
});

describe('event_comments/actions — applyCommentActionState: гілка копіювання', () => {
    let bus;
    let state;

    beforeEach(() => {
        if (bus) bus.restore();
        if (state) state.restore();
        bus = recordBus();
        state = recordStateWrites();
    });

    test('6. порожній payload не робить нічого', () => {
        const { self, calls } = createSelf();
        const block = createCommentBlock({ checkboxes: 2, typedCheckbox: true, starAriaSelected: 'false' });

        applyCommentActionState(self, EMPTY_PAYLOAD, 'Author', 'Text', block);

        assert.strictEqual(calls.saveToDatabase.length, 0);
        assert.strictEqual(calls.copyAndShowBanner.length, 0);
        assert.strictEqual(bus.events.length, 0);
        assert.strictEqual(state.writes.length, 0);
        assert.strictEqual(block.querySelectorAll('.syh-checkbox:checked').length, 0);
        bus.restore();
        state.restore();
    });

    test('7. COMMENT_ACTION містить actionType, автора і текст', () => {
        const { self } = createSelf();
        const block = createCommentBlock();

        applyCommentActionState(self, COPY_PAYLOAD, 'Author', 'Text', block);

        const actionEvents = bus.events.filter(e => e.event === 'COMMENT_ACTION');
        assert.strictEqual(actionEvents.length, 1);
        assert.deepStrictEqual(actionEvents[0].data, { type: 'copy', author: 'Author', text: 'Text' });
        bus.restore();
        state.restore();
    });

    test('8. copyAndShowBanner отримує саме textToCopy і header', () => {
        const { self, calls } = createSelf();
        const block = createCommentBlock();

        applyCommentActionState(self, QUESTION_PAYLOAD, 'Author', 'Text', block);

        assert.deepStrictEqual(calls.copyAndShowBanner, [
            { text: '@Author\n\nText', header: '📑 Автор і його ❓ питання' }
        ]);
        bus.restore();
        state.restore();
    });

    test('9. UTILS === null: банер не показується, решта ефектів лишається', () => {
        const { self } = createSelf({ UTILS: null });
        const block = createCommentBlock({ typedCheckbox: true });

        applyCommentActionState(self, QUESTION_PAYLOAD, 'Author', 'Text', block);

        assert.strictEqual(bus.events.filter(e => e.event === 'COMMENT_ACTION').length, 1);
        assert.strictEqual(block.querySelector('.syh-checkbox[data-type="comment"]').checked, true);
        bus.restore();
        state.restore();
    });

    test('10. PRAYER_MARKED емітиться ДО COMMENT_ACTION', () => {
        const { self } = createSelf();
        const block = createCommentBlock();

        applyCommentActionState(self, PRAYER_PAYLOAD, 'Author', 'Text', block);

        assert.deepStrictEqual(bus.events.map(e => e.event), ['PRAYER_MARKED', 'COMMENT_ACTION']);
        bus.restore();
        state.restore();
    });
});

describe('event_comments/actions — applyCommentActionState: DOM-побічні ефекти', () => {
    let bus;
    let state;

    beforeEach(() => {
        if (bus) bus.restore();
        if (state) state.restore();
        bus = recordBus();
        state = recordStateWrites();
    });

    test('11. типізований чекбокс: ставиться галочка, летить change (bubbles) і пишеться стан', () => {
        const { self } = createSelf();
        const block = createCommentBlock({ typedCheckbox: true });
        const typed = block.querySelector('.syh-checkbox[data-type="comment"]');

        const seen = [];
        typed.addEventListener('change', e => seen.push(e.bubbles));

        applyCommentActionState(self, QUESTION_PAYLOAD, 'Author', 'Text', block);

        assert.strictEqual(typed.checked, true);
        assert.deepStrictEqual(seen, [true]);
        assert.deepStrictEqual(state.writes, [{ key: 'Text', isChecked: true, delayMs: 150 }]);
        bus.restore();
        state.restore();
    });

    test('12. без типізованого чекбокса стан у сервіс не пишеться', () => {
        const { self } = createSelf();
        const block = createCommentBlock({ checkboxes: 2 });

        applyCommentActionState(self, QUESTION_PAYLOAD, 'Author', 'Text', block);

        assert.strictEqual(state.writes.length, 0);
        bus.restore();
        state.restore();
    });

    test('13. усі .syh-checkbox у блоці стають відміченими', () => {
        const { self } = createSelf();
        const block = createCommentBlock({ checkboxes: 3, typedCheckbox: true });

        applyCommentActionState(self, QUESTION_PAYLOAD, 'Author', 'Text', block);

        const boxes = Array.from(block.querySelectorAll('.syh-checkbox'));
        assert.strictEqual(boxes.length, 4);
        assert.ok(boxes.every(cb => cb.checked === true));
        bus.restore();
        state.restore();
    });

    test('14. зірка з aria-selected="false" клікається', () => {
        const { self } = createSelf();
        const block = createCommentBlock({ starAriaSelected: 'false' });
        let clicks = 0;
        block.querySelector('.star-button').addEventListener('click', () => { clicks++; });

        applyCommentActionState(self, QUESTION_PAYLOAD, 'Author', 'Text', block);

        assert.strictEqual(clicks, 1);
        bus.restore();
        state.restore();
    });

    test('15. зірка з aria-selected="true" не клікається', () => {
        const { self } = createSelf();
        const block = createCommentBlock({ starAriaSelected: 'true' });
        let clicks = 0;
        block.querySelector('.star-button').addEventListener('click', () => { clicks++; });

        applyCommentActionState(self, QUESTION_PAYLOAD, 'Author', 'Text', block);

        assert.strictEqual(clicks, 0);
        bus.restore();
        state.restore();
    });

    test('16. SELECTORS === null: пошук зірки пропускається без падіння', () => {
        const { self } = createSelf({ SELECTORS: null });
        const block = createCommentBlock({ starAriaSelected: 'false' });
        let clicks = 0;
        block.querySelector('.star-button').addEventListener('click', () => { clicks++; });

        applyCommentActionState(self, QUESTION_PAYLOAD, 'Author', 'Text', block);

        assert.strictEqual(clicks, 0);
        assert.strictEqual(bus.events.filter(e => e.event === 'COMMENT_ACTION').length, 1);
        bus.restore();
        state.restore();
    });

    test('17. starButton як масив-фолбек резолвиться через SelectorValue', () => {
        const { self } = createSelf({ SELECTORS: { starButton: ['.no-such-star', '.star-button'] } });
        const block = createCommentBlock({ starAriaSelected: 'false' });
        let clicks = 0;
        block.querySelector('.star-button').addEventListener('click', () => { clicks++; });

        applyCommentActionState(self, QUESTION_PAYLOAD, 'Author', 'Text', block);

        assert.strictEqual(clicks, 1);
        bus.restore();
        state.restore();
    });
});
