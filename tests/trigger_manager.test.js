// Characterization tests for `TriggerManager` — the config/regex/category core
// behind `SYH_COMMENT_ASSISTANT`.
//
// fallow flags `modules/comment_assistant/trigger_manager.ts` as a refactoring
// target (complexity density 0.45, fan-in 4) and it had no dedicated suite.
// These tests pin the *observable* contract (defaults, `init()` merge rules,
// regex identity/caching, word-boundary semantics, category resolution) so the
// split into smaller units can be proven behaviour-preserving 1-to-1.

import assert from 'node:assert';
import { test, describe } from 'node:test';

const { TriggerManager } = await import('../modules/comment_assistant/trigger_manager.ts');

const DEFAULT_QUESTION = ['вопрос', 'питання', 'вопросы', 'вопросик', 'вопросом'];
const DEFAULT_PRAYER = ['молитва', 'молитвенная', 'прошение', 'помолитесь', 'молитись', 'моліться', 'просьба'];

describe('TriggerManager — конструктор і дефолти', () => {
    test('1: без конфіга бере вбудовані списки питань і молитов', () => {
        const tm = new TriggerManager();
        assert.deepStrictEqual(tm.triggerWordsQuestion, DEFAULT_QUESTION);
        assert.deepStrictEqual(tm.triggerWordsPrayer, DEFAULT_PRAYER);
    });

    test('2: triggerWords за замовчуванням = питання + молитви (саме в такому порядку)', () => {
        const tm = new TriggerManager();
        assert.deepStrictEqual(tm.triggerWords, [...DEFAULT_QUESTION, ...DEFAULT_PRAYER]);
    });

    test('3: дефолтні селектори StreamYard', () => {
        const tm = new TriggerManager();
        assert.deepStrictEqual(tm.selectors, {
            commentBlock: '[class*="PlatformComment__Wrap"]',
            commentText: '[class*="PlatformCommentShell__ContentSpan"]'
        });
    });

    test('4: конфіг перекриває окремі списки, а triggerWords рахується з них', () => {
        const tm = new TriggerManager({
            TRIGGER_WORDS_QUESTION: ['q1'],
            TRIGGER_WORDS_PRAYER: ['p1', 'p2']
        });
        assert.deepStrictEqual(tm.triggerWords, ['q1', 'p1', 'p2']);
    });

    test('5: явний TRIGGER_WORDS має пріоритет над обчисленим списком', () => {
        const tm = new TriggerManager({
            TRIGGER_WORDS: ['only'],
            TRIGGER_WORDS_QUESTION: ['q1'],
            TRIGGER_WORDS_PRAYER: ['p1']
        });
        assert.deepStrictEqual(tm.triggerWords, ['only']);
        assert.deepStrictEqual(tm.triggerWordsQuestion, ['q1']);
        assert.deepStrictEqual(tm.triggerWordsPrayer, ['p1']);
    });

    test('6: SELECTORS з конфіга замінюють дефолтні цілком', () => {
        const tm = new TriggerManager({ SELECTORS: { commentBlock: '.x' } });
        assert.deepStrictEqual(tm.selectors, { commentBlock: '.x' });
    });

    test('7: null/порожній конфіг не ламає конструктор', () => {
        assert.deepStrictEqual(new TriggerManager(null).triggerWords, [...DEFAULT_QUESTION, ...DEFAULT_PRAYER]);
        assert.deepStrictEqual(new TriggerManager({}).triggerWords, [...DEFAULT_QUESTION, ...DEFAULT_PRAYER]);
    });
});

describe('TriggerManager — init() як часткове оновлення', () => {
    test('8: init() без аргументів нічого не змінює', () => {
        const tm = new TriggerManager();
        tm.init();
        assert.deepStrictEqual(tm.triggerWords, [...DEFAULT_QUESTION, ...DEFAULT_PRAYER]);
        assert.deepStrictEqual(tm.triggerWordsQuestion, DEFAULT_QUESTION);
    });

    test('9: init() з питаннями перераховує triggerWords разом із наявними молитвами', () => {
        const tm = new TriggerManager();
        tm.init({ TRIGGER_WORDS_QUESTION: ['q'] });
        assert.deepStrictEqual(tm.triggerWordsQuestion, ['q']);
        assert.deepStrictEqual(tm.triggerWords, ['q', ...DEFAULT_PRAYER]);
    });

    test('10: init() з молитвами перераховує triggerWords разом із наявними питаннями', () => {
        const tm = new TriggerManager();
        tm.init({ TRIGGER_WORDS_PRAYER: ['p'] });
        assert.deepStrictEqual(tm.triggerWordsPrayer, ['p']);
        assert.deepStrictEqual(tm.triggerWords, [...DEFAULT_QUESTION, 'p']);
    });

    test('11: явний TRIGGER_WORDS в init() виграє над перерахунком', () => {
        const tm = new TriggerManager();
        tm.init({ TRIGGER_WORDS: ['x'], TRIGGER_WORDS_QUESTION: ['q'] });
        assert.deepStrictEqual(tm.triggerWords, ['x']);
        assert.deepStrictEqual(tm.triggerWordsQuestion, ['q']);
    });

    test('12: init() оновлює селектори лише коли вони передані', () => {
        const tm = new TriggerManager();
        tm.init({});
        assert.deepStrictEqual(tm.selectors, {
            commentBlock: '[class*="PlatformComment__Wrap"]',
            commentText: '[class*="PlatformCommentShell__ContentSpan"]'
        });
        tm.init({ SELECTORS: { commentBlock: '.y' } });
        assert.deepStrictEqual(tm.selectors, { commentBlock: '.y' });
    });

    test('13: init() скидає кеш регулярок (нові слова не отримують стару регулярку)', () => {
        const tm = new TriggerManager();
        const before = tm.createTriggerRegExp('вопрос');
        tm.init({ TRIGGER_WORDS: ['вопрос'] });
        const after = tm.createTriggerRegExp('вопрос');
        assert.notStrictEqual(before, after, 'після init() має бути новий інстанс регулярки');
    });
});

