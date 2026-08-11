// tests/sheet_state_api.test.js
//
// Характерні (characterization) тести публічного API аркушів:
//   - SheetStatsCalculator (чисті підрахунки),
//   - SheetRepository      (мапа ключів сховища + дефолти),
//   - SheetStateService    (фасад + processSheetData).
//
// Написані ДО декомпозиції `modules/sheet_state_service.ts`, щоб зафіксувати
// поведінку 1-в-1: після розбиття на `sheet_stats_calculator.ts`,
// `sheet_repository.ts` і `sheet_processing.ts` ці тести мають лишитися
// зеленими без жодної правки очікувань.

import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { installChromeMock } from './setup/chrome_mock.ts';

let store = {};
let removedKeys = [];

installChromeMock({
    storageImpl: {
        get: (keys, cb) => {
            const res = {};
            const list = Array.isArray(keys) ? keys : [keys];
            list.forEach(k => {
                if (k in store) res[k] = store[k];
            });
            if (cb) cb(res);
        },
        set: (items, cb) => {
            Object.assign(store, items);
            if (cb) cb();
        },
        remove: (keys, cb) => {
            const list = Array.isArray(keys) ? keys : [keys];
            removedKeys.push(...list);
            list.forEach(k => { delete store[k]; });
            if (cb) cb();
        }
    }
});

const {
    SheetStatsCalculator,
    SheetRepository,
    SheetStateService,
    countUniquePeople
} = await import('../modules/sheet_state_service.ts');

const { POPUP_SHEET_KEYS, getSheetCollectedStorageKey } = await import('../modules/storage.ts');

const SHEET = 'vp_ss';
const k = POPUP_SHEET_KEYS;

const ytQuestion = (author, text) => ({
    id: `q_${author}`, author, text, type: 'question', timestamp: 1, videoId: 'v1'
});
const ytPrayer = (author, text) => ({
    id: `p_${author}`, author, text, type: 'prayer', timestamp: 1, videoId: 'v1'
});

beforeEach(() => {
    store = {};
    removedKeys = [];
});

describe('SheetStatsCalculator.countUniquePeople', () => {
    test('1. дедуплікує іменованих авторів без урахування регістру та @', () => {
        const items = [
            { author: '@Alex' },
            { author: 'alex' },
            { author: '  ALEX  ' },
            { author: '@@Alex' }
        ];
        assert.equal(SheetStatsCalculator.countUniquePeople(items), 1);
    });

    test('2. кожен анонім рахується окремо (не дедуплікується)', () => {
        const items = [
            { author: '' },
            { author: '   ' },
            { author: 'Анонім' },
            { author: 'питання з чату' },
            { author: 'Невідомий' }
        ];
        assert.equal(SheetStatsCalculator.countUniquePeople(items), 5);
    });

    test('3. змішаний набір: унікальні імена + аноніми', () => {
        const items = [
            { author: '@Bob' },
            { author: 'bob' },
            { author: 'Mary' },
            { author: 'анонім' },
            { author: '' }
        ];
        assert.equal(SheetStatsCalculator.countUniquePeople(items), 4);
    });

    test('4. відсутній author не кидає виняток і рахується як анонім', () => {
        assert.equal(SheetStatsCalculator.countUniquePeople([{}, {}]), 2);
    });

    test('5. порожній список -> 0', () => {
        assert.equal(SheetStatsCalculator.countUniquePeople([]), 0);
    });

    test('6. функція-обгортка countUniquePeople делегує у клас 1-в-1', () => {
        const items = [{ author: '@Alex' }, { author: 'alex' }, { author: 'Mary' }];
        assert.equal(countUniquePeople(items), SheetStatsCalculator.countUniquePeople(items));
        assert.equal(countUniquePeople(items), 2);
    });
});

