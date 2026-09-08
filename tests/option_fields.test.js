// tests/option_fields.test.js
//
// Реєстр опцій сторінки налаштувань (`options/option_fields.ts`, T9).
//
// Перевіряється не форма таблиці, а те, заради чого вона робилась:
//
//   1. Реєстр і реальний `options/options.html` не розходяться — тест читає
//      справжній файл розмітки, а не його копію.
//   2. ЕКСПОРТ КОНФІГУРАЦІЇ ДАЄ ТОЙ САМИЙ JSON. Об'єкт опцій, який іде в
//      сховище й далі у файл експорту, звіряється з еталонним рядком
//      побайтово — включно з ПОРЯДКОМ КЛЮЧІВ, бо `JSON.stringify` зберігає
//      порядок вставки. Це критерій приймання T9.
//   3. Семантика фолбеків збережена 1-в-1 (порожній рядок, збережений `false`,
//      нечисловий ввід).

import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock();

const { OPTION_FIELDS } = await import('../options/option_fields.ts');
const { DEFAULT_OPTIONS } = await import('../options/defaults.ts');
const { populateFormElements, readOptionsFromForm } = await import('../options/form.ts');

/** Форма сторінки налаштувань — рівно ті елементи, які описує реєстр. */
function buildFormFromRegistry() {
    return OPTION_FIELDS.map(field => {
        if (field.kind === 'checkbox') return `<input id="${field.elementId}" type="checkbox">`;
        if (field.kind === 'select') {
            return `<select id="${field.elementId}">
                <option value="auto">auto</option>
                <option value="uk">uk</option>
                <option value="ru">ru</option>
            </select>`;
        }
        return `<input id="${field.elementId}" type="text">`;
    }).join('\n');
}

const $ = (id) => document.getElementById(id);

describe('option_fields — реєстр і розмітка options.html не розходяться', () => {
    const html = readFileSync('options/options.html', 'utf8');

    test('кожна опція реєстру має елемент у options.html', () => {
        const missing = OPTION_FIELDS
            .filter(field => !html.includes(`id="${field.elementId}"`))
            .map(field => field.elementId);

        assert.deepEqual(missing, [], 'ці опції є в реєстрі, але їх немає в розмітці');
    });

    test('кожен елемент opt* із options.html описаний у реєстрі', () => {
        // `optionsVersionBadge` — не поле форми, а підпис версії у шапці.
        const NOT_AN_OPTION = new Set(['optionsVersionBadge']);

        const idsInMarkup = [...html.matchAll(/id="(opt[A-Za-z0-9_]*)"/g)]
            .map(m => m[1])
            .filter(id => !NOT_AN_OPTION.has(id));

        const known = new Set(OPTION_FIELDS.map(f => f.elementId));
        const unregistered = [...new Set(idsInMarkup)].filter(id => !known.has(id));

        assert.deepEqual(
            unregistered,
            [],
            'ці поля є в розмітці, але не описані в OPTION_FIELDS — вони не заповняться і не збережуться'
        );
    });

    test('атрибути min/max/step числових полів збігаються з реєстром', () => {
        OPTION_FIELDS.filter(f => f.kind === 'number').forEach(field => {
            const tag = html.match(new RegExp(`<input[^>]*id="${field.elementId}"[^>]*>`))?.[0];
            assert.ok(tag, `у розмітці має бути <input id="${field.elementId}">`);

            const attr = (name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];

            assert.equal(Number(attr('min')), field.min, `min поля ${field.elementId}`);
            assert.equal(Number(attr('max')), field.max, `max поля ${field.elementId}`);
            if (field.step !== undefined) {
                assert.equal(Number(attr('step')), field.step, `step поля ${field.elementId}`);
            }
        });
    });

    test('ключі й id опцій унікальні', () => {
        const keys = OPTION_FIELDS.map(f => f.key);
        const ids = OPTION_FIELDS.map(f => f.elementId);

        assert.equal(new Set(keys).size, keys.length);
        assert.equal(new Set(ids).size, ids.length);
    });
});

