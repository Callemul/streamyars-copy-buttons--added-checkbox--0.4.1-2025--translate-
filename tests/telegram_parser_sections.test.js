/**
 * Характеристичні (characterization) тести для публічного API `modules/telegram_parser.ts`.
 *
 * Написані ДО декомпозиції модуля (519 LOC, найвища сумарна цикломатика в проєкті — 130),
 * щоб зафіксувати поведінку 1-в-1 на тих гілках, які `tests/telegram_parser.test.js`
 * не покриває: parseAnsweredIds, parseTelegramSection, фільтрація підпунктів 🔹 за
 * дробовими ID, зняття службових міток часу, ігноровані рядки секцій,
 * cleanTelegramHeadersLogged і збір DOM-стану аркуша.
 */

import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import {
    parseAnsweredIds,
    parseTelegramSection,
    parseAndFilterOldList,
    parseTelegramExportLineByLine,
    collectTelegramSheetStateFromDOM,
    cleanTelegramHeadersLogged,
    countQuestionsInText,
    numberToEmoji
} from '../modules/telegram_parser.ts';

describe('telegram_parser — parseAnsweredIds', () => {
    test('1. розбирає числа через пробіл, кому та їх суміш', () => {
        assert.deepEqual(parseAnsweredIds('1 2 3'), [1, 2, 3]);
        assert.deepEqual(parseAnsweredIds('1,2,3'), [1, 2, 3]);
        assert.deepEqual(parseAnsweredIds('1, 2,  3'), [1, 2, 3]);
    });

    test('2. зберігає дробові ID підпунктів', () => {
        assert.deepEqual(parseAnsweredIds('1.2 3.10'), [1.2, 3.1]);
    });

    test('3. відкидає нечислові токени', () => {
        assert.deepEqual(parseAnsweredIds('1 abc 2'), [1, 2]);
        assert.deepEqual(parseAnsweredIds('abc'), []);
    });

    test('4. порожній рядок дає порожній масив', () => {
        assert.deepEqual(parseAnsweredIds(''), []);
        assert.deepEqual(parseAnsweredIds('   '), []);
    });

    test('5. parseFloat зупиняється на першому нечисловому символі (поточна поведінка)', () => {
        assert.deepEqual(parseAnsweredIds('12abc'), [12]);
    });
});

describe('telegram_parser — countQuestionsInText / numberToEmoji (межові випадки)', () => {
    test('6. порожній/невизначений текст дає 0, а не 1', () => {
        assert.equal(countQuestionsInText(''), 0);
        assert.equal(countQuestionsInText(undefined), 0);
        assert.equal(countQuestionsInText(null), 0);
    });

    test('7. текст без 🔹 рахується як одне питання', () => {
        assert.equal(countQuestionsInText('текст без маркерів'), 1);
    });

    test('8. numberToEmoji для 0 і для двоцифрових', () => {
        assert.equal(numberToEmoji(0), '0️⃣');
        assert.equal(numberToEmoji(10), '🔟');
        assert.equal(numberToEmoji(11), '1️⃣1️⃣');
        assert.equal(numberToEmoji(105), '1️⃣0️⃣5️⃣');
    });
});

