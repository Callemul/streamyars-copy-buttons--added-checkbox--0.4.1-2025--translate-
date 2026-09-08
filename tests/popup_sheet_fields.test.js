// tests/popup_sheet_fields.test.js
//
// Реєстр полів аркуша попапу (`popup/popup_sheet_fields.ts`, T8).
//
// Головне, що тут перевіряється, — НЕ форма таблиці, а дві речі, заради яких
// вона робилась:
//
//   1. Реєстр і реальна розмітка `popup/popup.html` не розходяться. Тест читає
//      справжній `<template id="sheet-content-template">` з файла, а не його
//      копію в тесті: копія протухає мовчки, а саме мовчазне протухання ми й
//      прибираємо.
//   2. ДАНІ КОРИСТУВАЧА НЕ ГУБЛЯТЬСЯ. Аркуш, збережений СТАРОЮ схемою
//      (`tg_<field>__<sheetId>`), читається новим кодом (docs/rules/storage.md,
//      Zero data loss). Це критерій приймання T8.

import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach } from 'node:test';
import { readFileSync } from 'node:fs';

import { installChromeMock } from './setup/chrome_mock.ts';

/** @type {Record<string, any>} */
let storageStore = {};

installChromeMock({
    storageImpl: {
        get: (keys, cb) => {
            const list = Array.isArray(keys) ? keys : [keys];
            /** @type {Record<string, any>} */
            const res = {};
            for (const k of list) {
                if (k in storageStore) res[k] = storageStore[k];
            }
            if (cb) cb(res);
        },
        set: (items, cb) => {
            Object.assign(storageStore, items);
            if (cb) cb();
        },
        remove: (keys, cb) => {
            const list = Array.isArray(keys) ? keys : [keys];
            for (const k of list) delete storageStore[k];
            if (cb) cb();
        }
    }
});

const {
    SHEET_FIELDS,
    sheetFieldId,
    sheetStateKeys,
    allSheetStateBindings,
    persistedValueFields,
    getSheetStateBinding
} = await import('../popup/popup_sheet_fields.ts');
const { renderSheetTemplates, buildPopupKeysToLoad } = await import('../popup/popup_sheet_renderer.ts');
const { restoreSingleSheetState } = await import('../popup/popup_sheet_state_restorer.ts');
const { bindSheetListeners, createSheetBindingTimers } = await import('../popup/popup_sheet_bindings.ts');

const SID = 'vp_ss';

/** Справжній шаблон аркуша з `popup/popup.html` — без копіювання в тест. */
function realSheetTemplateHtml() {
    const html = readFileSync('popup/popup.html', 'utf8');
    const match = html.match(/<template id="sheet-content-template">([\s\S]*?)<\/template>/);
    assert.ok(match, 'у popup/popup.html має бути <template id="sheet-content-template">');
    return `<template id="sheet-content-template">${match[1]}</template><div id="sheet-contents-container"></div>`;
}

const $id = (id) => document.getElementById(id);

describe('popup_sheet_fields — реєстр і розмітка не розходяться', () => {
    test('кожен гачок реєстру існує в шаблоні popup.html', () => {
        document.body.innerHTML = realSheetTemplateHtml();
        const tpl = document.getElementById('sheet-content-template');

        const missing = SHEET_FIELDS
            .filter(field => !tpl.content.querySelector(field.cssHook))
            .map(field => field.cssHook);

        assert.deepEqual(missing, [], 'ці гачки є в реєстрі, але їх немає в шаблоні');
    });

    test('кожен гачок .js-* із шаблону описаний у реєстрі', () => {
        document.body.innerHTML = realSheetTemplateHtml();
        const tpl = document.getElementById('sheet-content-template');

        const hooksInTemplate = new Set();
        tpl.content.querySelectorAll('*').forEach(el => {
            el.classList.forEach(cls => {
                if (cls.startsWith('js-')) hooksInTemplate.add(`.${cls}`);
            });
        });

        const known = new Set(SHEET_FIELDS.map(f => f.cssHook));
        const unregistered = [...hooksInTemplate].filter(hook => !known.has(hook));

        assert.deepEqual(
            unregistered,
            [],
            'ці гачки є в розмітці, але не описані в SHEET_FIELDS — поле не отримає id, ' +
            'а отже не збережеться і не відновиться'
        );
    });

    test('id і гачки унікальні', () => {
        const ids = SHEET_FIELDS.map(f => f.idPrefix);
        const hooks = SHEET_FIELDS.map(f => f.cssHook);

        assert.equal(new Set(ids).size, ids.length, 'idPrefix має бути унікальним');
        assert.equal(new Set(hooks).size, hooks.length, 'cssHook має бути унікальним');
    });

    test('рендер проставляє id усім полям реєстру', () => {
        document.body.innerHTML = realSheetTemplateHtml();
        renderSheetTemplates();

        const withoutId = SHEET_FIELDS.filter(field => !$id(sheetFieldId(field, SID)));
        assert.deepEqual(withoutId.map(f => f.idPrefix), []);
    });
});

