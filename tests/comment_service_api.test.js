// tests/comment_service_api.test.js
//
// Характеристичні (characterization) тести публічного API `CommentService`.
// Написані ПЕРЕД декомпозицією `modules/comment_service.ts`, щоб зафіксувати
// поведінку 1-в-1: формат буфера обміну, дедуплікацію зібраних коментарів,
// емісію подій шини, роботу зі станами кнопок/чекбоксів і TTL молитов.
//
// Після рефакторингу фасад `CommentService` має проходити ці ж тести без змін.

import test, { describe, mock } from 'node:test';
import assert from 'node:assert/strict';

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

const { CommentService } = await import('../modules/comments/comment_service.ts');
const { SYH_BUS } = await import('../modules/core/event_bus.ts');
const { STORAGE_KEYS, getSheetCollectedStorageKey } = await import('../modules/storage/storage.ts');

const COLLECTED_KEY = getSheetCollectedStorageKey('vp_ss');

/** Збирає всі події вказаного типу, що пролетіли шиною під час виконання `fn`. */
async function captureBusEvents(eventType, fn) {
    const seen = [];
    const off = SYH_BUS.on(eventType, payload => seen.push(payload));
    try {
        await fn();
    } finally {
        off();
    }
    return seen;
}

function makeComment(overrides = {}) {
    return {
        id: 'c1',
        author: 'Alex',
        text: 'Q1',
        type: 'question',
        timestamp: 1000,
        ...overrides
    };
}

// --- Публічний контракт -----------------------------------------------------

describe('CommentService — публічний контракт', () => {
    test('1. клас експонує рівно очікуваний набір статичних методів', () => {
        const api = [
            'formatForClipboard',
            'copyToClipboard',
            'saveCollectedComment',
            'removeCollectedComment',
            'clearAllCollectedForSheet',
            'setStreamYardCheckboxState',
            'getStreamYardCheckboxState',
            'subscribeToStateChanges',
            'saveButtonState',
            'saveCheckboxState',
            'savePrayerRecord',
            'removePrayerRecord'
        ];

        for (const method of api) {
            assert.equal(typeof CommentService[method], 'function', `відсутній метод: ${method}`);
        }
    });

    test('2. приватні хелпери списку молитов не є частиною публічного API', () => {
        // `loadPrayerList` / `savePrayerList` / `updateCollectedListAndEmit` — private.
        // TypeScript-приватність не існує в рантаймі, тому фіксуємо лише те,
        // що зовнішній код на них не спирається: вони не документовані в контракті.
        assert.equal(typeof CommentService.savePrayerRecord, 'function');
        assert.equal(typeof CommentService.removePrayerRecord, 'function');
    });
});

// --- Буфер обміну -----------------------------------------------------------

describe('CommentService — форматування та копіювання', () => {
    test('3. formatForClipboard знімає провідні "@" і додає рівно один', () => {
        assert.equal(CommentService.formatForClipboard('@@@John', 'Hi'), '@John\n\nHi');
        assert.equal(CommentService.formatForClipboard('  Jane  ', '  Hi  '), '@Jane\n\nHi');
    });

    test('4. formatForClipboard без автора віддає лише текст', () => {
        assert.equal(CommentService.formatForClipboard('', 'Anon'), 'Anon');
        assert.equal(CommentService.formatForClipboard('   ', 'Anon'), 'Anon');
        assert.equal(CommentService.formatForClipboard('@', 'Anon'), 'Anon');
    });

    test('5. formatForClipboard толерує null/undefined на вході', () => {
        assert.equal(CommentService.formatForClipboard(null, null), '');
        assert.equal(CommentService.formatForClipboard(undefined, 'text'), 'text');
    });

    test('6. copyToClipboard повертає false на порожньому тексті і не чіпає API', async () => {
        const writeText = mock.fn(async () => {});
        Object.defineProperty(global, 'navigator', {
            value: { clipboard: { writeText } },
            configurable: true,
            writable: true
        });

        assert.equal(await CommentService.copyToClipboard(''), false);
        assert.equal(writeText.mock.callCount(), 0);
    });

    test('7. copyToClipboard використовує navigator.clipboard, коли він доступний', async () => {
        const writeText = mock.fn(async () => {});
        Object.defineProperty(global, 'navigator', {
            value: { clipboard: { writeText } },
            configurable: true,
            writable: true
        });

        assert.equal(await CommentService.copyToClipboard('payload'), true);
        assert.equal(writeText.mock.callCount(), 1);
        assert.equal(writeText.mock.calls[0].arguments[0], 'payload');
    });

    test('8. copyToClipboard падає у execCommand-фолбек, якщо Clipboard API кинув', async () => {
        Object.defineProperty(global, 'navigator', {
            value: { clipboard: { writeText: async () => { throw new Error('denied'); } } },
            configurable: true,
            writable: true
        });

        const execCommand = mock.fn(() => true);
        document.execCommand = execCommand;

        const warn = mock.method(console, 'warn', () => {});
        const ok = await CommentService.copyToClipboard('fallback text');
        warn.mock.restore();

        assert.equal(ok, true);
        assert.equal(execCommand.mock.callCount(), 1);
        assert.equal(execCommand.mock.calls[0].arguments[0], 'copy');
        // Тимчасова textarea прибирається за собою.
        assert.equal(document.querySelectorAll('textarea').length, 0);
    });

    test('9. copyToClipboard повертає результат execCommand як є', async () => {
        Object.defineProperty(global, 'navigator', {
            value: {},
            configurable: true,
            writable: true
        });
        document.execCommand = mock.fn(() => false);

        assert.equal(await CommentService.copyToClipboard('nope'), false);
    });
});

