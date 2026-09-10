import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach, mock } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

// Характеризаційні тести `popup/popup_ui_state_restorer.ts` — файл із найгіршою
// підтримуваністю серед продакшн-коду за звітом Fallow (MI 78.6, щільність
// складності 0.50, `restoreTextareaSizesUI` = cognitive 16).
//
// Написані ДО рефакторингу: фіксують контракт «новий ключ ?? легасі-ключ»,
// правила активації вкладок і застосування розмірів/скролу 1-в-1.

/** @type {Record<string, any>} */
let storageStore = {};

installChromeMock({
    storageImpl: {
        get: (keys, cb) => {
            const list = Array.isArray(keys) ? keys : [keys];
            const res = {};
            for (const k of list) if (k in storageStore) res[k] = storageStore[k];
            if (cb) cb(res);
        },
        set: (items, cb) => { Object.assign(storageStore, items); if (cb) cb(); },
        remove: (keys, cb) => {
            const list = Array.isArray(keys) ? keys : [keys];
            for (const k of list) delete storageStore[k];
            if (cb) cb();
        }
    }
});

const { STORAGE_KEYS } = await import('../modules/storage/storage.ts');
const { getAllSheetIds } = await import('../modules/registry/sheets.ts');
const { db } = await import('../popup/popup_storage.ts');

const {
    restoreDbState,
    restoreActiveTabUI,
    restoreActiveSubtabUI,
    restoreTextareaSizesUI,
    restoreTranslitStateUI,
    restoreScrollPositionsUI
} = await import('../popup/popup_ui_state_restorer.ts');

const {
    readStoredValue,
    buildScrollTargetIds,
    SHARED_SCROLL_TARGET_IDS,
    SHEET_SCROLL_ID_PREFIXES
} = await import('../popup/popup_ui_state_rules.ts');

const {
    applyStoredElementSizes,
    applyScrollTop,
    applyInputValue
} = await import('../popup/popup_ui_state_appliers.ts');

const SHEET_IDS = getAllSheetIds();

const SHELL_HTML = `
<div class="tabs">
    <button class="tab-link" data-tab="prayers-tab" aria-selected="false">Prayers</button>
    <button class="tab-link" data-tab="telegram-tab" aria-selected="false">Telegram</button>
</div>
<div id="prayers-tab" class="tab-content"></div>
<div id="telegram-tab" class="tab-content"></div>
<div class="subtabs">
    ${SHEET_IDS.map(sId => `<button class="subtab-button" data-sheet="${sId}" aria-selected="false">${sId}</button>`).join('\n    ')}
</div>
${SHEET_IDS.map(sId => `<div id="sheet-content-${sId}" class="sheet-content"></div>`).join('\n')}
<input id="sschoolName" type="text">
<input id="preachNameInput" type="text">
<div id="prayersResultDiv"></div>
<textarea id="textArea1_oldText"></textarea>
<textarea id="textArea2_generatedRuText"></textarea>
${SHEET_IDS.map(sId => `
<div id="finalResultDiv__${sId}"></div>
<div id="deletedLog__${sId}"></div>
<textarea id="oldList__${sId}"></textarea>
<textarea id="newTelegram__${sId}"></textarea>`).join('\n')}
`;

const $id = (id) => document.getElementById(id);

describe('popup_ui_state_restorer — restoreDbState', () => {
    beforeEach(() => {
        document.body.innerHTML = SHELL_HTML;
        Object.keys(db).forEach(k => delete db[k]);
    });

    afterEach(() => {
        document.body.innerHTML = '';
        Object.keys(db).forEach(k => delete db[k]);
        mock.restoreAll();
    });

    test('1. зливає збережений db у спільний обʼєкт і заповнює обидва інпути', () => {
        restoreDbState({ [STORAGE_KEYS.DB]: { newTitleSS: 'Суботня', newTitlePreach: 'Проповідь', other: 42 } });

        assert.equal(db.other, 42);
        assert.equal($id('sschoolName').value, 'Суботня');
        assert.equal($id('preachNameInput').value, 'Проповідь');
    });

    test('2. не чіпає інпути, для яких немає значень у db', () => {
        restoreDbState({ [STORAGE_KEYS.DB]: { other: 1 } });

        assert.equal($id('sschoolName').value, '');
        assert.equal($id('preachNameInput').value, '');
    });

    test('3. відсутній ключ DB -> жодних змін і жодних винятків', () => {
        assert.doesNotThrow(() => restoreDbState({}));
        assert.deepEqual(Object.keys(db), []);
    });

    test('4. значення зберігаються навіть якщо інпутів немає в DOM', () => {
        document.body.innerHTML = '';
        assert.doesNotThrow(() => restoreDbState({ [STORAGE_KEYS.DB]: { newTitleSS: 'X' } }));
        assert.equal(db.newTitleSS, 'X');
    });
});