describe('telegram_parser — parseTelegramSection (keycap-режим)', () => {
    test('9. розбиває секцію на елементи за emoji-нумерацією', () => {
        const deleted = [];
        const cleaned = [];
        const items = parseTelegramSection(
            '1️⃣\n@John\nПерше питання\n2️⃣\n@Mary\nДруге питання',
            null,
            'old',
            0,
            deleted,
            cleaned
        );

        assert.equal(items.length, 2);
        assert.equal(items[0].author, '@John');
        assert.equal(items[0].text, 'Перше питання');
        assert.equal(items[0].source, 'old');
        assert.equal(items[1].author, '@Mary');
        assert.equal(items[1].text, 'Друге питання');
        assert.deepEqual(deleted, []);
    });

    test('10. initialCounter зміщує нумерацію для фільтрації', () => {
        const deleted = [];
        // лічильник стартує з 10 → перший блок отримує id 11
        const items = parseTelegramSection(
            '1️⃣\n@John\nПитання',
            [11],
            'old',
            10,
            deleted,
            []
        );

        assert.equal(items.length, 0);
        assert.equal(deleted[0].originalId, 11);
    });

    test('11. sourceType "pray" проставляється у кожен елемент', () => {
        const items = parseTelegramSection('1️⃣\n@Ann\nМолитва', null, 'pray', 0, [], []);

        assert.equal(items.length, 1);
        assert.equal(items[0].source, 'pray');
    });

    test('12. службові рядки секцій ігноруються', () => {
        const items = parseTelegramSection(
            '❓❓❓ВОПРОСЫ\n1️⃣\n@John\nПитання\nВіталій Кривко',
            null,
            'old',
            0,
            [],
            []
        );

        assert.equal(items.length, 1);
        assert.equal(items[0].text, 'Питання');
    });

    test('13. порожня секція дає порожній список', () => {
        assert.deepEqual(parseTelegramSection('', null, 'old', 0, [], []), []);
        assert.deepEqual(parseTelegramSection('\n\n   \n', null, 'old', 0, [], []), []);
    });

    test('14. автор без імені стає "Анонім"', () => {
        const items = parseTelegramSection('1️⃣\n\nСаме питання', null, 'old', 0, [], []);

        assert.equal(items.length, 1);
        assert.equal(items[0].author, 'Саме питання');
    });

    test('15. маркер "•" у рядку автора знімається і пишеться в cleaningLog', () => {
        const cleaned = [];
        const items = parseTelegramSection('1️⃣\n@John • admin\nПитання', null, 'old', 0, [], cleaned);

        assert.equal(items[0].author, '@John');
        assert.equal(cleaned.length, 1);
        assert.equal(cleaned[0].before, '@John • admin');
        assert.equal(cleaned[0].after, '@John');
        assert.equal(cleaned[0].removed, '• admin');
    });

    test('16. відносна мітка часу під автором прибирається і логується', () => {
        const cleaned = [];
        const items = parseTelegramSection('1️⃣\n@John\n5 хвилин тому\nПитання', null, 'old', 0, [], cleaned);

        assert.equal(items[0].author, '@John');
        assert.equal(items[0].text, 'Питання');
        assert.ok(cleaned.some(c => c.removed.includes('мітка часу')));
    });
});

describe('telegram_parser — фільтрація блоків і підпунктів 🔹', () => {
    test('17. цілий ID видаляє весь блок і рахує всі підпункти', () => {
        const result = parseAndFilterOldList('1️⃣\n@John\n🔹A\n🔹B\n🔹C', [1]);

        assert.equal(result.questions.length, 0);
        assert.equal(result.deleted.length, 1);
        assert.deepEqual(result.deleted[0], {
            originalId: 1, author: '@John', type: 'block', count: 3
        });
    });

    test('18. дробовий ID видаляє лише вказаний підпункт', () => {
        const result = parseAndFilterOldList('1️⃣\n@John\n🔹A\n🔹B\n🔹C', [1.2]);

        assert.equal(result.questions.length, 1);
        assert.equal(result.questions[0].text, '🔹A\n🔹C');
        assert.equal(result.deleted.length, 1);
        assert.deepEqual(result.deleted[0], {
            originalId: '1.2', author: '@John', type: 'sub', count: 1
        });
    });

    test('19. коли лишається один підпункт — маркер 🔹 знімається', () => {
        const result = parseAndFilterOldList('1️⃣\n@John\n🔹A\n🔹B', [1.2]);

        assert.equal(result.questions[0].text, 'A');
    });

    test('20. видалення всіх підпунктів прибирає блок і логує його як block', () => {
        const result = parseAndFilterOldList('1️⃣\n@John\n🔹A\n🔹B', [1.1, 1.2]);

        assert.equal(result.questions.length, 0);
        const blockEntry = result.deleted.find(d => d.type === 'block');
        assert.deepEqual(blockEntry, { originalId: 1, author: '@John', type: 'block', count: 2 });
        assert.equal(result.deleted.filter(d => d.type === 'sub').length, 2);
    });

    test('21. неіснуючий підпункт не логується, але блок усе одно фільтрується', () => {
        const result = parseAndFilterOldList('1️⃣\n@John\n🔹A\n🔹B', [1.9]);

        assert.equal(result.questions.length, 1);
        assert.equal(result.questions[0].text, '🔹A\n🔹B');
        assert.equal(result.deleted.filter(d => d.type === 'sub').length, 0);
    });

    test('22. answeredIds = null вимикає будь-яку фільтрацію', () => {
        const result = parseAndFilterOldList('1️⃣\n@John\n🔹A\n🔹B', null);

        assert.equal(result.questions.length, 1);
        assert.equal(result.questions[0].text, '🔹A\n🔹B');
        assert.deepEqual(result.deleted, []);
    });

    test('23. молитовна секція ніколи не фільтрується за answeredIds', () => {
        const text = '1️⃣\n@John\nПитання\n🙏🙏🙏Молитвы\n1️⃣\n@Ann\nМолитва';
        const result = parseAndFilterOldList(text, [1]);

        assert.equal(result.questions.length, 0, 'питання №1 відфільтроване');
        assert.equal(result.prayers.length, 1, 'молитва №1 лишається');
        assert.equal(result.prayers[0].source, 'pray');
    });
});

