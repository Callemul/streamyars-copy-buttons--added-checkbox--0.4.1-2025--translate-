import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock();

/**
 * Характеризаційні тести для CRAP-хотспота `OptionsController.saveSettings`
 * (`options/options.ts`, CRAP 63.6 / cyclomatic 15 за звітом Fallow 3.14).
 *
 * Тестуємо ЧОРНОЮ СКРИНЬКОЮ — через справжню точку входу сторінки налаштувань:
 * `DOMContentLoaded` створює `OptionsController`, далі клік по `#saveTopBtn`.
 * Завдяки цьому тести не залежать від того, як саме поділено код усередині,
 * і після винесення читання форми в окремий модуль лишаються зеленими.
 *
 * Навмисно зафіксовані особливості чинної реалізації:
 *   - відсутній чекбокс у DOM приводиться до булевого `false` (W-10, T-9);
 *   - нечислове значення інтервалу/обрізання більше НЕ дає `NaN` — повертається
 *     `0`, щоб уникнути запису `NaN` у storage (див. виправлений аудит про
 *     NaN у налаштуваннях);
 *   - `studio_enabled` дублюється: і всередині об'єкта опцій, і окремим ключем.
 */

const { STORAGE_KEYS } = await import('../modules/storage.ts');
const { DEFAULT_OPTIONS } = await import('../options/defaults.ts');

// Імпорт реєструє слухач DOMContentLoaded — саме він створює контролер.
await import('../options/options.ts');

const FORM_HTML = `
    <button id="saveTopBtn">Save</button>
    <div id="toastNotification"></div>
    <input id="optSschoolName" type="text">
    <input id="optPreachName" type="text">
    <select id="optLanguage">
        <option value="auto">auto</option>
        <option value="uk">uk</option>
        <option value="ru">ru</option>
    </select>
    <input id="optAntiAfkEnabled" type="checkbox">
    <input id="optAntiAfkInterval" type="text">
    <input id="optAutoHealEnabled" type="checkbox">
    <input id="optTruncationLength" type="text">
    <input id="optShowCopyButtons" type="checkbox">
    <input id="optCompactSecondaryTabs" type="checkbox">
    <input id="optYouTubeEnabled" type="checkbox">
    <input id="optStudioEnabled" type="checkbox">
    <table><tbody id="studioLogBody"></tbody></table>
`;

/** In-memory storage, спільний для SYH_STORAGE у межах одного тесту. */
let store = {};

function installStore(seed = {}) {
    store = { ...seed };
    globalThis.chrome = {
        runtime: { id: 'test-extension-id', lastError: null },
        storage: {
            local: {
                get(keys, cb) {
                    const list = Array.isArray(keys) ? keys : (keys == null ? Object.keys(store) : [keys]);
                    const out = {};
                    for (const k of list) if (k in store) out[k] = store[k];
                    if (cb) cb(out);
                },
                set(items, cb) {
                    Object.assign(store, items);
                    if (cb) cb();
                },
                remove(keys, cb) {
                    const list = Array.isArray(keys) ? keys : [keys];
                    for (const k of list) delete store[k];
                    if (cb) cb();
                }
            },
            onChanged: { addListener() {}, removeListener() {} }
        }
    };
}

/** Піднімає сторінку налаштувань так само, як це робить браузер. */
function bootOptionsPage(html = FORM_HTML) {
    document.body.innerHTML = html;
    document.dispatchEvent(new Event('DOMContentLoaded'));
}

function fillForm(values = {}) {
    const set = (id, prop, val) => {
        const el = document.getElementById(id);
        if (el && val !== undefined) el[prop] = val;
    };
    set('optSschoolName', 'value', values.sschool);
    set('optPreachName', 'value', values.preach);
    set('optLanguage', 'value', values.language);
    set('optAntiAfkEnabled', 'checked', values.antiAfk);
    set('optAntiAfkInterval', 'value', values.antiAfkInterval);
    set('optAutoHealEnabled', 'checked', values.autoHeal);
    set('optTruncationLength', 'value', values.truncation);
    set('optShowCopyButtons', 'checked', values.showCopy);
    set('optCompactSecondaryTabs', 'checked', values.compact);
    set('optYouTubeEnabled', 'checked', values.youtube);
    set('optStudioEnabled', 'checked', values.studio);
}

function clickSave() {
    document.getElementById('saveTopBtn').click();
}

function savedOptions() {
    return store[STORAGE_KEYS.OPTIONS];
}

