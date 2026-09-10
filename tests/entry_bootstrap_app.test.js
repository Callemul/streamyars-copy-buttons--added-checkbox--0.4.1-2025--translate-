// tests/entry_bootstrap_app.test.js
//
// Тести entry point StreamYard: `main.ts` → `modules/bootstrap_app.ts` (T19).
//
// Досі ланцюжок ініціалізації не був покритий узагалі. Це найгірше місце для
// прогалини: `bootstrap_app` навмисно обгортає КОЖЕН крок власним `try/catch`
// (error boundaries, аудит 2026-09-05), щоб падіння одного модуля не вбивало
// решту розширення. Але «не вбиває решту» — це твердження, яке нічим не
// перевірялось: прибери `try/catch`, і все виглядало б так само зеленим.
//
// Тому головна група тестів тут — ПАРАМЕТРИЗОВАНА по кроках ініціалізації:
// кожен крок по черзі змушують кинути виняток і перевіряють, що ВСІ наступні
// кроки все одно виконались. Приберіть обгортку будь-якого кроку в
// `initCoreModules` — і падає рівно цей тест.

import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock({ runtimeImpl: { id: 'test-id', getManifest: () => ({ version: '9.9.9' }) } });

const {
    INIT_FLAG,
    DEFAULT_VERSION,
    claimInitLock,
    getGlobalScope,
    getExtensionVersion,
    callIfFunction,
    initCoreModules,
    initSyhApp,
    registerPlugins,
    SYH_PLUGIN_LIST
} = await import('../modules/streamyard/bootstrap/bootstrap_app.ts');

const { SYH_UTILS } = await import('../modules/utils.ts');
const { SYH_UI } = await import('../modules/streamyard/ui/ui.ts');
const { SYH_BANNER_CREATOR } = await import('../modules/banner_creator.ts');
const { SYH_COMMENT_ASSISTANT } = await import('../modules/comment_assistant/index.ts');
const { SYH_RIGHT_TABS_COMPACT } = await import('../modules/streamyard/right_tabs/right_tabs_compact.ts');
const { SYH_STATE } = await import('../modules/state.ts');
const { SYH_STATS_TRACKER } = await import('../modules/stats_tracker.ts');
const { SYH_DOM_OBSERVER } = await import('../modules/dom_observer.ts');
const { SYH_MESSAGING } = await import('../modules/messaging.ts');
const { SYH_PLUGINS } = await import('../modules/plugin_registry.ts');

/**
 * Кроки `initCoreModules` у порядку виклику — саме ті, кожен з яких обгорнутий
 * власним `try/catch`. Пара «об'єкт + метод», щоб тест міг і підмінити виклик
 * лічильником, і змусити його кинути виняток.
 */
const CORE_STEPS = [
    { name: 'SYH_UTILS.init', target: () => SYH_UTILS, method: 'init' },
    { name: 'SYH_UI.init', target: () => SYH_UI, method: 'init' },
    { name: 'SYH_BANNER_CREATOR.init', target: () => SYH_BANNER_CREATOR, method: 'init' },
    { name: 'SYH_COMMENT_ASSISTANT.init', target: () => SYH_COMMENT_ASSISTANT, method: 'init' },
    { name: 'SYH_COMMENT_ASSISTANT.processAllComments', target: () => SYH_COMMENT_ASSISTANT, method: 'processAllComments' },
    { name: 'SYH_RIGHT_TABS_COMPACT.init', target: () => SYH_RIGHT_TABS_COMPACT, method: 'init' },
    { name: 'SYH_STATE.init', target: () => SYH_STATE, method: 'init' }
];

/** Підміняє методи власними лічильниками; повертає журнал і функцію відкату. */
function stubCoreSteps(throwOn = null) {
    const calls = [];
    const restore = [];

    CORE_STEPS.forEach(step => {
        const obj = step.target();
        const had = Object.prototype.hasOwnProperty.call(obj, step.method);
        const original = obj[step.method];

        obj[step.method] = function stubbed() {
            calls.push(step.name);
            if (step.name === throwOn) throw new Error(`навмисне падіння: ${step.name}`);
        };

        restore.push(() => {
            if (had) obj[step.method] = original;
            else delete obj[step.method];
        });
    });

    return { calls, restore: () => restore.forEach(fn => fn()) };
}

/** Глушник console.error — у цих тестах помилки очікувані й шумлять. */
function silenceConsoleError() {
    const original = console.error;
    const messages = [];
    console.error = (...args) => { messages.push(args.map(String).join(' ')); };
    return { messages, restore: () => { console.error = original; } };
}

