// tests/banner_modal_parser.test.js
//
// Юніт-тести `parseTextToSections` (`modules/banner_modal_parser.ts`) — чистого
// ядра, винесеного з `banner_modal.ts` під час розбиття God Object.
// Файл `banner_modal.test.js` перевіряє модалку як DOM-компонент; тут — самі
// правила нарізки на секції: нумерація, заголовки, перекриття категорій,
// прапорець стандартного формату та фолбек утиліт.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { parseTextToSections } from '../modules/banners/banner_modal_parser.ts';

/** Мінімальні парсери: та сама поведінка, що й у banner_modal.test.js. */
function createMockParsers() {
    return {
        parseStandardNumberedQuestions: (text) => text.split('\n')
            .map(l => l.trim())
            .filter(l => /^\d+[.)]/.test(l))
            .map(l => l.replace(/^\d+[.)]\s*/, '').trim()),
        parseEmojiNumberedQuestions: (text) => text.split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0 && !/^\d+\uFE0F?\u20E3/.test(l) && !/^@/.test(l)),
        parseSabbathSchoolUnnumberedQuestions: (text) => text.split('\n')
            .map(l => l.trim())
            .filter(Boolean)
    };
}

function createMockUtils() {
    return { cleanTelegramHeaders: (t) => t };
}

describe('banner_modal_parser — порожній вхід і фолбеки', () => {
    test('1. текст лише з пробілів дає порожній результат із поясненням у логах', () => {
        const result = parseTextToSections('   \n\t\n  ', createMockParsers(), createMockUtils());

        assert.deepEqual(result.sections, []);
        assert.deepEqual(result.allBanners, []);
        assert.equal(result.hasStandardFormat, false);
        assert.deepEqual(result.logs, ['Текст порожній']);
    });

    test('2. utils без cleanTelegramHeaders не ламає розбір (фолбек-тотожність)', () => {
        const result = parseTextToSections(
            '❓ ВОПРОСЫ ЗРИТЕЛЕЙ\n1. Питання перше',
            createMockParsers(),
            {} // частково ініціалізований SyhUtils
        );

        assert.equal(result.sections.length, 1);
        assert.equal(result.allBanners.length, 1);
    });

    test('3. cleanTelegramHeaders реально застосовується до вхідного тексту', () => {
        const calls = [];
        const utils = {
            cleanTelegramHeaders(text) {
                calls.push(text);
                return text.replace('СМІТТЯ\n', '');
            }
        };

        const result = parseTextToSections(
            'СМІТТЯ\n❓ ВОПРОСЫ ЗРИТЕЛЕЙ\n1. Питання перше',
            createMockParsers(),
            utils
        );

        assert.equal(calls.length, 1);
        assert.ok(!result.sections[0].rawText.includes('СМІТТЯ'));
    });
});

describe('banner_modal_parser — заголовки і нумерація секцій', () => {
    test('4. довгий перший рядок обрізається до 32 символів із трикрапкою', () => {
        const longHeader = '❓ ВОПРОСЫ ЗРИТЕЛЕЙ ПРО ДУЖЕ ДОВГУ ТЕМУ ЕФІРУ';
        const result = parseTextToSections(
            `${longHeader}\n1. Питання`,
            createMockParsers(),
            createMockUtils()
        );

        assert.equal(result.sections[0].title, `Секція 1: ${longHeader.substring(0, 32)}...`);
    });

    test('5. короткий заголовок лишається без обрізання', () => {
        const result = parseTextToSections(
            '❓ ВОПРОСЫ\n1. Питання',
            createMockParsers(),
            createMockUtils()
        );

        assert.equal(result.sections[0].title, 'Секція 1: ❓ ВОПРОСЫ');
    });

    test('6. нумерація секцій наскрізна через кілька повідомлень', () => {
        const input = [
            '❓ ВОПРОСЫ ЗРИТЕЛЕЙ',
            '1. Питання перше',
            '',
            '🙏 МОЛИТВЫ',
            '1. Молитва перша',
            '',
            '❓ ВОПРОСЫ ЗРИТЕЛЕЙ',
            '1. Питання друге'
        ].join('\n');

        const result = parseTextToSections(input, createMockParsers(), createMockUtils());

        assert.deepEqual(result.sections.map(s => s.id), [1, 2, 3]);
        assert.deepEqual(result.sections.map(s => s.category), ['audience', 'prayer', 'audience']);
    });
});

describe('banner_modal_parser — категорії та банери', () => {
    test('7. categoryOverrides перекриває автокатегорію молитовної секції', () => {
        const input = '❓ ВОПРОСЫ ЗРИТЕЛЕЙ\n1. Питання\n\n🙏 МОЛИТВЫ\n1. Молитва';
        const result = parseTextToSections(input, createMockParsers(), createMockUtils(), { 2: 'stream' });

        assert.equal(result.sections[1].category, 'stream');
        assert.ok(result.sections[1].banners.every(b => b.category === 'stream'),
            'категорія секції має примусово перекривати категорію кожного банера');
    });

    test('8. перекриття неіснуючої секції ігнорується', () => {
        const result = parseTextToSections(
            '❓ ВОПРОСЫ ЗРИТЕЛЕЙ\n1. Питання',
            createMockParsers(),
            createMockUtils(),
            { 99: 'prayer' }
        );

        assert.equal(result.sections[0].category, 'audience');
    });

    test('9. allBanners — це конкатенація банерів секцій у порядку секцій', () => {
        const input = '❓ ВОПРОСЫ ЗРИТЕЛЕЙ\n1. Перше\n2. Друге\n\n🙏 МОЛИТВЫ\n1. Молитва';
        const result = parseTextToSections(input, createMockParsers(), createMockUtils());

        const fromSections = result.sections.flatMap(s => s.banners);
        assert.deepEqual(result.allBanners, fromSections);
        assert.deepEqual(result.allBanners.map(b => b.text), ['Перше', 'Друге', 'Молитва']);
    });

    test('10. rawText секції зберігає вихідний підблок для повторного розбору', () => {
        const input = '❓ ВОПРОСЫ ЗРИТЕЛЕЙ\n1. Питання перше';
        const result = parseTextToSections(input, createMockParsers(), createMockUtils());

        assert.ok(result.sections[0].rawText.includes('1. Питання перше'));
    });
});

describe('banner_modal_parser — hasStandardFormat і логи', () => {
    test('11. нумерований блок питань вмикає hasStandardFormat', () => {
        const result = parseTextToSections(
            '❓ ВОПРОСЫ ЗРИТЕЛЕЙ\n1. Питання',
            createMockParsers(),
            createMockUtils()
        );

        assert.equal(result.hasStandardFormat, true);
    });

    test('12. emoji-нумерація не вважається стандартним форматом', () => {
        const result = parseTextToSections(
            '❓ ВОПРОСЫ ЗРИТЕЛЕЙ\n1\uFE0F\u20E3 Питання',
            createMockParsers(),
            createMockUtils()
        );

        assert.equal(result.hasStandardFormat, false);
    });

    test('13. логи містять кількість блоків і підсумок по банерах', () => {
        const result = parseTextToSections(
            '❓ ВОПРОСЫ ЗРИТЕЛЕЙ\n1. Перше\n2. Друге',
            createMockParsers(),
            createMockUtils()
        );

        assert.ok(result.logs[0].startsWith('Виявлено логічних блоків тексту:'));
        assert.equal(result.logs.at(-1), `Всього сформовано банерів: ${result.allBanners.length}`);
    });
});
