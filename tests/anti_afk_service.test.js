// tests/anti_afk_service.test.js
//
// Характеристичні (characterization) тести для життєвого циклу
// `AntiAfkService` з `modules/anti_afk.ts`.
//
// Мета: зафіксувати поведінку 1-в-1 ПЕРЕД рефакторингом. За звітом Fallow
// `checkOptionsAndRun` — замикання на 50 рядків із cyclomatic 11, а
// `checkAndClickAntiAfk` — 40 рядків із cognitive 13; обидві всередині
// hotspot-файлу `modules/anti_afk.ts` (churn-score 30.2).
//
// Наявний `tests/anti_afk.test.js` покриває лише розпізнавання кнопки.
// Цей набір покриває САМЕ те, що переїжджає: конфіг, таймери, спостерігач,
// реакцію на storage і зупинку.
//
// `applyOptions` зроблено ідемпотентним: переналаштування зі storage більше не
// лишає осиротілих таймерів/спостерігача. Латентний баг виправлено (див.
// docs/audits/active/audit_2026-08-10_KILO_antiafk-timer-observer-leak-on-reconfigure.md).

import assert from 'node:assert';
import { test, describe, beforeEach, afterEach } from 'node:test';

const {
    AntiAfkService,
    startAntiAfk,
    stopAntiAfk,
    simulateUserActivity,
    checkAndClickAntiAfk,
    SYH_ANTI_AFK
} = await import('../modules/anti_afk.ts');

const OPTIONS_KEY = 'syh:core:options';

/** Мінімальний DOM-подібний вузол (без happy-dom, щоб контролювати querySelector). */
function createMockNode(tagName, attrs = {}, children = [], textContent = '') {
    let clicked = false;
    const attributes = { ...attrs };
    return {
        tagName: tagName.toUpperCase(),
        textContent,
        children,
        get wasClicked() { return clicked; },
        resetClicked() { clicked = false; },
        click() { clicked = true; },
        getAttribute(name) { return attributes[name] !== undefined ? attributes[name] : null; },
        querySelector(selector) {
            const res = this.querySelectorAll(selector);
            return res.length > 0 ? res[0] : null;
        },
        querySelectorAll(selector) {
            const results = [];
            const walk = (current) => {
                for (const child of current.children) {
                    if (matchesSelector(child, selector)) results.push(child);
                    walk(child);
                }
            };
            walk(this);
            return results;
        }
    };
}

function matchesSelector(el, selector) {
    if (selector === 'div[role="dialog"][aria-label="Are you still there?"]') {
        return el.tagName === 'DIV' && el.getAttribute('role') === 'dialog' && el.getAttribute('aria-label') === 'Are you still there?';
    }
    if (selector === 'div[role="dialog"]') return el.tagName === 'DIV' && el.getAttribute('role') === 'dialog';
    if (selector === '[aria-modal="true"]') return el.getAttribute('aria-modal') === 'true';
    if (selector === 'div[class*="modal"]') return el.tagName === 'DIV' && (el.getAttribute('class') || '').includes('modal');
    if (selector === 'div[class*="Dialog"]') return el.tagName === 'DIV' && (el.getAttribute('class') || '').includes('Dialog');
    if (selector.includes('button')) return el.tagName === 'BUTTON' || el.getAttribute('role') === 'button';
    return false;
}

function makeAfkTree(text = 'Stay in the studio') {
    const stayButton = createMockNode('button', {}, [], text);
    const dialog = createMockNode('div', { role: 'dialog' }, [stayButton]);
    const root = createMockNode('div', {}, [dialog]);
    return { stayButton, dialog, root };
}

/** Спостерігач, що фіксує зареєстровані інтервали. */
function installIntervalSpy() {
    const intervals = [];
    const originalSet = globalThis.setInterval;
    const originalClear = globalThis.clearInterval;
    let nextId = 1;

    globalThis.setInterval = (fn, ms) => {
        const id = nextId++;
        intervals.push({ id, fn, ms, cleared: false });
        return id;
    };
    globalThis.clearInterval = (id) => {
        const entry = intervals.find(i => i.id === id);
        if (entry) entry.cleared = true;
    };

    return {
        intervals,
        byDelay: (ms) => intervals.filter(i => i.ms === ms),
        alive: () => intervals.filter(i => !i.cleared),
        restore() {
            globalThis.setInterval = originalSet;
            globalThis.clearInterval = originalClear;
        }
    };
}

