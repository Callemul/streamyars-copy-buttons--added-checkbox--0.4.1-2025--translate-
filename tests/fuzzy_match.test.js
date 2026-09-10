import assert from 'node:assert';
import { test, describe } from 'node:test';

const { levenshtein, normalize, fuzzyIncludes } = await import('../modules/core/fuzzy_match.ts');
const { maxAllowedDistance, buildWindowSizes, hasApproximateWindow } = await import('../modules/core/fuzzy_window.ts');

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

/**
 * Характеризаційні тести, додані перед рефакторингом CRAP-хотспота
 * `fuzzyIncludes` (cyclomatic 13, cognitive 20). Фіксують семантику
 * ковзного вікна та порогу помилок 1-в-1.
 */
describe('fuzzy_match — характеризація fuzzyIncludes (до рефакторингу)', () => {

    test('7. рядки лише з пробілів після нормалізації дають false', () => {
        assert.strictEqual(fuzzyIncludes('   ', 'тест'), false);
        assert.strictEqual(fuzzyIncludes('тест', '   '), false);
    });

    test('8. undefined-аргументи не кидають виняток', () => {
        assert.strictEqual(fuzzyIncludes(undefined, 'тест'), false);
        assert.strictEqual(fuzzyIncludes('тест', undefined), false);
        assert.strictEqual(fuzzyIncludes(null, null), false);
    });

    test('9. поріг помилок — не менше 1 навіть для дуже коротких запитів', () => {
        // ceil(2 * 0.25) = 1 -> одна помилка дозволена
        assert.strictEqual(fuzzyIncludes('ab', 'ac'), true);
        // дві помилки на запиті довжиною 2 — вже забагато
        assert.strictEqual(fuzzyIncludes('xy', 'ab'), false);
    });

    test('10. maxErrorRatio = 0 усе одно дозволяє рівно одну помилку (Math.max(1, …))', () => {
        assert.strictEqual(fuzzyIncludes('привит', 'привіт', 0), true);
        assert.strictEqual(fuzzyIncludes('прувут', 'привіт', 0), false);
    });

    test('11. збільшений maxErrorRatio пропускає більше помилок', () => {
        assert.strictEqual(fuzzyIncludes('абвгдеж', 'абвгдез', 0.1), true);
        assert.strictEqual(fuzzyIncludes('ххвгдеж', 'абвгдез', 0.1), false);
        assert.strictEqual(fuzzyIncludes('ххвгдеж', 'абвгдез', 0.5), true);
    });

    test('12. збіг знаходиться на будь-якій позиції haystack', () => {
        assert.strictEqual(fuzzyIncludes('опарин на початку', 'опарін'), true);
        assert.strictEqual(fuzzyIncludes('десь усередині опарин тут', 'опарін'), true);
        assert.strictEqual(fuzzyIncludes('аж у самому кінці опарин', 'опарін'), true);
    });

    test('13. вікно ширше за haystack не дає збігу (needle довший за текст)', () => {
        assert.strictEqual(fuzzyIncludes('коротко', 'дуже довгий пошуковий запит'), false);
    });

    test('14. вікно допускає різницю довжин до ±3 символів', () => {
        // вставлено 3 зайві символи всередину — довжина вікна n+3 ще перевіряється
        assert.strictEqual(fuzzyIncludes('абвгдеєжзи', 'абвгдеєжзи', 1), true);
        // потрібне вікно n-1: пропущено символ
        assert.strictEqual(fuzzyIncludes('субботня школа', 'субботняя школа'), true);
    });

    test('15. нормалізація застосовується до обох аргументів (регістр і пробіли)', () => {
        assert.strictEqual(fuzzyIncludes('  СУББОТНЯЯ    ШКОЛА  ', 'субботняя школа'), true);
        assert.strictEqual(fuzzyIncludes('субботняя школа', '  СУББОТНЯЯ   ШКОЛА '), true);
    });

    test('16. точний підрядок повертає true навіть за нульового бюджету помилок', () => {
        assert.strictEqual(fuzzyIncludes('є субботняя школа тут', 'субботняя школа', 0), true);
    });

    test('17. однакові рядки завжди збігаються', () => {
        assert.strictEqual(fuzzyIncludes('опарин', 'опарин'), true);
        assert.strictEqual(fuzzyIncludes('a', 'a'), true);
    });

    test('18. результат детермінований і не залежить від попередніх викликів', () => {
        const a = fuzzyIncludes('Проповідь Опарін О.О.', 'опарин');
        const b = fuzzyIncludes('Проповідь Опарін О.О.', 'опарин');
        assert.strictEqual(a, b);
        assert.strictEqual(a, true);
    });
});