describe('bootstrap_app — запобіжник подвійної ін\'єкції', () => {
    beforeEach(() => {
        delete getGlobalScope()[INIT_FLAG];
    });

    afterEach(() => {
        delete getGlobalScope()[INIT_FLAG];
    });

    test('перший виклик бере блокування, другий — ні', () => {
        const scope = {};

        assert.equal(claimInitLock(scope), true);
        assert.equal(claimInitLock(scope), false);
        assert.equal(claimInitLock(scope), false);
    });

    test('блокування ставиться саме в глобальний скоуп', () => {
        assert.equal(getGlobalScope()[INIT_FLAG], undefined);

        claimInitLock();

        assert.equal(getGlobalScope()[INIT_FLAG], true);
    });

    // Саме так `main.ts` вирішує, чи ініціалізуватись: `if (!claimInitLock()) return;`.
    test('вже позначений скоуп не дає ініціалізуватись повторно', () => {
        const scope = { [INIT_FLAG]: true };

        assert.equal(claimInitLock(scope), false);
    });
});

describe('bootstrap_app — версія розширення', () => {
    test('береться з маніфесту, коли chrome доступний', () => {
        assert.equal(getExtensionVersion(), '9.9.9');
    });

    test('падає на фолбек, коли getManifest кидає виняток', () => {
        const original = chrome.runtime.getManifest;
        chrome.runtime.getManifest = () => { throw new Error('немає chrome'); };

        try {
            assert.equal(getExtensionVersion(), DEFAULT_VERSION);
            assert.equal(getExtensionVersion('7.7.7'), '7.7.7');
        } finally {
            chrome.runtime.getManifest = original;
        }
    });
});

describe('bootstrap_app — callIfFunction', () => {
    test('викликає метод і повідомляє про це', () => {
        let called = 0;
        const target = { init() { called++; } };

        assert.equal(callIfFunction(target, 'init'), true);
        assert.equal(called, 1);
    });

    test('відсутній метод, null і undefined не кидають винятку', () => {
        assert.equal(callIfFunction({}, 'init'), false);
        assert.equal(callIfFunction(null, 'init'), false);
        assert.equal(callIfFunction(undefined, 'init'), false);
        assert.equal(callIfFunction({ init: 'не функція' }, 'init'), false);
    });

    test('метод викликається з правильним this', () => {
        const target = {
            value: 42,
            seen: null,
            init() { this.seen = this.value; }
        };

        callIfFunction(target, 'init');

        assert.equal(target.seen, 42);
    });
});

