import assert from 'node:assert';
import { test, describe, beforeEach, mock } from 'node:test';

// Mock DOM
global.window = global;
global.document = {
    getElementById: mock.fn((id) => {
        const el = {
            id,
            textContent: '',
            innerHTML: '',
            value: '',
            style: {},
            classList: {
                add: () => {},
                remove: () => {},
                contains: () => false
            },
            setAttribute: () => {},
            removeAttribute: () => {},
            appendChild: () => {},
            querySelector: () => ({ id: '', setAttribute: () => {} }),
            querySelectorAll: () => [],
            cloneNode: () => el,
            firstElementChild: el,
            content: { firstElementChild: el }
        };
        return el;
    }),
    querySelectorAll: mock.fn(() => []),
    querySelector: mock.fn(),
    createElement: mock.fn(() => ({
        className: '',
        textContent: '',
        innerHTML: '',
        style: {},
        setAttribute: () => {},
        removeAttribute: () => {},
        appendChild: () => {},
        classList: { add: () => {}, remove: () => {} }
    }))
};

// Mock chrome storage
global.chrome = {
    runtime: { id: 'test-extension-id', lastError: null },
    storage: {
        local: {
            get: mock.fn((keys, cb) => cb({})),
            set: mock.fn((items, cb) => cb && cb()),
            remove: mock.fn((keys, cb) => cb && cb())
        }
    }
};

// Import modules after mocks
const { SYH_STORAGE, STORAGE_KEYS, POPUP_SHEET_KEYS, getSheetCollectedStorageKey } = await import('../modules/storage.ts');
const { getAllSheetIds, SHEET_LABELS } = await import('../modules/sheets.ts');

// Mock the popup_telegram functions - just stub them
const mockUpdateOldInputStats = () => {};
const mockUpdateNewInputStats = () => {};
const mockLoadYTCollected = () => {};
const mockEnsureStatsBarRows = () => {};

// Now import the module under test
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

