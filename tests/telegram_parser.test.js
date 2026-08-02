import test from 'node:test';
import assert from 'node:assert/strict';
import {
    countQuestionsInText,
    numberToEmoji,
    parseAndFilterOldList,
    parseTelegramExportLineByLine
} from '../modules/telegram_parser.ts';

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