describe('popup_ui_state_restorer — активація вкладок', () => {
    beforeEach(() => { document.body.innerHTML = SHELL_HTML; });
    afterEach(() => { document.body.innerHTML = ''; mock.restoreAll(); });

    test('5. новий ключ має пріоритет над легасі tg_active_tab', () => {
        restoreActiveTabUI({
            [STORAGE_KEYS.POPUP_ACTIVE_TAB]: 'telegram-tab',
            tg_active_tab: 'prayers-tab'
        });

        assert.ok($id('telegram-tab').classList.contains('active'));
        assert.ok(!$id('prayers-tab').classList.contains('active'));
    });

    test('6. легасі-ключ використовується лише коли новий null/undefined', () => {
        restoreActiveTabUI({ [STORAGE_KEYS.POPUP_ACTIVE_TAB]: null, tg_active_tab: 'prayers-tab' });
        assert.ok($id('prayers-tab').classList.contains('active'));
    });

    test('7. знімає active/aria-selected з усіх кнопок і панелей перед активацією', () => {
        document.querySelectorAll('.tab-link').forEach(b => {
            b.classList.add('active');
            b.setAttribute('aria-selected', 'true');
        });
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('active'));

        restoreActiveTabUI({ [STORAGE_KEYS.POPUP_ACTIVE_TAB]: 'telegram-tab' });

        assert.equal(document.querySelectorAll('.tab-link.active').length, 1);
        assert.equal(document.querySelectorAll('.tab-content.active').length, 1);
        assert.equal(document.querySelectorAll('.tab-link[aria-selected="true"]').length, 1);
    });

    test('8. невідома вкладка: усе знято, нічого не активовано (без винятку)', () => {
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('active'));

        assert.doesNotThrow(() => restoreActiveTabUI({ [STORAGE_KEYS.POPUP_ACTIVE_TAB]: 'no-such-tab' }));

        assert.equal(document.querySelectorAll('.tab-link.active').length, 0);
        assert.equal(document.querySelectorAll('.tab-content.active').length, 0);
    });

    test('9. підвкладка: новий ключ має пріоритет, застосовується лише до відомих sheet id', () => {
        const [first, second] = SHEET_IDS;
        restoreActiveSubtabUI({
            [STORAGE_KEYS.POPUP_ACTIVE_SUBTAB]: second,
            tg_active_subtab: first
        });

        assert.ok(document.querySelector(`.subtab-button[data-sheet="${second}"]`).classList.contains('active'));
        assert.ok($id(`sheet-content-${second}`).classList.contains('active'));
        assert.ok(!$id(`sheet-content-${first}`).classList.contains('active'));
    });

    test('10. невідомий sheet id НЕ скидає поточний вибір (рання відсічка)', () => {
        const [first] = SHEET_IDS;
        document.querySelector(`.subtab-button[data-sheet="${first}"]`).classList.add('active');
        $id(`sheet-content-${first}`).classList.add('active');

        restoreActiveSubtabUI({ [STORAGE_KEYS.POPUP_ACTIVE_SUBTAB]: 'not-a-sheet' });

        assert.ok(document.querySelector(`.subtab-button[data-sheet="${first}"]`).classList.contains('active'));
        assert.ok($id(`sheet-content-${first}`).classList.contains('active'));
    });

    test('11. порожній result нічого не змінює', () => {
        assert.doesNotThrow(() => restoreActiveSubtabUI({}));
        assert.equal(document.querySelectorAll('.subtab-button.active').length, 0);
    });
});