describe('popup_sheet_fields — ключі сховища', () => {
    test('імена полів стану унікальні', () => {
        const fields = allSheetStateBindings().map(b => b.field);
        assert.equal(new Set(fields).size, fields.length);
    });

    // Легасі-префікс записаний у таблиці ЯВНО, а не виведений з імені поля,
    // саме через ці два винятки. Тест фіксує і конвенцію, і винятки з неї —
    // щоб «нормалізація» ключа не проїхала непоміченою.
    test('легасі-префікс = tg_<field>__ для всіх, крім двох історичних винятків', () => {
        const EXCEPTIONS = {
            dividerPos: 'syh:popup:divider_pos:',
            collected: 'syh:popup:collected:'
        };

        allSheetStateBindings().forEach(binding => {
            const expected = EXCEPTIONS[binding.field] ?? `tg_${binding.field}__`;
            assert.equal(
                binding.legacyPrefix,
                expected,
                `легасі-префікс поля «${binding.field}» змінився — це втрата даних користувача`
            );
        });
    });

    test('канонічний ключ полів має формат syh:popup:sheet:<id>:<field>', () => {
        const EXCEPTIONS = new Set(['dividerPos', 'collected']);

        allSheetStateBindings()
            .filter(b => !EXCEPTIONS.has(b.field))
            .forEach(binding => {
                assert.equal(binding.key(SID), `syh:popup:sheet:${SID}:${binding.field}`);
            });
    });

    test('buildPopupKeysToLoad вантажить ОБИДВІ форми кожного ключа', () => {
        const keys = new Set(buildPopupKeysToLoad([SID]));

        allSheetStateBindings().forEach(binding => {
            const [canonical, legacy] = sheetStateKeys(binding, SID);
            assert.ok(keys.has(canonical), `не вантажиться канонічний ключ ${canonical}`);
            assert.ok(keys.has(legacy), `не вантажиться легасі-ключ ${legacy}`);
        });
    });

    test('getSheetStateBinding кидає виняток на невідоме поле', () => {
        assert.throws(() => getSheetStateBinding('такогоПоляНемає'), /немає прив'язки/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// КРИТИЧНИЙ ТЕСТ T8: дані, збережені старою схемою, читаються новою.
// ─────────────────────────────────────────────────────────────────────────────

/** Стан аркуша, як його записала БУДЬ-ЯКА попередня версія — лише легасі-ключі. */
function legacySheetState(sid) {
    return {
        [`tg_oldList__${sid}`]: '1. Старе питання',
        [`tg_answered__${sid}`]: '1, 3',
        [`tg_newTelegram__${sid}`]: 'Нове питання з Телеграму',
        [`tg_finalResultHtml__${sid}`]: '<div>Готовий результат</div>',
        [`tg_statsVisible__${sid}`]: true,
        [`tg_statsHtml__${sid}`]: '<div class="stats-row">Стара статистика</div>',
        [`tg_deletedLogDetailsVisible__${sid}`]: true,
        [`tg_deletedLogHtml__${sid}`]: '<div class="del-row">видалене</div>',
        [`tg_deletedLogCount__${sid}`]: 1,
        [`tg_deletedLogDetailsOpen__${sid}`]: true,
        [`tg_cleanedLogDetailsVisible__${sid}`]: true,
        [`tg_cleanedLogHtml__${sid}`]: '<table class="clean-table"><tr><th>h</th></tr><tr><td>x</td></tr></table>',
        [`tg_cleanedLogCount__${sid}`]: 1,
        [`tg_cleanedLogDetailsOpen__${sid}`]: false,
        [`syh:popup:divider_pos:${sid}`]: 70
    };
}

describe('popup_sheet_fields — ZERO DATA LOSS: старі дані читаються новим кодом', () => {
    beforeEach(() => {
        storageStore = {};
        document.body.innerHTML = realSheetTemplateHtml();
        renderSheetTemplates();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('аркуш, збережений СТАРОЮ схемою (tg_*__), повністю відновлюється', () => {
        restoreSingleSheetState(SID, legacySheetState(SID));

        assert.equal($id(`oldList__${SID}`).value, '1. Старе питання');
        assert.equal($id(`answeredIds__${SID}`).value, '1, 3');
        assert.equal($id(`newTelegram__${SID}`).value, 'Нове питання з Телеграму');
        assert.equal($id(`finalResultDiv__${SID}`).innerHTML, '<div>Готовий результат</div>');

        assert.ok(
            $id(`statsBar__${SID}`).innerHTML.includes('Стара статистика'),
            'панель статистики зі старих даних не відновилась'
        );
        assert.equal($id(`statsBar__${SID}`).style.display, '');

        assert.ok($id(`deletedLog__${SID}`).innerHTML.includes('видалене'));
        assert.equal($id(`deletedLogCount__${SID}`).textContent, '(1)');
        assert.ok($id(`deletedLogDetails__${SID}`).hasAttribute('open'));

        assert.ok($id(`cleanedLog__${SID}`).innerHTML.includes('clean-table'));
        assert.equal($id(`cleanedLogCount__${SID}`).textContent, '(1)');
        assert.equal($id(`cleanedLogDetails__${SID}`).hasAttribute('open'), false);

        // happy-dom нормалізує скорочений `flex` у повну форму `1 1 <basis>`.
        assert.match($id(`step3Left__${SID}`).style.flex, /(^|\s)70%$/);
        assert.match($id(`step3Right__${SID}`).style.flex, /(^|\s)30%$/);
    });

    test('канонічний ключ має пріоритет над легасі, якщо є обидва', () => {
        const result = {
            ...legacySheetState(SID),
            [`syh:popup:sheet:${SID}:oldList`]: 'НОВЕ значення',
            [`syh:popup:sheet:${SID}:newTelegram`]: 'НОВИЙ телеграм'
        };

        restoreSingleSheetState(SID, result);

        assert.equal($id(`oldList__${SID}`).value, 'НОВЕ значення');
        assert.equal($id(`newTelegram__${SID}`).value, 'НОВИЙ телеграм');
        // Поле, у якого канонічного ключа немає, і далі читається з легасі.
        assert.equal($id(`answeredIds__${SID}`).value, '1, 3');
    });

    test('порожній рядок у легасі-ключі не затирає поле (поведінка 1-в-1)', () => {
        $id(`oldList__${SID}`).value = 'вже введене';

        restoreSingleSheetState(SID, { [`tg_oldList__${SID}`]: '' });

        assert.equal($id(`oldList__${SID}`).value, 'вже введене');
    });

    test('відсутність будь-яких збережених даних не ламає відновлення', () => {
        assert.doesNotThrow(() => restoreSingleSheetState(SID, {}));
        assert.equal($id(`oldList__${SID}`).value, '');
    });
});

describe('popup_sheet_fields — збереження пише обидві форми ключа', () => {
    beforeEach(() => {
        storageStore = {};
        document.body.innerHTML = realSheetTemplateHtml();
        renderSheetTemplates();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    // Кожне поле, що зберігається, має отримати слухач. Раніше на кожне поле
    // писалась окрема `bind<Field>Input()` — забути її означало «поле
    // відновлюється, але не зберігається», без жодного сигналу.
    test('усі поля реєстру, що зберігаються, отримують слухач input', () => {
        const seen = [];
        persistedValueFields().forEach(field => {
            const el = $id(sheetFieldId(field, SID));
            assert.ok(el, `елемент поля ${field.idPrefix} має існувати`);
            const original = el.addEventListener.bind(el);
            el.addEventListener = (type, handler, opts) => {
                if (type === 'input') seen.push(field.idPrefix);
                original(type, handler, opts);
            };
        });

        bindSheetListeners(SID, createSheetBindingTimers());

        assert.deepEqual(
            [...new Set(seen)].sort(),
            persistedValueFields().map(f => f.idPrefix).sort()
        );
    });

    test('createSheetBindingTimers дає окрему мапу таймерів кожному полю', () => {
        const timers = createSheetBindingTimers();

        assert.deepEqual(
            Object.keys(timers).sort(),
            persistedValueFields().map(f => f.idPrefix).sort()
        );
    });
});
