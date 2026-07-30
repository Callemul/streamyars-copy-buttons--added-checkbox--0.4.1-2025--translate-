import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SYH_COMMENT_ASSISTANT } from '../modules/comment_assistant.ts';

test('SYH_COMMENT_ASSISTANT.hasTrigger detects trigger word "вопрос"', () => {
    assert.equal(SYH_COMMENT_ASSISTANT.hasTrigger('У меня есть вопрос по теме'), true);
    assert.equal(SYH_COMMENT_ASSISTANT.hasTrigger('ВОПРОС: как подключиться?'), true);
    assert.equal(SYH_COMMENT_ASSISTANT.hasTrigger('Срочный Вопрос!'), true);
    assert.equal(SYH_COMMENT_ASSISTANT.hasTrigger('Важный вопрос?'), true);
});

test('SYH_COMMENT_ASSISTANT.hasTrigger rejects unrelated text or partial words', () => {
    assert.equal(SYH_COMMENT_ASSISTANT.hasTrigger('Просто обычный коментарий'), false);
    assert.equal(SYH_COMMENT_ASSISTANT.hasTrigger('Це молитва за здоров‘я'), false);
});

test('SYH_COMMENT_ASSISTANT.highlightTriggers wraps trigger word in mark tag and preserves casing', () => {
    const res1 = SYH_COMMENT_ASSISTANT.highlightTriggers('Важный Вопрос по теме');
    assert.equal(
        res1.highlightedText,
        'Важный <mark class="syh-trigger-highlight" data-syh-trigger="вопрос">Вопрос</mark> по теме'
    );
    assert.deepEqual(res1.matchedWords, ['вопрос']);

    const res2 = SYH_COMMENT_ASSISTANT.highlightTriggers('ВОПРОС: что делать?');
    assert.equal(
        res2.highlightedText,
        '<mark class="syh-trigger-highlight" data-syh-trigger="вопрос">ВОПРОС</mark>: что делать?'
    );
});

test('SYH_COMMENT_ASSISTANT.escapeHTML escapes special HTML characters', () => {
    const res = SYH_COMMENT_ASSISTANT.highlightTriggers('Вопрос: <script>alert(1)</script>');
    assert.equal(
        res.highlightedText,
        '<mark class="syh-trigger-highlight" data-syh-trigger="вопрос">Вопрос</mark>: &lt;script&gt;alert(1)&lt;/script&gt;'
    );
});

test('SYH_COMMENT_ASSISTANT.stripHighlights removes mark tags', () => {
    const text = 'У меня <mark class="syh-trigger-highlight" data-syh-trigger="вопрос">вопрос</mark>';
    assert.equal(SYH_COMMENT_ASSISTANT.stripHighlights(text), 'У меня вопрос');
});