describe('popup_ui_state_restorer — restoreTextareaSizesUI', () => {
    beforeEach(() => { document.body.innerHTML = SHELL_HTML; });
    afterEach(() => { document.body.innerHTML = ''; mock.restoreAll(); });

    test('12. застосовує ширину і висоту до кількох елементів', () => {
        restoreTextareaSizesUI({
            [STORAGE_KEYS.POPUP_TEXTAREA_SIZES]: {
                textArea1_oldText: { width: '300px', height: '200px' },
                textArea2_generatedRuText: { width: '400px', height: '300px' }
            }
        });

        assert.equal($id('textArea1_oldText').style.width, '300px');
        assert.equal($id('textArea1_oldText').style.height, '200px');
        assert.equal($id('textArea2_generatedRuText').style.width, '400px');
    });

    test('13. застосовує лише наявний вимір (частковий запис)', () => {
        restoreTextareaSizesUI({
            [STORAGE_KEYS.POPUP_TEXTAREA_SIZES]: { textArea1_oldText: { height: '120px' } }
        });

        assert.equal($id('textArea1_oldText').style.width, '');
        assert.equal($id('textArea1_oldText').style.height, '120px');
    });

    test('14. порожні рядки-виміри ігноруються', () => {
        restoreTextareaSizesUI({
            [STORAGE_KEYS.POPUP_TEXTAREA_SIZES]: { textArea1_oldText: { width: '', height: '' } }
        });

        assert.equal($id('textArea1_oldText').style.width, '');
        assert.equal($id('textArea1_oldText').style.height, '');
    });

    test('15. невідомий id пропускається без винятку', () => {
        assert.doesNotThrow(() => restoreTextareaSizesUI({
            [STORAGE_KEYS.POPUP_TEXTAREA_SIZES]: { 'missing-element': { width: '10px' } }
        }));
    });

    test('16. легасі-ключ tg_textarea_sizes підтримується', () => {
        restoreTextareaSizesUI({ tg_textarea_sizes: { textArea1_oldText: { width: '77px' } } });
        assert.equal($id('textArea1_oldText').style.width, '77px');
    });

    test('17. новий ключ має пріоритет над легасі', () => {
        restoreTextareaSizesUI({
            [STORAGE_KEYS.POPUP_TEXTAREA_SIZES]: { textArea1_oldText: { width: '11px' } },
            tg_textarea_sizes: { textArea1_oldText: { width: '99px' } }
        });
        assert.equal($id('textArea1_oldText').style.width, '11px');
    });

    test('18. без збережених розмірів нічого не змінюється', () => {
        restoreTextareaSizesUI({});
        assert.equal($id('textArea1_oldText').style.width, '');
    });
});

describe('popup_ui_state_restorer — restoreTranslitStateUI', () => {
    beforeEach(() => { document.body.innerHTML = SHELL_HTML; });
    afterEach(() => { document.body.innerHTML = ''; mock.restoreAll(); });

    test('19. відновлює обидва поля транслітерації', () => {
        restoreTranslitStateUI({
            [STORAGE_KEYS.POPUP_TRANSLIT_OLD]: 'старе',
            [STORAGE_KEYS.POPUP_TRANSLIT_NEW]: 'нове'
        });

        assert.equal($id('textArea1_oldText').value, 'старе');
        assert.equal($id('textArea2_generatedRuText').value, 'нове');
    });

    test('20. поля відновлюються незалежно одне від одного', () => {
        restoreTranslitStateUI({ [STORAGE_KEYS.POPUP_TRANSLIT_NEW]: 'лише нове' });

        assert.equal($id('textArea1_oldText').value, '');
        assert.equal($id('textArea2_generatedRuText').value, 'лише нове');
    });

    test('21. порожній рядок трактується як «немає значення» (не перезаписує)', () => {
        $id('textArea1_oldText').value = 'було';
        restoreTranslitStateUI({ [STORAGE_KEYS.POPUP_TRANSLIT_OLD]: '' });

        assert.equal($id('textArea1_oldText').value, 'було');
    });

    test('22. відсутні елементи в DOM не ламають відновлення', () => {
        document.body.innerHTML = '';
        assert.doesNotThrow(() => restoreTranslitStateUI({ [STORAGE_KEYS.POPUP_TRANSLIT_OLD]: 'x' }));
    });
});

