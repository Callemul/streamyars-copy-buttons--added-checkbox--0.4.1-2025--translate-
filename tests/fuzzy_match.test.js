import assert from 'node:assert';
import { test, describe } from 'node:test';

const { levenshtein, normalize, fuzzyIncludes } = await import('../modules/fuzzy_match.ts');

describe('fuzzy_match tests', () => {
    test('1. levenshtein distance calculation', () => {
        assert.strictEqual(levenshtein('cat', 'cat'), 0);
        assert.strictEqual(levenshtein('cat', 'bat'), 1);
        assert.strictEqual(levenshtein('суботня', 'субботняя'), 2);
        assert.strictEqual(levenshtein('опарін', 'опарин'), 1);
    });

    test('2. normalize text', () => {
        assert.strictEqual(normalize('  СУБОТНЯЯ   ШКОЛА  '), 'суботняя школа');
        assert.strictEqual(normalize('Опарін'), 'опарін');
    });

    test('3. fuzzyIncludes exact match', () => {
        assert.strictEqual(fuzzyIncludes('субботняя школа 5 урок', 'субботняя школа'), true);
        assert.strictEqual(fuzzyIncludes('проповедь опарин', 'опарин'), true);
    });

    test('4. fuzzyIncludes typos & casing ("суботня школа", "СУБОТНЯЯ ШКОЛА", "опарін")', () => {
        assert.strictEqual(fuzzyIncludes('Тема: суботня школа №5', 'субботняя школа'), true);
        assert.strictEqual(fuzzyIncludes('Відео: СУБОТНЯЯ ШКОЛА 2026', 'субботняя школа'), true);
        assert.strictEqual(fuzzyIncludes('Проповідь Опарін О.О.', 'опарин'), true);
        assert.strictEqual(fuzzyIncludes('АРТЕМ МОЛЧАНОВ проповідь', 'молчанов'), true);
    });

    test('5. fuzzyIncludes non-match returns false', () => {
        assert.strictEqual(fuzzyIncludes('Звичайні новини дня', 'субботняя школа'), false);
        assert.strictEqual(fuzzyIncludes('Тест системи', 'опарин'), false);
    });

    test('6. edge cases', () => {
        assert.strictEqual(fuzzyIncludes('', 'тест'), false);
        assert.strictEqual(fuzzyIncludes('тест', ''), false);
        assert.strictEqual(fuzzyIncludes(null, 'тест'), false);
    });
});
