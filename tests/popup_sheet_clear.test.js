import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';

// ---------------------------------------------------------------------------
// Мінімальний DOM + chrome storage для Node
// ---------------------------------------------------------------------------

class FakeHTMLElement {
    constructor(id, tag = 'div') {
        this.id = id;
        this.tagName = tag.toUpperCase();
        this.style = {};
        this.value = '';
        this.innerHTML = '';
        this.textContent = '';
        this.open = false;
        this.listeners = {};
    }
    addEventListener(type, fn) {
        (this.listeners[type] ||= []).push(fn);
    }
    dispatch(type, evt = {}) {
        (this.listeners[type] || []).forEach(fn => fn.call(this, evt));
    }
}

global.HTMLElement = FakeHTMLElement;

let elements = new Map();
function el(id, tag) {
    if (!elements.has(id)) elements.set(id, new FakeHTMLElement(id, tag));
    return elements.get(id);
}

global.window = global;
global.document = {
    getElementById: (id) => elements.get(id) || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: (tag) => new FakeHTMLElement('', tag),
    addEventListener: () => {}
};

let storageStore = {};
let removedKeys = [];
global.chrome = {
    runtime: { id: 'test-extension-id' },
    storage: {
        local: {
            get: (keys, cb) => {
                const res = {};
                (Array.isArray(keys) ? keys : [keys]).forEach(k => { res[k] = storageStore[k]; });
                if (cb) cb(res);
            },
            set: (items, cb) => { Object.assign(storageStore, items); if (cb) cb(); },
            remove: (keys, cb) => {
                const arr = Array.isArray(keys) ? keys : [keys];
                removedKeys.push(...arr);
                arr.forEach(k => { delete storageStore[k]; });
                if (cb) cb();
            }
        },
        onChanged: { addListener: () => {} }
    }
};

let confirmAnswer = true;
let confirmCalls = [];
global.confirm = (message) => { confirmCalls.push(message); return confirmAnswer; };
global.alert = () => {};

const {
    CLEAR_SHEET_CONFIRM_MESSAGE,
    buildSheetInputIds,
    buildSheetClearStorageKeys,
    resetSheetInputFields,
    resetSheetLogSection,
    resetSheetDom,
    clearSheetState
} = await import('../popup/popup_listeners.ts');

const {
    persistSheetValue,
    bindSheetDetailsToggle,
    bindSheetActionButtons,
    createSheetBindingTimers,
    SHEET_INPUT_DEBOUNCE_MS
} = await import('../popup/popup_sheet_bindings.ts');

const { POPUP_SHEET_KEYS, migrateKey } = await import('../modules/storage.ts');

const SID = 'vp_ss';

function seedSheetDom(sId) {
    elements = new Map();
    const ids = [
        `oldList__${sId}`, `answeredIds__${sId}`, `newTelegram__${sId}`,
        `finalResultDiv__${sId}`, `statsBar__${sId}`,
        `deletedLog__${sId}`, `deletedLogCount__${sId}`, `deletedLogDetails__${sId}`,
        `cleanedLog__${sId}`, `cleanedLogCount__${sId}`, `cleanedLogDetails__${sId}`,
        `oldTotalCount__${sId}`, `tgTotalCountAll__${sId}`,
        `clearStateBtn__${sId}`, `clearYTCollected__${sId}`
    ];
    ids.forEach(id => el(id));

    el(`oldList__${sId}`).value = 'старий список';
    el(`answeredIds__${sId}`).value = '1,2,3';
    el(`newTelegram__${sId}`).value = 'нові питання';
    el(`finalResultDiv__${sId}`).innerHTML = '<b>результат</b>';
    el(`statsBar__${sId}`).style.display = 'flex';
    el(`deletedLog__${sId}`).innerHTML = '<div>видалено</div>';
    el(`deletedLogCount__${sId}`).textContent = '(5)';
    el(`deletedLogDetails__${sId}`).style.display = 'block';
    el(`cleanedLog__${sId}`).innerHTML = '<div>очищено</div>';
    el(`cleanedLogCount__${sId}`).textContent = '(2)';
    el(`cleanedLogDetails__${sId}`).style.display = 'block';
    el(`oldTotalCount__${sId}`).textContent = '10';
    el(`tgTotalCountAll__${sId}`).textContent = '20';
}