describe('options — saveSettings (характеризація CRAP-хотспота)', () => {
    beforeEach(() => {
        installStore();
    });

    test('1. зберігає повний набір опцій із форми', () => {
        bootOptionsPage();
        fillForm({
            sschool: 'СШ 2026',
            preach: 'Проповідь вечора',
            language: 'uk',
            antiAfk: true,
            antiAfkInterval: '45',
            autoHeal: false,
            truncation: '120',
            showCopy: true,
            compact: false,
            youtube: true,
            studio: false
        });
        clickSave();

        assert.deepStrictEqual(savedOptions(), {
            newTitleSS: 'СШ 2026',
            newTitlePreach: 'Проповідь вечора',
            ui_locale: 'uk',
            anti_afk_enabled: true,
            anti_afk_interval_sec: 45,
            auto_heal_enabled: false,
            text_truncation_length: 120,
            show_copy_buttons: true,
            compact_secondary_tabs_default: false,
            youtube_enabled: true,
            studio_enabled: false
        });
    });

    test('2. порожні текстові поля падають на DEFAULT_OPTIONS', () => {
        bootOptionsPage();
        fillForm({ sschool: '   ', preach: '', language: '' });
        clickSave();

        const opts = savedOptions();
        assert.strictEqual(opts.newTitleSS, DEFAULT_OPTIONS.newTitleSS);
        assert.strictEqual(opts.newTitlePreach, DEFAULT_OPTIONS.newTitlePreach);
        assert.strictEqual(opts.ui_locale, DEFAULT_OPTIONS.ui_locale);
    });

    test('3. текстові поля обрізаються по краях', () => {
        bootOptionsPage();
        fillForm({ sschool: '  Урок 7  ', preach: '  Слово  ' });
        clickSave();

        const opts = savedOptions();
        assert.strictEqual(opts.newTitleSS, 'Урок 7');
        assert.strictEqual(opts.newTitlePreach, 'Слово');
    });

    test('4. порожній інтервал/обрізання дають вбудовані фолбеки 30 і 195', () => {
        bootOptionsPage();
        fillForm({ antiAfkInterval: '', truncation: '' });
        clickSave();

        const opts = savedOptions();
        assert.strictEqual(opts.anti_afk_interval_sec, 30);
        assert.strictEqual(opts.text_truncation_length, 195);
    });

    test('5. РЕГРЕС: нечислові інтервал/обрізання більше не дають NaN — повертається 0', () => {
        bootOptionsPage();
        fillForm({ antiAfkInterval: 'abc', truncation: 'xyz' });
        clickSave();

        const opts = savedOptions();
        assert.strictEqual(opts.anti_afk_interval_sec, 0, 'anti_afk_interval_sec має бути 0, а не NaN');
        assert.strictEqual(opts.text_truncation_length, 0, 'text_truncation_length має бути 0, а не NaN');
        assert.ok(!Number.isNaN(opts.anti_afk_interval_sec));
        assert.ok(!Number.isNaN(opts.text_truncation_length));
    });

    test('6. відсутній у DOM чекбокс дає false (boolean coercion), а не undefined', () => {
        bootOptionsPage(FORM_HTML.replace('<input id="optAutoHealEnabled" type="checkbox">', ''));
        clickSave();

        const opts = savedOptions();
        assert.ok('auto_heal_enabled' in opts);
        assert.strictEqual(opts.auto_heal_enabled, false);
    });

    test('7. db зберігає назви і НЕ втрачає сторонні поля', () => {
        installStore({ [STORAGE_KEYS.DB]: { someOtherField: 'keep-me', newTitleSS: 'старе' } });
        bootOptionsPage();
        fillForm({ sschool: 'нове СШ', preach: 'нова проповідь' });
        clickSave();

        assert.deepStrictEqual(store[STORAGE_KEYS.DB], {
            someOtherField: 'keep-me',
            newTitleSS: 'нове СШ',
            newTitlePreach: 'нова проповідь'
        });
    });

    test('8. studio_enabled дублюється в окремий ключ STUDIO_ENABLED', () => {
        bootOptionsPage();
        fillForm({ studio: true });
        clickSave();

        assert.strictEqual(store[STORAGE_KEYS.STUDIO_ENABLED], true);
        assert.strictEqual(savedOptions().studio_enabled, true);

        fillForm({ studio: false });
        clickSave();

        assert.strictEqual(store[STORAGE_KEYS.STUDIO_ENABLED], false);
        assert.strictEqual(savedOptions().studio_enabled, false);
    });

    test('9. після збереження показується тост підтвердження', () => {
        bootOptionsPage();
        clickSave();

        const toast = document.getElementById('toastNotification');
        assert.strictEqual(toast.textContent, '✅ Налаштування успішно збережено!');
        assert.ok(toast.classList.contains('show'));
    });

    test('10. запис виконується рівно у три ключі storage', () => {
        bootOptionsPage();
        clickSave();

        assert.deepStrictEqual(
            Object.keys(store).sort(),
            [STORAGE_KEYS.DB, STORAGE_KEYS.OPTIONS, STORAGE_KEYS.STUDIO_ENABLED].sort()
        );
    });
});