describe('telegram_parser — parseAndFilterOldList (контракт результату)', () => {
    test('24. завжди повертає всі чотири колекції', () => {
        const result = parseAndFilterOldList('', []);

        assert.deepEqual(Object.keys(result).sort(), ['cleaned', 'deleted', 'prayers', 'questions']);
        assert.deepEqual(result.questions, []);
        assert.deepEqual(result.prayers, []);
        assert.deepEqual(result.deleted, []);
        assert.deepEqual(result.cleaned, []);
    });

    test('25. переданий cleaningLog використовується як той самий масив', () => {
        const log = [];
        const result = parseAndFilterOldList('1️⃣\n@John • x\nПитання', [], log);

        assert.equal(result.cleaned, log, 'повертається саме переданий масив');
        assert.ok(log.length > 0);
    });
});

describe('telegram_parser — cleanTelegramHeadersLogged', () => {
    test('26. знімає службовий заголовок Telegram із тексту', () => {
        const cleaned = cleanTelegramHeadersLogged('[10.07.2026 20:44] Віталій: Текст питання');

        assert.equal(cleaned.includes('[10.07.2026 20:44]'), false);
        assert.ok(cleaned.includes('Текст питання'));
    });

    test('27. текст без заголовка лишається незмінним', () => {
        assert.equal(cleanTelegramHeadersLogged('Просто текст'), 'Просто текст');
    });
});

describe('telegram_parser — parseTelegramExportLineByLine (межові гілки)', () => {
    test('28. рядки до першого заголовка ігноруються', () => {
        const result = parseTelegramExportLineByLine('сміття зверху\n[10.07.2026 20:44] @John\nПитання');

        assert.equal(result.length, 1);
        assert.equal(result[0].author, 'John');
        assert.equal(result[0].text, 'Питання');
    });

    test('29. заголовок без тексту не створює елемента', () => {
        assert.deepEqual(parseTelegramExportLineByLine('[10.07.2026 20:44] @John'), []);
    });

    test('30. відносна мітка часу як єдиний вміст логується і не стає автором', () => {
        const log = [];
        const result = parseTelegramExportLineByLine('[10.07.2026 20:44] Name\n5 хвилин тому\nПитання', log);

        assert.equal(result.length, 1);
        assert.equal(result[0].author, 'Питання з чату');
        assert.equal(result[0].text, 'Питання');
        assert.ok(log.some(e => e.removed.includes('службова мітка часу')));
    });

    test('31. групування зупиняється при зміні автора і починається заново', () => {
        const text = [
            '[10.07.2026 20:44] @John', 'Q1',
            '[10.07.2026 20:45] @Mary', 'Q2',
            '[10.07.2026 20:46] @John', 'Q3',
            '[10.07.2026 20:47] @John', 'Q4'
        ].join('\n');

        const result = parseTelegramExportLineByLine(text);

        assert.equal(result.length, 3);
        assert.equal(result[0].text, 'Q1');
        assert.equal(result[1].text, 'Q2');
        assert.equal(result[2].text, '🔹Q3\n🔹Q4');
    });

    test('32. усі елементи мають source "new"', () => {
        const result = parseTelegramExportLineByLine('[10.07.2026 20:44] @John\nQ');

        assert.equal(result[0].source, 'new');
    });

    test('33. заголовок формату A ("Ім\'я, [дата]") теж відкриває новий елемент', () => {
        const result = parseTelegramExportLineByLine('John, [10.07.2026 20:44]\nПитання');

        assert.equal(result.length, 1);
        assert.equal(result[0].author, 'Питання з чату');
        assert.equal(result[0].text, 'Питання');
    });
});

