// tests/author_bracket_cleanup.test.js
//
// Тести для очищення суфіксів авторів у дужках (як закритих, так і незакритих)
// наприкінці питань: наприклад, " ( Опарин , Молчанов" або " (Опарин, Молчанов)".

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { QUESTION_AUTHOR_SUFFIX_REGEX } from '../modules/parsers/regex.ts';
import { SYH_PARSERS } from '../modules/parsers/index.ts';
import { parseStandardNumberedQuestions, parseSabbathSchoolUnnumberedQuestions } from '../modules/parsers/question_parsers.ts';
import { parseBlock, parseRawTextToBanners } from '../modules/banners/banner_parser.ts';
import { executeBannerCreationLoop } from '../modules/banners/banner_executor.ts';
import { parseTextToSections } from '../modules/banners/banner_modal.ts';
import { SYH_UTILS } from '../modules/utils.ts';

describe('Author bracket cleanup (незакриті та закриті дужки з авторами)', () => {
    describe('1. QUESTION_AUTHOR_SUFFIX_REGEX — безпосередня перевірка регулярного виразу', () => {
        test('видаляє незакриту дужку з кількома авторами: " ( Опарин , Молчанов"', () => {
            const input = 'В чем опасность сопротивления Святому Духу? ( Опарин , Молчанов';
            const cleaned = input.replace(QUESTION_AUTHOR_SUFFIX_REGEX, '').trim();
            assert.strictEqual(cleaned, 'В чем опасность сопротивления Святому Духу?');
        });

        test('видаляє закриту дужку з кількома авторами: " ( Опарин , Молчанов)"', () => {
            const input = 'В чем опасность сопротивления Святому Духу? ( Опарин , Молчанов)';
            const cleaned = input.replace(QUESTION_AUTHOR_SUFFIX_REGEX, '').trim();
            assert.strictEqual(cleaned, 'В чем опасность сопротивления Святому Духу?');
        });

        test('видаляє незакриту дужку з одним автором: " (Опарин"', () => {
            const input = 'Вопрос про покаяние (Опарин';
            const cleaned = input.replace(QUESTION_AUTHOR_SUFFIX_REGEX, '').trim();
            assert.strictEqual(cleaned, 'Вопрос про покаяние');
        });

        test('видаляє незакриту дужку із зайвими пробілами: " (  Молчанов  "', () => {
            const input = 'Вопрос про веру (  Молчанов  ';
            const cleaned = input.replace(QUESTION_AUTHOR_SUFFIX_REGEX, '').trim();
            assert.strictEqual(cleaned, 'Вопрос про веру');
        });

        test('зберігає дужки всередині тексту питання, видаляючи лише кінцеву дужку автора', () => {
            const input = 'Что значит закон (Тора) в Послании к Римлянам? ( Опарин , Молчанов';
            const cleaned = input.replace(QUESTION_AUTHOR_SUFFIX_REGEX, '').trim();
            assert.strictEqual(cleaned, 'Что значит закон (Тора) в Послании к Римлянам?');
        });

        test('не чіпає питання взагалі без дужок', () => {
            const input = 'В чем опасность сопротивления Святому Духу?';
            const cleaned = input.replace(QUESTION_AUTHOR_SUFFIX_REGEX, '').trim();
            assert.strictEqual(cleaned, 'В чем опасность сопротивления Святому Духу?');
        });
    });

    describe('2. parseSabbathSchoolUnnumberedQuestions — формат Суботньої школи', () => {
        test('очищає незакриту дужку в питанні Суботньої школи', () => {
            const input = [
                'Субботняя школа',
                'Памятный стих: Рим. 8:28',
                'В чем опасность сопротивления Святому Духу? ( Опарин , Молчанов'
            ].join('\n');

            const result = parseSabbathSchoolUnnumberedQuestions(input);
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0], 'Памятный стих: Рим. 8:28');
            assert.strictEqual(result[1], 'В чем опасность сопротивления Святому Духу?');
            assert.ok(!result[1].includes('Опарин'));
            assert.ok(!result[1].includes('Молчанов'));
            assert.ok(!result[1].includes('('));
        });

        test('обробляє змішаний список: питання із закритими та незакритими дужками авторів', () => {
            const input = [
                'Памятный стих',
                'Вопрос 1 (Молчанов, Опарин)',
                'В чем опасность сопротивления Святому Духу? ( Опарин , Молчанов',
                'Вопрос 3 (Василенко',
                'Вопрос 4 без дужок'
            ].join('\n');

            const result = parseSabbathSchoolUnnumberedQuestions(input);
            assert.strictEqual(result.length, 5);
            assert.strictEqual(result[0], 'Памятный стих');
            assert.strictEqual(result[1], 'Вопрос 1');
            assert.strictEqual(result[2], 'В чем опасность сопротивления Святому Духу?');
            assert.strictEqual(result[3], 'Вопрос 3');
            assert.strictEqual(result[4], 'Вопрос 4 без дужок');
        });
    });

    describe('3. parseStandardNumberedQuestions — стандартний нумерований формат', () => {
        test('очищає незакриту дужку з авторами у нумерованому питанні: "1. ... ( Опарин , Молчанов"', () => {
            const input = '1. В чем опасность сопротивления Святому Духу? ( Опарин , Молчанов';
            const result = parseStandardNumberedQuestions(input);
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0], 'В чем опасность сопротивления Святому Духу?');
            assert.ok(!result[0].includes('('));
        });

        test('очищає закриту дужку у нумерованому питанні: "1. ... ( Опарин , Молчанов)"', () => {
            const input = '1. В чем опасность сопротивления Святому Духу? ( Опарин , Молчанов)';
            const result = parseStandardNumberedQuestions(input);
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0], 'В чем опасность сопротивления Святому Духу?');
        });
    });

    describe('4. parseBlock та parseRawTextToBanners — модуль banner_parser', () => {
        test('parseBlock формує банери без авторів при незакритій дужці', () => {
            const input = [
                'Субботняя школа',
                'Памятный стих',
                'В чем опасность сопротивления Святому Духу? ( Опарин , Молчанов'
            ].join('\n');

            const items = parseBlock(input, 'stream', SYH_PARSERS);
            assert.strictEqual(items.length, 2);
            assert.strictEqual(items[1].text, 'В чем опасность сопротивления Святому Духу?');
            assert.strictEqual(items[1].category, 'stream');
        });

        test('parseRawTextToBanners коректно очищає текст питання для створення', () => {
            const rawText = [
                'Субботняя школа',
                'Памятный текст',
                'В чем опасность сопротивления Святому Духу? ( Опарин , Молчанов'
            ].join('\n');

            const { bannersToCreate } = parseRawTextToBanners(rawText, SYH_PARSERS, SYH_UTILS);
            assert.strictEqual(bannersToCreate.length, 2);
            assert.strictEqual(bannersToCreate[1].text, 'В чем опасность сопротивления Святому Духу?');
        });
    });

    describe('5. parseTextToSections — прев’ю модального вікна (SyhBannerModal)', () => {
        test('прев’ю модалки показує питання без незакритої дужки та авторів', () => {
            const rawText = [
                'Субботняя школа',
                'Памятный текст',
                'В чем опасность сопротивления Святому Духу? ( Опарин , Молчанов'
            ].join('\n');

            const parseResult = parseTextToSections(rawText, SYH_PARSERS, SYH_UTILS);
            assert.strictEqual(parseResult.sections.length, 1);
            assert.strictEqual(parseResult.allBanners.length, 2);
            assert.strictEqual(parseResult.allBanners[1].text, 'В чем опасность сопротивления Святому Духу?');
        });
    });

    describe('6. executeBannerCreationLoop — створення банера у StreamYard', () => {
        test('передає у createSingleBanner очищений текст, навіть якщо у BannerItem була незакрита дужка', async () => {
            const createdTexts = [];
            const mockCreator = {
                log: () => {},
                createSingleBanner: async (text) => {
                    createdTexts.push(text);
                },
                UTILS: {
                    saveBannerCategory: async () => {}
                },
                finalCleanup: async () => {}
            };

            const banners = [
                {
                    text: 'В чем опасность сопротивления Святому Духу? ( Опарин , Молчанов',
                    category: 'stream',
                    isStandard: false
                }
            ];

            const count = await executeBannerCreationLoop(mockCreator, banners);
            assert.strictEqual(count, 1);
            assert.strictEqual(createdTexts.length, 1);
            assert.strictEqual(createdTexts[0], 'В чем опасность сопротивления Святому Духу?');
            assert.ok(!createdTexts[0].includes('Опарин'));
            assert.ok(!createdTexts[0].includes('Молчанов'));
        });
    });
});
