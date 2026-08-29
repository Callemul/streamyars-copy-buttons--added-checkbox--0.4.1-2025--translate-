import test from 'node:test';
import assert from 'node:assert/strict';
import {
    SYH_PARSERS,
    cleanAuthorName,
    EMOJI_NUMBER_LINE_REGEX,
    EMOJI_NUMBER_CONTAINS_REGEX,
    TELEGRAM_HEADER_MARKER_REGEX,
    PRAYER_SECTION_SPLIT_REGEX,
    STANDARD_NUMBER_REGEX,
    STANDARD_NUMBER_START_REGEX,
    QUESTION_START_REGEX,
    QUESTION_SPLIT_REGEX,
    SECTION_HEADER_SPLIT_REGEX,
    TG_HEADER_A_REGEX,
    TG_HEADER_B_REGEX,
    TG_HEADER_CLEANUP_REGEX,
    RELATIVE_TIME_LINE_REGEX,
    splitPrayerSection
} from '../modules/parsers/index.ts';

const DEFAULT_MAX_LENGTH = 195;

// --- Tests for parseEmojiNumberedQuestions ---

test('parseEmojiNumberedQuestions - basic single question', () => {
    const input = `1️⃣
@John
What is faith?`;
    const result = SYH_PARSERS.parseEmojiNumberedQuestions(input);
    assert.equal(result.length, 1);
    assert.ok(result[0].includes('1️⃣'));
    assert.ok(result[0].includes('John'));
    assert.ok(result[0].includes('What is faith?'));
});

test('parseEmojiNumberedQuestions - multiple questions with sub-questions (🔹)', () => {
    const input = `1️⃣
@John
🔹Question A
🔹Question B
2️⃣
@Mary
What is hope?`;
    const result = SYH_PARSERS.parseEmojiNumberedQuestions(input);
    assert.equal(result.length, 3);
    assert.ok(result[0].includes('John'));
    assert.ok(result[0].includes('Question A'));
    assert.ok(result[1].includes('Question B'));
    assert.ok(result[2].includes('Mary'));
    assert.ok(result[2].includes('What is hope?'));
});

test('parseEmojiNumberedQuestions - empty input returns empty array', () => {
    const result = SYH_PARSERS.parseEmojiNumberedQuestions('');
    assert.deepEqual(result, []);
});

test('parseEmojiNumberedQuestions - null input returns empty array', () => {
    const result = SYH_PARSERS.parseEmojiNumberedQuestions(null);
    assert.deepEqual(result, []);
});

test('parseEmojiNumberedQuestions - text without emoji numbers returns empty array', () => {
    const input = `Just some text
Without any numbers`;
    const result = SYH_PARSERS.parseEmojiNumberedQuestions(input);
    assert.deepEqual(result, []);
});

test('parseEmojiNumberedQuestions - handles 🔟 (10)', () => {
    const input = `🔟
@User
Tenth question`;
    const result = SYH_PARSERS.parseEmojiNumberedQuestions(input);
    assert.equal(result.length, 1);
    assert.ok(result[0].includes('🔟'));
    assert.ok(result[0].includes('User'));
});

test('parseEmojiNumberedQuestions - handles multi-digit emoji like 1️⃣1️⃣ (11)', () => {
    const input = `1️⃣1️⃣
@User
Eleventh question`;
    const result = SYH_PARSERS.parseEmojiNumberedQuestions(input);
    assert.equal(result.length, 1);
    assert.ok(result[0].includes('1️⃣1️⃣'));
});

test('parseEmojiNumberedQuestions - truncates long text', () => {
    const longText = 'A'.repeat(300);
    const input = `1️⃣
@John
${longText}`;
    const result = SYH_PARSERS.parseEmojiNumberedQuestions(input);
    assert.equal(result.length, 1);
    assert.ok(result[0].length <= DEFAULT_MAX_LENGTH + 50);
    assert.ok(result[0].includes('...'));
});

