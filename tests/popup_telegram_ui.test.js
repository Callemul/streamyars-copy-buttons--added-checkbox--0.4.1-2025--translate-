// tests/popup_telegram_ui.test.js
//
// Характеристичні (characterization) тести для публічного API
// `popup/popup_telegram.ts`.
//
// Мета: зафіксувати поведінку 1-в-1 ПЕРЕД рефакторингом. За звітом Fallow це
// хотспот №1 усього проєкту (churn-score 51.2, 616 рядків, fan-in 6, функція
// `processTelegramData` — 56 LOC).
//
// Тести навмисно перевіряють спостережуваний результат у DOM та у storage,
// а не внутрішні приватні хелпери, тому мають лишатися зеленими після
// розбиття файлу на дрібніші модулі.

import assert from 'node:assert';
import { test, describe, beforeEach } from 'node:test';
import { installChromeMock } from './setup/chrome_mock.ts';

let storageStore = {};

const chromeMock = installChromeMock({
    storageImpl: {
        get: (keys, cb) => {
            const list = Array.isArray(keys) ? keys : [keys];
            const out = {};
            for (const k of list) if (k in storageStore) out[k] = storageStore[k];
            if (cb) cb(out);
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
chromeMock.storage.onChanged = { addListener() {}, removeListener() {} };

const {
    formatStatLabel,
    ensureStatsBarRows,
    clearFinalResult,
    updateOldInputStats,
    updateCombinedCounters,
    updateNewInputStats,
    updateRightColumnStats,
    getCollectedItemsForSheet,
    loadYTCollected,
    deleteYTCollectedItem,
    processTelegramData,
    saveTelegramSheetState
} = await import('../popup/popup_telegram.ts');

const SHEET = 'vp_ss';
const collectedKey = (id) => `syh:popup:collected:${id}`;

/** Будує DOM-каркас одного аркуша попапу з усіма id, яких торкається модуль. */
function buildSheetFixture(sheetId = SHEET) {
    document.body.innerHTML = `
        <textarea id="oldList__${sheetId}"></textarea>
        <span id="oldTotalCount__${sheetId}"></span>
        <textarea id="newTelegram__${sheetId}"></textarea>
        <input id="answeredIds__${sheetId}" />

        <span id="tgTotalCountLeft__${sheetId}"></span>
        <span id="tgTotalCountRight__${sheetId}"></span>
        <span id="tgTotalCountAll__${sheetId}"></span>

        <div id="statsBar__${sheetId}">
            <div class="stat-item old">Було: <b id="countOld__${sheetId}">0</b></div>
            <div class="stat-item del">Видалено: <b id="countDel__${sheetId}">0</b></div>
            <div class="stat-item new">Нові з лівої: <b id="countNewLeft__${sheetId}">0</b></div>
            <div class="stat-item total">Разом: <b id="countTotal__${sheetId}">0</b></div>
        </div>

        <div id="finalResultDiv__${sheetId}"></div>
        <div id="ytCollectedList__${sheetId}"></div>

        <details id="deletedLogDetails__${sheetId}">
            <summary>Видалення <span id="deletedLogCount__${sheetId}"></span></summary>
            <div id="deletedLog__${sheetId}"></div>
        </details>
        <details id="cleanedLogDetails__${sheetId}">
            <summary>Очищення <span id="cleanedLogCount__${sheetId}"></span></summary>
            <div id="cleanedLog__${sheetId}"></div>
        </details>
    `;
}

const $id = (id) => document.getElementById(id);
const textOf = (id) => ($id(id)?.textContent ?? null);

beforeEach(() => {
    storageStore = {};
    buildSheetFixture();
});

describe('popup_telegram — formatStatLabel (чиста функція)', () => {
    test('1. базовий формат без молитов', () => {
        assert.equal(formatStatLabel(3, 5, 0), '3 люд. - 5 пит.');
    });

    test('2. молитви додаються лише коли їх більше нуля', () => {
        assert.equal(formatStatLabel(3, 5, 2), '3 люд. - 5 пит. | Молитви: 2');
        assert.equal(formatStatLabel(0, 0, 0), '0 люд. - 0 пит.');
    });

    test('3. префікс підставляється на початок', () => {
        assert.equal(formatStatLabel(1, 1, 1, 'Разом: '), 'Разом: 1 люд. - 1 пит. | Молитви: 1');
        assert.equal(formatStatLabel(1, 1, 0, 'Разом: '), 'Разом: 1 люд. - 1 пит.');
    });

    test('4. від\'ємна кількість молитов не додає секцію', () => {
        assert.equal(formatStatLabel(1, 1, -1), '1 люд. - 1 пит.');
    });
});

describe('popup_telegram — ensureStatsBarRows', () => {
    test('5. перебудовує панель у три рядки і додає блок "Нові з YouTube"', () => {
        ensureStatsBarRows(SHEET);

        const bar = $id(`statsBar__${SHEET}`);
        const rows = bar.querySelectorAll('.stats-row');
        assert.equal(rows.length, 3);
        assert.ok(rows[1].classList.contains('new-row'));
        assert.ok(rows[2].classList.contains('total-row'));
        assert.ok($id(`countNewYT__${SHEET}`), 'має з\'явитись лічильник "Нові з YouTube"');
    });

    test('6. зберігає наявні елементи-лічильники (не пересоздає їх)', () => {
        const oldCounter = $id(`countOld__${SHEET}`);
        ensureStatsBarRows(SHEET);
        assert.strictEqual($id(`countOld__${SHEET}`), oldCounter, 'вузол countOld має бути перенесений, а не замінений');
    });

    test('7. ідемпотентний: повторний виклик не додає нових рядків', () => {
        ensureStatsBarRows(SHEET);
        ensureStatsBarRows(SHEET);
        assert.equal($id(`statsBar__${SHEET}`).querySelectorAll('.stats-row').length, 3);
    });

    test('8. відсутня панель не спричиняє винятку', () => {
        document.body.innerHTML = '';
        assert.doesNotThrow(() => ensureStatsBarRows(SHEET));
    });
});

describe('popup_telegram — clearFinalResult', () => {
    test('9. очищає контейнер результату і зберігає порожній HTML у стан аркуша', () => {
        $id(`finalResultDiv__${SHEET}`).innerHTML = '<div>щось</div>';

        clearFinalResult(SHEET);

        assert.equal($id(`finalResultDiv__${SHEET}`).innerHTML, '');
        const persisted = JSON.stringify(storageStore);
        assert.ok(persisted.includes('finalResultHtml'), 'стан аркуша має бути записаний у storage');
    });

    test('10. відсутній контейнер не блокує збереження стану', () => {
        document.body.innerHTML = '';
        assert.doesNotThrow(() => clearFinalResult(SHEET));
    });
});

describe('popup_telegram — updateOldInputStats', () => {
    test('11. порожній список -> лічильник очищається', () => {
        $id(`oldTotalCount__${SHEET}`).textContent = 'застаріле';

        updateOldInputStats(SHEET);

        assert.equal(textOf(`oldTotalCount__${SHEET}`), '');
    });

    test('12. рахує людей, питання і молитви та застосовує інлайн-стилі', () => {
        $id(`oldList__${SHEET}`).value = '1️⃣\n@John\nWhat is faith?\n\n2️⃣\n@Mary\nWhat is hope?';

        updateOldInputStats(SHEET);

        const el = $id(`oldTotalCount__${SHEET}`);
        assert.equal(el.textContent, '(2 люд. - 2 пит. | Молитви: 0)');
        assert.equal(el.style.color, '#2b7de9');
        assert.equal(el.style.fontWeight, 'bold');
        assert.equal(el.style.fontSize, '12px');
    });

    test('13. побічно очищає фінальний результат (контракт "введення інвалідовує вивід")', () => {
        $id(`finalResultDiv__${SHEET}`).innerHTML = '<div>старий вивід</div>';
        $id(`oldList__${SHEET}`).value = '1️⃣\n@John\nQ?';

        updateOldInputStats(SHEET);

        assert.equal($id(`finalResultDiv__${SHEET}`).innerHTML, '');
    });
});

describe('popup_telegram — updateCombinedCounters', () => {
    test('14. порожні дані ховають бейджі Кроку 3', () => {
        updateCombinedCounters(SHEET);

        assert.equal($id(`tgTotalCountLeft__${SHEET}`).style.display, 'none');
        assert.equal($id(`tgTotalCountRight__${SHEET}`).style.display, 'none');
        assert.equal($id(`tgTotalCountAll__${SHEET}`).style.display, 'none');
    });

    test('15. текст із лівої колонки заповнює лівий бейдж і робить його видимим', () => {
        $id(`newTelegram__${SHEET}`).value = '1️⃣\n@John\nWhat is faith?\n\n2️⃣\n@Mary\nWhat is hope?';

        updateCombinedCounters(SHEET);

        const left = $id(`tgTotalCountLeft__${SHEET}`);
        assert.equal(left.style.display, '');
        assert.equal(left.textContent, '2 люд. - 2 пит.');
        assert.equal($id(`tgTotalCountRight__${SHEET}`).style.display, 'none', 'правий бейдж лишається схованим');
    });

    test('16. бейдж "Разом" береться в дужки', () => {
        $id(`newTelegram__${SHEET}`).value = '1️⃣\n@John\nWhat is faith?';

        updateCombinedCounters(SHEET);

        const all = $id(`tgTotalCountAll__${SHEET}`).textContent;
        assert.ok(all.startsWith('(') && all.endsWith(')'), `очікувались дужки, отримано: ${all}`);
        assert.ok(all.includes('Разом: '));
    });

    test('17. заповнює рядок панелі статистики (countOld / countDel / countTotal)', () => {
        $id(`oldList__${SHEET}`).value = '1️⃣\n@John\nWhat is faith?\n\n2️⃣\n@Mary\nWhat is hope?';
        $id(`answeredIds__${SHEET}`).value = '1';

        updateCombinedCounters(SHEET);

        assert.equal(textOf(`countOld__${SHEET}`), '1 люд. - 1 пит.', 'відповідене питання виключається');
        assert.equal(textOf(`countDel__${SHEET}`), '1 люд. - 1 пит.', 'відповідене питання потрапляє у "видалено"');
        assert.ok(textOf(`countTotal__${SHEET}`).includes('люд.'));
    });

    test('18. updateNewInputStats — тонкий псевдонім updateCombinedCounters', () => {
        $id(`newTelegram__${SHEET}`).value = '1️⃣\n@John\nWhat is faith?';

        updateNewInputStats(SHEET);

        assert.equal($id(`tgTotalCountLeft__${SHEET}`).textContent, '1 люд. - 1 пит.');
    });
});

describe('popup_telegram — YT-зібрані коментарі', () => {
    test('19. getCollectedItemsForSheet повертає порожній масив для невідомого аркуша', () => {
        assert.deepEqual(getCollectedItemsForSheet('no_such_sheet'), []);
    });

    test('20. loadYTCollected малює порожній стан, коли даних немає', () => {
        loadYTCollected(SHEET);

        const list = $id(`ytCollectedList__${SHEET}`);
        assert.equal(list.querySelectorAll('.yt-empty-msg').length, 1);
        assert.equal(list.textContent.trim(), 'Зібраних коментарів з YouTube немає');
    });

    test('21. loadYTCollected малює картки з автором, типом і текстом', () => {
        storageStore[collectedKey(SHEET)] = [
            { id: 'c1', author: 'Іван', text: 'Питання?', type: 'question' },
            { id: 'c2', author: '', text: 'Прошу молитви', type: 'prayer' }
        ];

        loadYTCollected(SHEET);

        const cards = $id(`ytCollectedList__${SHEET}`).querySelectorAll('.yt-collected-item');
        assert.equal(cards.length, 2);

        assert.ok(cards[0].classList.contains('is-question'));
        assert.equal(cards[0].getAttribute('data-id'), 'c1');
        assert.equal(cards[0].querySelector('.yt-item-author').textContent, 'Іван');
        assert.equal(cards[0].querySelector('.yt-item-type-badge').textContent, '❓ Питання');
        assert.equal(cards[0].querySelector('.yt-item-text').textContent, 'Питання?');

        assert.ok(cards[1].classList.contains('is-prayer'));
        assert.equal(cards[1].querySelector('.yt-item-author').textContent, 'Анонім', 'порожній автор -> "Анонім"');
        assert.equal(cards[1].querySelector('.yt-item-type-badge').textContent, '🙏 Молитва');
    });

    test('22. loadYTCollected наповнює кеш аркуша для getCollectedItemsForSheet', () => {
        storageStore[collectedKey(SHEET)] = [{ id: 'c1', author: 'A', text: 'Q?', type: 'question' }];

        loadYTCollected(SHEET);

        assert.equal(getCollectedItemsForSheet(SHEET).length, 1);
        assert.equal(getCollectedItemsForSheet(SHEET)[0].id, 'c1');
    });

    test('23. текст картки вставляється як textContent (без інтерпретації HTML)', () => {
        storageStore[collectedKey(SHEET)] = [
            { id: 'x', author: '<img src=x onerror=alert(1)>', text: '<b>жирний</b>', type: 'question' }
        ];

        loadYTCollected(SHEET);

        const card = $id(`ytCollectedList__${SHEET}`).querySelector('.yt-collected-item');
        assert.equal(card.querySelector('.yt-item-text').textContent, '<b>жирний</b>');
        assert.equal(card.querySelector('.yt-item-text').querySelectorAll('b').length, 0);
        assert.equal(card.querySelector('.yt-item-author').querySelectorAll('img').length, 0);
    });

    test('24. updateRightColumnStats рахує людей, питання і молитви з кешу', () => {
        storageStore[collectedKey(SHEET)] = [
            { id: 'c1', author: 'A', text: 'Q1?', type: 'question' },
            { id: 'c2', author: 'B', text: 'Молитва', type: 'prayer' },
            { id: 'c3', author: 'C', text: 'Q2?', type: 'question' }
        ];
        loadYTCollected(SHEET);

        assert.deepEqual(updateRightColumnStats(SHEET), { people: 3, questions: 2, prayers: 1 });
    });

    test('25. updateRightColumnStats для невідомого аркуша -> нулі', () => {
        assert.deepEqual(updateRightColumnStats('no_such_sheet'), { people: 0, questions: 0, prayers: 0 });
    });

    test('26. кнопка ✕ на картці видаляє елемент зі storage і прибирає стани кнопок', async () => {
        storageStore[collectedKey(SHEET)] = [
            { id: 'c1', author: 'A', text: 'Q1?', type: 'question' },
            { id: 'c2', author: 'B', text: 'Q2?', type: 'question' }
        ];
        storageStore['syh:yt:button_states'] = { c1: 'copied', c2: 'copied' };
        storageStore['syh:studio:button_state'] = { c1: 'copied' };

        loadYTCollected(SHEET);
        $id(`ytCollectedList__${SHEET}`).querySelector('[data-id="c1"] .yt-item-del-btn').click();
        await new Promise(resolve => setTimeout(resolve, 0));

        assert.deepEqual(storageStore[collectedKey(SHEET)].map(i => i.id), ['c2']);
        assert.deepEqual(Object.keys(storageStore['syh:yt:button_states']), ['c2']);
        assert.deepEqual(Object.keys(storageStore['syh:studio:button_state']), []);
    });

    test('27. deleteYTCollectedItem для неіснуючого id лишає список без змін', async () => {
        storageStore[collectedKey(SHEET)] = [{ id: 'c1', author: 'A', text: 'Q?', type: 'question' }];

        await deleteYTCollectedItem('missing', SHEET);

        assert.equal(storageStore[collectedKey(SHEET)].length, 1);
    });

    test('28. видалення перемальовує список і чистить фінальний результат', async () => {
        storageStore[collectedKey(SHEET)] = [{ id: 'c1', author: 'A', text: 'Q?', type: 'question' }];
        loadYTCollected(SHEET);
        $id(`finalResultDiv__${SHEET}`).innerHTML = '<div>старе</div>';

        await deleteYTCollectedItem('c1', SHEET);

        assert.equal($id(`ytCollectedList__${SHEET}`).querySelectorAll('.yt-empty-msg').length, 1);
        assert.equal($id(`finalResultDiv__${SHEET}`).innerHTML, '');
    });
});

describe('popup_telegram — processTelegramData', () => {
    test('29. рендерить заголовки і пронумеровані блоки питань', () => {
        $id(`newTelegram__${SHEET}`).value = '1️⃣\n@John\nWhat is faith?\n\n2️⃣\n@Mary\nWhat is hope?';

        processTelegramData(SHEET);

        const out = $id(`finalResultDiv__${SHEET}`).textContent;
        assert.ok(out.includes('❓❓❓ВОПРОСЫ'), 'має бути заголовок питань');
        assert.ok(out.includes('What is faith?'));
        assert.ok(out.includes('What is hope?'));
    });

    test('30. порожній ввід -> порожній фінальний результат', () => {
        $id(`finalResultDiv__${SHEET}`).innerHTML = '<div>старе</div>';

        processTelegramData(SHEET);

        assert.equal($id(`finalResultDiv__${SHEET}`).innerHTML, '');
    });

    test('31. гарантує рядки панелі статистики і показує її', () => {
        processTelegramData(SHEET);

        assert.equal($id(`statsBar__${SHEET}`).querySelectorAll('.stats-row').length, 3);
        assert.equal($id(`statsBar__${SHEET}`).style.display, '');
    });

    test('32. порожній журнал видалень -> "Видалень немає" і лічильник (0)', () => {
        processTelegramData(SHEET);

        assert.equal($id(`deletedLog__${SHEET}`).textContent.trim(), 'Видалень немає');
        assert.equal(textOf(`deletedLogCount__${SHEET}`), '(0)');
        assert.equal($id(`cleanedLog__${SHEET}`).textContent.trim(), 'Очищених фраз чи нікнеймів немає');
        assert.equal(textOf(`cleanedLogCount__${SHEET}`), '(0)');
    });

    test('33. відповідені id потрапляють у журнал видалень із лічильником', () => {
        $id(`oldList__${SHEET}`).value = '1️⃣\n@John\nWhat is faith?\n\n2️⃣\n@Mary\nWhat is hope?';
        $id(`answeredIds__${SHEET}`).value = '1';

        processTelegramData(SHEET);

        const rows = $id(`deletedLog__${SHEET}`).querySelectorAll('.del-row');
        assert.equal(rows.length, 1);
        assert.ok(rows[0].textContent.includes('№1'));
        assert.ok(rows[0].textContent.includes('Видалено повністю'));
        assert.equal(textOf(`deletedLogCount__${SHEET}`), '(1)');
    });

    test('34. зберігає стан аркуша у storage після обробки', () => {
        $id(`newTelegram__${SHEET}`).value = '1️⃣\n@John\nWhat is faith?';

        processTelegramData(SHEET);

        assert.ok(Object.keys(storageStore).length > 0, 'стан має бути записаний');
    });

    test('35. повторний виклик не дублює блоки результату', () => {
        $id(`newTelegram__${SHEET}`).value = '1️⃣\n@John\nWhat is faith?';

        processTelegramData(SHEET);
        const firstCount = $id(`finalResultDiv__${SHEET}`).querySelectorAll('.q-block').length;
        processTelegramData(SHEET);
        const secondCount = $id(`finalResultDiv__${SHEET}`).querySelectorAll('.q-block').length;

        assert.equal(secondCount, firstCount);
    });

    test('36. saveTelegramSheetState приймає явний стан і не читає DOM', () => {
        assert.doesNotThrow(() => saveTelegramSheetState(SHEET, {
            oldList: 'x', newTelegram: '', answeredIds: '', finalResultHtml: ''
        }));
        assert.ok(Object.keys(storageStore).length > 0);
    });
});
