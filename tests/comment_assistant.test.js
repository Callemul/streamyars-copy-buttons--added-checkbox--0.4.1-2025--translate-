import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CommentAssistantService, SYH_COMMENT_ASSISTANT } from '../modules/comments/assistant/index.ts';
import { TriggerHighlighter } from '../modules/comments/assistant/highlighter.ts';

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

test('highlightTriggers never matches trigger-like words inside generated markup', () => {
    for (const markupWord of ['mark', 'class', 'highlight', 'prayer', 'question']) {
        const assistant = new CommentAssistantService({
            TRIGGER_WORDS: ['молитва', markupWord],
            TRIGGER_WORDS_QUESTION: [],
            TRIGGER_WORDS_PRAYER: ['молитва']
        });
        const result = assistant.highlightTriggers('прошу молитва');

        assert.equal(
            result.highlightedText,
            'прошу <mark class="syh-trigger-highlight syh-trigger-prayer" data-syh-trigger="молитва">молитва</mark>',
            `trigger "${markupWord}" must not match generated markup`
        );
        assert.deepEqual(result.matchedWords, ['молитва']);
        assert.deepEqual(result.matchedCategories, ['prayer']);
    }
});

test('highlightTriggers prefers the longest match when triggers start at the same position', () => {
    const assistant = new CommentAssistantService({
        TRIGGER_WORDS: ['молитва', 'молитва за'],
        TRIGGER_WORDS_QUESTION: [],
        TRIGGER_WORDS_PRAYER: ['молитва', 'молитва за']
    });
    const result = assistant.highlightTriggers('молитва за здоров’я');

    assert.equal(
        result.highlightedText,
        '<mark class="syh-trigger-highlight syh-trigger-prayer" data-syh-trigger="молитва за">молитва за</mark> здоров’я'
    );
    assert.deepEqual(result.matchedWords, ['молитва за']);
    assert.deepEqual(result.matchedCategories, ['prayer']);
});

test('highlightTriggers highlights repeated matches but reports unique metadata', () => {
    const assistant = new CommentAssistantService({
        TRIGGER_WORDS: ['вопрос'],
        TRIGGER_WORDS_QUESTION: ['вопрос'],
        TRIGGER_WORDS_PRAYER: []
    });
    const result = assistant.highlightTriggers('Вопрос и еще вопрос');

    assert.equal(
        result.highlightedText,
        '<mark class="syh-trigger-highlight syh-trigger-question" data-syh-trigger="вопрос">Вопрос</mark> и еще <mark class="syh-trigger-highlight syh-trigger-question" data-syh-trigger="вопрос">вопрос</mark>'
    );
    assert.deepEqual(result.matchedWords, ['вопрос']);
    assert.deepEqual(result.matchedCategories, ['question']);
});

test('highlightTriggers escapes raw HTML, matched text, and trigger data attributes', () => {
    const maliciousTrigger = 'evil" onclick="alert(1)';
    const assistant = new CommentAssistantService({
        TRIGGER_WORDS: [maliciousTrigger],
        TRIGGER_WORDS_QUESTION: [],
        TRIGGER_WORDS_PRAYER: []
    });
    const result = assistant.highlightTriggers(`${maliciousTrigger} <img src=x onerror=alert(2)>`);

    assert.equal(
        result.highlightedText,
        '<mark class="syh-trigger-highlight" data-syh-trigger="evil&quot; onclick=&quot;alert(1)">evil&quot; onclick=&quot;alert(1)</mark> &lt;img src=x onerror=alert(2)&gt;'
    );
    assert.deepEqual(result.matchedWords, [maliciousTrigger]);
    assert.deepEqual(result.matchedCategories, ['other']);
});

test('highlightTriggers handles fallback regex boundary groups without highlighting delimiters', () => {
    const fallbackManager = {
        triggerWords: ['молитва'],
        triggerWordsQuestion: [],
        triggerWordsPrayer: ['молитва'],
        createTriggerRegExp: () => /(^|[^a-zA-Z0-9а-яА-ЯёЁіІїЇєЄґҐ])(молитва)($|[^a-zA-Z0-9а-яА-ЯёЁіІїЇєЄґҐ])/gi,
        resolveTriggerCategory: () => ({ categoryClass: 'syh-trigger-prayer', categoryName: 'prayer' })
    };
    const result = new TriggerHighlighter(fallbackManager).highlightTriggers('прошу молитва, молитва!');

    assert.equal(
        result.highlightedText,
        'прошу <mark class="syh-trigger-highlight syh-trigger-prayer" data-syh-trigger="молитва">молитва</mark>, <mark class="syh-trigger-highlight syh-trigger-prayer" data-syh-trigger="молитва">молитва</mark>!'
    );
    assert.deepEqual(result.matchedWords, ['молитва']);
    assert.deepEqual(result.matchedCategories, ['prayer']);
});

test('SYH_COMMENT_ASSISTANT.stripHighlights removes mark tags', () => {
    const text = 'У меня <mark class="syh-trigger-highlight syh-trigger-question" data-syh-trigger="вопрос">вопрос</mark>';
    assert.equal(SYH_COMMENT_ASSISTANT.stripHighlights(text), 'У меня вопрос');
});