describe('popup_state_restorer tests', () => {
    beforeEach(() => {
        global.chrome.runtime.lastError = null;
        global.chrome.storage.local.get.mock.resetCalls();
        global.chrome.storage.local.set.mock.resetCalls();
        
        // Reset db
        Object.keys(db).forEach(k => delete db[k]);
    });

    describe('renderSheetTemplates', () => {
        test('should do nothing if template or container not found', () => {
            global.document.getElementById = mock.fn((id) => {
                if (id === 'sheet-content-template' || id === 'sheet-contents-container') return null;
                return { 
                    id, 
                    textContent: '', 
                    innerHTML: '', 
                    value: '', 
                    style: {}, 
                    classList: { add: () => {}, remove: () => {} } 
                };
            });
            
            assert.doesNotThrow(() => renderSheetTemplates());
        });

        test('should render sheet templates for all sheet IDs', () => {
            const templateEl = {
                id: 'sheet-content-template',
                content: {
                    firstElementChild: {
                        cloneNode: () => ({
                            id: '',
                            setAttribute: () => {},
                            classList: { add: () => {} },
                            querySelector: () => ({ id: '', setAttribute: () => {} }),
                            appendChild: () => {}
                        })
                    }
                }
            };
            const containerEl = { appendChild: () => {} };
            
            global.document.getElementById = mock.fn((id) => {
                if (id === 'sheet-content-template') return templateEl;
                if (id === 'sheet-contents-container') return containerEl;
                return { 
                    id, 
                    textContent: '', 
                    innerHTML: '', 
                    value: '', 
                    style: {}, 
                    classList: { add: () => {}, remove: () => {} } 
                };
            });
            
            assert.doesNotThrow(() => renderSheetTemplates());
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
            
            // Mock DOM elements
            const sschoolNameEl = { value: '', id: 'sschoolName' };
            const preachNameEl = { value: '', id: 'preachNameInput' };
            global.document.getElementById = mock.fn((id) => {
                if (id === 'sschoolName') return sschoolNameEl;
                if (id === 'preachNameInput') return preachNameEl;
                return null;
            });
            
            restoreDbState(result);
            
            assert.strictEqual(db.newTitleSS, 'Test School');
            assert.strictEqual(db.newTitlePreach, 'Test Preach');
            assert.strictEqual(sschoolNameEl.value, 'Test School');
            assert.strictEqual(preachNameEl.value, 'Test Preach');
        });

        test('should handle missing DB in result', () => {
            const result = {};
            assert.doesNotThrow(() => restoreDbState(result));
        });
    });

    describe('restoreSingleSheetState', () => {
        test('should call all sheet restoration functions', () => {
            const result = {
                [POPUP_SHEET_KEYS.oldList('vp_ss')]: 'old list data',
                [POPUP_SHEET_KEYS.answered('vp_ss')]: 'answered data',
                [POPUP_SHEET_KEYS.newTelegram('vp_ss')]: 'new telegram data',
                [POPUP_SHEET_KEYS.finalResultHtml('vp_ss')]: '<div>final</div>',
                [POPUP_SHEET_KEYS.statsVisible('vp_ss')]: true,
                [POPUP_SHEET_KEYS.statsHtml('vp_ss')]: '<div>stats</div>',
                [POPUP_SHEET_KEYS.deletedLogDetailsVisible('vp_ss')]: true,
                [POPUP_SHEET_KEYS.deletedLogHtml('vp_ss')]: '<div>deleted</div>',
                [POPUP_SHEET_KEYS.deletedLogCount('vp_ss')]: 5,
                [POPUP_SHEET_KEYS.deletedLogDetailsOpen('vp_ss')]: true,
                [POPUP_SHEET_KEYS.cleanedLogDetailsVisible('vp_ss')]: true,
                [POPUP_SHEET_KEYS.cleanedLogHtml('vp_ss')]: '<div>cleaned</div>',
                [POPUP_SHEET_KEYS.cleanedLogCount('vp_ss')]: 3,
                [POPUP_SHEET_KEYS.cleanedLogDetailsOpen('vp_ss')]: false,
                [POPUP_SHEET_KEYS.dividerPos('vp_ss')]: 60
            };
            
            // Mock DOM elements
            global.document.getElementById = mock.fn((id) => ({
                id,
                value: '',
                textContent: '',
                innerHTML: '',
                style: {},
                classList: { add: () => {}, remove: () => {} },
                setAttribute: () => {},
                removeAttribute: () => {},
                querySelectorAll: () => [],
                querySelector: () => null
            }));
            
            assert.doesNotThrow(() => restoreSingleSheetState('vp_ss', result));
        });
    });

    describe('restoreActiveTabUI', () => {
        test('should restore active tab UI', () => {
            const result = { [STORAGE_KEYS.POPUP_ACTIVE_TAB]: 'telegram-tab' };
            
            const tabLink1 = { 
                classList: { remove: () => {}, add: () => {} }, 
                setAttribute: () => {},
                getAttribute: () => 'prayers-tab' 
            };
            const tabLink2 = { 
                classList: { remove: () => {}, add: () => {} }, 
                setAttribute: () => {},
                getAttribute: () => 'telegram-tab' 
            };
            const tabContent1 = { classList: { remove: () => {}, add: () => {} } };
            const tabContent2 = { classList: { remove: () => {}, add: () => {} } };
            
            global.document.querySelectorAll = mock.fn((selector) => {
                if (selector === '.tab-link') return [tabLink1, tabLink2];
                if (selector === '.tab-content') return [tabContent1, tabContent2];
                return [];
            });
            
            global.document.querySelector = mock.fn((selector) => {
                if (selector.includes('data-tab="telegram-tab"')) return tabLink2;
                if (selector === '#telegram-tab') return tabContent2;
                return null;
            });
            
            restoreActiveTabUI(result);
            
            assert.ok(true);
        });

        test('should do nothing if activeTabVal not in result', () => {
            const result = {};
            assert.doesNotThrow(() => restoreActiveTabUI(result));
        });
    });

    describe('restoreActiveSubtabUI', () => {
        test('should restore active subtab UI', () => {
            const result = { [STORAGE_KEYS.POPUP_ACTIVE_SUBTAB]: 'vp_ss' };
            
            const subtabBtn1 = { 
                classList: { remove: () => {}, add: () => {} }, 
                setAttribute: () => {},
                getAttribute: () => 'oparin' 
            };
            const subtabBtn2 = { 
                classList: { remove: () => {}, add: () => {} }, 
                setAttribute: () => {},
                getAttribute: () => 'vp_ss' 
            };
            const sheetContent1 = { classList: { remove: () => {}, add: () => {} } };
            const sheetContent2 = { classList: { remove: () => {}, add: () => {} } };
            
            global.document.querySelectorAll = mock.fn((selector) => {
                if (selector === '.subtab-button') return [subtabBtn1, subtabBtn2];
                if (selector === '.sheet-content') return [sheetContent1, sheetContent2];
                return [];
            });
            
            global.document.querySelector = mock.fn((selector) => {
                if (selector.includes('data-sheet="vp_ss"')) return subtabBtn2;
                if (selector === '#sheet-content-vp_ss') return sheetContent2;
                return null;
            });
            
            restoreActiveSubtabUI(result);
            
            assert.ok(true);
        });
    });

    describe('restoreTextareaSizesUI', () => {
        test('should restore textarea sizes', () => {
            const result = {
                [STORAGE_KEYS.POPUP_TEXTAREA_SIZES]: {
                    'textArea1_oldText': { width: '300px', height: '200px' },
                    'textArea2_generatedRuText': { width: '400px', height: '300px' }
                }
            };
            
            const ta1 = { id: 'textArea1_oldText', style: {}, instanceof: true };
            const ta2 = { id: 'textArea2_generatedRuText', style: {}, instanceof: true };
            
            global.document.getElementById = mock.fn((id) => {
                if (id === 'textArea1_oldText') return ta1;
                if (id === 'textArea2_generatedRuText') return ta2;
                return null;
            });
            
            restoreTextareaSizesUI(result);
            
            assert.strictEqual(ta1.style.width, '300px');
            assert.strictEqual(ta1.style.height, '200px');
            assert.strictEqual(ta2.style.width, '400px');
            assert.strictEqual(ta2.style.height, '300px');
        });
    });

    describe('restoreTranslitStateUI', () => {
        test('should restore transliteration state', () => {
            const result = {
                [STORAGE_KEYS.POPUP_TRANSLIT_OLD]: 'old text',
                [STORAGE_KEYS.POPUP_TRANSLIT_NEW]: 'new text'
            };
            
            const ta1 = { id: 'textArea1_oldText', value: '' };
            const ta2 = { id: 'textArea2_generatedRuText', value: '' };
            
            global.document.getElementById = mock.fn((id) => {
                if (id === 'textArea1_oldText') return ta1;
                if (id === 'textArea2_generatedRuText') return ta2;
                return null;
            });
            
            restoreTranslitStateUI(result);
            
            assert.strictEqual(ta1.value, 'old text');
            assert.strictEqual(ta2.value, 'new text');
        });
    });

    describe('restoreScrollPositionsUI', () => {
        test('should restore scroll positions', () => {
            const result = {
                [STORAGE_KEYS.POPUP_SCROLL_POSITIONS]: {
                    window: 100,
                    prayersResultDiv: 50,
                    textArea1_oldText: 25,
                    textArea2_generatedRuText: 75,
                    'finalResultDiv__vp_ss': 200,
                    'deletedLog__vp_ss': 150
                }
            };
            
            const elements = {
                prayersResultDiv: { scrollTop: 0 },
                textArea1_oldText: { scrollTop: 0 },
                textArea2_generatedRuText: { scrollTop: 0 },
                'finalResultDiv__vp_ss': { scrollTop: 0 },
                'deletedLog__vp_ss': { scrollTop: 0 }
            };
            
            global.document.getElementById = mock.fn((id) => elements[id] || null);
            global.window.scrollTo = () => {};
            
            restoreScrollPositionsUI(result);
            
            assert.ok(true);
        });
    });

    describe('db and storage functions', () => {
        test('saveDataToStorage should call SYH_STORAGE.set', () => {
            db.testKey = 'testValue';
            saveDataToStorage();
            assert.ok(global.chrome.storage.local.set.mock.calls.length > 0);
        });

        test('loadData should return value from storage', async () => {
            global.chrome.storage.local.get.mock.implementationOnce((keys, cb) => {
                cb({ [keys[0]]: 'loadedValue' });
            });
            
            const result = await loadData('testKey');
            assert.strictEqual(result, 'loadedValue');
        });

        test('saveData should store value in storage', async () => {
            await saveData('testKey', 'testValue');
            assert.ok(global.chrome.storage.local.set.mock.calls.length > 0);
            const call = global.chrome.storage.local.set.mock.calls[0];
            assert.strictEqual(call.arguments[0]['testKey'], 'testValue');
        });
    });
});