describe('popup_ui_state_restorer — restoreScrollPositionsUI', () => {
    beforeEach(() => { document.body.innerHTML = SHELL_HTML; });
    afterEach(() => { document.body.innerHTML = ''; mock.restoreAll(); });

    test('23. відновлює вікно, спільні панелі та всі per-sheet контейнери', async () => {
        const scrollTo = mock.method(window, 'scrollTo', () => {});
        const [first] = SHEET_IDS;

        restoreScrollPositionsUI({
            [STORAGE_KEYS.POPUP_SCROLL_POSITIONS]: {
                window: 100,
                prayersResultDiv: 50,
                textArea1_oldText: 25,
                textArea2_generatedRuText: 75,
                [`finalResultDiv__${first}`]: 200,
                [`deletedLog__${first}`]: 150,
                [`oldList__${first}`]: 12,
                [`newTelegram__${first}`]: 34
            }
        });

        await new Promise(r => setTimeout(r, 180));

        assert.deepEqual(scrollTo.mock.calls[0].arguments, [0, 100]);
        assert.equal($id('prayersResultDiv').scrollTop, 50);
        assert.equal($id('textArea1_oldText').scrollTop, 25);
        assert.equal($id('textArea2_generatedRuText').scrollTop, 75);
        assert.equal($id(`finalResultDiv__${first}`).scrollTop, 200);
        assert.equal($id(`deletedLog__${first}`).scrollTop, 150);
        assert.equal($id(`oldList__${first}`).scrollTop, 12);
        assert.equal($id(`newTelegram__${first}`).scrollTop, 34);
    });

    test('24. відсутні значення дають scrollTop = 0', async () => {
        const [first] = SHEET_IDS;
        $id(`finalResultDiv__${first}`).scrollTop = 999;

        restoreScrollPositionsUI({ [STORAGE_KEYS.POPUP_SCROLL_POSITIONS]: { window: 0 } });
        await new Promise(r => setTimeout(r, 180));

        assert.equal($id(`finalResultDiv__${first}`).scrollTop, 0);
    });

    test('25. window відновлюється навіть при значенні 0 (перевірка на undefined)', async () => {
        const scrollTo = mock.method(window, 'scrollTo', () => {});

        restoreScrollPositionsUI({ [STORAGE_KEYS.POPUP_SCROLL_POSITIONS]: { window: 0 } });
        await new Promise(r => setTimeout(r, 180));

        assert.deepEqual(scrollTo.mock.calls[0].arguments, [0, 0]);
    });

    test('26. без ключа window вікно не скролиться', async () => {
        const scrollTo = mock.method(window, 'scrollTo', () => {});

        restoreScrollPositionsUI({ [STORAGE_KEYS.POPUP_SCROLL_POSITIONS]: { prayersResultDiv: 5 } });
        await new Promise(r => setTimeout(r, 180));

        assert.equal(scrollTo.mock.calls.length, 0);
        assert.equal($id('prayersResultDiv').scrollTop, 5);
    });

    test('27. легасі-ключ tg_scroll_positions підтримується', async () => {
        restoreScrollPositionsUI({ tg_scroll_positions: { prayersResultDiv: 7 } });
        await new Promise(r => setTimeout(r, 180));

        assert.equal($id('prayersResultDiv').scrollTop, 7);
    });

    test('28. без збережених позицій відкладена робота не планується', async () => {
        const scrollTo = mock.method(window, 'scrollTo', () => {});

        restoreScrollPositionsUI({});
        await new Promise(r => setTimeout(r, 180));

        assert.equal(scrollTo.mock.calls.length, 0);
    });
});