describe('option_fields — DEFAULT_OPTIONS виводиться з реєстру', () => {
    test('склад і значення за замовчуванням не змінились', () => {
        assert.deepEqual(DEFAULT_OPTIONS, {
            newTitleSS: 'СШ Урок',
            newTitlePreach: 'Проповідь',
            ui_locale: 'auto',
            anti_afk_enabled: true,
            anti_afk_interval_sec: 30,
            auto_heal_enabled: true,
            text_truncation_length: 195,
            compact_secondary_tabs_default: true,
            youtube_enabled: true,
            studio_enabled: true
        });
    });

    test('кожен ключ DEFAULT_OPTIONS має рядок у реєстрі', () => {
        assert.deepEqual(
            Object.keys(DEFAULT_OPTIONS).sort(),
            OPTION_FIELDS.map(f => f.key).sort()
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// КРИТИЧНИЙ ТЕСТ T9: JSON конфігурації не змінився — ні складом, ні порядком.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Еталон: рівно те, що `readOptionsFromForm` повертав ДО введення реєстру.
 *
 * Порядок ключів значущий — цей об'єкт лягає в `chrome.storage` під ключем
 * `syh_options`, а звідти дослівно в файл експорту конфігурації.
 */
const GOLDEN_OPTIONS_JSON = '{"newTitleSS":"СШ 2026","newTitlePreach":"Проповідь вечора",'
    + '"ui_locale":"uk","anti_afk_enabled":true,"anti_afk_interval_sec":45,'
    + '"auto_heal_enabled":false,"text_truncation_length":120,'
    + '"compact_secondary_tabs_default":false,"youtube_enabled":true,"studio_enabled":false}';

describe('option_fields — експорт конфігурації дає той самий JSON', () => {
    beforeEach(() => {
        document.body.innerHTML = buildFormFromRegistry();
    });

    test('об\'єкт опцій із форми збігається з еталоном ПОБАЙТОВО, включно з порядком ключів', () => {
        $('optSschoolName').value = 'СШ 2026';
        $('optPreachName').value = 'Проповідь вечора';
        $('optLanguage').value = 'uk';
        $('optAntiAfkEnabled').checked = true;
        $('optAntiAfkInterval').value = '45';
        $('optAutoHealEnabled').checked = false;
        $('optTruncationLength').value = '120';
        $('optCompactSecondaryTabs').checked = false;
        $('optYouTubeEnabled').checked = true;
        $('optStudioEnabled').checked = false;

        assert.equal(JSON.stringify(readOptionsFromForm(DEFAULT_OPTIONS)), GOLDEN_OPTIONS_JSON);
    });

    test('round-trip форма → стан → форма → стан не спотворює значень', () => {
        const source = {
            newTitleSS: 'A',
            newTitlePreach: 'B',
            ui_locale: 'ru',
            anti_afk_enabled: false,
            anti_afk_interval_sec: 77,
            auto_heal_enabled: true,
            text_truncation_length: 88,
            compact_secondary_tabs_default: false,
            youtube_enabled: false,
            studio_enabled: true
        };

        populateFormElements(
            { newTitleSS: source.newTitleSS, newTitlePreach: source.newTitlePreach },
            source,
            DEFAULT_OPTIONS
        );
        const first = readOptionsFromForm(DEFAULT_OPTIONS);

        populateFormElements({ newTitleSS: first.newTitleSS, newTitlePreach: first.newTitlePreach }, first, DEFAULT_OPTIONS);
        const second = readOptionsFromForm(DEFAULT_OPTIONS);

        assert.equal(JSON.stringify(first), JSON.stringify(source));
        assert.equal(JSON.stringify(second), JSON.stringify(first));
    });
});

describe('option_fields — семантика фолбеків збережена 1-в-1', () => {
    beforeEach(() => {
        document.body.innerHTML = buildFormFromRegistry();
    });

    test('порожнє/пробільне текстове поле падає на DEFAULT_OPTIONS', () => {
        $('optSschoolName').value = '   ';
        $('optPreachName').value = '';

        const state = readOptionsFromForm(DEFAULT_OPTIONS);

        assert.equal(state.newTitleSS, DEFAULT_OPTIONS.newTitleSS);
        assert.equal(state.newTitlePreach, DEFAULT_OPTIONS.newTitlePreach);
    });

    test('порожні числові поля дають вбудовані фолбеки 30 і 195 з реєстру', () => {
        $('optAntiAfkInterval').value = '';
        $('optTruncationLength').value = '';

        const state = readOptionsFromForm(DEFAULT_OPTIONS);

        assert.equal(state.anti_afk_interval_sec, 30);
        assert.equal(state.text_truncation_length, 195);
        assert.equal(OPTION_FIELDS.find(f => f.key === 'anti_afk_interval_sec').readFallback, '30');
        assert.equal(OPTION_FIELDS.find(f => f.key === 'text_truncation_length').readFallback, '195');
    });

    test('нечислове значення не дає NaN — повертається 0', () => {
        $('optAntiAfkInterval').value = 'abc';
        $('optTruncationLength').value = 'xyz';

        const state = readOptionsFromForm(DEFAULT_OPTIONS);

        assert.equal(state.anti_afk_interval_sec, 0);
        assert.equal(state.text_truncation_length, 0);
    });

    test('збережений false у чекбоксі НЕ підміняється дефолтом true', () => {
        populateFormElements({}, { anti_afk_enabled: false, youtube_enabled: false }, DEFAULT_OPTIONS);

        assert.equal($('optAntiAfkEnabled').checked, false);
        assert.equal($('optYouTubeEnabled').checked, false);
        // Опція, якої немає в збереженому стані, бере дефолт.
        assert.equal($('optAutoHealEnabled').checked, true);
    });

    test('збережений 0 у числовому полі НЕ підміняється дефолтом', () => {
        populateFormElements({}, { text_truncation_length: 0 }, DEFAULT_OPTIONS);

        assert.equal($('optTruncationLength').value, '0');
    });

    test('порожній рядок у select падає на дефолт (на відміну від чекбокса)', () => {
        populateFormElements({}, { ui_locale: '' }, DEFAULT_OPTIONS);

        assert.equal($('optLanguage').value, DEFAULT_OPTIONS.ui_locale);
    });

    test('окремий ключ studio_enabled має пріоритет над значенням усередині опцій', () => {
        populateFormElements({}, { studio_enabled: true }, DEFAULT_OPTIONS, false);
        assert.equal($('optStudioEnabled').checked, false);

        populateFormElements({}, { studio_enabled: false }, DEFAULT_OPTIONS, true);
        assert.equal($('optStudioEnabled').checked, true);

        // `undefined` означає «окремого ключа немає» — беремо з об'єкта опцій.
        populateFormElements({}, { studio_enabled: false }, DEFAULT_OPTIONS, undefined);
        assert.equal($('optStudioEnabled').checked, false);
    });

    test('відсутній у DOM елемент не ламає ні читання, ні запис', () => {
        document.body.innerHTML = '';

        assert.doesNotThrow(() => populateFormElements({}, {}, DEFAULT_OPTIONS));
        const state = readOptionsFromForm(DEFAULT_OPTIONS);

        assert.equal(state.newTitleSS, DEFAULT_OPTIONS.newTitleSS);
        assert.equal(state.anti_afk_enabled, false, 'відсутній чекбокс дає false (boolean coercion)');
    });
});