test('parseEmojiNumberedQuestions - handles author with @ symbol', () => {
    const input = `1️⃣
@JohnDoe
Question text`;
    const result = SYH_PARSERS.parseEmojiNumberedQuestions(input);
    assert.ok(result[0].includes('JohnDoe'));
});

test('parseEmojiNumberedQuestions - handles missing author', () => {
    const input = `1️⃣
Question without author`;
    const result = SYH_PARSERS.parseEmojiNumberedQuestions(input);
    assert.equal(result.length, 1);
    assert.ok(result[0].includes(':'));
});

test('parseEmojiNumberedQuestions - handles empty lines', () => {
    const input = `1️⃣

@John

What is faith?

2️⃣
@Mary
What is hope?`;
    const result = SYH_PARSERS.parseEmojiNumberedQuestions(input);
    assert.equal(result.length, 2);
});

test('parseEmojiNumberedQuestions - handles sub-questions with only 🔹', () => {
    const input = `1️⃣
@John
🔹Sub question only`;
    const result = SYH_PARSERS.parseEmojiNumberedQuestions(input);
    assert.equal(result.length, 1);
    assert.ok(result[0].includes('Sub question only'));
});

// --- Tests for parseStandardNumberedQuestions ---

test('parseStandardNumberedQuestions - basic numbered list', () => {
    const input = `1. First question (John)
2. Second question (Mary)`;
    const result = SYH_PARSERS.parseStandardNumberedQuestions(input);
    assert.equal(result.length, 2);
    assert.equal(result[0], 'First question');
    assert.equal(result[1], 'Second question');
});

test('parseStandardNumberedQuestions - handles parentheses with author', () => {
    const input = `1. What is faith? (John Doe)
2. What is hope? (Mary Jane)`;
    const result = SYH_PARSERS.parseStandardNumberedQuestions(input);
    assert.equal(result.length, 2);
    assert.equal(result[0], 'What is faith?');
    assert.equal(result[1], 'What is hope?');
});

test('parseStandardNumberedQuestions - empty input returns empty array', () => {
    const result = SYH_PARSERS.parseStandardNumberedQuestions('');
    assert.deepEqual(result, []);
});

test('parseStandardNumberedQuestions - handles various number formats', () => {
    const input = `1. First question
2. Second question
3. Third question`;
    const result = SYH_PARSERS.parseStandardNumberedQuestions(input);
    assert.equal(result.length, 3);
});

test('parseStandardNumberedQuestions - truncates long text', () => {
    const longText = 'A'.repeat(300);
    const input = `1. ${longText} (John)`;
    const result = SYH_PARSERS.parseStandardNumberedQuestions(input);
    assert.equal(result.length, 1);
    assert.ok(result[0].length <= DEFAULT_MAX_LENGTH + 10);
    assert.ok(result[0].includes('...'));
});

test('parseStandardNumberedQuestions - filters out non-question lines', () => {
    const input = `Some header text
1. First question
Some other text
2. Second question
Footer text`;
    const result = SYH_PARSERS.parseStandardNumberedQuestions(input);
    assert.equal(result.length, 2);
});

// --- Tests for parseSabbathSchoolUnnumberedQuestions ---

test('parseSabbathSchoolUnnumberedQuestions - basic Sabbath School format', () => {
    const input = `Урок 5 Субботняя школа
Памятный стих
Вопрос про веру
Вопрос про надежду`;
    const result = SYH_PARSERS.parseSabbathSchoolUnnumberedQuestions(input);
    assert.equal(result.length, 3);
    assert.ok(result[0].includes('Памятный стих'));
    assert.ok(result[1].includes('Вопрос про веру'));
    assert.ok(result[2].includes('Вопрос про надежду'));
});

test('parseSabbathSchoolUnnumberedQuestions - returns empty when no keyword found', () => {
    const input = `Just some random text
Without keywords`;
    const result = SYH_PARSERS.parseSabbathSchoolUnnumberedQuestions(input);
    assert.deepEqual(result, []);
});

