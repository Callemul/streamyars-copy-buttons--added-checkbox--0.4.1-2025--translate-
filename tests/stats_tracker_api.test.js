// tests/stats_tracker_api.test.js
//
// Характерні тести публічного API `SYH_STATS_TRACKER` (`modules/stats_tracker.ts`).
//
// Мета — зафіксувати поведінку оркестратора 1-в-1 ПЕРЕД декомпозицією модуля
// (239 рядків, cyclomatic 66 / cognitive 51 за звітом Fallow).
// Наявний `tests/stats_tracker.test.js` покриває лише 6 сценаріїв; тут додано
// життєвий цикл (init/destroy), спостерігач заголовка, семплер ефіру
// та повну матрицю `getBrandFromLocalStorage`.
//
// Тести звертаються ТІЛЬКИ до експортованого об'єкта, тому лишаються дійсними
// і після винесення внутрішньої логіки в окремі файли.

import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

let mockStorageStore = {};

installChromeMock({
    storageImpl: {
        get: (keys, cb) => {
            const res = {};
            const arr = Array.isArray(keys) ? keys : [keys];
            arr.forEach((k) => { res[k] = mockStorageStore[k]; });
            if (cb) cb(res);
        },
        set: (items, cb) => {
            Object.assign(mockStorageStore, items);
            if (cb) cb();
        },
        remove: (keys, cb) => {
            const arr = Array.isArray(keys) ? keys : [keys];
            arr.forEach((k) => { delete mockStorageStore[k]; });
            if (cb) cb();
        }
    }
});

const { SYH_STATS_TRACKER } = await import('../modules/stats/stats_tracker.ts');
const { SYH_BUS } = await import('../modules/core/event_bus.ts');
const { SYH_STATS_EXPORTER } = await import('../modules/stats/stats_exporter.ts');
const { STORAGE_KEYS } = await import('../modules/storage/storage.ts');

const STATS_KEY = STORAGE_KEYS.STATS_CHARTS;
const today = () => new Date().toLocaleDateString('sv-SE');

/** Створює елемент із детермінованим `innerText` (happy-dom його не обчислює з layout). */
function el(tag, className, innerText) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    Object.defineProperty(node, 'innerText', { value: innerText, configurable: true, writable: true });
    document.body.appendChild(node);
    return node;
}

function resetDom() {
    document.body.innerHTML = '';
}

/** Підміняє localStorage.getItem без перезапису рид-онлі геттера (див. AGENTS.md). */
function stubLocalStorage(map, { throwOnRead = false } = {}) {
    Object.defineProperty(global, 'localStorage', {
        value: {
            getItem: (key) => {
                if (throwOnRead) throw new Error('storage unavailable');
                return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null;
            }
        },
        configurable: true,
        writable: true
    });
}

describe('SYH_STATS_TRACKER — життєвий цикл', () => {
    beforeEach(() => {
        mockStorageStore = {};
        resetDom();
        SYH_STATS_TRACKER.destroy();
        SYH_STATS_TRACKER.currentBrand = 'DefaultShow';
        SYH_STATS_TRACKER.lastKnownBrand = '';
    });

    afterEach(() => {
        SYH_STATS_TRACKER.destroy();
        resetDom();
    });

    test('1. початковий стан полів відповідає контракту', () => {
        assert.equal(SYH_STATS_TRACKER.intervalId, null);
        assert.equal(SYH_STATS_TRACKER.pendingRAF, null);
        assert.equal(SYH_STATS_TRACKER.observer, null);
    });

    test('2. init() піднімає спостерігач, трекінг і підписку на шину', () => {
        SYH_STATS_TRACKER.init();

        assert.ok(SYH_STATS_TRACKER.observer, 'observer має бути створений');
        assert.ok(SYH_STATS_TRACKER.intervalId !== null, 'трекінг має стартувати');
        assert.ok(SYH_BUS.listenerCount('PRAYER_MARKED') > 0, 'PRAYER_MARKED має слухача');
    });

    test('3. setupObservers() скидає lastKnownBrand і перестворює observer', () => {
        SYH_STATS_TRACKER.lastKnownBrand = 'Старий бренд';
        SYH_STATS_TRACKER.setupObservers();
        const first = SYH_STATS_TRACKER.observer;

        assert.equal(SYH_STATS_TRACKER.lastKnownBrand, '');
        assert.ok(first);

        SYH_STATS_TRACKER.setupObservers();
        assert.notEqual(SYH_STATS_TRACKER.observer, first, 'попередній observer має бути замінений');
    });

    test('4. startTracking() ідемпотентний — другий виклик не створює новий інтервал', () => {
        SYH_STATS_TRACKER.startTracking();
        const firstId = SYH_STATS_TRACKER.intervalId;
        assert.ok(firstId !== null);

        SYH_STATS_TRACKER.startTracking();
        assert.equal(SYH_STATS_TRACKER.intervalId, firstId);
    });

    test('5. destroy() обнуляє інтервал, RAF і observer', () => {
        SYH_STATS_TRACKER.init();
        SYH_STATS_TRACKER.pendingRAF = requestAnimationFrame(() => {});

        SYH_STATS_TRACKER.destroy();

        assert.equal(SYH_STATS_TRACKER.intervalId, null);
        assert.equal(SYH_STATS_TRACKER.pendingRAF, null);
        assert.equal(SYH_STATS_TRACKER.observer, null);
    });

    test('6. destroy() безпечно викликати повторно на чистому стані', () => {
        SYH_STATS_TRACKER.destroy();
        SYH_STATS_TRACKER.destroy();
        assert.equal(SYH_STATS_TRACKER.intervalId, null);
    });

    test('7. bindEvents() реагує на подію PRAYER_MARKED без винятку', () => {
        SYH_STATS_TRACKER.bindEvents();
        SYH_BUS.emit('PRAYER_MARKED', { author: 'A', text: 'T', icon: '🙏🙏🙏' });
        assert.ok(true);
    });
});