// --- Зібрані коментарі ------------------------------------------------------

describe('CommentService — сховище зібраних коментарів', () => {
    test('10. saveCollectedComment кладе новий коментар на початок списку', async () => {
        mockStorageStore = {};

        await CommentService.saveCollectedComment('vp_ss', makeComment({ id: 'a', text: 'first' }));
        const list = await CommentService.saveCollectedComment('vp_ss', makeComment({ id: 'b', text: 'second' }));

        assert.deepEqual(list.map(i => i.id), ['b', 'a']);
        assert.deepEqual(mockStorageStore[COLLECTED_KEY].map(i => i.id), ['b', 'a']);
    });

    test('11. saveCollectedComment замінює запис на місці при збігу id', async () => {
        mockStorageStore = {};

        await CommentService.saveCollectedComment('vp_ss', makeComment({ id: 'a', text: 'old' }));
        await CommentService.saveCollectedComment('vp_ss', makeComment({ id: 'b', text: 'other' }));
        const list = await CommentService.saveCollectedComment('vp_ss', makeComment({ id: 'a', text: 'new' }));

        assert.equal(list.length, 2);
        // Порядок збережено: оновлений елемент лишається на своїй позиції.
        assert.deepEqual(list.map(i => i.id), ['b', 'a']);
        assert.equal(list[1].text, 'new');
    });

    test('12. saveCollectedComment вважає дублем збіг author+text+type при іншому id', async () => {
        mockStorageStore = {};

        await CommentService.saveCollectedComment('vp_ss', makeComment({ id: 'a' }));
        const list = await CommentService.saveCollectedComment('vp_ss', makeComment({ id: 'zzz' }));

        assert.equal(list.length, 1);
        assert.equal(list[0].id, 'zzz');
    });

    test('13. saveCollectedComment емітить SHEET_DATA_PROCESSED з роздільним підрахунком', async () => {
        mockStorageStore = {};

        const events = await captureBusEvents('SHEET_DATA_PROCESSED', async () => {
            await CommentService.saveCollectedComment('vp_ss', makeComment({ id: 'q1', type: 'question' }));
            await CommentService.saveCollectedComment('vp_ss', makeComment({ id: 'p1', type: 'prayer', text: 'P' }));
        });

        assert.equal(events.length, 2);
        assert.deepEqual(events[0], { sheetId: 'vp_ss', totalQuestions: 1, totalPrayers: 0 });
        assert.deepEqual(events[1], { sheetId: 'vp_ss', totalQuestions: 1, totalPrayers: 1 });
    });

    test('14. removeCollectedComment видаляє за id', async () => {
        mockStorageStore = {};
        await CommentService.saveCollectedComment('vp_ss', makeComment({ id: 'a' }));
        await CommentService.saveCollectedComment('vp_ss', makeComment({ id: 'b', text: 'B' }));

        const list = await CommentService.removeCollectedComment('vp_ss', 'a');

        assert.deepEqual(list.map(i => i.id), ['b']);
    });

    test('15. removeCollectedComment видаляє за парою author+text, коли id не збігся', async () => {
        mockStorageStore = {};
        await CommentService.saveCollectedComment('vp_ss', makeComment({ id: 'a', author: 'Alex', text: 'Q1' }));

        const list = await CommentService.removeCollectedComment('vp_ss', 'unknown-id', 'Alex', 'Q1');

        assert.equal(list.length, 0);
    });

    test('16. removeCollectedComment без author/text не чіпає інші записи', async () => {
        mockStorageStore = {};
        await CommentService.saveCollectedComment('vp_ss', makeComment({ id: 'a' }));

        const list = await CommentService.removeCollectedComment('vp_ss', 'other-id');

        assert.equal(list.length, 1);
    });

    test('16b. removeCollectedComment очищає стани кнопок YT/Studio для видаленого коментаря', async () => {
        mockStorageStore = {};
        await CommentService.saveCollectedComment('vp_ss', makeComment({ id: 'a' }));
        await CommentService.saveCollectedComment('vp_ss', makeComment({ id: 'b', text: 'B' }));

        mockStorageStore[STORAGE_KEYS.YT_BUTTON_STATES] = { a: 'question', b: 'prayer' };
        mockStorageStore[STORAGE_KEYS.STUDIO_BUTTON_STATE] = { a: 'prayer', b: 'question' };

        await CommentService.removeCollectedComment('vp_ss', 'a');

        assert.deepEqual(mockStorageStore[STORAGE_KEYS.YT_BUTTON_STATES], { b: 'prayer' });
        assert.deepEqual(mockStorageStore[STORAGE_KEYS.STUDIO_BUTTON_STATE], { b: 'question' });
    });

    test('17. clearAllCollectedForSheet чистить лист і зриває стани кнопок YT/Studio', async () => {
        mockStorageStore = {};
        await CommentService.saveCollectedComment('vp_ss', makeComment({ id: 'a' }));
        await CommentService.saveCollectedComment('vp_ss', makeComment({ id: 'b', text: 'B' }));

        mockStorageStore[STORAGE_KEYS.YT_BUTTON_STATES] = { a: 'question', keep: 'prayer' };
        mockStorageStore[STORAGE_KEYS.STUDIO_BUTTON_STATE] = { b: 'prayer', keep2: 'question' };

        const events = await captureBusEvents('SHEET_DATA_PROCESSED', async () => {
            await CommentService.clearAllCollectedForSheet('vp_ss');
        });

        assert.deepEqual(mockStorageStore[COLLECTED_KEY], []);
        assert.deepEqual(mockStorageStore[STORAGE_KEYS.YT_BUTTON_STATES], { keep: 'prayer' });
        assert.deepEqual(mockStorageStore[STORAGE_KEYS.STUDIO_BUTTON_STATE], { keep2: 'question' });
        assert.deepEqual(events, [{ sheetId: 'vp_ss', totalQuestions: 0, totalPrayers: 0 }]);
    });

    test('18. clearAllCollectedForSheet не падає на порожньому сховищі', async () => {
        mockStorageStore = {};
        await assert.doesNotReject(CommentService.clearAllCollectedForSheet('vp_ss'));
        assert.deepEqual(mockStorageStore[COLLECTED_KEY], []);
    });
});