let observers = [];
let originalMutationObserver;

beforeEach(() => {
    observers = [];
    originalMutationObserver = globalThis.MutationObserver;
    globalThis.MutationObserver = class {
        constructor(cb) {
            this.callback = cb;
            this.observed = [];
            this.disconnected = false;
            observers.push(this);
        }
        observe(target, options) { this.observed.push({ target, options }); }
        disconnect() { this.disconnected = true; }
    };
});

afterEach(() => {
    stopAntiAfk();
    globalThis.MutationObserver = originalMutationObserver;
});

describe('AntiAfkService — конфігурація інтервалів', () => {
    test('1. без storage стартує з дефолтним резервним таймером 30с і активністю 150с', () => {
        const spy = installIntervalSpy();
        try {
            const service = new AntiAfkService();
            service.start({}, null, null, makeAfkTree().root);

            assert.equal(spy.byDelay(30000).length, 1, 'резервний AFK-таймер = 30с за замовчуванням');
            assert.equal(spy.byDelay(150000).length, 1, 'таймер імітації активності = 150с (фіксована константа)');
            service.stop();
        } finally {
            spy.restore();
        }
    });

    test('2. anti_afk_interval_sec поважається, коли він більший за нижню межу', () => {
        const spy = installIntervalSpy();
        try {
            const service = new AntiAfkService();
            const storage = { get: (keys, cb) => cb({ [OPTIONS_KEY]: { anti_afk_interval_sec: 45 } }) };
            service.start({}, storage, null, makeAfkTree().root);

            assert.equal(spy.byDelay(45000).length, 1, 'інтервал 45с має дійти до setInterval');
            service.stop();
        } finally {
            spy.restore();
        }
    });

    test('3. інтервал затискається знизу до 5000мс (Math.max)', () => {
        const spy = installIntervalSpy();
        try {
            const service = new AntiAfkService();
            const storage = { get: (keys, cb) => cb({ [OPTIONS_KEY]: { anti_afk_interval_sec: 1 } }) };
            service.start({}, storage, null, makeAfkTree().root);

            assert.equal(spy.byDelay(1000).length, 0, '1с не має проходити напряму');
            assert.equal(spy.byDelay(5000).length, 1, 'нижня межа = 5000мс');
            service.stop();
        } finally {
            spy.restore();
        }
    });

    test('4. інтервал 0 трактується як falsy -> дефолт 30с на обох проходах', () => {
        const spy = installIntervalSpy();
        try {
            const service = new AntiAfkService();
            const storage = { get: (keys, cb) => cb({ [OPTIONS_KEY]: { anti_afk_interval_sec: 0 } }) };
            service.start({}, storage, null, makeAfkTree().root);

            // Два проходи checkOptionsAndRun: синхронний дефолтний + прохід зі storage.
            // Обидва падають на дефолт 30с, бо 0 — falsy (`options?.anti_afk_interval_sec || 30`).
            assert.equal(spy.byDelay(30000).length, 2);
            service.stop();
        } finally {
            spy.restore();
        }
    });
});