describe('fuzzy_match — характеризація levenshtein і normalize', () => {

    test('19. levenshtein симетрична і зі спецвипадками порожніх рядків', () => {
        assert.strictEqual(levenshtein('', ''), 0);
        assert.strictEqual(levenshtein('abc', ''), 3);
        assert.strictEqual(levenshtein('', 'abc'), 3);
        assert.strictEqual(levenshtein('kitten', 'sitting'), levenshtein('sitting', 'kitten'));
        assert.strictEqual(levenshtein('kitten', 'sitting'), 3);
    });

    test('20. normalize повертає порожній рядок для порожніх/відсутніх значень', () => {
        assert.strictEqual(normalize(''), '');
        assert.strictEqual(normalize(null), '');
        assert.strictEqual(normalize(undefined), '');
        assert.strictEqual(normalize('\t\n  a \n b \t'), 'a b');
    });
});

/**
 * Юніт-тести стратегії ковзного вікна, винесеної з `fuzzyIncludes`
 * у `modules/fuzzy_window.ts`.
 */
describe('fuzzy_window — геометрія пошуку', () => {

    test('21. maxAllowedDistance ніколи не менша за 1', () => {
        assert.strictEqual(maxAllowedDistance(0, 0.25), 1);
        assert.strictEqual(maxAllowedDistance(10, 0), 1);
        assert.strictEqual(maxAllowedDistance(2, 0.25), 1);
    });

    test('22. maxAllowedDistance округлює вгору', () => {
        assert.strictEqual(maxAllowedDistance(10, 0.25), 3);   // ceil(2.5)
        assert.strictEqual(maxAllowedDistance(8, 0.5), 4);
        assert.strictEqual(maxAllowedDistance(16, 0.25), 4);
    });

    test('23. buildWindowSizes дає діапазон ±3 у порядку зростання', () => {
        assert.deepStrictEqual(buildWindowSizes(10), [7, 8, 9, 10, 11, 12, 13]);
    });

    test('24. buildWindowSizes відкидає недодатні довжини для коротких запитів', () => {
        assert.deepStrictEqual(buildWindowSizes(1), [1, 2, 3, 4]);
        assert.deepStrictEqual(buildWindowSizes(2), [1, 2, 3, 4, 5]);
        assert.deepStrictEqual(buildWindowSizes(0), [1, 2, 3]);
    });

    test('25. hasApproximateWindow знаходить збіг у межах бюджету помилок', () => {
        assert.strictEqual(hasApproximateWindow('абвгде', 'вгд', 0, levenshtein), true);
        assert.strictEqual(hasApproximateWindow('абвгде', 'вxд', 1, levenshtein), true);
        assert.strictEqual(hasApproximateWindow('абвгде', 'ххх', 0, levenshtein), false);
    });

    test('26. hasApproximateWindow не виходить за межі haystack', () => {
        assert.strictEqual(hasApproximateWindow('аб', 'абвгдеж', 0, levenshtein), false);
        assert.strictEqual(hasApproximateWindow('', 'аб', 5, levenshtein), false);
    });

    test('27. hasApproximateWindow приймає власну функцію відстані', () => {
        const always = () => 0;
        const never = () => 99;
        assert.strictEqual(hasApproximateWindow('abc', 'xyz', 0, always), true);
        assert.strictEqual(hasApproximateWindow('abc', 'abc', 0, never), false);
    });

    test('28. hasApproximateWindow виходить одразу на першому збігу', () => {
        let calls = 0;
        const counting = (a, b) => { calls++; return levenshtein(a, b); };
        hasApproximateWindow('абвгдеєжзи', 'абв', 0, counting);
        assert.ok(calls > 0 && calls < 40, `ранній вихід має обмежити кількість порівнянь, було ${calls}`);
    });
});