describe('SheetStatsCalculator.computeSheetCounters', () => {
    test('7. порожній telegram-текст лишає ліву колонку нульовою', () => {
        const res = SheetStatsCalculator.computeSheetCounters('   ', []);
        assert.deepEqual(res, {
            leftPeople: 0,
            leftQuestions: 0,
            leftPrayers: 0,
            rightPeople: 0,
            rightQuestions: 0,
            rightPrayers: 0,
            totalPeople: 0,
            totalQuestions: 0,
            totalPrayers: 0
        });
    });

    test('8. гілка з маркером-заголовком рахує і питання, і молитви', () => {
        const text = '❓❓❓ВОПРОСЫ\n1️⃣\n@Alex\nWhat is grace?\n\n🙏🙏🙏МОЛИТВЫ\n1️⃣\n@Maria\nPray for peace';
        const res = SheetStatsCalculator.computeSheetCounters(text, []);

        assert.equal(res.leftPeople, 2);
        assert.equal(res.leftQuestions, 1);
        assert.equal(res.leftPrayers, 1);
    });

    test('9. гілка line-by-line (без маркера) ніколи не дає молитов зліва', () => {
        const text = '[10.07.2026 20:44] @Alex\nWhat is grace?\n\n[10.07.2026 20:45] @Bob\nWhat is mercy?';
        const res = SheetStatsCalculator.computeSheetCounters(text, []);

        assert.equal(res.leftPeople, 2);
        assert.equal(res.leftQuestions, 2);
        assert.equal(res.leftPrayers, 0);
    });

    test('10. права колонка: question -> питання, prayer -> молитва', () => {
        const res = SheetStatsCalculator.computeSheetCounters('', [
            ytQuestion('Peter', 'How to pray?'),
            ytPrayer('Anna', 'Pray for health')
        ]);

        assert.equal(res.rightPeople, 2);
        assert.equal(res.rightQuestions, 1);
        assert.equal(res.rightPrayers, 1);
    });

    test('11. підсумки — це точна сума лівої та правої колонок', () => {
        const text = '[10.07.2026 20:44] @Alex\nWhat is grace?';
        const res = SheetStatsCalculator.computeSheetCounters(text, [
            ytQuestion('Peter', 'How to pray?'),
            ytPrayer('Anna', 'Pray for health')
        ]);

        assert.equal(res.totalPeople, res.leftPeople + res.rightPeople);
        assert.equal(res.totalQuestions, res.leftQuestions + res.rightQuestions);
        assert.equal(res.totalPrayers, res.leftPrayers + res.rightPrayers);
    });

    test('12. фасад SheetStateService.computeSheetCounters повертає той самий результат', () => {
        const text = '[10.07.2026 20:44] @Alex\nWhat is grace?';
        const items = [ytQuestion('Peter', 'How to pray?')];

        assert.deepEqual(
            SheetStateService.computeSheetCounters(text, items),
            SheetStatsCalculator.computeSheetCounters(text, items)
        );
    });
});

describe('SheetRepository — читання стану аркуша', () => {
    test('13. порожнє сховище дає повний набір дефолтів', async () => {
        const state = await SheetRepository.loadSheetState(SHEET);

        assert.deepEqual(state, {
            oldList: '',
            answered: '',
            newTelegram: '',
            finalResultHtml: '',
            statsHtml: '',
            statsVisible: false,
            deletedLogHtml: '',
            deletedLogCount: 0,
            deletedLogDetailsVisible: false,
            deletedLogDetailsOpen: false,
            cleanedLogHtml: '',
            cleanedLogCount: 0,
            cleanedLogDetailsVisible: false,
            cleanedLogDetailsOpen: false,
            dividerPos: 50,
            ytCollected: []
        });
    });

    test('14. збережені значення читаються з правильних ключів', async () => {
        const collected = [ytQuestion('Peter', 'How to pray?')];
        store[k.oldList(SHEET)] = 'old text';
        store[k.answered(SHEET)] = '1,2';
        store[k.newTelegram(SHEET)] = 'new text';
        store[k.finalResultHtml(SHEET)] = '<b>res</b>';
        store[k.statsHtml(SHEET)] = '<i>stats</i>';
        store[k.statsVisible(SHEET)] = true;
        store[k.deletedLogHtml(SHEET)] = '<u>del</u>';
        store[k.deletedLogCount(SHEET)] = 3;
        store[k.deletedLogDetailsVisible(SHEET)] = true;
        store[k.deletedLogDetailsOpen(SHEET)] = true;
        store[k.cleanedLogHtml(SHEET)] = '<s>clean</s>';
        store[k.cleanedLogCount(SHEET)] = 7;
        store[k.cleanedLogDetailsVisible(SHEET)] = true;
        store[k.cleanedLogDetailsOpen(SHEET)] = true;
        store[k.dividerPos(SHEET)] = 62;
        store[getSheetCollectedStorageKey(SHEET)] = collected;

        const state = await SheetRepository.loadSheetState(SHEET);

        assert.equal(state.oldList, 'old text');
        assert.equal(state.answered, '1,2');
        assert.equal(state.newTelegram, 'new text');
        assert.equal(state.finalResultHtml, '<b>res</b>');
        assert.equal(state.statsHtml, '<i>stats</i>');
        assert.equal(state.statsVisible, true);
        assert.equal(state.deletedLogHtml, '<u>del</u>');
        assert.equal(state.deletedLogCount, 3);
        assert.equal(state.deletedLogDetailsVisible, true);
        assert.equal(state.deletedLogDetailsOpen, true);
        assert.equal(state.cleanedLogHtml, '<s>clean</s>');
        assert.equal(state.cleanedLogCount, 7);
        assert.equal(state.cleanedLogDetailsVisible, true);
        assert.equal(state.cleanedLogDetailsOpen, true);
        assert.equal(state.dividerPos, 62);
        assert.deepEqual(state.ytCollected, collected);
    });

    test('15. булеві прапорці нормалізуються (0/1/"" -> boolean)', async () => {
        store[k.statsVisible(SHEET)] = 1;
        store[k.deletedLogDetailsVisible(SHEET)] = 0;
        store[k.cleanedLogDetailsOpen(SHEET)] = '';

        const state = await SheetRepository.loadSheetState(SHEET);

        assert.equal(state.statsVisible, true);
        assert.equal(state.deletedLogDetailsVisible, false);
        assert.equal(state.cleanedLogDetailsOpen, false);
    });

    test('16. стан читається лише для свого sheetId (ізоляція аркушів)', async () => {
        store[k.oldList('other')] = 'foreign';

        const state = await SheetRepository.loadSheetState(SHEET);

        assert.equal(state.oldList, '');
    });

    test('17. фасад SheetStateService.loadSheetState делегує у репозиторій', async () => {
        store[k.oldList(SHEET)] = 'via facade';

        const state = await SheetStateService.loadSheetState(SHEET);

        assert.equal(state.oldList, 'via facade');
    });
});