describe('TriggerManager — createTriggerRegExp', () => {
    test('14: повторний виклик повертає ТОЙ САМИЙ інстанс (кеш)', () => {
        const tm = new TriggerManager();
        assert.strictEqual(tm.createTriggerRegExp('вопрос'), tm.createTriggerRegExp('вопрос'));
    });

    test('15: кеш нечутливий до регістру — "Вопрос" і "вопрос" дають один інстанс', () => {
        const tm = new TriggerManager();
        assert.strictEqual(tm.createTriggerRegExp('Вопрос'), tm.createTriggerRegExp('вопрос'));
    });

    test('16: віддана з кешу регулярка має lastIndex = 0', () => {
        const tm = new TriggerManager();
        const rx = tm.createTriggerRegExp('вопрос');
        rx.test('тут є вопрос десь');
        assert.notStrictEqual(rx.lastIndex, 0, 'g-регулярка лишає lastIndex після збігу');
        assert.strictEqual(tm.createTriggerRegExp('вопрос').lastIndex, 0);
    });

    test('17: спецсимволи регексу екрануються (слово читається літерально)', () => {
        const tm = new TriggerManager();
        const rx = tm.createTriggerRegExp('c++');
        assert.doesNotThrow(() => rx.test('щось'));
        rx.lastIndex = 0;
        assert.strictEqual(rx.test('мова c++ тут'), true);
    });

    test('18: збіг лише по цілому слову, не всередині іншого', () => {
        const tm = new TriggerManager();
        const rx = tm.createTriggerRegExp('вопрос');
        rx.lastIndex = 0;
        assert.strictEqual(rx.test('вопросник'), false);
        rx.lastIndex = 0;
        assert.strictEqual(rx.test('Есть вопрос?'), true);
    });

    test('19: регулярка глобальна, юнікодна та без урахування регістру', () => {
        const tm = new TriggerManager();
        const rx = tm.createTriggerRegExp('вопрос');
        assert.strictEqual(rx.global, true);
        assert.strictEqual(rx.ignoreCase, true);
        rx.lastIndex = 0;
        assert.strictEqual(rx.test('ВОПРОС'), true);
    });
});

describe('TriggerManager — hasTrigger', () => {
    test('20: порожній текст -> false', () => {
        const tm = new TriggerManager();
        assert.strictEqual(tm.hasTrigger(''), false);
        assert.strictEqual(tm.hasTrigger(null), false);
    });

    test('21: порожній список тригерів -> false', () => {
        const tm = new TriggerManager({ TRIGGER_WORDS: [] });
        assert.strictEqual(tm.hasTrigger('вопрос'), false);
    });

    test('22: знаходить питальні й молитовні слова', () => {
        const tm = new TriggerManager();
        assert.strictEqual(tm.hasTrigger('У меня вопрос к вам'), true);
        assert.strictEqual(tm.hasTrigger('прошу, молитва нужна'), true);
    });

    test('23: текст без тригерів -> false', () => {
        const tm = new TriggerManager();
        assert.strictEqual(tm.hasTrigger('просто привіт усім'), false);
    });

    test('24: результат стабільний при повторних викликах (без витоку lastIndex)', () => {
        const tm = new TriggerManager();
        assert.strictEqual(tm.hasTrigger('есть вопрос'), true);
        assert.strictEqual(tm.hasTrigger('есть вопрос'), true);
        assert.strictEqual(tm.hasTrigger('есть вопрос'), true);
    });

    test('25: не спрацьовує на підрядку всередині слова', () => {
        const tm = new TriggerManager();
        assert.strictEqual(tm.hasTrigger('вопросник'), false);
    });
});

describe('TriggerManager — resolveTriggerCategory', () => {
    test('26: молитовне слово -> prayer', () => {
        const tm = new TriggerManager();
        assert.deepStrictEqual(tm.resolveTriggerCategory('молитва', ['молитва'], ['вопрос']), {
            categoryClass: 'syh-trigger-prayer',
            categoryName: 'prayer'
        });
    });

    test('27: питальне слово -> question', () => {
        const tm = new TriggerManager();
        assert.deepStrictEqual(tm.resolveTriggerCategory('вопрос', ['молитва'], ['вопрос']), {
            categoryClass: 'syh-trigger-question',
            categoryName: 'question'
        });
    });

    test('28: невідоме слово -> other без CSS-класу', () => {
        const tm = new TriggerManager();
        assert.deepStrictEqual(tm.resolveTriggerCategory('інше', ['молитва'], ['вопрос']), {
            categoryClass: '',
            categoryName: 'other'
        });
    });

    test('29: слово в обох списках -> перемагає prayer', () => {
        const tm = new TriggerManager();
        assert.deepStrictEqual(tm.resolveTriggerCategory('просьба', ['просьба'], ['просьба']), {
            categoryClass: 'syh-trigger-prayer',
            categoryName: 'prayer'
        });
    });
});
