// Характеризаційні тести для `modules/event_comments/auto_heal.ts` —
// refactoring target зі звіту Fallow 3.14: `priority 26.0`,
// `complexity_density 0.40` (найвища щільність у проєкті), MI 80.8, fan-in 3.
//
// `tests/event_comments_auto_heal.test.js` покриває side-effects самого
// сканування (чекбокси cover-кнопок і видалення «привидів»). Цей набір
// закриває ЖИТТЄВИЙ ЦИКЛ сканера, який досі не був покритий і тому не давав
// безпечно розділити файл:
//   - guard на runtime розширення (`chrome.runtime.id`) і від'єднання observer;
//   - реєстрація/перереєстрація у `SYH_DOM_OBSERVER` (звільнення попередньої);
//   - фолбек селектора коментаря, коли `SELECTORS.commentBlock` не заданий;
//   - батчинг через requestAnimationFrame і пропуск роботи при `document.hidden`;
//   - самостійність експорту `runAutoHeal` (виклик без реєстрації observer).

import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach, mock } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

/** @type {Record<string, any>} */
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

const { runAutoHeal, bindAutoHealScanner } = await import('../modules/event_comments/auto_heal.ts');
const { SYH_DOM_OBSERVER } = await import('../modules/dom_observer.ts');
const { SYH_STATE } = await import('../modules/state.ts');

const TEST_SELECTORS = {
    commentBlock: '.test-comment-block',
    commentText: '.test-comment-text',
    commentAuthor: '.test-comment-author',
    starButton: '.test-star-button'
};

/** @type {Array<() => void>} */
let unregisterQueue = [];

function createMockSelf(overrides = {}) {
    const calls = {
        removeFromDatabase: [],
        updateCommentVisuals: [],
        filterStarredComments: 0,
        observerDisconnects: 0
    };

    const self = {
        SELECTORS: TEST_SELECTORS,
        STATE: {},
        UI: {
            updateCommentVisuals: (block, type) => calls.updateCommentVisuals.push({ block, type }),
            filterStarredComments: () => { calls.filterStarredComments++; },
            prayersCache: []
        },
        TIMINGS: { FILTER_DEBOUNCE: 150 },
        calls,
        autoHealObserver: null,
        unregisterAutoHeal: null,
        removeFromDatabase: (text) => {
            calls.removeFromDatabase.push(text);
            return Promise.resolve();
        },
        saveToDatabase: () => Promise.resolve(),
        ...overrides
    };

    return self;
}

/** Реєструє self так, щоб afterEach гарантовано зняв реєстрацію в observer. */
function bindTracked(self) {
    bindAutoHealScanner(self);
    if (self.unregisterAutoHeal) unregisterQueue.push(self.unregisterAutoHeal);
    return self;
}

const COVER_BUTTON_HTML = `
    <div class="test-comment-block">
        <div class="test-comment-text">Текст коментаря</div>
        <button data-testid="show-comment-button">Hide</button>
        <input class="syh-checkbox" data-type="comment" type="checkbox">
    </div>
`;

const GHOST_HTML = `
    <div class="test-comment-block" data-syh-type="prayer">
        <div class="test-comment-text">Привид</div>
        <button class="test-star-button" aria-selected="false"></button>
    </div>
`;

/** Блок-привид із заданим текстом (для сценаріїв із кількома привидами). */
const ghostHtml = (text) => `
    <div class="test-comment-block" data-syh-type="prayer">
        <div class="test-comment-text">${text}</div>
        <button class="test-star-button" aria-selected="false"></button>
    </div>
`;

/**
 * Дає асинхронному проходу «привиди» повністю доопрацювати.
 * Один макротаск гарантовано зливає всю чергу мікротасків
 * (`Promise.allSettled` → скидання візуалів → перефільтрування).
 */
const flushGhostPass = () => new Promise(resolve => setTimeout(resolve, 0));