describe('SheetRepository — запис і очищення', () => {
    test('18. відомі поля мапляться через POPUP_SHEET_KEYS', async () => {
        await SheetRepository.saveSheetState(SHEET, {
            oldList: 'text',
            statsVisible: true,
            dividerPos: 42
        });

        assert.equal(store[k.oldList(SHEET)], 'text');
        assert.equal(store[k.statsVisible(SHEET)], true);
        assert.equal(store[k.dividerPos(SHEET)], 42);
    });

    test('19. невідомі поля пишуться у fallback-ключ syh:popup:sheet:<id>:<key>', async () => {
        await SheetRepository.saveSheetState(SHEET, { customThing: 'x' });

        assert.equal(store[`syh:popup:sheet:${SHEET}:customThing`], 'x');
    });

    test('20. порожній набір оновлень не створює ключів', async () => {
        await SheetRepository.saveSheetState(SHEET, {});

        assert.deepEqual(Object.keys(store), []);
    });

    test('21. clearSheetState прибирає 14 ключів стану', async () => {
        await SheetRepository.clearSheetState(SHEET);

        assert.equal(removedKeys.length, 14);
        assert.ok(removedKeys.includes(k.oldList(SHEET)));
        assert.ok(removedKeys.includes(k.cleanedLogDetailsOpen(SHEET)));
    });

    test('22. clearSheetState НЕ чіпає позицію роздільника та зібрані YT-коментарі', async () => {
        store[k.dividerPos(SHEET)] = 62;
        store[getSheetCollectedStorageKey(SHEET)] = [ytQuestion('Peter', 'q')];

        await SheetRepository.clearSheetState(SHEET);

        assert.ok(!removedKeys.includes(k.dividerPos(SHEET)));
        assert.ok(!removedKeys.includes(getSheetCollectedStorageKey(SHEET)));
        assert.equal(store[k.dividerPos(SHEET)], 62);
        assert.equal(store[getSheetCollectedStorageKey(SHEET)].length, 1);
    });

    test('23. фасади saveSheetState/clearSheetState делегують у репозиторій', async () => {
        await SheetStateService.saveSheetState(SHEET, { oldList: 'facade write' });
        assert.equal(store[k.oldList(SHEET)], 'facade write');

        await SheetStateService.clearSheetState(SHEET);
        assert.equal(store[k.oldList(SHEET)], undefined);
    });
});

