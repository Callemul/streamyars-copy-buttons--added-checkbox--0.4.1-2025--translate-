import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SYH_COMMENT_ASSISTANT } from '../modules/comment_assistant.ts';

test('SYH_COMMENT_ASSISTANT.hasTrigger detects question and prayer trigger words', () => {
    assert.equal(SYH_COMMENT_ASSISTANT.hasTrigger('У меня есть вопрос по теме'), true);
    assert.equal(SYH_COMMENT_ASSISTANT.hasTrigger('ВОПРОС: как подключиться?'), true);
    assert.equal(SYH_COMMENT_ASSISTANT.hasTrigger('Це молитва за здоров‘я'), true);
    assert.equal(SYH_COMMENT_ASSISTANT.hasTrigger('Маю молитвенная просьба'), true);
});

test('SYH_COMMENT_ASSISTANT.hasTrigger rejects unrelated text', () => {
    assert.equal(SYH_COMMENT_ASSISTANT.hasTrigger('Просто обычный коментарий без слів'), false);
});

test('SYH_COMMENT_ASSISTANT.highlightTriggers wraps trigger words in category-specific mark tags', () => {
    const res1 = SYH_COMMENT_ASSISTANT.highlightTriggers('Важный Вопрос по теме');
    assert.equal(
        res1.highlightedText,
        'Важный <mark class="syh-trigger-highlight syh-trigger-question" data-syh-trigger="вопрос">Вопрос</mark> по теме'
    );
    assert.deepEqual(res1.matchedWords, ['вопрос']);
    assert.deepEqual(res1.matchedCategories, ['question']);

    const res2 = SYH_COMMENT_ASSISTANT.highlightTriggers('Молитвенная просьба о помощи');
    assert.equal(
        res2.highlightedText,
        '<mark class="syh-trigger-highlight syh-trigger-prayer" data-syh-trigger="молитвенная">Молитвенная</mark> <mark class="syh-trigger-highlight syh-trigger-prayer" data-syh-trigger="просьба">просьба</mark> о помощи'
    );
    assert.deepEqual(res2.matchedWords, ['молитвенная', 'просьба']);
    assert.deepEqual(res2.matchedCategories, ['prayer']);
});

test('SYH_COMMENT_ASSISTANT.escapeHTML escapes special HTML characters', () => {
    const res = SYH_COMMENT_ASSISTANT.highlightTriggers('Вопрос: <script>alert(1)</script>');
    assert.equal(
        res.highlightedText,
        '<mark class="syh-trigger-highlight syh-trigger-question" data-syh-trigger="вопрос">Вопрос</mark>: &lt;script&gt;alert(1)&lt;/script&gt;'
    );
});

test('SYH_COMMENT_ASSISTANT.stripHighlights removes mark tags', () => {
    const text = 'У меня <mark class="syh-trigger-highlight syh-trigger-question" data-syh-trigger="вопрос">вопрос</mark>';
    assert.equal(SYH_COMMENT_ASSISTANT.stripHighlights(text), 'У меня вопрос');
});