describe('AntiAfkService — вмикання / вимикання', () => {
    test('5. anti_afk_enabled: false зупиняє сервіс і не лишає активних таймерів', () => {
        const spy = installIntervalSpy();
        try {
            const service = new AntiAfkService();
            const storage = { get: (keys, cb) => cb({ [OPTIONS_KEY]: { anti_afk_enabled: false } }) };
            service.start({}, storage, null, makeAfkTree().root);

            assert.equal(spy.alive().length, 0, 'усі таймери мають бути очищені при вимкненні');
            assert.ok(observers.every(o => o.disconnected), 'спостерігач має бути відключений');
        } finally {
            spy.restore();
        }
    });

    test('6. anti_afk_enabled: undefined трактується як увімкнено (!== false)', () => {
        const spy = installIntervalSpy();
        try {
            const service = new AntiAfkService();
            const storage = { get: (keys, cb) => cb({ [OPTIONS_KEY]: { anti_afk_interval_sec: 20 } }) };
            service.start({}, storage, null, makeAfkTree().root);

            assert.equal(spy.byDelay(20000).filter(i => !i.cleared).length, 1);
            service.stop();
        } finally {
            spy.restore();
        }
    });

    test('7. stop() ідемпотентний і безпечний без попереднього start()', () => {
        const service = new AntiAfkService();
        assert.doesNotThrow(() => { service.stop(); service.stop(); });
    });

    test('8. повторний start() спершу прибирає попередні таймери й спостерігача', () => {
        const spy = installIntervalSpy();
        try {
            const service = new AntiAfkService();
            service.start({}, null, null, makeAfkTree().root);
            const firstObserver = observers[0];
            assert.equal(spy.alive().length, 2);

            service.start({}, null, null, makeAfkTree().root);

            assert.ok(firstObserver.disconnected, 'старий MutationObserver має бути відключений');
            assert.equal(spy.alive().length, 2, 'живими лишаються рівно 2 нові таймери');
            service.stop();
        } finally {
            spy.restore();
        }
    });

    test('9. stop() очищає ЛИШЕ останні збережені таймери', () => {
        const spy = installIntervalSpy();
        try {
            const service = new AntiAfkService();
            service.start({}, null, null, makeAfkTree().root);
            service.stop();

            assert.equal(spy.alive().length, 0);
        } finally {
            spy.restore();
        }
    });
});

describe('AntiAfkService — реакція на сховище', () => {
    test('10. синхронний первинний запуск відбувається ДО читання storage', () => {
        const order = [];
        const spy = installIntervalSpy();
        try {
            const service = new AntiAfkService();
            const storage = { get: (keys, cb) => { order.push('storage.get'); cb({}); } };
            const { root, stayButton } = makeAfkTree();

            const spiedSet = globalThis.setInterval;
            globalThis.setInterval = (fn, ms) => { order.push(`interval:${ms}`); return spiedSet(fn, ms); };
            service.start({}, storage, null, root);
            globalThis.setInterval = spiedSet;

            assert.ok(stayButton.wasClicked, 'первинний прохід має одразу натиснути кнопку');
            assert.equal(order[0], 'interval:150000', 'таймери ставляться до звернення до storage');
            assert.ok(order.includes('storage.get'));
            service.stop();
        } finally {
            spy.restore();
        }
    });

    test('11. порожня відповідь storage не перезапускає конфігурацію', () => {
        const spy = installIntervalSpy();
        try {
            const service = new AntiAfkService();
            const storage = { get: (keys, cb) => cb({}) };
            service.start({}, storage, null, makeAfkTree().root);

            assert.equal(spy.byDelay(30000).length, 1, 'має лишитись єдиний дефолтний прохід');
            service.stop();
        } finally {
            spy.restore();
        }
    });

    test('12. onChanged із новими опціями створює таймер із новим інтервалом', () => {
        const spy = installIntervalSpy();
        try {
            let changeHandler = null;
            const service = new AntiAfkService();
            const storage = {
                get: (keys, cb) => cb({}),
                onChanged: (handler) => { changeHandler = handler; }
            };
            service.start({}, storage, null, makeAfkTree().root);
            assert.ok(changeHandler, 'сервіс має підписатися на onChanged');

            changeHandler({ [OPTIONS_KEY]: { newValue: { anti_afk_interval_sec: 90 } } });

            assert.equal(spy.byDelay(90000).filter(i => !i.cleared).length, 1, 'новий інтервал 90с активний');
            service.stop();
        } finally {
            spy.restore();
        }
    });

    test('13. ✅ ВИПРАВЛЕНО: переналаштування очищає старі таймери/спостерігача (без витоку)', () => {
        // `applyOptions` ідемпотентний: будь-яке (пере)налаштування спершу викликає
        // this.stop(), тож зміна інтервалу на льоту не лишає осиротілих інтервалів.
        // див. docs/audits/active/audit_2026-08-10_KILO_antiafk-timer-observer-leak-on-reconfigure.md
        const spy = installIntervalSpy();
        try {
            let changeHandler = null;
            const service = new AntiAfkService();
            const storage = {
                get: (keys, cb) => cb({}),
                onChanged: (handler) => { changeHandler = handler; }
            };
            service.start({}, storage, null, makeAfkTree().root);
            assert.equal(spy.alive().length, 2, 'після старту — 2 живі таймери');
            const observersAfterStart = observers.length;

            changeHandler({ [OPTIONS_KEY]: { newValue: { anti_afk_interval_sec: 90 } } });

            assert.equal(spy.alive().length, 2, 'старі 2 таймери очищено, лишились нові 2');
            assert.equal(spy.byDelay(30000).filter(i => !i.cleared).length, 0, 'старий 30с-таймер очищено');
            assert.equal(spy.byDelay(90000).filter(i => !i.cleared).length, 1, 'новий 90с-таймер активний');
            assert.equal(observers.length, observersAfterStart + 1, 'створено новий спостерігач після очищення старого');
            assert.ok(observers[observersAfterStart - 1].disconnected, 'старий спостерігач відключено перед перевідкриттям');
            assert.ok(!observers[observers.length - 1].disconnected, 'новий спостерігач активний');

            service.stop();
            assert.equal(spy.alive().length, 0, 'stop() прибирає єдину пару таймерів');
        } finally {
            spy.restore();
        }
    });

    test('14. onChanged без ключа опцій ігнорується', () => {
        const spy = installIntervalSpy();
        try {
            let changeHandler = null;
            const service = new AntiAfkService();
            const storage = {
                get: (keys, cb) => cb({}),
                onChanged: (handler) => { changeHandler = handler; }
            };
            service.start({}, storage, null, makeAfkTree().root);
            const before = spy.intervals.length;

            changeHandler({ 'syh:some:other:key': { newValue: 1 } });

            assert.equal(spy.intervals.length, before, 'жодного нового таймера');
            service.stop();
        } finally {
            spy.restore();
        }
    });

    test('15. storage без get() не ламає старт', () => {
        const service = new AntiAfkService();
        assert.doesNotThrow(() => service.start({}, {}, null, makeAfkTree().root));
        service.stop();
    });
});