describe('SYH_STATS_TRACKER — loadStatsDb', () => {
    beforeEach(() => { mockStorageStore = {}; });

    test('8. повертає порожній об’єкт, коли у сховищі нічого немає', (t, done) => {
        SYH_STATS_TRACKER.loadStatsDb((db) => {
            assert.deepEqual(db, {});
            done();
        });
    });

    test('9. повертає збережену базу як є', (t, done) => {
        mockStorageStore[STATS_KEY] = { Brand: { '2026-01-01': { data: [] } } };
        SYH_STATS_TRACKER.loadStatsDb((db) => {
            assert.deepEqual(db, { Brand: { '2026-01-01': { data: [] } } });
            done();
        });
    });
});

describe('SYH_STATS_TRACKER — markPhase', () => {
    beforeEach(() => {
        mockStorageStore = {};
        resetDom();
        SYH_STATS_TRACKER.currentBrand = 'DefaultShow';
    });

    afterEach(resetDom);

    test('10. без таймера показує тост і НЕ пише у сховище', () => {
        SYH_STATS_TRACKER.markPhase('questions', { innerText: '', style: {} });

        const banner = document.querySelector('.copy-success-banner');
        assert.ok(banner);
        assert.match(banner.textContent, /Ефір ще не розпочався/);
        assert.equal(mockStorageStore[STATS_KEY], undefined);
    });

    test('11. фаза prayers пише timerText і змінює підпис кнопки', (t, done) => {
        el('div', 'Timer__TimerWrapper-abc', '01:20\n');
        const btn = { innerText: '', style: {} };

        SYH_STATS_TRACKER.markPhase('prayers', btn);

        setTimeout(() => {
            const session = mockStorageStore[STATS_KEY].DefaultShow[today()];
            assert.equal(session.phase_prayers_start, '01:20');
            assert.equal(btn.innerText, '✅ Молитви');
            assert.equal(btn.style.opacity, '0.7');
            done();
        }, 30);
    });

    test('12. позначення фази зберігає вже накопичені data сесії', (t, done) => {
        mockStorageStore[STATS_KEY] = {
            DefaultShow: { [today()]: { data: [{ time: '00:01', viewers: 5 }] } }
        };
        el('div', 'Timer__TimerWrapper-abc', '00:30');

        SYH_STATS_TRACKER.markPhase('questions', { innerText: '', style: {} });

        setTimeout(() => {
            const session = mockStorageStore[STATS_KEY].DefaultShow[today()];
            assert.equal(session.phase_questions_start, '00:30');
            assert.deepEqual(session.data, [{ time: '00:01', viewers: 5 }]);
            done();
        }, 30);
    });
});