describe('options — loadSettings підставляє збережене у форму', () => {
    beforeEach(() => {
        installStore();
    });

    test('11. значення зі storage потрапляють у поля форми при старті', () => {
        installStore({
            [STORAGE_KEYS.DB]: { newTitleSS: 'СШ зі сховища', newTitlePreach: 'Проповідь зі сховища' },
            [STORAGE_KEYS.OPTIONS]: {
                ui_locale: 'ru',
                anti_afk_enabled: false,
                anti_afk_interval_sec: 77,
                auto_heal_enabled: false,
                text_truncation_length: 88,
                show_copy_buttons: false,
                compact_secondary_tabs_default: false,
                youtube_enabled: false,
                studio_enabled: false
            }
        });
        bootOptionsPage();

        assert.strictEqual(document.getElementById('optSschoolName').value, 'СШ зі сховища');
        assert.strictEqual(document.getElementById('optPreachName').value, 'Проповідь зі сховища');
        assert.strictEqual(document.getElementById('optLanguage').value, 'ru');
        assert.strictEqual(document.getElementById('optAntiAfkEnabled').checked, false);
        assert.strictEqual(document.getElementById('optAntiAfkInterval').value, '77');
        assert.strictEqual(document.getElementById('optTruncationLength').value, '88');
    });

    test('12. round-trip: load -> save зберігає значення без спотворень', () => {
        installStore({
            [STORAGE_KEYS.DB]: { newTitleSS: 'A', newTitlePreach: 'B' },
            [STORAGE_KEYS.OPTIONS]: {
                ui_locale: 'uk',
                anti_afk_enabled: true,
                anti_afk_interval_sec: 42,
                auto_heal_enabled: true,
                text_truncation_length: 150,
                show_copy_buttons: true,
                compact_secondary_tabs_default: true,
                youtube_enabled: true,
                studio_enabled: true
            }
        });
        bootOptionsPage();
        clickSave();

        assert.deepStrictEqual(savedOptions(), {
            newTitleSS: 'A',
            newTitlePreach: 'B',
            ui_locale: 'uk',
            anti_afk_enabled: true,
            anti_afk_interval_sec: 42,
            auto_heal_enabled: true,
            text_truncation_length: 150,
            show_copy_buttons: true,
            compact_secondary_tabs_default: true,
            youtube_enabled: true,
            studio_enabled: true
        });
    });
});

describe('options — журнал ручних корекцій YouTube Studio', () => {
    beforeEach(() => {
        installStore();
    });

    test('13. порожній лог рендерить рядок-заглушку', () => {
        bootOptionsPage();

        const tbody = document.getElementById('studioLogBody');
        assert.match(tbody.innerHTML, /Записи у лозі відсутні/);
        assert.strictEqual(tbody.querySelectorAll('td').length, 1);
    });

    test('14. записи рендеряться у зворотному порядку і з 5 колонками', () => {
        installStore({
            [STORAGE_KEYS.STUDIO_OVERRIDE_LOG]: [
                {
                    timestamp: 0,
                    channelLabel: 'Канал A',
                    videoTitle: 'Відео A',
                    autoDetectedSheet: 'Авто A',
                    assignedSheet: 'Ручний A'
                },
                {
                    timestamp: 0,
                    channelKey: 'key-b',
                    videoTitle: 'Відео B',
                    assignedSheet: 'Ручний B'
                }
            ]
        });
        bootOptionsPage();

        const rows = document.getElementById('studioLogBody').querySelectorAll('tr');
        assert.strictEqual(rows.length, 2);

        const firstCells = Array.from(rows[0].querySelectorAll('td')).map(td => td.textContent);
        assert.strictEqual(firstCells.length, 5);
        // Найновіший (останній у масиві) — зверху.
        assert.strictEqual(firstCells[1], 'key-b');
        assert.strictEqual(firstCells[2], 'Відео B');
        assert.strictEqual(firstCells[3], 'Не визначено');
        assert.strictEqual(firstCells[4], 'Ручний B');

        const secondCells = Array.from(rows[1].querySelectorAll('td')).map(td => td.textContent);
        assert.strictEqual(secondCells[1], 'Канал A');
        assert.strictEqual(secondCells[3], 'Авто A');
    });

    test('15. відсутній timestamp рендериться як тире', () => {
        installStore({
            [STORAGE_KEYS.STUDIO_OVERRIDE_LOG]: [
                { videoTitle: 'Без часу', assignedSheet: 'X' }
            ]
        });
        bootOptionsPage();

        const cells = document.getElementById('studioLogBody').querySelectorAll('td');
        assert.strictEqual(cells[0].textContent, '—');
        assert.strictEqual(cells[1].textContent, '—');
    });
});