describe('AntiAfkService — MutationObserver і резервний таймер', () => {
    test('16. спостерігач стежить за rootNode із childList+subtree', () => {
        const { root } = makeAfkTree();
        const service = new AntiAfkService();
        service.start({}, null, null, root);

        const observer = observers[observers.length - 1];
        assert.equal(observer.observed.length, 1);
        assert.strictEqual(observer.observed[0].target, root);
        assert.deepEqual(observer.observed[0].options, { childList: true, subtree: true });
        service.stop();
    });

    test('17. мутація з addedNodes запускає перевірку і клікає кнопку', () => {
        const { root, dialog, stayButton } = makeAfkTree();
        const service = new AntiAfkService();
        service.start({}, null, null, root);
        stayButton.resetClicked();

        observers[observers.length - 1].callback([{ addedNodes: [dialog] }]);

        assert.ok(stayButton.wasClicked);
        service.stop();
    });

    test('18. мутація без addedNodes нічого не натискає', () => {
        const { root, stayButton } = makeAfkTree();
        const service = new AntiAfkService();
        service.start({}, null, null, root);
        stayButton.resetClicked();

        observers[observers.length - 1].callback([{ addedNodes: [] }]);

        assert.equal(stayButton.wasClicked, false);
        service.stop();
    });

    test('19. резервний таймер зупиняє сервіс, коли chrome.runtime.id зник (контекст інвалідовано)', () => {
        const spy = installIntervalSpy();
        const originalChrome = globalThis.chrome;
        try {
            const { root } = makeAfkTree();
            const service = new AntiAfkService();
            service.start({}, null, null, root);

            const afkTimer = spy.byDelay(30000)[0];
            globalThis.chrome = { runtime: { id: undefined } };
            afkTimer.fn();

            assert.ok(spy.intervals.every(i => i.cleared), 'усі таймери мають бути зупинені');
            assert.ok(observers[observers.length - 1].disconnected);
        } finally {
            globalThis.chrome = originalChrome;
            spy.restore();
        }
    });

    test('20. резервний таймер продовжує перевіряти, коли контекст живий', () => {
        const spy = installIntervalSpy();
        const originalChrome = globalThis.chrome;
        try {
            const { root, stayButton } = makeAfkTree();
            const service = new AntiAfkService();
            service.start({}, null, null, root);
            stayButton.resetClicked();

            const afkTimer = spy.byDelay(30000)[0];
            globalThis.chrome = { runtime: { id: 'alive' } };
            afkTimer.fn();

            assert.ok(stayButton.wasClicked, 'кнопку має бути натиснуто резервним проходом');
            assert.ok(spy.alive().length > 0, 'сервіс лишається активним');
            service.stop();
        } finally {
            globalThis.chrome = originalChrome;
            spy.restore();
        }
    });
});

