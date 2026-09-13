// tests/i18n_catalog_completeness.test.js
//
// Правило `docs/rules/i18n.md` §1: новий видимий рядок = ключ у ВСІХ трьох
// `_locales/{uk,en,ru}/messages.json` в тому самому коміті.
//
// Порушити його легко й непомітно: `localize()` і `getMessage(key, fallback)`
// при відсутньому ключі мовчки показують запасний текст, тож український UI
// виглядає справним. Саме так 126 ключів уже одного разу опинились у розмітці
// без жодного запису в каталогах. Цей тест ловить таке одразу.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';

const LOCALES = ['uk', 'en', 'ru'];
const SOURCE_DIRS = ['popup', 'options', 'modules', 'youtube'];

function collectSources(dir, acc = []) {
    for (const entry of readdirSync(dir)) {
        // Шлях через `/` навмисно — на Windows `join` дав би `\`.
        const full = `${dir}/${entry}`;
        if (statSync(full).isDirectory()) collectSources(full, acc);
        else if (/\.(ts|html)$/.test(entry)) acc.push(full);
    }
    return acc;
}

/** Усі ключі, на які посилається код: data-i18n* атрибути та getMessage('key', …). */
function collectUsedKeys() {
    const used = new Map();
    const remember = (key, file) => {
        if (!used.has(key)) used.set(key, new Set());
        used.get(key).add(file);
    };

    for (const file of SOURCE_DIRS.flatMap(dir => collectSources(dir))) {
        const source = readFileSync(file, 'utf8');
        for (const m of source.matchAll(/data-i18n(?:-title|-placeholder|-aria-label)?="([^"]+)"/g)) remember(m[1], file);
        for (const m of source.matchAll(/getMessage\(\s*'([A-Za-z0-9_]+)'/g)) remember(m[1], file);
    }
    return used;
}

const catalogs = Object.fromEntries(
    LOCALES.map(locale => [locale, JSON.parse(readFileSync(`_locales/${locale}/messages.json`, 'utf8'))])
);

describe('i18n — каталоги повні', () => {
    const used = collectUsedKeys();

    for (const locale of LOCALES) {
        test(`кожен ключ із коду є в _locales/${locale}/messages.json`, () => {
            const missing = [...used.keys()]
                .filter(key => !catalogs[locale][key]?.message)
                .map(key => `${key}  ← ${[...used.get(key)].join(', ')}`);

            assert.deepEqual(
                missing,
                [],
                `ключі без перекладу в ${locale}. Додайте їх в усі три каталоги ` +
                '(docs/rules/i18n.md §1) — запасний текст у розмітці не замінює запис у каталозі.'
            );
        });
    }

    test('три каталоги мають однаковий набір ключів', () => {
        const [base, ...rest] = LOCALES.map(locale => Object.keys(catalogs[locale]).sort());
        rest.forEach((keys, i) => assert.deepEqual(keys, base, `${LOCALES[i + 1]} розходиться з ${LOCALES[0]}`));
    });

    test('перевірка справді знаходить ключі (не проходить вхолосту)', () => {
        assert.ok(used.size > 100, `очікувались сотні ключів, знайдено ${used.size}`);
        assert.ok(used.has('popup_empty_prayers'));
        assert.ok(used.has('options_save_success'));
    });
});