describe('popup_sheet_clear — чисті будівники ключів', () => {
    test('1. buildSheetInputIds повертає 3 поля вводу аркуша', () => {
        assert.deepEqual(buildSheetInputIds(SID), [
            'oldList__vp_ss', 'answeredIds__vp_ss', 'newTelegram__vp_ss'
        ]);
    });

    test('2. buildSheetClearStorageKeys містить канонічні + legacy tg_-ключі без дублів', () => {
        const keys = buildSheetClearStorageKeys(SID);

        assert.equal(keys.length, 28, '14 пар (канонічний + legacy)');
        assert.equal(new Set(keys).size, keys.length, 'дублікатів немає');

        // Канонічні ключі беруться саме з POPUP_SHEET_KEYS (single source of truth)
        assert.ok(keys.includes(POPUP_SHEET_KEYS.oldList(SID)));
        assert.ok(keys.includes(POPUP_SHEET_KEYS.answered(SID)));
        assert.ok(keys.includes(POPUP_SHEET_KEYS.newTelegram(SID)));
        assert.ok(keys.includes(POPUP_SHEET_KEYS.finalResultHtml(SID)));
        assert.ok(keys.includes(POPUP_SHEET_KEYS.cleanedLogDetailsOpen(SID)));

        // Legacy-дзеркало
        assert.ok(keys.includes(`tg_oldList__${SID}`));
        assert.ok(keys.includes(`tg_cleanedLogDetailsOpen__${SID}`));

        const legacy = keys.filter(k => k.startsWith('tg_'));
        assert.equal(legacy.length, 14, 'кожен канонічний ключ має legacy-пару');
    });

    test('2b. кожен legacy tg_-ключ мігрує рівно у свій канонічний ключ', () => {
        const keys = buildSheetClearStorageKeys(SID);
        const canonical = new Set(keys.map(migrateKey));

        assert.equal(canonical.size, 14, 'після міграції лишається 14 унікальних ключів');
        assert.equal(migrateKey(`tg_oldList__${SID}`), POPUP_SHEET_KEYS.oldList(SID));
        assert.equal(migrateKey(`tg_finalResultHtml__${SID}`), POPUP_SHEET_KEYS.finalResultHtml(SID));
        assert.equal(migrateKey(`tg_deletedLogDetailsOpen__${SID}`), POPUP_SHEET_KEYS.deletedLogDetailsOpen(SID));
    });

    test('3. buildSheetClearStorageKeys ізольований по sheetId', () => {
        const a = buildSheetClearStorageKeys('vp_ss');
        const b = buildSheetClearStorageKeys('oparin');
        assert.equal(a.filter(k => b.includes(k)).length, 0, 'ключі різних аркушів не перетинаються');
    });
});

describe('popup_sheet_clear — скидання DOM', () => {
    beforeEach(() => { seedSheetDom(SID); });

    test('4. resetSheetInputFields очищає лише текстові поля', () => {
        resetSheetInputFields(SID);
        assert.equal(el(`oldList__${SID}`).value, '');
        assert.equal(el(`answeredIds__${SID}`).value, '');
        assert.equal(el(`newTelegram__${SID}`).value, '');
        assert.equal(el(`finalResultDiv__${SID}`).innerHTML, '<b>результат</b>', 'результат не чіпаємо');
    });

    test('5. resetSheetLogSection скидає вміст, лічильник і ховає details', () => {
        resetSheetLogSection('deleted', SID);
        assert.equal(el(`deletedLog__${SID}`).innerHTML, '');
        assert.equal(el(`deletedLogCount__${SID}`).textContent, '');
        assert.equal(el(`deletedLogDetails__${SID}`).style.display, 'none');

        assert.equal(el(`cleanedLog__${SID}`).innerHTML, '<div>очищено</div>', 'cleaned не зачеплено');

        resetSheetLogSection('cleaned', SID);
        assert.equal(el(`cleanedLog__${SID}`).innerHTML, '');
        assert.equal(el(`cleanedLogCount__${SID}`).textContent, '');
        assert.equal(el(`cleanedLogDetails__${SID}`).style.display, 'none');
    });

    test('6. resetSheetDom очищає всю візуальну частину аркуша', () => {
        resetSheetDom(SID);

        assert.equal(el(`oldList__${SID}`).value, '');
        assert.equal(el(`finalResultDiv__${SID}`).innerHTML, '');
        assert.equal(el(`statsBar__${SID}`).style.display, 'none');
        assert.equal(el(`deletedLog__${SID}`).innerHTML, '');
        assert.equal(el(`cleanedLog__${SID}`).innerHTML, '');
        assert.equal(el(`oldTotalCount__${SID}`).textContent, '');
        assert.equal(el(`tgTotalCountAll__${SID}`).textContent, '');
    });

    test('7. resetSheetDom не падає, коли DOM-елементів немає', () => {
        elements = new Map();
        assert.doesNotThrow(() => resetSheetDom('oparin'));
    });
});

