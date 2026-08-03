import test from 'node:test';
import assert from 'node:assert/strict';
import {
    countQuestionsInText,
    numberToEmoji,
    parseAndFilterOldList,
    parseTelegramExportLineByLine,
    cleanAuthorName,
    EMOJI_NUMBER_LINE_REGEX,
    EMOJI_NUMBER_CONTAINS_REGEX,
    TELEGRAM_HEADER_MARKER_REGEX
} from '../modules/telegram_parser.ts';
import { SYH_PARSERS } from '../modules/parsers.ts';

test('countQuestionsInText counts bullet points correctly', () => {
    assert.equal(countQuestionsInText('Simple question'), 1);
    assert.equal(countQuestionsInText('🔹Question 1\n🔹Question 2'), 2);
    assert.equal(countQuestionsInText('🔹Q1\n🔹Q2\n🔹Q3'), 3);
});

test('numberToEmoji converts numbers to keycap emojis', () => {
    assert.equal(numberToEmoji(1), '1️⃣');
    assert.equal(numberToEmoji(10), '🔟');
    assert.equal(numberToEmoji(12), '1️⃣2️⃣');
});

test('parseAndFilterOldList correctly filters answered question IDs', () => {
    const text = `1️⃣\n@John\nWhat is faith?\n\n2️⃣\n@Mary\nWhat is hope?`;
    const result = parseAndFilterOldList(text, [1]);
    assert.equal(result.questions.length, 1);
    assert.equal(result.questions[0].author, '@Mary');
    assert.equal(result.deleted.length, 1);
    assert.equal(result.deleted[0].originalId, 1);
});

test('parseTelegramExportLineByLine handles line by line exports', () => {
    const text = `[10.07.2026 20:44] @John\nWhat is grace?\n[10.07.2026 20:45] @John\nWhat is love?`;
    const result = parseTelegramExportLineByLine(text);
    assert.equal(result.length, 1);
    assert.equal(result[0].author, 'John');
    assert.ok(result[0].text.includes('🔹What is grace?'));
    assert.ok(result[0].text.includes('🔹What is love?'));
});

test('cleanAuthorName removes @ symbol, bullets, and suffixes', () => {
    const log = [];
    assert.equal(cleanAuthorName('@JohnDoe', log), 'John Doe');
    assert.equal(cleanAuthorName('@Mary•Admin', log), 'Mary');
    assert.equal(cleanAuthorName('Alex-UA', log), 'Alex');
    assert.ok(log.length > 0);
});

test('Shared Emoji Regex Constants match keycap patterns correctly', () => {
    assert.equal(EMOJI_NUMBER_LINE_REGEX.test('1️⃣'), true);
    assert.equal(EMOJI_NUMBER_LINE_REGEX.test('1️⃣2️⃣'), true);
    assert.equal(EMOJI_NUMBER_LINE_REGEX.test('🔟'), true);
    assert.equal(EMOJI_NUMBER_LINE_REGEX.test('Simple text'), false);

    assert.equal(EMOJI_NUMBER_CONTAINS_REGEX.test('Question 1️⃣ in list'), true);
    assert.equal(EMOJI_NUMBER_CONTAINS_REGEX.test('No keycaps here'), false);

    assert.equal(TELEGRAM_HEADER_MARKER_REGEX.test('❓❓❓ВОПРОСЫ'), true);
    assert.equal(TELEGRAM_HEADER_MARKER_REGEX.test('🙏🙏🙏МОЛИТВЫ'), true);
    assert.equal(TELEGRAM_HEADER_MARKER_REGEX.test('1️⃣'), true);
});

test('SYH_PARSERS formats emoji, standard, and Sabbath school question lists', () => {
    const emojiText = `1️⃣\n@John\n🔹Question A\n🔹Question B`;
    const emojiBanners = SYH_PARSERS.parseEmojiNumberedQuestions(emojiText);
    assert.equal(emojiBanners.length, 2);
    assert.ok(emojiBanners[0].includes('John'));

    const stdText = `1. First question (John)\n2. Second question (Mary)`;
    const stdBanners = SYH_PARSERS.parseStandardNumberedQuestions(stdText);
    assert.equal(stdBanners.length, 2);
    assert.equal(stdBanners[0], 'First question');

    const ssText = `Урок 5 Субботняя школа\nПамятный стих\nВопрос про веру`;
    const ssBanners = SYH_PARSERS.parseSabbathSchoolUnnumberedQuestions(ssText);
    assert.equal(ssBanners.length, 2);
});