describe('SheetStateService.processSheetData', () => {
    test('24. повністю порожній вхід дає порожній результат без винятків', () => {
        const res = SheetStateService.processSheetData({
            oldListText: '',
            answeredInput: '',
            telegramText: '',
            ytItems: []
        });

        assert.deepEqual(res.questions, []);
        assert.deepEqual(res.prayers, []);
        assert.deepEqual(res.deletedLog, []);
        assert.deepEqual(res.cleaningLog, []);
        assert.equal(res.stats.totalPeople, 0);
        assert.equal(res.stats.totalQuestions, 0);
        assert.equal(res.stats.totalPrayers, 0);
    });

    test('25. кожен елемент отримує коректний source (new/pray/yt)', () => {
        const res = SheetStateService.processSheetData({
            oldListText: '',
            answeredInput: '',
            telegramText: '❓❓❓ВОПРОСЫ\n1️⃣\n@Alex\nWhat is grace?\n\n🙏🙏🙏МОЛИТВЫ\n1️⃣\n@Maria\nPray for peace',
            ytItems: [ytQuestion('Peter', 'How to pray?'), ytPrayer('Anna', 'Pray for health')]
        });

        assert.deepEqual(res.questions.map(q => q.source), ['new', 'yt']);
        assert.deepEqual(res.prayers.map(p => p.source), ['pray', 'pray']);
    });

    test('26. порядок склейки: збережені старі -> нові з Telegram -> YouTube', () => {
        const res = SheetStateService.processSheetData({
            oldListText: '1️⃣\n@John\nWhat is faith?',
            answeredInput: '',
            telegramText: '[10.07.2026 20:44] @Alex\nWhat is grace?',
            ytItems: [ytQuestion('Peter', 'How to pray?')]
        });

        // Формат авторів навмисно НЕ уніфіковано: блоковий парсер лишає "@",
        // порядковий (line-by-line) — зрізає. Фіксуємо поточну поведінку 1-в-1.
        assert.deepEqual(res.questions.map(q => q.author), ['@John', 'Alex', 'Peter']);
    });

    test('27. відповіді (answeredInput) вилучають блок і потрапляють у deletedLog', () => {
        const res = SheetStateService.processSheetData({
            oldListText: '1️⃣\n@John\nWhat is faith?\n\n2️⃣\n@Mary\nWhat is hope?',
            answeredInput: '1',
            telegramText: '',
            ytItems: []
        });

        assert.equal(res.questions.length, 1);
        assert.equal(res.questions[0].author, '@Mary');
        assert.equal(res.deletedLog.length, 1);
        assert.equal(res.stats.delPeople, 1);
    });

    test('28. YT-елементи без відомого типу ігноруються в обох списках', () => {
        const res = SheetStateService.processSheetData({
            oldListText: '',
            answeredInput: '',
            telegramText: '',
            ytItems: [{ id: 'x', author: 'Ghost', text: 'no type', type: 'other', timestamp: 1, videoId: 'v1' }]
        });

        assert.deepEqual(res.questions, []);
        assert.deepEqual(res.prayers, []);
        // people рахуються по всьому масиву ytItems, навіть якщо тип невідомий
        assert.equal(res.stats.newYTPeople, 1);
    });

    test('29. підсумкові лічильники — сума трьох джерел', () => {
        const res = SheetStateService.processSheetData({
            oldListText: '1️⃣\n@John\nWhat is faith?',
            answeredInput: '',
            telegramText: '[10.07.2026 20:44] @Alex\nWhat is grace?',
            ytItems: [ytQuestion('Peter', 'How to pray?'), ytPrayer('Anna', 'Pray for health')]
        });

        const s = res.stats;
        assert.equal(s.totalPeople, s.oldPeople + s.newLeftPeople + s.newYTPeople);
        assert.equal(s.totalQuestions, s.oldQuestionsTotal + s.newLeftQuestionsTotal + s.newYTQuestionsTotal);
        assert.equal(s.totalPrayers, res.prayers.length);
    });

    test('30. computeSheetCounters узгоджений з processSheetData для нових даних', () => {
        const telegramText = '[10.07.2026 20:44] @Alex\nWhat is grace?\n\n[10.07.2026 20:45] @Bob\nWhat is mercy?';
        const ytItems = [ytQuestion('Peter', 'How to pray?'), ytPrayer('Anna', 'Pray for health')];

        const processed = SheetStateService.processSheetData({
            oldListText: '',
            answeredInput: '',
            telegramText,
            ytItems
        });
        const counters = SheetStateService.computeSheetCounters(telegramText, ytItems);

        assert.equal(counters.leftPeople, processed.stats.newLeftPeople);
        assert.equal(counters.leftQuestions, processed.stats.newLeftQuestionsTotal);
        assert.equal(counters.leftPrayers, processed.stats.newLeftPrayersTotal);
        assert.equal(counters.rightPeople, processed.stats.newYTPeople);
        assert.equal(counters.rightQuestions, processed.stats.newYTQuestionsTotal);
        assert.equal(counters.rightPrayers, processed.stats.newYTPrayersTotal);
    });
});