describe('popup_listeners — clearSheetState', () => {
    beforeEach(() => {
        seedSheetDom(SID);
        storageStore = {};
        removedKeys = [];
        confirmCalls = [];
        confirmAnswer = true;
        buildSheetClearStorageKeys(SID).forEach(k => { storageStore[migrateKey(k)] = 'значення'; });
    });

    test('8. відмова в confirm() повністю скасовує очищення', () => {
        confirmAnswer = false;

        clearSheetState(SID);

        assert.equal(confirmCalls.length, 1);
        assert.equal(confirmCalls[0], CLEAR_SHEET_CONFIRM_MESSAGE);
        assert.equal(removedKeys.length, 0, 'storage не чіпали');
        assert.equal(el(`oldList__${SID}`).value, 'старий список', 'DOM не чіпали');
    });

    test('9. підтвердження очищає DOM і видаляє всі ключі аркуша зі storage', () => {
        confirmAnswer = true;

        clearSheetState(SID);

        assert.equal(el(`oldList__${SID}`).value, '');
        assert.equal(el(`answeredIds__${SID}`).value, '');
        assert.equal(el(`newTelegram__${SID}`).value, '');
        assert.equal(el(`finalResultDiv__${SID}`).innerHTML, '');
        assert.equal(el(`statsBar__${SID}`).style.display, 'none');

        for (const key of buildSheetClearStorageKeys(SID)) {
            const canonical = migrateKey(key);
            assert.ok(removedKeys.includes(canonical), `ключ ${key} -> ${canonical} видалено`);
            assert.equal(storageStore[canonical], undefined);
        }
    });

    test('10. clearSheetState не зачіпає інші аркуші', () => {
        const otherKey = POPUP_SHEET_KEYS.oldList('oparin');
        storageStore[otherKey] = 'дані іншого аркуша';

        clearSheetState(SID);

        assert.equal(storageStore[otherKey], 'дані іншого аркуша');
        assert.ok(!removedKeys.includes(otherKey));
    });
});

describe('popup_sheet_bindings — прив\'язка слухачів аркуша', () => {
    beforeEach(() => {
        seedSheetDom(SID);
        storageStore = {};
        confirmCalls = [];
        confirmAnswer = false;
    });

    test('11. persistSheetValue пише і канонічний, і legacy ключ (обидва мігрують в один)', () => {
        persistSheetValue(POPUP_SHEET_KEYS.oldList(SID), `tg_oldList__${SID}`, 'текст');

        // legacy `tg_*` мігрує у канонічний ключ -> у storage лишається одне джерело правди
        assert.equal(storageStore[POPUP_SHEET_KEYS.oldList(SID)], 'текст');
        assert.equal(migrateKey(`tg_oldList__${SID}`), POPUP_SHEET_KEYS.oldList(SID));
        assert.equal(Object.keys(storageStore).length, 1, 'жодного дубля legacy-ключа у storage');
    });

    test('12. bindSheetDetailsToggle зберігає стан <details> для обох секцій логів', () => {
        bindSheetDetailsToggle('deleted', SID);
        bindSheetDetailsToggle('cleaned', SID);

        const deletedDetails = el(`deletedLogDetails__${SID}`);
        deletedDetails.open = true;
        deletedDetails.dispatch('toggle');

        assert.equal(storageStore[POPUP_SHEET_KEYS.deletedLogDetailsOpen(SID)], true);

        const cleanedDetails = el(`cleanedLogDetails__${SID}`);
        cleanedDetails.open = false;
        cleanedDetails.dispatch('toggle');

        assert.equal(storageStore[POPUP_SHEET_KEYS.cleanedLogDetailsOpen(SID)], false);
        assert.equal(storageStore[POPUP_SHEET_KEYS.deletedLogDetailsOpen(SID)], true, 'секції не перетирають одна одну');
    });

    test('13. bindSheetActionButtons вішає клік, що викликає clearSheetState', () => {
        bindSheetActionButtons(SID);

        el(`clearStateBtn__${SID}`).dispatch('click');

        assert.equal(confirmCalls.length, 1, 'clearSheetState викликано (питає підтвердження)');
        assert.equal(confirmCalls[0], CLEAR_SHEET_CONFIRM_MESSAGE);
    });

    test('14. createSheetBindingTimers дає ізольовані мапи таймерів', () => {
        const timers = createSheetBindingTimers();
        assert.deepEqual(Object.keys(timers).sort(), ['answeredIds', 'finalResult', 'newTelegram', 'oldList']);
        Object.values(timers).forEach(m => assert.ok(m instanceof Map));

        timers.oldList.set(SID, 1);
        assert.equal(timers.newTelegram.size, 0, 'мапи не спільні');
        assert.equal(SHEET_INPUT_DEBOUNCE_MS, 300);
    });
});