describe('SYH_STATS_TRACKER — restoreButtonStates', () => {
    beforeEach(() => {
        mockStorageStore = {};
        SYH_STATS_TRACKER.currentBrand = 'DefaultShow';
    });

    test('13. без збереженої сесії підписи кнопок не змінюються', (t, done) => {
        const btnQ = { innerText: 'Питання', style: {} };
        const btnP = { innerText: 'Молитви', style: {} };

        SYH_STATS_TRACKER.restoreButtonStates(btnQ, btnP);

        setTimeout(() => {
            assert.equal(btnQ.innerText, 'Питання');
            assert.equal(btnP.innerText, 'Молитви');
            done();
        }, 30);
    });

    test('14. відновлюється лише та фаза, що збережена', (t, done) => {
        mockStorageStore[STATS_KEY] = {
            DefaultShow: { [today()]: { data: [], phase_questions_start: '00:15' } }
        };
        const btnQ = { innerText: 'Питання', style: {} };
        const btnP = { innerText: 'Молитви', style: {} };

        SYH_STATS_TRACKER.restoreButtonStates(btnQ, btnP);

        setTimeout(() => {
            assert.equal(btnQ.innerText, '✅ Питання');
            assert.equal(btnP.innerText, 'Молитви', 'молитви лишаються незмінними');
            done();
        }, 30);
    });
});

describe('SYH_STATS_TRACKER — семплер ефіру (тік інтервалу)', () => {
    let capturedTick;
    let realSetInterval;
    let realClearInterval;

    beforeEach(() => {
        mockStorageStore = {};
        resetDom();
        SYH_STATS_TRACKER.destroy();
        SYH_STATS_TRACKER.currentBrand = 'DefaultShow';

        capturedTick = null;
        realSetInterval = window.setInterval;
        realClearInterval = window.clearInterval;
        window.setInterval = (fn) => { capturedTick = fn; return 424242; };
        window.clearInterval = () => {};
    });

    afterEach(() => {
        window.setInterval = realSetInterval;
        window.clearInterval = realClearInterval;
        SYH_STATS_TRACKER.intervalId = null;
        resetDom();
    });

    test('15. без тега LiveTag тік нічого не пише у сховище', () => {
        SYH_STATS_TRACKER.startTracking();
        capturedTick();
        assert.equal(mockStorageStore[STATS_KEY], undefined);
    });

    test('16. тік в ефірі читає бренд, таймер і кількість глядачів', (t, done) => {
        el('span', 'Tags__LiveTag-x', 'LIVE');
        el('div', 'BrandSelect__BrandNameText-sc-16g9tfx-1', '  Канал А  ');
        el('div', 'Timer__TimerWrapper-x', '00:10\n');
        el('p', 'ViewerCount__StatText-x', ' 42 ');

        SYH_STATS_TRACKER.startTracking();
        capturedTick();

        setTimeout(() => {
            assert.equal(SYH_STATS_TRACKER.currentBrand, 'Канал А');
            const session = mockStorageStore[STATS_KEY]['Канал А'][today()];
            assert.equal(session.initial_viewers, 42);
            assert.deepEqual(session.data, [{ time: '00:10', viewers: 42 }]);
            done();
        }, 30);
    });

    test('17. повторний тік із тим самим часом не дублює точку', (t, done) => {
        el('span', 'Tags__LiveTag-x', 'LIVE');
        el('div', 'Timer__TimerWrapper-x', '00:10');
        el('p', 'ViewerCount__StatText-x', '7');

        SYH_STATS_TRACKER.startTracking();
        capturedTick();

        setTimeout(() => {
            capturedTick();
            setTimeout(() => {
                const session = mockStorageStore[STATS_KEY].DefaultShow[today()];
                assert.equal(session.data.length, 1, 'та сама мітка часу — одна точка');
                done();
            }, 30);
        }, 30);
    });

    test('18. нечислова кількість глядачів (NaN) перериває тік', () => {
        el('span', 'Tags__LiveTag-x', 'LIVE');
        el('div', 'Timer__TimerWrapper-x', '00:10');
        el('p', 'ViewerCount__StatText-x', 'нема даних');

        SYH_STATS_TRACKER.startTracking();
        capturedTick();

        assert.equal(mockStorageStore[STATS_KEY], undefined);
    });

    test('19. без таймера у DOM використовується запасне значення "0:00"', (t, done) => {
        el('span', 'Tags__LiveTag-x', 'LIVE');
        el('p', 'ViewerCount__StatText-x', '3');

        SYH_STATS_TRACKER.startTracking();
        capturedTick();

        setTimeout(() => {
            const session = mockStorageStore[STATS_KEY].DefaultShow[today()];
            assert.equal(session.data[0].time, '0:00');
            done();
        }, 30);
    });

    test('20. інвалідований контекст розширення зупиняє інтервал', () => {
        const savedChrome = globalThis.chrome;
        globalThis.chrome = { runtime: { id: undefined } };

        SYH_STATS_TRACKER.startTracking();
        capturedTick();

        assert.equal(SYH_STATS_TRACKER.intervalId, null, 'трекер має самознищити інтервал');
        globalThis.chrome = savedChrome;
    });

    test('20b. throwing getter chrome.runtime.id не пробивається з тіку і зупиняє інтервал', () => {
        const originalChrome = Object.getOwnPropertyDescriptor(globalThis, 'chrome');
        const runtime = {};
        Object.defineProperty(runtime, 'id', {
            configurable: true,
            get() { throw new Error('Extension context invalidated.'); }
        });
        Object.defineProperty(globalThis, 'chrome', {
            value: { runtime },
            configurable: true,
            writable: true
        });

        try {
            SYH_STATS_TRACKER.startTracking();
            assert.doesNotThrow(() => capturedTick());
            assert.equal(SYH_STATS_TRACKER.intervalId, null, 'трекер має самознищити інтервал');
            assert.equal(mockStorageStore[STATS_KEY], undefined, 'після інвалідації storage не читається');
        } finally {
            if (originalChrome) Object.defineProperty(globalThis, 'chrome', originalChrome);
            else delete globalThis.chrome;
        }
    });
});