// --- Стани кнопок і чекбоксів -----------------------------------------------

describe('CommentService — стани кнопок і чекбоксів', () => {
    test('19. saveButtonState записує стан і емітить STATE_CHANGED value=true', async () => {
        mockStorageStore = {};
        const states = {};

        const events = await captureBusEvents('STATE_CHANGED', async () => {
            await CommentService.saveButtonState('k:btn', states, 'c1', 'question');
        });

        assert.equal(states.c1, 'question');
        assert.equal(mockStorageStore['k:btn'].c1, 'question');
        assert.deepEqual(events, [{ key: 'c1', value: true }]);
    });

    test('20. saveButtonState зі state=null видаляє ключ і емітить value=false', async () => {
        mockStorageStore = {};
        const states = { c1: 'prayer' };

        const events = await captureBusEvents('STATE_CHANGED', async () => {
            await CommentService.saveButtonState('k:btn', states, 'c1', null);
        });

        assert.equal('c1' in states, false);
        assert.deepEqual(events, [{ key: 'c1', value: false }]);
    });

    test('21. saveButtonState повертає ТОЙ САМИЙ обʼєкт-кеш (мутація на місці)', async () => {
        mockStorageStore = {};
        const states = {};
        const returned = await CommentService.saveButtonState('k:btn', states, 'c1', 'prayer');
        assert.equal(returned, states);
    });

    test('22. saveCheckboxState зберігає { checked, timestamp } і емітить STATE_CHANGED', async () => {
        mockStorageStore = {};
        const states = {};
        const before = Date.now();

        const events = await captureBusEvents('STATE_CHANGED', async () => {
            await CommentService.saveCheckboxState('k:cb', states, 'c1', true);
        });

        assert.equal(states.c1.checked, true);
        assert.ok(states.c1.timestamp >= before);
        assert.equal(mockStorageStore['k:cb'].c1.checked, true);
        assert.deepEqual(events, [{ key: 'c1', value: true }]);
    });

    test('23. saveCheckboxState=false не видаляє запис, а перезаписує його', async () => {
        mockStorageStore = {};
        const states = {};
        await CommentService.saveCheckboxState('k:cb', states, 'c1', true);
        const returned = await CommentService.saveCheckboxState('k:cb', states, 'c1', false);

        assert.equal(returned, states);
        assert.equal(states.c1.checked, false);
    });

    test('24. StreamYard-чекбокс: set/get ідуть через SYH_STATE та ігнорують порожній ключ', async () => {
        const { SYH_STATE } = await import('../modules/core/state.ts');
        const updateState = mock.method(SYH_STATE, 'updateState', () => {});
        const getState = mock.method(SYH_STATE, 'getState', () => true);

        CommentService.setStreamYardCheckboxState('', true);
        assert.equal(updateState.mock.callCount(), 0);
        assert.equal(CommentService.getStreamYardCheckboxState(''), false);
        assert.equal(getState.mock.callCount(), 0);

        CommentService.setStreamYardCheckboxState('text-key', true);
        assert.deepEqual(updateState.mock.calls[0].arguments, ['text-key', true, 150]);

        CommentService.setStreamYardCheckboxState('text-key', false, 42);
        assert.deepEqual(updateState.mock.calls[1].arguments, ['text-key', false, 42]);

        assert.equal(CommentService.getStreamYardCheckboxState('text-key'), true);

        updateState.mock.restore();
        getState.mock.restore();
    });

    test('25. subscribeToStateChanges повертає функцію відписки', () => {
        const received = [];
        const off = CommentService.subscribeToStateChanges(data => received.push(data));

        SYH_BUS.emit('STATE_CHANGED', { key: 'x', value: true });
        assert.equal(received.length, 1);

        off();
        SYH_BUS.emit('STATE_CHANGED', { key: 'y', value: false });
        assert.equal(received.length, 1, 'після відписки події більше не приходять');
    });
});