// NOTE: The parser starts collecting at the first line matching SABBATH_SCHOOL_KEYWORDS_REGEX
// (/памятн|пам'ятн|молчанов|опарин|опарін|молчанів/i), so "Памятный стих" is the trigger line -
// "Субботняя школа" alone is NOT a keyword and yields an empty result.

test('parseSabbathSchoolUnnumberedQuestions - throws when too many questions', () => {
    const lines = Array(12).fill('Вопрос').join('\n');
    const input = `Памятный стих\n${lines}`;
    assert.throws(() => SYH_PARSERS.parseSabbathSchoolUnnumberedQuestions(input), /ліміт/);
});

test('parseSabbathSchoolUnnumberedQuestions - truncates long questions', () => {
    const longText = 'A'.repeat(300);
    const input = `Памятный стих\nВопрос 1\n${longText}`;
    const result = SYH_PARSERS.parseSabbathSchoolUnnumberedQuestions(input);
    assert.equal(result.length, 3);
    assert.equal(result[0], 'Памятный стих');
    assert.equal(result[1], 'Вопрос 1');
    // Long line is truncated to TEXT_TRUNCATION_LENGTH (195) including the "..." suffix
    assert.ok(result[2].endsWith('...'));
    assert.equal(result[2].length, 195);
});

test('parseSabbathSchoolUnnumberedQuestions - cleans parentheses from end', () => {
    const input = `Памятный стих
Вопрос про веру (John)`;
    const result = SYH_PARSERS.parseSabbathSchoolUnnumberedQuestions(input);
    assert.equal(result.length, 2);
    assert.equal(result[1], 'Вопрос про веру');
    assert.ok(!result[1].includes('(John)'));
});

test('parseSabbathSchoolUnnumberedQuestions - cleans unclosed parentheses and authors from end', () => {
    const input = `Памятный стих
В чем опасность сопротивления Святому Духу? ( Опарин , Молчанов`;
    const result = SYH_PARSERS.parseSabbathSchoolUnnumberedQuestions(input);
    assert.equal(result.length, 2);
    assert.equal(result[1], 'В чем опасность сопротивления Святому Духу?');
    assert.ok(!result[1].includes('Опарин'));
    assert.ok(!result[1].includes('Молчанов'));
});


// --- Tests for cleanAuthorName ---

test('cleanAuthorName - removes @ prefix', () => {
    const log = [];
    const result = cleanAuthorName('@JohnDoe', log);
    assert.equal(result, 'John Doe');
    assert.ok(log.length > 0);
});

test('cleanAuthorName - removes bullet character', () => {
    const log = [];
    const result = cleanAuthorName('Mary•Admin', log);
    assert.equal(result, 'Mary');
    assert.ok(log.length > 0);
});

test('cleanAuthorName - removes suffix after dash', () => {
    const log = [];
    const result = cleanAuthorName('Alex-UA', log);
    assert.equal(result, 'Alex');
    assert.ok(log.length > 0);
});

test('cleanAuthorName - handles complex case with camelCase', () => {
    const log = [];
    const result = cleanAuthorName('johnDoe', log);
    assert.equal(result, 'john Doe');
});

test('cleanAuthorName - handles empty string', () => {
    const log = [];
    const result = cleanAuthorName('', log);
    assert.equal(result, '');
});

test('cleanAuthorName - handles string with only whitespace', () => {
    const log = [];
    const result = cleanAuthorName('   ', log);
    assert.equal(result, '');
});

test('cleanAuthorName - no cleaning log provided', () => {
    const result = cleanAuthorName('@JohnDoe');
    assert.equal(result, 'John Doe');
});

test('cleanAuthorName - multiple @ symbols', () => {
    const log = [];
    const result = cleanAuthorName('@@JohnDoe', log);
    assert.equal(result, '@John Doe');
});

test('cleanAuthorName - handles suffix with numbers', () => {
    const log = [];
    const result = cleanAuthorName('User-123', log);
    assert.equal(result, 'User');
});

// --- Tests for Regex Constants ---

