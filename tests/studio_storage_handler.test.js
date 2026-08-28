import assert from 'node:assert';
import { test, describe, beforeEach, mock } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock();

const { StudioStorageController, createStorageChangeHandler } = await import('../youtube/studio/studio_storage_handler.ts');
const { getSheetCollectedStorageKey } = await import('../modules/storage.ts');
const { STORAGE_KEYS } = await import('../modules/storage_keys.ts');
const SHEET_IDS = (await import('../modules/sheets.ts')).SHEET_IDS;

describe('studio_storage_handler — StudioStorageController (характеризація)', () => {

    beforeEach(() => {
        installChromeMock({ storageData: {} });
    });

    test('1. конструктор реєструє обробники для базових ключів + по sheetId', () => {
        const ctrl = new StudioStorageController();
        // за замовчуванням увімкнено
        assert.strictEqual(ctrl.enabled, true);
        assert.deepStrictEqual(ctrl.caches, {
            videoSheetMap: {},
            buttonStates: {},
            checkboxStates: {},
            collectedItems: []
        });
        assert.deepStrictEqual(ctrl.sheetStatsMap, {});
    });

    test('2. loadStorageData заповнює кеші з нових ключів (syh: формат)', async () => {
        installChromeMock({
            storageData: {
                'syh:studio:video_sheet_map': { a: 'sheetA' },
                'syh:studio:button_state': { c1: 'question' },
                'syh:studio:checkbox_state': { c1: { checked: true, timestamp: 1 } },
                [getSheetCollectedStorageKey(SHEET_IDS.VP_SS)]: [
                    { type: 'prayer', text: 'x' },
                    { type: 'question', text: '🔹a\n🔹b' }
                ]
            }
        });

        const ctrl = new StudioStorageController();
        await ctrl.loadStorageData();

        assert.deepStrictEqual(ctrl.caches.videoSheetMap, { a: 'sheetA' });
        assert.deepStrictEqual(ctrl.caches.buttonStates, { c1: 'question' });
        assert.deepStrictEqual(ctrl.caches.checkboxStates, { c1: { checked: true, timestamp: 1 } });
        assert.strictEqual(ctrl.caches.collectedItems.length, 2);
    });

    test('3. enabled читається з канонічного ключа STORAGE_KEYS.STUDIO_ENABLED (syh:core:studio_enabled)', async () => {
        // Виправлено: контролер тепер читає той самий ключ, що й Options
        // (див. audit studio-enabled-storage-key-mismatch). Значення в
        // правильному ключі враховується.
        installChromeMock({
            storageData: {
                [STORAGE_KEYS.STUDIO_ENABLED]: false,
                [getSheetCollectedStorageKey(SHEET_IDS.VP_SS)]: []
            }
        });

        const ctrl = new StudioStorageController();
        await ctrl.loadStorageData();
        assert.strictEqual(ctrl.enabled, false);
    });

    test('4. відсутність ключа enabled -> enabled за замовчуванням true', async () => {
        installChromeMock({
            storageData: { [getSheetCollectedStorageKey(SHEET_IDS.VP_SS)]: [] }
        });
        const ctrl = new StudioStorageController();
        await ctrl.loadStorageData();
        assert.strictEqual(ctrl.enabled, true);
    });

    test('5. sheetStatsMap рахує питання (countQuestionsInText) і молитви', async () => {
        installChromeMock({
            storageData: {
                [getSheetCollectedStorageKey(SHEET_IDS.VP_SS)]: [
                    { type: 'question', text: '🔹a\n🔹b\n🔹c' },
                    { type: 'prayer', text: 'p' },
                    { type: 'question', text: 'z' } // без булетів -> 1
                ]
            }
        });
        const ctrl = new StudioStorageController();
        await ctrl.loadStorageData();
        // 3 булети + 1 питання без булетів = 4; молитов = 1
        assert.deepStrictEqual(ctrl.sheetStatsMap[SHEET_IDS.VP_SS], { questions: 4, prayers: 1 });
    });

    test('6. не-масив collected не ламає підрахунок (stats -> 0/0)', async () => {
        installChromeMock({
            storageData: { [getSheetCollectedStorageKey(SHEET_IDS.VP_SS)]: 'not-an-array' }
        });
        const ctrl = new StudioStorageController();
        await ctrl.loadStorageData();
        assert.deepStrictEqual(ctrl.sheetStatsMap[SHEET_IDS.VP_SS], { questions: 0, prayers: 0 });
        assert.strictEqual(ctrl.caches.collectedItems.length, 0);
    });

    test('7. collectedItems конкатенується з усіх sheetId у порядку їхнього переліку', async () => {
        installChromeMock({
            storageData: {
                [getSheetCollectedStorageKey(SHEET_IDS.VP_SS)]: [{ type: 'prayer', text: 'vp' }],
                [getSheetCollectedStorageKey(SHEET_IDS.OPARIN)]: [{ type: 'question', text: 'op' }]
            }
        });
        const ctrl = new StudioStorageController();
        await ctrl.loadStorageData();
        assert.strictEqual(ctrl.caches.collectedItems.length, 2);
        assert.strictEqual(ctrl.caches.collectedItems[0].text, 'vp');
        assert.strictEqual(ctrl.caches.collectedItems[1].text, 'op');
    });

    test('8. handleStorageChange викликає зареєстрований обробник для videoMap', async () => {
        const ctrl = new StudioStorageController();
        const schedule = mock.fn();
        ctrl.scheduleProcessComments = schedule;

        ctrl.handleStorageChange({ 'syh:studio:video_sheet_map': { newValue: { z: 'z' } } });
        assert.strictEqual(schedule.mock.calls.length, 1);
        assert.deepStrictEqual(ctrl.caches.videoSheetMap, { z: 'z' });
    });

    test('9. handleStorageChange для enabled змінює ctrl.enabled і кличе handleStateChange', async () => {
        const ctrl = new StudioStorageController();
        const stateChange = mock.fn();
        ctrl.handleStateChange = stateChange;

        ctrl.handleStorageChange({ [STORAGE_KEYS.STUDIO_ENABLED]: { newValue: false } });
        assert.strictEqual(ctrl.enabled, false);
        assert.strictEqual(stateChange.mock.calls.length, 1);
    });

    test('10. handleStorageChange викликає loadStorageData для collected-ключа sheetId', async () => {
        const ctrl = new StudioStorageController();
        // заміняємо loadStorageData на шпигун, бо справжній іде в chrome.storage
        const load = mock.fn(async () => {});
        ctrl.loadStorageData = load;

        ctrl.handleStorageChange({ [getSheetCollectedStorageKey(SHEET_IDS.VP_SS)]: { newValue: [] } });
        assert.strictEqual(load.mock.calls.length, 1);
    });

    test('11. createStorageChangeHandler делегує в controller.handleStorageChange', () => {
        const ctrl = new StudioStorageController();
        const spy = mock.fn();
        ctrl.handleStorageChange = spy;

        const handler = createStorageChangeHandler(ctrl);
        handler({ someKey: { newValue: 1 } });
        assert.strictEqual(spy.mock.calls.length, 1);
        assert.deepStrictEqual(spy.mock.calls[0].arguments[0], { someKey: { newValue: 1 } });
    });

    test('12. handleStorageChange ігнорує ключі без зареєстрованого обробника', () => {
        const ctrl = new StudioStorageController();
        const stateChange = mock.fn();
        ctrl.handleStateChange = stateChange;
        const schedule = mock.fn();
        ctrl.scheduleProcessComments = schedule;

        ctrl.handleStorageChange({ 'unknown:key': { newValue: 1 } });
        assert.strictEqual(stateChange.mock.calls.length, 0);
        assert.strictEqual(schedule.mock.calls.length, 0);
    });

    test('13. handleStorageChange коалесцить кілька collected-ключів в один loadStorageData', async () => {
        const ctrl = new StudioStorageController();
        const load = mock.fn(async () => {});
        ctrl.loadStorageData = load;

        ctrl.handleStorageChange({
            [getSheetCollectedStorageKey(SHEET_IDS.VP_SS)]: { newValue: [] },
            [getSheetCollectedStorageKey(SHEET_IDS.OPARIN)]: { newValue: [] }
        });
        assert.strictEqual(load.mock.calls.length, 1);
    });
});