describe('event_comments auto_heal — життєвий цикл сканера (характеризація)', () => {
    beforeEach(() => {
        mockStorageStore = {};
        SYH_STATE.itemStates = {};
        document.body.innerHTML = '';
        unregisterQueue = [];
        globalThis.chrome = {
            runtime: { id: 'test-id', lastError: null },
            storage: globalThis.chrome?.storage
        };
    });

    afterEach(() => {
        unregisterQueue.forEach(fn => { try { fn(); } catch { /* ігноруємо */ } });
        unregisterQueue = [];
        mock.restoreAll();
        document.body.innerHTML = '';
    });

    describe('guard на runtime розширення', () => {
        test('1. без chrome.runtime.id сканування не виконується', () => {
            document.body.innerHTML = COVER_BUTTON_HTML;
            globalThis.chrome.runtime = { id: undefined };
            const self = createMockSelf();

            runAutoHeal(self);

            assert.equal(document.querySelector('.syh-checkbox').checked, false);
        });

        test('2. без runtime observer від\'єднується, якщо він є', () => {
            let disconnects = 0;
            globalThis.chrome.runtime = { id: undefined };
            const self = createMockSelf({
                autoHealObserver: { disconnect: () => { disconnects++; } }
            });

            runAutoHeal(self);

            assert.equal(disconnects, 1);
        });

        test('3. без runtime і без observer виклик безпечний', () => {
            globalThis.chrome.runtime = { id: undefined };
            const self = createMockSelf({ autoHealObserver: null });

            assert.doesNotThrow(() => runAutoHeal(self));
        });

        test('4. повністю відсутній chrome не спричиняє винятку', () => {
            const savedChrome = globalThis.chrome;
            globalThis.chrome = undefined;
            const self = createMockSelf();

            try {
                assert.doesNotThrow(() => runAutoHeal(self));
            } finally {
                globalThis.chrome = savedChrome;
            }
        });
    });

    describe('runAutoHeal як самостійний експорт', () => {
        test('5. виклик без bindAutoHealScanner виконує обидва проходи', () => {
            document.body.innerHTML = COVER_BUTTON_HTML + GHOST_HTML;
            const self = createMockSelf();

            runAutoHeal(self);

            assert.equal(document.querySelector('.syh-checkbox').checked, true);
            assert.deepEqual(self.calls.removeFromDatabase, ['Привид']);
        });

        test('6. повторний виклик ідемпотентний для вже позначеного чекбокса', () => {
            document.body.innerHTML = COVER_BUTTON_HTML;
            const self = createMockSelf();

            runAutoHeal(self);
            runAutoHeal(self);

            assert.equal(document.querySelector('.syh-checkbox').checked, true);
        });

        test('7. cover-кнопка поза блоком коментаря ігнорується', () => {
            document.body.innerHTML = `
                <button data-testid="show-comment-button">Hide</button>
                <input class="syh-checkbox" data-type="comment" type="checkbox">
            `;
            const self = createMockSelf();

            runAutoHeal(self);

            assert.equal(document.querySelector('.syh-checkbox').checked, false);
        });

        test('8. блок без тексту коментаря не пише стан, але чекбокс ставить', () => {
            document.body.innerHTML = `
                <div class="test-comment-block">
                    <button data-testid="show-comment-button">Hide</button>
                    <input class="syh-checkbox" data-type="comment" type="checkbox">
                </div>
            `;
            const self = createMockSelf();

            runAutoHeal(self);

            assert.equal(document.querySelector('.syh-checkbox').checked, true);
            assert.deepEqual(SYH_STATE.itemStates, {});
        });
    });

    describe('реєстрація у SYH_DOM_OBSERVER', () => {
        test('9. bindAutoHealScanner виставляє unregisterAutoHeal', () => {
            const self = bindTracked(createMockSelf());

            assert.equal(typeof self.unregisterAutoHeal, 'function');
        });

        test('10. повторний bind звільняє попередню реєстрацію рівно один раз', () => {
            let released = 0;
            const self = createMockSelf({
                unregisterAutoHeal: () => { released++; }
            });

            bindTracked(self);

            assert.equal(released, 1);
            assert.equal(typeof self.unregisterAutoHeal, 'function');
        });

        test('11. bindAutoHealScanner одразу виконує перший прохід', () => {
            document.body.innerHTML = COVER_BUTTON_HTML;
            const self = bindTracked(createMockSelf());

            assert.equal(document.querySelector('.syh-checkbox').checked, true);
        });

        test('12. використовується селектор із SELECTORS.commentBlock', () => {
            const registered = [];
            const register = mock.method(SYH_DOM_OBSERVER, 'register', (selector, onAdded, onRemoved) => {
                registered.push(selector);
                return () => {};
            });

            bindAutoHealScanner(createMockSelf());

            assert.deepEqual(registered, ['.test-comment-block']);
            register.mock.restore();
        });

        test('13. без SELECTORS.commentBlock застосовується вбудований фолбек', () => {
            const registered = [];
            const register = mock.method(SYH_DOM_OBSERVER, 'register', (selector) => {
                registered.push(selector);
                return () => {};
            });

            bindAutoHealScanner(createMockSelf({ SELECTORS: {} }));

            assert.deepEqual(registered, ['[class*="PlatformComment__Wrap"]']);
            register.mock.restore();
        });

        test('14. реєструються обидва колбеки — на додавання і на видалення', () => {
            let captured = null;
            const register = mock.method(SYH_DOM_OBSERVER, 'register', (selector, onAdded, onRemoved) => {
                captured = { onAdded, onRemoved };
                return () => {};
            });

            bindAutoHealScanner(createMockSelf());

            assert.equal(typeof captured.onAdded, 'function');
            assert.equal(typeof captured.onRemoved, 'function');
            register.mock.restore();
        });
    });

    describe('батчинг через requestAnimationFrame', () => {
        /** Перехоплює register і повертає тригер, який віддав auto_heal. */
        function captureTrigger(self) {
            let onAdded = null;
            const register = mock.method(SYH_DOM_OBSERVER, 'register', (selector, added) => {
                onAdded = added;
                return () => {};
            });
            bindAutoHealScanner(self);
            register.mock.restore();
            return onAdded;
        }

        test('15. кілька мутацій підряд згортаються в один прохід rAF', async () => {
            const self = createMockSelf();
            const trigger = captureTrigger(self);

            document.body.innerHTML = GHOST_HTML;
            trigger();
            trigger();
            trigger();

            assert.equal(self.calls.removeFromDatabase.length, 0, 'до кадру роботи бути не має');

            await new Promise(resolve => requestAnimationFrame(() => resolve()));
            await new Promise(resolve => setTimeout(resolve, 0));

            assert.equal(self.calls.removeFromDatabase.length, 1, 'за кадр — рівно один прохід');
        });

        test('16. після відпрацьованого кадру наступна мутація планує новий прохід', async () => {
            const self = createMockSelf();
            const trigger = captureTrigger(self);

            document.body.innerHTML = GHOST_HTML;
            trigger();
            await new Promise(resolve => requestAnimationFrame(() => resolve()));
            await new Promise(resolve => setTimeout(resolve, 0));

            trigger();
            await new Promise(resolve => requestAnimationFrame(() => resolve()));
            await new Promise(resolve => setTimeout(resolve, 0));

            assert.equal(self.calls.removeFromDatabase.length, 2);
        });

        test('17. прихована вкладка (document.hidden) повністю пропускає прохід', async () => {
            const self = createMockSelf();
            const trigger = captureTrigger(self);

            Object.defineProperty(document, 'hidden', { value: true, configurable: true });
            try {
                document.body.innerHTML = GHOST_HTML;
                trigger();

                await new Promise(resolve => requestAnimationFrame(() => resolve()));
                await new Promise(resolve => setTimeout(resolve, 0));

                assert.equal(self.calls.removeFromDatabase.length, 0);
            } finally {
                Object.defineProperty(document, 'hidden', { value: false, configurable: true });
            }
        });

        test('18. після повернення видимості тригер знову працює', async () => {
            const self = createMockSelf();
            const trigger = captureTrigger(self);

            Object.defineProperty(document, 'hidden', { value: true, configurable: true });
            trigger();
            Object.defineProperty(document, 'hidden', { value: false, configurable: true });

            document.body.innerHTML = GHOST_HTML;
            trigger();
            await new Promise(resolve => requestAnimationFrame(() => resolve()));
            await new Promise(resolve => setTimeout(resolve, 0));

            assert.equal(self.calls.removeFromDatabase.length, 1);
        });
    });

    describe('взаємодія з UI при видаленні привида', () => {
        test('19. візуали й перефільтрування виконуються ПІСЛЯ оновлення бази', async () => {
            document.body.innerHTML = GHOST_HTML;
            const self = createMockSelf();

            runAutoHeal(self);

            assert.deepEqual(self.calls.removeFromDatabase, ['Привид'], 'видалення стартує одразу');
            assert.equal(self.calls.updateCommentVisuals.length, 0, 'візуали чекають на базу');
            assert.equal(self.calls.filterStarredComments, 0, 'перефільтрування чекає на базу');

            await flushGhostPass();

            assert.equal(self.calls.updateCommentVisuals.length, 1);
            assert.equal(self.calls.updateCommentVisuals[0].type, 'none');
            assert.equal(self.calls.filterStarredComments, 1);
        });

        test('20. UI без filterStarredComments не ламає видалення привида', async () => {
            document.body.innerHTML = GHOST_HTML;
            const self = createMockSelf({
                UI: { updateCommentVisuals: () => {} }
            });

            assert.doesNotThrow(() => runAutoHeal(self));
            assert.deepEqual(self.calls.removeFromDatabase, ['Привид']);

            await flushGhostPass();
        });
    });

    // Регресія до `audit_2026-08-10_KILO_autoheal-floating-promise-refilter-race.md`:
    // прохід «привиди» більше не лишає плаваючих промісів і не перемальовує
    // список по одному разу на кожного привида.
    describe('асинхронний прохід «привиди» (регресія)', () => {
        test('21. три привиди → filterStarredComments викликано рівно один раз', async () => {
            document.body.innerHTML = ghostHtml('Привид 1') + ghostHtml('Привид 2') + ghostHtml('Привид 3');
            const self = createMockSelf();

            runAutoHeal(self);
            await flushGhostPass();

            assert.deepEqual(self.calls.removeFromDatabase, ['Привид 1', 'Привид 2', 'Привид 3']);
            assert.equal(self.calls.updateCommentVisuals.length, 3);
            assert.equal(self.calls.filterStarredComments, 1, 'рівно одне перефільтрування на прохід');
        });

        test('22. відхилення removeFromDatabase → warn у консоль, прохід не падає', async () => {
            document.body.innerHTML = ghostHtml('Битий') + ghostHtml('Цілий');
            const warn = mock.method(console, 'warn', () => {});

            const attempted = [];
            const self = createMockSelf({
                removeFromDatabase: (text) => {
                    attempted.push(text);
                    return text === 'Битий'
                        ? Promise.reject(new Error('storage down'))
                        : Promise.resolve();
                }
            });

            assert.doesNotThrow(() => runAutoHeal(self));
            await flushGhostPass();

            assert.deepEqual(attempted, ['Битий', 'Цілий'], 'решта привидів усе одно обробляється');
            assert.equal(warn.mock.callCount(), 1);
            assert.match(String(warn.mock.calls[0].arguments[0]), /Auto-Heal/);
            assert.equal(self.calls.filterStarredComments, 1, 'прохід дійшов до кінця');
            warn.mock.restore();
        });

        test('23. відхилення storage не реєструє unhandledrejection', async () => {
            document.body.innerHTML = GHOST_HTML;
            const warn = mock.method(console, 'warn', () => {});

            const captured = [];
            const onUnhandled = (reason) => captured.push(reason);
            process.on('unhandledRejection', onUnhandled);

            try {
                const self = createMockSelf({
                    removeFromDatabase: () => Promise.reject(new Error('Extension context invalidated'))
                });

                runAutoHeal(self);

                await flushGhostPass();
                await new Promise(resolve => setTimeout(resolve, 20));

                assert.equal(self.calls.filterStarredComments, 1);
            } finally {
                process.off('unhandledRejection', onUnhandled);
                warn.mock.restore();
            }

            assert.deepEqual(captured, [], 'жодного незакритого відхилення');
        });

        test('24. порядок проходів: cover-кнопки відпрацьовують ДО «привидів»', async () => {
            document.body.innerHTML = `
                <div class="test-comment-block" data-syh-type="prayer">
                    <div class="test-comment-text">Прихований привид</div>
                    <button class="test-star-button" aria-selected="false"></button>
                    <button data-testid="show-comment-button">Hide</button>
                    <input class="syh-checkbox" data-type="comment" type="checkbox">
                </div>
            `;

            let checkboxAtRemoval = null;
            const self = createMockSelf({
                removeFromDatabase: (text) => {
                    checkboxAtRemoval = document.querySelector('.syh-checkbox').checked;
                    self.calls.removeFromDatabase.push(text);
                    return Promise.resolve();
                }
            });

            runAutoHeal(self);
            await flushGhostPass();

            assert.deepEqual(self.calls.removeFromDatabase, ['Прихований привид']);
            assert.equal(checkboxAtRemoval, true, 'processCoverButtons уже виставив чекбокс');
        });

        test('25. немає привидів → жодного перефільтрування (порожня робота не планується)', async () => {
            document.body.innerHTML = COVER_BUTTON_HTML;
            const self = createMockSelf();

            runAutoHeal(self);
            await flushGhostPass();

            assert.equal(self.calls.removeFromDatabase.length, 0);
            assert.equal(self.calls.filterStarredComments, 0);
        });
    });
});