test('EMOJI_NUMBER_LINE_REGEX - matches single emoji number', () => {
    assert.equal(EMOJI_NUMBER_LINE_REGEX.test('1️⃣'), true);
    assert.equal(EMOJI_NUMBER_LINE_REGEX.test('🔟'), true);
});

test('EMOJI_NUMBER_LINE_REGEX - matches multiple emoji numbers', () => {
    assert.equal(EMOJI_NUMBER_LINE_REGEX.test('1️⃣2️⃣'), true);
    assert.equal(EMOJI_NUMBER_LINE_REGEX.test('1️⃣1️⃣'), true);
});

test('EMOJI_NUMBER_LINE_REGEX - does not match regular text', () => {
    assert.equal(EMOJI_NUMBER_LINE_REGEX.test('Simple text'), false);
    assert.equal(EMOJI_NUMBER_LINE_REGEX.test('1. text'), false);
});

test('EMOJI_NUMBER_CONTAINS_REGEX - detects emoji in text', () => {
    assert.equal(EMOJI_NUMBER_CONTAINS_REGEX.test('Question 1️⃣ in list'), true);
    assert.equal(EMOJI_NUMBER_CONTAINS_REGEX.test('No keycaps here'), false);
});

test('TELEGRAM_HEADER_MARKER_REGEX - matches section markers', () => {
    assert.equal(TELEGRAM_HEADER_MARKER_REGEX.test('❓❓❓ВОПРОСЫ'), true);
    assert.equal(TELEGRAM_HEADER_MARKER_REGEX.test('🙏🙏🙏МОЛИТВЫ'), true);
    assert.equal(TELEGRAM_HEADER_MARKER_REGEX.test('1️⃣'), true);
});

test('PRAYER_SECTION_SPLIT_REGEX - splits prayer sections', () => {
    const text = `Questions text
🙏 МОЛИТВА
Prayer text`;
    const parts = text.split(PRAYER_SECTION_SPLIT_REGEX);
    assert.equal(parts.length, 2);
});

test('STANDARD_NUMBER_REGEX - matches standard numbers', () => {
    assert.equal(STANDARD_NUMBER_REGEX.test('1.'), true);
    assert.equal(STANDARD_NUMBER_REGEX.test('text'), false);
});

test('QUESTION_START_REGEX - matches question starts', () => {
    assert.equal(QUESTION_START_REGEX.test('1. Question'), true);
    assert.equal(QUESTION_START_REGEX.test('1️⃣ Question'), true);
    assert.equal(QUESTION_START_REGEX.test('🔹 Sub question'), true);
    assert.equal(QUESTION_START_REGEX.test('Regular text'), false);
});

test('SECTION_HEADER_SPLIT_REGEX - matches section headers', () => {
    assert.equal(SECTION_HEADER_SPLIT_REGEX.test('❓ Вопросы'), true);
    assert.equal(SECTION_HEADER_SPLIT_REGEX.test('🙏 Молитвы'), true);
    assert.equal(SECTION_HEADER_SPLIT_REGEX.test('Вопросы к'), true);
    assert.equal(SECTION_HEADER_SPLIT_REGEX.test('Саша, привет'), true);
});

test('TG_HEADER_A_REGEX - matches Telegram header format A', () => {
    assert.equal(TG_HEADER_A_REGEX.test('John, [10.07.2026 20:44]'), true);
    assert.equal(TG_HEADER_A_REGEX.test('Regular text'), false);
});

test('TG_HEADER_B_REGEX - matches Telegram header format B', () => {
    assert.equal(TG_HEADER_B_REGEX.test('[10.07.2026 20:44] @John: Text'), true);
    assert.equal(TG_HEADER_B_REGEX.test('Regular text'), false);
});

test('TG_HEADER_CLEANUP_REGEX - cleans Telegram headers', () => {
    const text = `[10.07.2026 20:44] @John: Text
[10.07.2026 20:45] @Mary: More text`;
    const cleaned = text.replace(TG_HEADER_CLEANUP_REGEX, '');
    assert.ok(!cleaned.includes('['));
});

