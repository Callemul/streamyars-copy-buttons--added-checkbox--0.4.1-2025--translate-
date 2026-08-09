import assert from 'node:assert';
import { test, describe, beforeEach, afterEach, mock } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

// NOTE: This suite runs under the Happy DOM global registrator (see tests/setup/happy-dom.ts).
// The previous version replaced `global.document` with hand-rolled element stubs, which broke as
// soon as the production code touched an API the stub lacked (e.g. `list.appendChild is not a
// function` from popup_telegram.loadYTCollected). We now render the *real* `#sheet-content-template`
// markup from popup/popup.html into a real DOM, so every element behaves like it does in Chrome.

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

const { STORAGE_KEYS, POPUP_SHEET_KEYS, getSheetCollectedStorageKey } = await import('../modules/storage.ts');
const { getAllSheetIds, SHEET_LABELS } = await import('../modules/sheets.ts');

const {
    renderSheetTemplates,
    buildPopupKeysToLoad,
    restoreDbState,
    restoreSingleSheetState,
    restoreActiveTabUI,
    restoreActiveSubtabUI,
    restoreTextareaSizesUI,
    restoreTranslitStateUI,
    restoreScrollPositionsUI,
    db,
    saveDataToStorage,
    loadData,
    saveData
} = await import('../popup/popup_state_restorer.ts');

const SHEET_IDS = getAllSheetIds();

// Mirrors the `#sheet-content-template` markup in popup/popup.html (trimmed to the
// hooks that renderSheetTemplates() rewires, which is what the restorers look up).
const SHEET_TEMPLATE_HTML = `
<template id="sheet-content-template">
    <div class="sheet-content" role="tabpanel">
        <label class="section-title">1. <span class="js-old-total-count"></span></label>
        <textarea class="js-old-list"></textarea>
        <input type="text" class="js-answered-ids">
        <span class="js-tg-total-count-all"></span>
        <div class="step3-columns js-step3-columns">
            <div class="step3-col js-step3-left">
                <span class="js-tg-total-count-left"></span>
                <textarea class="js-new-telegram"></textarea>
            </div>
            <div class="step3-divider js-step3-divider"></div>
            <div class="step3-col js-step3-right">
                <span class="js-tg-total-count-right"></span>
                <button class="js-clear-yt-collected"></button>
                <div class="yt-collected-list js-yt-collected-list"></div>
            </div>
        </div>
        <button class="js-process-btn"></button>
        <button class="js-clear-state-btn"></button>
        <div class="stats-bar js-stats-bar">
            <div class="stats-row">
                <div class="stat-item old">Залишилось старих: <b class="js-count-old">0</b></div>
                <div class="stat-item del">Видалено: <b class="js-count-del">0</b></div>
            </div>
            <div class="stats-row new-row">
                <div class="stat-item new">Нові з лівої: <span class="js-count-new-left">0</span></div>
                <div class="stat-item new-yt">Нові з YouTube: <b class="js-count-new-yt">0</b></div>
            </div>
            <div class="stats-row total-row">
                <div class="stat-item total">Разом: <b class="js-count-total">0</b></div>
            </div>
        </div>
        <button class="js-copy-result-btn"></button>
        <div class="rich-editor js-final-result-div" contenteditable="true"></div>
        <details class="js-deleted-log-details">
            <summary>🗑 <span class="log-count js-deleted-log-count"></span></summary>
            <div class="deleted-log js-deleted-log"></div>
        </details>
        <details class="js-cleaned-log-details">
            <summary>🧹 <span class="log-count js-cleaned-log-count"></span></summary>
            <div class="cleaned-log js-cleaned-log"></div>
        </details>
    </div>
</template>
<div id="sheet-contents-container"></div>
`;