describe('bootstrap_app — порядок ініціалізації ядра', () => {
    test('кроки виконуються рівно у зафіксованому порядку', () => {
        const stub = stubCoreSteps();

        try {
            initCoreModules();
        } finally {
            stub.restore();
        }

        assert.deepEqual(stub.calls, CORE_STEPS.map(s => s.name));
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// КРИТИЧНИЙ ТЕСТ T19: error boundaries реально тримають.
//
// Мутація для перевірки: приберіть `try/catch` навколо будь-якого кроку в
// `initCoreModules` — падає рівно той випадок цієї параметризованої групи.
// ─────────────────────────────────────────────────────────────────────────────

describe('bootstrap_app — падіння одного модуля не вбиває решту', () => {
    for (const failing of CORE_STEPS) {
        test(`виняток у «${failing.name}» не зупиняє наступні кроки`, () => {
            const stub = stubCoreSteps(failing.name);
            const quiet = silenceConsoleError();

            try {
                assert.doesNotThrow(
                    () => initCoreModules(),
                    `виняток у «${failing.name}» вилетів назовні — error boundary не тримає`
                );
            } finally {
                stub.restore();
                quiet.restore();
            }

            assert.deepEqual(
                stub.calls,
                CORE_STEPS.map(s => s.name),
                `після падіння «${failing.name}» решта кроків не виконалась`
            );

            assert.ok(
                quiet.messages.some(m => m.includes('[SYH]')),
                'падіння має бути залоговане, а не проковтнуте мовчки'
            );
        });
    }

    test('падіння ВСІХ кроків одночасно теж не валить ініціалізацію', () => {
        const calls = [];
        const restore = [];
        const quiet = silenceConsoleError();

        CORE_STEPS.forEach(step => {
            const obj = step.target();
            const original = obj[step.method];
            obj[step.method] = function () {
                calls.push(step.name);
                throw new Error(`падіння: ${step.name}`);
            };
            restore.push(() => { obj[step.method] = original; });
        });

        try {
            assert.doesNotThrow(() => initCoreModules());
        } finally {
            restore.forEach(fn => fn());
            quiet.restore();
        }

        assert.deepEqual(calls, CORE_STEPS.map(s => s.name));
    });
});

describe('bootstrap_app — реєстрація плагінів', () => {
    test('список плагінів StreamYard зафіксовано', () => {
        assert.equal(SYH_PLUGIN_LIST.length, 4);
        SYH_PLUGIN_LIST.forEach(plugin => {
            assert.equal(typeof plugin, 'object');
            assert.ok(plugin, 'плагін не має бути null');
        });
    });

    test('усі плагіни реєструються, потім піднімаються підтримувані', () => {
        const registered = [];
        let initCalls = 0;

        const registry = {
            register: (plugin) => registered.push(plugin),
            initSupportedPlugins: () => { initCalls++; return Promise.resolve(); }
        };
        const plugins = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];

        registerPlugins(registry, plugins);

        assert.deepEqual(registered, plugins);
        assert.equal(initCalls, 1);
    });

    test('порожній список не ламає реєстрацію', () => {
        let initCalls = 0;
        const registry = { register: () => {}, initSupportedPlugins: () => { initCalls++; } };

        assert.doesNotThrow(() => registerPlugins(registry, []));
        assert.equal(initCalls, 1);
    });
});

describe('bootstrap_app — initSyhApp піднімає всі підсистеми', () => {
    /**
     * Підміняє ВСІ підсистеми, які піднімає `initSyhApp`, і журналює порядок.
     *
     * Підміна саме всіх — не педантизм: без неї `registerPlugins` підняв би
     * справжній Anti-AFK з `setInterval`, і тестовий процес не завершився б.
     */
    function stubSubsystems() {
        const order = [];
        const restore = [];

        function spy(obj, method, label, impl = () => {}) {
            const original = obj[method];
            obj[method] = function (...args) {
                order.push(label);
                return impl.apply(this, args);
            };
            restore.push(() => { obj[method] = original; });
        }

        const core = stubCoreSteps();

        spy(SYH_PLUGINS, 'register', 'plugins.register');
        spy(SYH_PLUGINS, 'initSupportedPlugins', 'plugins.init', () => Promise.resolve());
        spy(SYH_STATS_TRACKER, 'init', 'stats.init');
        spy(SYH_DOM_OBSERVER, 'register', 'observer.register', () => () => {});
        spy(SYH_DOM_OBSERVER, 'start', 'observer.start');
        spy(SYH_MESSAGING, 'onMessage', 'messaging.onMessage');

        return {
            order,
            coreCalls: core.calls,
            restore: () => { restore.forEach(fn => fn()); core.restore(); }
        };
    }

    test('ядро, плагіни, статистика, DOM-спостерігач і месенджер — у цьому порядку', () => {
        const stub = stubSubsystems();

        try {
            initSyhApp();
        } finally {
            stub.restore();
        }

        // Ядро — перше і в повному складі.
        assert.deepEqual(stub.coreCalls, CORE_STEPS.map(s => s.name));

        const unique = stub.order.filter((label, i) => stub.order.indexOf(label) === i);
        assert.deepEqual(unique, [
            'plugins.register',
            'plugins.init',
            'stats.init',
            'observer.register',
            'observer.start',
            'messaging.onMessage'
        ]);
    });

    test('усі чотири плагіни StreamYard реєструються', () => {
        const stub = stubSubsystems();

        try {
            initSyhApp();
        } finally {
            stub.restore();
        }

        const registerCalls = stub.order.filter(l => l === 'plugins.register').length;
        assert.equal(registerCalls, SYH_PLUGIN_LIST.length);
    });

    // Спостерігач, запущений до реєстрації селекторів, не побачив би жодної
    // картки коментаря до наступної мутації — саме той клас багу, який
    // ловиться лише в браузері.
    test('DOM-спостерігач стартує ПІСЛЯ реєстрації всіх селекторів', () => {
        const stub = stubSubsystems();

        try {
            initSyhApp();
        } finally {
            stub.restore();
        }

        const observerOnly = stub.order.filter(l => l.startsWith('observer.'));
        const startIndex = observerOnly.indexOf('observer.start');

        assert.ok(startIndex > 0, 'start не має бути першим викликом спостерігача');
        assert.ok(
            observerOnly.slice(0, startIndex).every(x => x === 'observer.register'),
            'усі register мають відбутись до start'
        );
        assert.equal(
            observerOnly.filter(x => x === 'observer.start').length,
            1,
            'спостерігач стартує рівно один раз'
        );
    });

    test('месенджер попапу підключається останнім, коли решта вже піднята', () => {
        const stub = stubSubsystems();

        try {
            initSyhApp();
        } finally {
            stub.restore();
        }

        assert.equal(stub.order[stub.order.length - 1], 'messaging.onMessage');
    });
});