// --- Молитви ----------------------------------------------------------------

describe('CommentService — записи молитов з TTL', () => {
    function prayer(overrides = {}) {
        return {
            author: 'John',
            text: 'Prayer text',
            type: 'prayer',
            icon: '🙏🙏🙏',
            roomId: 'room1',
            timestamp: Date.now(),
            ...overrides
        };
    }

    test('26. savePrayerRecord додає запис у кінець списку', async () => {
        mockStorageStore = {};

        await CommentService.savePrayerRecord(prayer({ text: 'A' }));
        const list = await CommentService.savePrayerRecord(prayer({ text: 'B' }));

        assert.deepEqual(list.map(i => i.text), ['A', 'B']);
        assert.deepEqual(mockStorageStore[STORAGE_KEYS.PRAYERS].map(i => i.text), ['A', 'B']);
    });

    test('27. savePrayerRecord дедуплікує за текстом (новий запис витісняє старий)', async () => {
        mockStorageStore = {};

        await CommentService.savePrayerRecord(prayer({ text: 'Same', author: 'Old' }));
        const list = await CommentService.savePrayerRecord(prayer({ text: 'Same', author: 'New' }));

        assert.equal(list.length, 1);
        assert.equal(list[0].author, 'New');
    });

    test('28. savePrayerRecord відкидає протухлі молитви (TTL 2 доби) під час читання', async () => {
        const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
        mockStorageStore = {
            [STORAGE_KEYS.PRAYERS]: [
                prayer({ text: 'stale', timestamp: Date.now() - THREE_DAYS }),
                prayer({ text: 'fresh', timestamp: Date.now() })
            ]
        };

        const list = await CommentService.savePrayerRecord(prayer({ text: 'new' }));

        assert.deepEqual(list.map(i => i.text), ['fresh', 'new']);
    });

    test('29. питання (type !== prayer) живуть 30 днів, а не 2 доби', async () => {
        const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
        mockStorageStore = {
            [STORAGE_KEYS.PRAYERS]: [
                prayer({ text: 'question', type: 'question', timestamp: Date.now() - THREE_DAYS })
            ]
        };

        const list = await CommentService.savePrayerRecord(prayer({ text: 'new' }));

        assert.deepEqual(list.map(i => i.text), ['question', 'new']);
    });

    test('30. removePrayerRecord видаляє точно за текстом', async () => {
        mockStorageStore = {};
        await CommentService.savePrayerRecord(prayer({ text: 'A' }));
        await CommentService.savePrayerRecord(prayer({ text: 'B' }));

        const list = await CommentService.removePrayerRecord('A');

        assert.deepEqual(list.map(i => i.text), ['B']);
        assert.deepEqual(mockStorageStore[STORAGE_KEYS.PRAYERS].map(i => i.text), ['B']);
    });

    test('31. removePrayerRecord з невідомим текстом лишає список незмінним', async () => {
        mockStorageStore = {};
        await CommentService.savePrayerRecord(prayer({ text: 'A' }));

        const list = await CommentService.removePrayerRecord('missing');

        assert.deepEqual(list.map(i => i.text), ['A']);
    });

    test('32. removePrayerRecord на порожньому сховищі повертає порожній масив', async () => {
        mockStorageStore = {};
        assert.deepEqual(await CommentService.removePrayerRecord('anything'), []);
    });
});