describe('anti_afk — публічний фасад', () => {
    test('21. SYH_ANTI_AFK експонує стабільний набір методів', () => {
        assert.deepEqual(
            Object.keys(SYH_ANTI_AFK).sort(),
            ['checkAndClickAntiAfk', 'simulateUserActivity', 'startAntiAfk', 'stopAntiAfk']
        );
        assert.strictEqual(SYH_ANTI_AFK.checkAndClickAntiAfk, checkAndClickAntiAfk);
        assert.strictEqual(SYH_ANTI_AFK.simulateUserActivity, simulateUserActivity);
        assert.strictEqual(SYH_ANTI_AFK.startAntiAfk, startAntiAfk);
        assert.strictEqual(SYH_ANTI_AFK.stopAntiAfk, stopAntiAfk);
    });

    test('22. simulateUserActivity шле mousemove і не кидає винятків', () => {
        const events = [];
        const target = document.body || document.documentElement;
        const listener = (e) => events.push(e.type);
        target.addEventListener('mousemove', listener);
        try {
            assert.doesNotThrow(() => simulateUserActivity());
            assert.ok(events.includes('mousemove'));
        } finally {
            target.removeEventListener('mousemove', listener);
        }
    });

    test('23. startAntiAfk/stopAntiAfk керують спільним singleton-сервісом', () => {
        const spy = installIntervalSpy();
        try {
            startAntiAfk({}, null, null, makeAfkTree().root);
            assert.ok(spy.alive().length > 0);

            stopAntiAfk();
            assert.equal(spy.alive().length, 0);
            assert.ok(observers[observers.length - 1].disconnected);
        } finally {
            spy.restore();
        }
    });

    test('24. i18n-адаптер розширює список цільових текстів кнопки', () => {
        const custom = createMockNode('button', {}, [], 'Bleib im Studio');
        const dialog = createMockNode('div', { role: 'dialog' }, [custom]);
        const root = createMockNode('div', {}, [dialog]);

        assert.equal(checkAndClickAntiAfk(root), false, 'без i18n текст невідомий');

        const clicked = checkAndClickAntiAfk(root, { getMessage: () => 'Bleib im Studio' });
        assert.equal(clicked, true);
        assert.ok(custom.wasClicked);
    });

    test('25. i18n, що повертає порожній рядок, не додає порожній збіг', () => {
        const neutral = createMockNode('button', {}, [], 'Cancel');
        const dialog = createMockNode('div', { role: 'dialog' }, [neutral]);
        const root = createMockNode('div', {}, [dialog]);

        const clicked = checkAndClickAntiAfk(root, { getMessage: () => '   ' });
        assert.equal(clicked, false, 'порожній локалізований рядок не має збігатися з усім підряд');
        assert.equal(neutral.wasClicked, false);
    });

    test('26. checkAndClickAntiAfk повертає false для null та для дерева без кнопок', () => {
        assert.equal(checkAndClickAntiAfk(null), false);
        assert.equal(checkAndClickAntiAfk(createMockNode('div', {}, [])), false);
    });
});