// Shared (non per-sheet) popup chrome: tabs, subtabs and the translit textareas.
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
<input id="sschoolName" type="text">
<input id="preachNameInput" type="text">
<div id="prayersResultDiv"></div>
<textarea id="textArea1_oldText"></textarea>
<textarea id="textArea2_generatedRuText"></textarea>
`;

function buildPopupDom({ withTemplate = true } = {}) {
    document.body.innerHTML = SHELL_HTML + (withTemplate ? SHEET_TEMPLATE_HTML : '');
}

describe('popup_state_restorer tests', () => {
    beforeEach(() => {
        storageStore = {};
        globalThis.chrome.runtime.lastError = null;
        globalThis.chrome.storage.local.get.mock.resetCalls();
        globalThis.chrome.storage.local.set.mock.resetCalls();

        // Reset the shared db object
        Object.keys(db).forEach(k => delete db[k]);

        buildPopupDom();
    });

    afterEach(() => {
        mock.restoreAll();
        document.body.innerHTML = '';
        Object.keys(db).forEach(k => delete db[k]);
    });

    describe('renderSheetTemplates', () => {
        test('should do nothing if template or container not found', () => {
            document.body.innerHTML = SHELL_HTML; // no template, no container

            assert.doesNotThrow(() => renderSheetTemplates());
            assert.strictEqual(document.getElementById('sheet-contents-container'), null);
        });

        test('should render sheet templates for all sheet IDs', () => {
            renderSheetTemplates();

            const container = document.getElementById('sheet-contents-container');
            assert.strictEqual(container.children.length, SHEET_IDS.length);

            SHEET_IDS.forEach((sId, idx) => {
                const sheet = document.getElementById(`sheet-content-${sId}`);
                assert.ok(sheet, `sheet-content-${sId} should be rendered`);
                assert.strictEqual(sheet.getAttribute('aria-label'), SHEET_LABELS[sId] || sId);
                // Only the first sheet starts active
                assert.strictEqual(sheet.classList.contains('active'), idx === 0);
            });
        });

        test('should rewire template hooks to per-sheet element ids', () => {
            renderSheetTemplates();

            for (const sId of SHEET_IDS) {
                for (const id of [
                    `oldTotalCount__${sId}`, `oldList__${sId}`, `answeredIds__${sId}`,
                    `step3Columns__${sId}`, `step3Left__${sId}`, `step3Divider__${sId}`, `step3Right__${sId}`,
                    `newTelegram__${sId}`, `ytCollectedList__${sId}`, `statsBar__${sId}`,
                    `finalResultDiv__${sId}`, `deletedLogDetails__${sId}`, `deletedLogCount__${sId}`,
                    `deletedLog__${sId}`, `cleanedLogDetails__${sId}`, `cleanedLogCount__${sId}`, `cleanedLog__${sId}`
                ]) {
                    assert.ok(document.getElementById(id), `${id} should exist after rendering`);
                }
            }
        });
    });

    describe('buildPopupKeysToLoad', () => {
        test('should return base keys plus sheet-specific keys', () => {
            const sheetIds = ['vp_ss', 'oparin'];
            const keys = buildPopupKeysToLoad(sheetIds);

            // Check base keys
            assert.ok(keys.includes(STORAGE_KEYS.DB));
            assert.ok(keys.includes(STORAGE_KEYS.OPTIONS));
            assert.ok(keys.includes(STORAGE_KEYS.PRAYERS));
            assert.ok(keys.includes(STORAGE_KEYS.POPUP_ACTIVE_TAB));
            assert.ok(keys.includes(STORAGE_KEYS.POPUP_ACTIVE_SUBTAB));
            assert.ok(keys.includes(STORAGE_KEYS.POPUP_TEXTAREA_SIZES));
            assert.ok(keys.includes(STORAGE_KEYS.POPUP_TRANSLIT_OLD));
            assert.ok(keys.includes(STORAGE_KEYS.POPUP_TRANSLIT_NEW));
            assert.ok(keys.includes(STORAGE_KEYS.POPUP_SCROLL_POSITIONS));

            // Check sheet-specific keys
            sheetIds.forEach(sId => {
                assert.ok(keys.includes(POPUP_SHEET_KEYS.oldList(sId)));
                assert.ok(keys.includes(POPUP_SHEET_KEYS.answered(sId)));
                assert.ok(keys.includes(POPUP_SHEET_KEYS.newTelegram(sId)));
                assert.ok(keys.includes(POPUP_SHEET_KEYS.finalResultHtml(sId)));
                assert.ok(keys.includes(POPUP_SHEET_KEYS.statsHtml(sId)));
                assert.ok(keys.includes(POPUP_SHEET_KEYS.statsVisible(sId)));
                assert.ok(keys.includes(POPUP_SHEET_KEYS.deletedLogHtml(sId)));
                assert.ok(keys.includes(POPUP_SHEET_KEYS.deletedLogCount(sId)));
                assert.ok(keys.includes(POPUP_SHEET_KEYS.deletedLogDetailsVisible(sId)));
                assert.ok(keys.includes(POPUP_SHEET_KEYS.deletedLogDetailsOpen(sId)));
                assert.ok(keys.includes(POPUP_SHEET_KEYS.cleanedLogHtml(sId)));
                assert.ok(keys.includes(POPUP_SHEET_KEYS.cleanedLogCount(sId)));
                assert.ok(keys.includes(POPUP_SHEET_KEYS.cleanedLogDetailsVisible(sId)));
                assert.ok(keys.includes(POPUP_SHEET_KEYS.cleanedLogDetailsOpen(sId)));
                assert.ok(keys.includes(POPUP_SHEET_KEYS.dividerPos(sId)));
                assert.ok(keys.includes(getSheetCollectedStorageKey(sId)));
            });
        });

        test('should handle empty sheetIds array', () => {
            const keys = buildPopupKeysToLoad([]);
            assert.ok(keys.includes(STORAGE_KEYS.DB));
            assert.ok(keys.includes(STORAGE_KEYS.OPTIONS));
        });
    });

    describe('restoreDbState', () => {
        test('should restore DB state from result', () => {
            const result = {
                [STORAGE_KEYS.DB]: { newTitleSS: 'Test School', newTitlePreach: 'Test Preach' }
            };

            restoreDbState(result);

            assert.strictEqual(db.newTitleSS, 'Test School');
            assert.strictEqual(db.newTitlePreach, 'Test Preach');
            assert.strictEqual(document.getElementById('sschoolName').value, 'Test School');
            assert.strictEqual(document.getElementById('preachNameInput').value, 'Test Preach');
        });

        test('should handle missing DB in result', () => {
            assert.doesNotThrow(() => restoreDbState({}));
            assert.deepStrictEqual({ ...db }, {});
        });
    });

    describe('restoreSingleSheetState', () => {
        beforeEach(() => {
            renderSheetTemplates();
        });

        test('should call all sheet restoration functions', () => {
            const result = {
                [POPUP_SHEET_KEYS.oldList('vp_ss')]: 'old list data',
                [POPUP_SHEET_KEYS.answered('vp_ss')]: '1, 2',
                [POPUP_SHEET_KEYS.newTelegram('vp_ss')]: 'new telegram data',
                [POPUP_SHEET_KEYS.finalResultHtml('vp_ss')]: '<div>final</div>',
                [POPUP_SHEET_KEYS.statsVisible('vp_ss')]: true,
                [POPUP_SHEET_KEYS.statsHtml('vp_ss')]: '<div>stats</div>',
                [POPUP_SHEET_KEYS.deletedLogDetailsVisible('vp_ss')]: true,
                [POPUP_SHEET_KEYS.deletedLogHtml('vp_ss')]: '<div class="del-row">deleted</div>',
                [POPUP_SHEET_KEYS.deletedLogCount('vp_ss')]: 5,
                [POPUP_SHEET_KEYS.deletedLogDetailsOpen('vp_ss')]: true,
                [POPUP_SHEET_KEYS.cleanedLogDetailsVisible('vp_ss')]: true,
                [POPUP_SHEET_KEYS.cleanedLogHtml('vp_ss')]: '<div>cleaned</div>',
                [POPUP_SHEET_KEYS.cleanedLogCount('vp_ss')]: 3,
                [POPUP_SHEET_KEYS.cleanedLogDetailsOpen('vp_ss')]: false,
                [POPUP_SHEET_KEYS.dividerPos('vp_ss')]: 60
            };

            assert.doesNotThrow(() => restoreSingleSheetState('vp_ss', result));
        });

        test('should restore textarea values and inputs', () => {
            const result = {
                [POPUP_SHEET_KEYS.oldList('vp_ss')]: 'old list data',
                [POPUP_SHEET_KEYS.answered('vp_ss')]: '1, 3, 8.1',
                [POPUP_SHEET_KEYS.newTelegram('vp_ss')]: 'new telegram data'
            };

            restoreSingleSheetState('vp_ss', result);

            assert.strictEqual(document.getElementById('oldList__vp_ss').value, 'old list data');
            assert.strictEqual(document.getElementById('answeredIds__vp_ss').value, '1, 3, 8.1');
            assert.strictEqual(document.getElementById('newTelegram__vp_ss').value, 'new telegram data');
        });

        test('should restore the deleted-log details block', () => {
            const result = {
                [POPUP_SHEET_KEYS.deletedLogDetailsVisible('vp_ss')]: true,
                [POPUP_SHEET_KEYS.deletedLogHtml('vp_ss')]: '<div class="del-row">row</div>',
                [POPUP_SHEET_KEYS.deletedLogCount('vp_ss')]: 5,
                [POPUP_SHEET_KEYS.deletedLogDetailsOpen('vp_ss')]: true
            };

            restoreSingleSheetState('vp_ss', result);

            assert.strictEqual(document.getElementById('deletedLog__vp_ss').innerHTML, '<div class="del-row">row</div>');
            assert.strictEqual(document.getElementById('deletedLogCount__vp_ss').textContent, '(5)');
            assert.ok(document.getElementById('deletedLogDetails__vp_ss').hasAttribute('open'));
        });

        test('should clear the log count when the log is not visible', () => {
            restoreSingleSheetState('vp_ss', {});

            assert.strictEqual(document.getElementById('deletedLogCount__vp_ss').textContent, '');
            assert.strictEqual(document.getElementById('cleanedLogCount__vp_ss').textContent, '');
        });

        test('should restore the divider position', () => {
            restoreSingleSheetState('vp_ss', { [POPUP_SHEET_KEYS.dividerPos('vp_ss')]: 60 });

            // Browsers expand the `flex` shorthand, so assert on the flex-basis longhand.
            assert.strictEqual(document.getElementById('step3Left__vp_ss').style.flexBasis, '60%');
            assert.strictEqual(document.getElementById('step3Right__vp_ss').style.flexBasis, '40%');
        });

        test('should render the YouTube collected empty state', () => {
            restoreSingleSheetState('vp_ss', {});

            const list = document.getElementById('ytCollectedList__vp_ss');
            assert.strictEqual(list.children.length, 1);
            assert.strictEqual(list.children[0].className, 'yt-empty-msg');
        });

        test('should render collected YouTube items from storage', () => {
            storageStore[getSheetCollectedStorageKey('vp_ss')] = [
                { id: 'c1', type: 'question', author: 'Anna', text: 'First question' },
                { id: 'c2', type: 'prayer', author: 'Bob', text: 'Please pray' }
            ];

            restoreSingleSheetState('vp_ss', {});

            const list = document.getElementById('ytCollectedList__vp_ss');
            assert.strictEqual(list.children.length, 2);
            assert.ok(list.children[0].classList.contains('is-question'));
            assert.ok(list.children[1].classList.contains('is-prayer'));
        });
    });

    describe('restoreActiveTabUI', () => {
        test('should restore active tab UI', () => {
            restoreActiveTabUI({ [STORAGE_KEYS.POPUP_ACTIVE_TAB]: 'telegram-tab' });

            const active = document.querySelector('.tab-link[data-tab="telegram-tab"]');
            const inactive = document.querySelector('.tab-link[data-tab="prayers-tab"]');

            assert.ok(active.classList.contains('active'));
            assert.strictEqual(active.getAttribute('aria-selected'), 'true');
            assert.ok(!inactive.classList.contains('active'));
            assert.strictEqual(inactive.getAttribute('aria-selected'), 'false');
            assert.ok(document.getElementById('telegram-tab').classList.contains('active'));
            assert.ok(!document.getElementById('prayers-tab').classList.contains('active'));
        });

        test('should support the legacy tg_active_tab key', () => {
            restoreActiveTabUI({ tg_active_tab: 'prayers-tab' });

            assert.ok(document.getElementById('prayers-tab').classList.contains('active'));
        });

        test('should do nothing if activeTabVal not in result', () => {
            assert.doesNotThrow(() => restoreActiveTabUI({}));
            assert.ok(!document.getElementById('telegram-tab').classList.contains('active'));
        });
    });

    describe('restoreActiveSubtabUI', () => {
        beforeEach(() => {
            renderSheetTemplates();
        });

        test('should restore active subtab UI', () => {
            restoreActiveSubtabUI({ [STORAGE_KEYS.POPUP_ACTIVE_SUBTAB]: 'vp_ss' });

            const active = document.querySelector('.subtab-button[data-sheet="vp_ss"]');
            assert.ok(active.classList.contains('active'));
            assert.strictEqual(active.getAttribute('aria-selected'), 'true');
            assert.ok(document.getElementById('sheet-content-vp_ss').classList.contains('active'));

            const other = document.querySelector('.subtab-button[data-sheet="oparin"]');
            assert.ok(!other.classList.contains('active'));
            assert.ok(!document.getElementById('sheet-content-oparin').classList.contains('active'));
        });

        test('should ignore unknown sheet ids', () => {
            restoreActiveSubtabUI({ [STORAGE_KEYS.POPUP_ACTIVE_SUBTAB]: 'not-a-sheet' });

            // The first sheet keeps the `active` class rendered by renderSheetTemplates()
            assert.ok(document.getElementById(`sheet-content-${SHEET_IDS[0]}`).classList.contains('active'));
            assert.strictEqual(document.querySelectorAll('.subtab-button.active').length, 0);
        });
    });

    describe('restoreTextareaSizesUI', () => {
        test('should restore textarea sizes', () => {
            restoreTextareaSizesUI({
                [STORAGE_KEYS.POPUP_TEXTAREA_SIZES]: {
                    'textArea1_oldText': { width: '300px', height: '200px' },
                    'textArea2_generatedRuText': { width: '400px', height: '300px' }
                }
            });

            const ta1 = document.getElementById('textArea1_oldText');
            const ta2 = document.getElementById('textArea2_generatedRuText');

            assert.strictEqual(ta1.style.width, '300px');
            assert.strictEqual(ta1.style.height, '200px');
            assert.strictEqual(ta2.style.width, '400px');
            assert.strictEqual(ta2.style.height, '300px');
        });

        test('should skip ids that are not in the DOM', () => {
            assert.doesNotThrow(() => restoreTextareaSizesUI({
                [STORAGE_KEYS.POPUP_TEXTAREA_SIZES]: { 'missing-element': { width: '10px' } }
            }));
        });

        test('should do nothing without stored sizes', () => {
            restoreTextareaSizesUI({});
            assert.strictEqual(document.getElementById('textArea1_oldText').style.width, '');
        });
    });

    describe('restoreTranslitStateUI', () => {
        test('should restore transliteration state', () => {
            restoreTranslitStateUI({
                [STORAGE_KEYS.POPUP_TRANSLIT_OLD]: 'old text',
                [STORAGE_KEYS.POPUP_TRANSLIT_NEW]: 'new text'
            });

            assert.strictEqual(document.getElementById('textArea1_oldText').value, 'old text');
            assert.strictEqual(document.getElementById('textArea2_generatedRuText').value, 'new text');
        });

        test('should support the legacy translit keys', () => {
            restoreTranslitStateUI({ tg_translit_old: 'legacy old', tg_translit_new: 'legacy new' });

            assert.strictEqual(document.getElementById('textArea1_oldText').value, 'legacy old');
            assert.strictEqual(document.getElementById('textArea2_generatedRuText').value, 'legacy new');
        });
    });

    describe('restoreScrollPositionsUI', () => {
        test('should restore scroll positions', async () => {
            renderSheetTemplates();
            const scrollTo = mock.method(window, 'scrollTo', () => {});

            restoreScrollPositionsUI({
                [STORAGE_KEYS.POPUP_SCROLL_POSITIONS]: {
                    window: 100,
                    prayersResultDiv: 50,
                    textArea1_oldText: 25,
                    textArea2_generatedRuText: 75,
                    'finalResultDiv__vp_ss': 200,
                    'deletedLog__vp_ss': 150
                }
            });

            // restoreScrollPositionsUI defers the DOM writes by 100ms.
            await new Promise(resolve => setTimeout(resolve, 180));

            assert.deepStrictEqual(scrollTo.mock.calls[0].arguments, [0, 100]);
            assert.strictEqual(document.getElementById('prayersResultDiv').scrollTop, 50);
            assert.strictEqual(document.getElementById('textArea1_oldText').scrollTop, 25);
            assert.strictEqual(document.getElementById('textArea2_generatedRuText').scrollTop, 75);
            assert.strictEqual(document.getElementById('finalResultDiv__vp_ss').scrollTop, 200);
            assert.strictEqual(document.getElementById('deletedLog__vp_ss').scrollTop, 150);
            // Sheets without a stored value fall back to 0
            assert.strictEqual(document.getElementById('oldList__vp_ss').scrollTop, 0);
        });

        test('should do nothing without stored scroll positions', async () => {
            const scrollTo = mock.method(window, 'scrollTo', () => {});

            restoreScrollPositionsUI({});
            await new Promise(resolve => setTimeout(resolve, 180));

            assert.strictEqual(scrollTo.mock.calls.length, 0);
        });
    });

    describe('db and storage functions', () => {
        test('saveDataToStorage should call SYH_STORAGE.set', () => {
            db.testKey = 'testValue';
            saveDataToStorage();

            assert.ok(globalThis.chrome.storage.local.set.mock.calls.length > 0);
            assert.deepStrictEqual(storageStore[STORAGE_KEYS.DB], { testKey: 'testValue' });
        });

        test('loadData should return value from storage', async () => {
            // node:test exposes mockImplementationOnce() on the mock context
            // (the old `mock.implementationOnce` helper no longer exists).
            globalThis.chrome.storage.local.get.mock.mockImplementationOnce((keys, cb) => {
                cb({ [keys[0]]: 'loadedValue' });
            });

            const result = await loadData('testKey');

            assert.strictEqual(result, 'loadedValue');
        });

        test('loadData should read straight from the backing store', async () => {
            storageStore.testKey = 'storedValue';

            assert.strictEqual(await loadData('testKey'), 'storedValue');
            assert.strictEqual(await loadData('unknownKey'), undefined);
        });

        test('saveData should store value in storage', async () => {
            await saveData('testKey', 'testValue');

            assert.ok(globalThis.chrome.storage.local.set.mock.calls.length > 0);
            const call = globalThis.chrome.storage.local.set.mock.calls[0];
            assert.strictEqual(call.arguments[0]['testKey'], 'testValue');
            assert.strictEqual(storageStore.testKey, 'testValue');
        });
    });
});