describe('telegram_parser — collectTelegramSheetStateFromDOM', () => {
    /** Мінімальний фейковий елемент, достатній для читача стану. */
    function el(props = {}) {
        return { innerHTML: '', style: { display: '' }, open: false, ...props };
    }

    test('34. збирає повний знімок стану аркуша з DOM', () => {
        const nodes = {
            'finalResultDiv__s1': el({ innerHTML: '<p>result</p>' }),
            'statsBar__s1': el({ innerHTML: '<b>stats</b>', style: { display: 'flex' } }),
            'deletedLog__s1': el({ innerHTML: 'deleted' }),
            'cleanedLog__s1': el({ innerHTML: 'cleaned' }),
            'deletedLogDetails__s1': el({ open: true }),
            'cleanedLogDetails__s1': el({ open: false })
        };

        const state = collectTelegramSheetStateFromDOM('s1', 3, 7, (id) => nodes[id] || null);

        assert.deepEqual(state, {
            finalResultHtml: '<p>result</p>',
            statsHtml: '<b>stats</b>',
            statsVisible: true,
            deletedLogHtml: 'deleted',
            deletedLogCount: 3,
            deletedLogDetailsVisible: true,
            deletedLogDetailsOpen: true,
            cleanedLogHtml: 'cleaned',
            cleanedLogCount: 7,
            cleanedLogDetailsVisible: true,
            cleanedLogDetailsOpen: false
        });
    });

    test('35. statsVisible = false, коли панель схована через display:none', () => {
        const state = collectTelegramSheetStateFromDOM(
            's1', 0, 0,
            (id) => (id === 'statsBar__s1' ? el({ style: { display: 'none' } }) : null)
        );

        assert.equal(state.statsVisible, false);
    });

    test('36. відсутність усіх вузлів дає безпечні дефолти', () => {
        const state = collectTelegramSheetStateFromDOM('missing', 0, 0, () => null);

        assert.equal(state.finalResultHtml, '');
        assert.equal(state.statsHtml, '');
        assert.equal(state.statsVisible, false);
        assert.equal(state.deletedLogHtml, '');
        assert.equal(state.cleanedLogHtml, '');
        assert.equal(state.deletedLogDetailsOpen, false);
        assert.equal(state.cleanedLogDetailsOpen, false);
    });

    test('37. лічильники мають дефолт 0, а прапорці видимості логів — завжди true', () => {
        const state = collectTelegramSheetStateFromDOM('s1', undefined, undefined, () => null);

        assert.equal(state.deletedLogCount, 0);
        assert.equal(state.cleanedLogCount, 0);
        assert.equal(state.deletedLogDetailsVisible, true);
        assert.equal(state.cleanedLogDetailsVisible, true);
    });

    test('38. без явного getElementById читає з глобального document', () => {
        document.body.innerHTML = '<div id="finalResultDiv__dom">від document</div>';

        const state = collectTelegramSheetStateFromDOM('dom');

        assert.equal(state.finalResultHtml, 'від document');
        document.body.innerHTML = '';
    });
});