describe('popup_ui_state_rules — readStoredValue (чисте правило легасі-ключів)', () => {
    const KEY = 'syh:popup:thing';
    const LEGACY = 'tg_thing';

    test('29. повертає значення нового ключа, коли він є', () => {
        assert.equal(readStoredValue({ [KEY]: 'new', [LEGACY]: 'old' }, KEY, LEGACY), 'new');
    });

    test('30. падає на легасі-ключ, коли новий відсутній', () => {
        assert.equal(readStoredValue({ [LEGACY]: 'old' }, KEY, LEGACY), 'old');
    });

    test('31. null у новому ключі теж вмикає легасі (семантика ??)', () => {
        assert.equal(readStoredValue({ [KEY]: null, [LEGACY]: 'old' }, KEY, LEGACY), 'old');
    });

    test('32. falsy, але визначені значення НЕ вмикають легасі', () => {
        assert.equal(readStoredValue({ [KEY]: 0, [LEGACY]: 5 }, KEY, LEGACY), 0);
        assert.equal(readStoredValue({ [KEY]: '', [LEGACY]: 'x' }, KEY, LEGACY), '');
        assert.equal(readStoredValue({ [KEY]: false, [LEGACY]: true }, KEY, LEGACY), false);
    });

    test('33. немає жодного ключа -> undefined', () => {
        assert.equal(readStoredValue({}, KEY, LEGACY), undefined);
    });
});

describe('popup_ui_state_rules — buildScrollTargetIds', () => {
    test('34. спільні панелі йдуть першими у зафіксованому порядку', () => {
        const ids = buildScrollTargetIds([]);
        assert.deepEqual(ids, SHARED_SCROLL_TARGET_IDS);
        assert.deepEqual(SHARED_SCROLL_TARGET_IDS, [
            'prayersResultDiv', 'textArea1_oldText', 'textArea2_generatedRuText'
        ]);
    });

    test('35. для кожного аркуша додає 4 контейнери у зафіксованому порядку', () => {
        const ids = buildScrollTargetIds(['a', 'b']);

        assert.deepEqual(ids.slice(SHARED_SCROLL_TARGET_IDS.length), [
            'finalResultDiv__a', 'deletedLog__a', 'oldList__a', 'newTelegram__a',
            'finalResultDiv__b', 'deletedLog__b', 'oldList__b', 'newTelegram__b'
        ]);
    });

    test('36. довжина = спільні + 4 * кількість аркушів, без дублів', () => {
        const ids = buildScrollTargetIds(SHEET_IDS);

        assert.equal(ids.length, SHARED_SCROLL_TARGET_IDS.length + SHEET_SCROLL_ID_PREFIXES.length * SHEET_IDS.length);
        assert.equal(new Set(ids).size, ids.length);
    });

    test('37. ключ у сховищі збігається з id елемента (єдине джерело правди)', () => {
        assert.deepEqual(SHEET_SCROLL_ID_PREFIXES, [
            'finalResultDiv__', 'deletedLog__', 'oldList__', 'newTelegram__'
        ]);
    });
});

describe('popup_ui_state_appliers — точкові DOM-записи', () => {
    beforeEach(() => { document.body.innerHTML = SHELL_HTML; });
    afterEach(() => { document.body.innerHTML = ''; mock.restoreAll(); });

    test('38. applyStoredElementSizes застосовує обидва виміри', () => {
        applyStoredElementSizes({ textArea1_oldText: { width: '5px', height: '6px' } });

        assert.equal($id('textArea1_oldText').style.width, '5px');
        assert.equal($id('textArea1_oldText').style.height, '6px');
    });

    test('39. applyStoredElementSizes ігнорує неіснуючі id (не читає їхній запис)', () => {
        assert.doesNotThrow(() => applyStoredElementSizes({ nope: null }));
    });

    test('40. applyScrollTop без значення ставить 0', () => {
        $id('prayersResultDiv').scrollTop = 42;
        applyScrollTop('prayersResultDiv', undefined);

        assert.equal($id('prayersResultDiv').scrollTop, 0);
    });

    test('41. applyScrollTop для неіснуючого id — тиха відсутність дії', () => {
        assert.doesNotThrow(() => applyScrollTop('no-such-id', 10));
    });

    test('42. applyInputValue ігнорує порожні значення і неіснуючі елементи', () => {
        $id('sschoolName').value = 'було';

        applyInputValue('sschoolName', '');
        assert.equal($id('sschoolName').value, 'було');

        applyInputValue('sschoolName', 'стало');
        assert.equal($id('sschoolName').value, 'стало');

        assert.doesNotThrow(() => applyInputValue('no-such-id', 'x'));
    });
});