describe('SYH_STATS_TRACKER — getBrandFromLocalStorage', () => {
    test('21. читає JSON-об’єкт із полем name', () => {
        stubLocalStorage({ streamyard_brand: '{"name":"Канал 1"}' });
        assert.equal(SYH_STATS_TRACKER.getBrandFromLocalStorage(), 'Канал 1');
    });

    test('22. читає простий рядок і трімить його', () => {
        stubLocalStorage({ sy_active_brand: '  Канал 2  ' });
        assert.equal(SYH_STATS_TRACKER.getBrandFromLocalStorage(), 'Канал 2');
    });

    test('23. перебирає ключі у фіксованому порядку пріоритету', () => {
        stubLocalStorage({ sy_active_brand: 'Другий', brand_state: 'Третій' });
        assert.equal(SYH_STATS_TRACKER.getBrandFromLocalStorage(), 'Другий');
    });

    test('24. зіпсований JSON не кидає — перебір триває далі', () => {
        stubLocalStorage({ streamyard_brand: '{зламано', brand_state: 'Резервний' });
        assert.equal(SYH_STATS_TRACKER.getBrandFromLocalStorage(), 'Резервний');
    });

    test('25. JSON без поля name пропускається', () => {
        stubLocalStorage({ streamyard_brand: '{"id":7}', sy_active_brand: 'Запасний' });
        assert.equal(SYH_STATS_TRACKER.getBrandFromLocalStorage(), 'Запасний');
    });

    test('26. порожній рядок і пробіли брендом не вважаються', () => {
        stubLocalStorage({ streamyard_brand: '   ', sy_active_brand: '' });
        assert.equal(SYH_STATS_TRACKER.getBrandFromLocalStorage(), '');
    });

    test('27. відсутність ключів дає порожній рядок', () => {
        stubLocalStorage({});
        assert.equal(SYH_STATS_TRACKER.getBrandFromLocalStorage(), '');
    });

    test('28. виняток під час читання localStorage перехоплюється', () => {
        stubLocalStorage({}, { throwOnRead: true });
        assert.equal(SYH_STATS_TRACKER.getBrandFromLocalStorage(), '');
    });
});

describe('SYH_STATS_TRACKER — делегування', () => {
    test('29. searchBrandNameInObject делегує у чистий хелпер', () => {
        assert.equal(SYH_STATS_TRACKER.searchBrandNameInObject({ activeBrand: { name: 'A' } }), 'A');
        assert.equal(SYH_STATS_TRACKER.searchBrandNameInObject({ brand: { name: 'B' } }), 'B');
        assert.equal(SYH_STATS_TRACKER.searchBrandNameInObject('рядок'), null);
        assert.equal(SYH_STATS_TRACKER.searchBrandNameInObject(undefined), null);
    });

    test('30. showAnalyticsModal передає поточний бренд в експортер', () => {
        const original = SYH_STATS_EXPORTER.showModal;
        const calls = [];
        SYH_STATS_EXPORTER.showModal = (brand) => calls.push(brand);

        SYH_STATS_TRACKER.currentBrand = 'Канал Х';
        SYH_STATS_TRACKER.showAnalyticsModal();

        assert.deepEqual(calls, ['Канал Х']);
        SYH_STATS_EXPORTER.showModal = original;
        SYH_STATS_TRACKER.currentBrand = 'DefaultShow';
    });

    test('31. showAnalyticsModal не падає, коли експортер без showModal', () => {
        const original = SYH_STATS_EXPORTER.showModal;
        SYH_STATS_EXPORTER.showModal = undefined;

        SYH_STATS_TRACKER.showAnalyticsModal();
        assert.ok(true, 'має бути тихий warn, а не виняток');

        SYH_STATS_EXPORTER.showModal = original;
    });
});
