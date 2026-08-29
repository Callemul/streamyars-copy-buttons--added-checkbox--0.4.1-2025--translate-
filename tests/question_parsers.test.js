import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const { parseEmojiNumberedQuestions, parseStandardNumberedQuestions, parseSabbathSchoolUnnumberedQuestions } = await import('../modules/parsers/question_parsers.ts');

describe('question_parsers tests', () => {

    describe('parseEmojiNumberedQuestions', () => {
        test('returns empty array for null/undefined/empty input', () => {
            assert.deepStrictEqual(parseEmojiNumberedQuestions(null), []);
            assert.deepStrictEqual(parseEmojiNumberedQuestions(undefined), []);
            assert.deepStrictEqual(parseEmojiNumberedQuestions(''), []);
            assert.deepStrictEqual(parseEmojiNumberedQuestions('   '), []);
        });

        test('parses single emoji-numbered question with author', () => {
            const input = `1️⃣
Author Name
This is a question text`;
            const result = parseEmojiNumberedQuestions(input);
            assert.strictEqual(result.length, 1);
            assert.ok(result[0].includes('1️⃣'));
            assert.ok(result[0].includes('Author Name'));
            assert.ok(result[0].includes('This is a question text'));
        });

        test('parses multiple emoji-numbered questions', () => {
            const input = `1️⃣
Author One
Question one text

2️⃣
Author Two
Question two text`;
            const result = parseEmojiNumberedQuestions(input);
            assert.strictEqual(result.length, 2);
            assert.ok(result[0].includes('1️⃣'));
            assert.ok(result[1].includes('2️⃣'));
        });

        test('parses sub-questions with 🔹 marker', () => {
            const input = `1️⃣
Author Name
Main question
🔹 Sub question 1
🔹 Sub question 2`;
            const result = parseEmojiNumberedQuestions(input);
            assert.strictEqual(result.length, 3);
            assert.ok(result[0].includes('Main question'));
            assert.ok(result[1].includes('🔹 Sub question 1'));
            assert.ok(result[2].includes('🔹 Sub question 2'));
        });

        test('truncates long text with ellipsis', () => {
            const longText = 'A'.repeat(300);
            const input = `1️⃣
Author
${longText}`;
            const result = parseEmojiNumberedQuestions(input);
            assert.strictEqual(result.length, 1);
            assert.ok(result[0].endsWith('...'));
            assert.ok(result[0].length <= 195 + 3); // 195 default + '...'
        });

        test('handles question without author', () => {
            const input = `1️⃣
Question without author`;
            const result = parseEmojiNumberedQuestions(input);
            assert.strictEqual(result.length, 1);
            assert.ok(result[0].includes('Question without author'));
        });

        test('handles 🔟 (keycap ten) emoji number', () => {
            const input = `🔟
Author
Question ten`;
            const result = parseEmojiNumberedQuestions(input);
            assert.strictEqual(result.length, 1);
            assert.ok(result[0].includes('🔟'));
        });

        test('ignores empty lines between questions', () => {
            const input = `1️⃣
Author
Question 1

2️⃣
Author
Question 2`;
            const result = parseEmojiNumberedQuestions(input);
            assert.strictEqual(result.length, 2);
        });

        test('handles multiple emoji digits in number (e.g., 10️⃣11️⃣)', () => {
            const input = `10️⃣11️⃣
Author
Question`;
            const result = parseEmojiNumberedQuestions(input);
            assert.strictEqual(result.length, 1);
            assert.ok(result[0].includes('10️⃣11️⃣'));
        });
    });

    describe('parseStandardNumberedQuestions', () => {
        test('returns empty array for null/undefined/empty input', () => {
            assert.deepStrictEqual(parseStandardNumberedQuestions(null), []);
            assert.deepStrictEqual(parseStandardNumberedQuestions(undefined), []);
            assert.deepStrictEqual(parseStandardNumberedQuestions(''), []);
        });

        test('parses standard numbered questions (1. Text)', () => {
            const input = `1. First question
2. Second question
3. Third question`;
            const result = parseStandardNumberedQuestions(input);
            assert.strictEqual(result.length, 3);
            assert.strictEqual(result[0], 'First question');
            assert.strictEqual(result[1], 'Second question');
            assert.strictEqual(result[2], 'Third question');
        });

        test('removes author in parentheses at end', () => {
            const input = `1. Question text (Author Name)`;
            const result = parseStandardNumberedQuestions(input);
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0], 'Question text');
        });

        test('handles dot format only (1. not 1))', () => {
            const input = `1) First
2. Second`;
            const result = parseStandardNumberedQuestions(input);
            // Only matches "2." format, not "1)" format
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0], 'Second');
        });

        test('truncates long questions', () => {
            const longText = 'A'.repeat(250);
            const input = `1. ${longText}`;
            const result = parseStandardNumberedQuestions(input);
            assert.strictEqual(result.length, 1);
            assert.ok(result[0].endsWith('...'));
            assert.ok(result[0].length <= 195 + 3);
        });

        test('filters out non-numbered lines', () => {
            const input = `Some header
1. Real question
Another line
2. Another question`;
            const result = parseStandardNumberedQuestions(input);
            assert.strictEqual(result.length, 2);
        });

        test('handles empty lines gracefully', () => {
            const input = `1. Question 1\n\n2. Question 2`;
            const result = parseStandardNumberedQuestions(input);
            assert.strictEqual(result.length, 2);
        });

        test('removes unclosed author suffix in parentheses from end', () => {
            const input = `1. В чем опасность сопротивления Святому Духу? ( Опарин , Молчанов`;
            const result = parseStandardNumberedQuestions(input);
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0], 'В чем опасность сопротивления Святому Духу?');
        });
    });

    describe('parseSabbathSchoolUnnumberedQuestions', () => {
        test('returns empty array for empty input', () => {
            assert.deepStrictEqual(parseSabbathSchoolUnnumberedQuestions(''), []);
            assert.deepStrictEqual(parseSabbathSchoolUnnumberedQuestions(null), []);
            assert.deepStrictEqual(parseSabbathSchoolUnnumberedQuestions(undefined), []);
        });

        test('returns empty array when no Sabbath School keyword found', () => {
            const input = `Header Line\nSome random question 1\nSome random question 2`;
            assert.deepStrictEqual(parseSabbathSchoolUnnumberedQuestions(input), []);
        });

        test('parses unnumbered questions starting from keyword line', () => {
            const input = `Lesson 5
Памятный текст
Question 1
Question 2
Question 3`;
            const result = parseSabbathSchoolUnnumberedQuestions(input);
            // Includes the keyword line itself + 3 questions = 4 lines
            assert.strictEqual(result.length, 4);
            assert.ok(result[0].includes('Памятный'));
            assert.strictEqual(result[1], 'Question 1');
            assert.strictEqual(result[2], 'Question 2');
            assert.strictEqual(result[3], 'Question 3');
        });

        test('removes author suffix in parentheses', () => {
            const input = `Памятный текст
Question (Author Name)`;
            const result = parseSabbathSchoolUnnumberedQuestions(input);
            // Includes keyword line + question = 2 lines
            assert.strictEqual(result.length, 2);
            assert.ok(result[0].includes('Памятный'));
            assert.strictEqual(result[1], 'Question');
        });

        test('removes unclosed author suffix in parentheses from end', () => {
            const input = `Памятный текст
В чем опасность сопротивления Святому Духу? ( Опарин , Молчанов`;
            const result = parseSabbathSchoolUnnumberedQuestions(input);
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[1], 'В чем опасность сопротивления Святому Духу?');
        });

        test('truncates long questions', () => {
            const longText = 'A'.repeat(250);
            const input = `Памятный текст
${longText}`;
            const result = parseSabbathSchoolUnnumberedQuestions(input);
            // Includes keyword line + truncated question = 2 lines
            assert.strictEqual(result.length, 2);
            assert.ok(result[1].endsWith('...'));
        });

        test('throws error when more than 10 questions (including keyword line)', () => {
            // 10 questions + 1 keyword line = 11 lines > 10 limit
            const input = `Памятный текст
${Array.from({ length: 10 }, (_, i) => `Question ${i + 1}`).join('\n')}`;
            assert.throws(
                () => parseSabbathSchoolUnnumberedQuestions(input),
                /Кількість питань перевищує ліміт/
            );
        });

        test('handles various Sabbath School keywords', () => {
            const keywords = ['памятн', 'пам\'ятн', 'молчанов', 'опарин', 'опарін', 'молчанів'];
            for (const kw of keywords) {
                const input = `${kw} текст
Question 1`;
                const result = parseSabbathSchoolUnnumberedQuestions(input);
                // Includes keyword line + question = 2 lines
                assert.strictEqual(result.length, 2, `Failed for keyword: ${kw}`);
            }
        });
    });
});