test('RELATIVE_TIME_LINE_REGEX - matches relative time', () => {
    assert.equal(RELATIVE_TIME_LINE_REGEX.test('щойно'), true);
    assert.equal(RELATIVE_TIME_LINE_REGEX.test('5 хвилин тому'), true);
    assert.equal(RELATIVE_TIME_LINE_REGEX.test('2 hours ago'), true);
    assert.equal(RELATIVE_TIME_LINE_REGEX.test('Regular text'), false);
});

// --- Tests for splitPrayerSection ---

test('splitPrayerSection - splits questions and prayers', () => {
    const text = `Questions here
🙏 МОЛИТВА
Prayers here`;
    const result = splitPrayerSection(text);
    assert.equal(result.questionsText.trim(), 'Questions here');
    assert.equal(result.prayersText.trim(), 'Prayers here');
});

test('splitPrayerSection - handles no prayer section', () => {
    const text = `Only questions here`;
    const result = splitPrayerSection(text);
    assert.equal(result.questionsText, 'Only questions here');
    assert.equal(result.prayersText, '');
});

test('splitPrayerSection - handles empty input', () => {
    const result = splitPrayerSection('');
    assert.equal(result.questionsText, '');
    assert.equal(result.prayersText, '');
});

// --- Tests for SYH_PARSERS object ---

test('SYH_PARSERS - parseEmojiNumberedQuestions works', () => {
    const input = `1️⃣
@John
Question`;
    const result = SYH_PARSERS.parseEmojiNumberedQuestions(input);
    assert.equal(result.length, 1);
});

test('SYH_PARSERS - parseStandardNumberedQuestions works', () => {
    const input = `1. Question (John)`;
    const result = SYH_PARSERS.parseStandardNumberedQuestions(input);
    assert.equal(result.length, 1);
});

test('SYH_PARSERS - parseSabbathSchoolUnnumberedQuestions works', () => {
    const input = `Памятный стих\nQuestion`;
    const result = SYH_PARSERS.parseSabbathSchoolUnnumberedQuestions(input);
    assert.equal(result.length, 2);
    assert.equal(result[1], 'Question');
});

test('SYH_PARSERS - cleanAuthorName works', () => {
    const result = SYH_PARSERS.cleanAuthorName('@JohnDoe');
    assert.equal(result, 'John Doe');
});

// --- Edge cases and integration tests ---

test('parseEmojiNumberedQuestions - handles mixed content with headers', () => {
    const input = `❓❓❓ВОПРОСЫ
1️⃣
@John
Question 1
2️⃣
@Mary
Question 2`;
    const result = SYH_PARSERS.parseEmojiNumberedQuestions(input);
    assert.equal(result.length, 2);
});

test('parseEmojiNumberedQuestions - preserves line breaks in multi-line questions', () => {
    const input = `1️⃣
@John
Line 1
Line 2
Line 3`;
    const result = SYH_PARSERS.parseEmojiNumberedQuestions(input);
    assert.equal(result.length, 1);
    assert.ok(result[0].includes('Line 1'));
    assert.ok(result[0].includes('Line 2'));
});

test('parseStandardNumberedQuestions - handles numbers at start of string', () => {
    const input = `1. First question
2. Second question`;
    const result = SYH_PARSERS.parseStandardNumberedQuestions(input);
    assert.equal(result.length, 2);
});

test('cleanAuthorName - preserves spaces in names', () => {
    const log = [];
    const result = cleanAuthorName('@John Doe', log);
    assert.equal(result, 'John Doe');
});

test('parseEmojiNumberedQuestions - handles special characters in questions', () => {
    const input = `1️⃣
@John
What about "quotes" and 'apostrophes'?`;
    const result = SYH_PARSERS.parseEmojiNumberedQuestions(input);
    assert.equal(result.length, 1);
    assert.ok(result[0].includes('quotes'));
    assert.ok(result[0].includes("apostrophes"));
});