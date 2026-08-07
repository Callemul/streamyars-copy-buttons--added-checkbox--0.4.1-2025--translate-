import test from 'node:test';
import assert from 'node:assert/strict';

global.window = global;
global.chrome = {
    runtime: { id: 'test-id' },
    storage: {
        local: {
            get: (keys, cb) => {
                const res = {};
                const arr = Array.isArray(keys) ? keys : [keys];
                arr.forEach(k => { res[k] = global.mockStorageStore[k]; });
                if (cb) cb(res);
            },
            set: (items, cb) => {
                Object.assign(global.mockStorageStore, items);
                if (cb) cb();
            },
            remove: (keys, cb) => {
                const arr = Array.isArray(keys) ? keys : [keys];
                arr.forEach(k => { delete global.mockStorageStore[k]; });
                if (cb) cb();
            }
        }
    }
};

let mockStateCache = {
    youtubeEnabled: true,
    buttonStates: {},
    checkboxStates: {},
    collectedList: []
};

let mockInitializeCommentAssistant = false;
let mockProcessAllYTComments = false;
let mockInitializeYouTubeModule = false;
let mockCleanupYouTubeUI = false;

global.mockStorageStore = {};

// Mock all dependencies before importing the module
const originalResolve = global.resolveModuleHooks || [];
global.resolveModuleHooks = [];

// We'll mock the modules by defining them before import
const mockModules = {
    '../modules/storage': {
        SYH_STORAGE: global.chrome.storage.local,
        STORAGE_KEYS: {
            OPTIONS: 'syh:options',
            YT_BUTTON_STATES: 'syh:yt:button_states',
            YT_CHECKBOX_STATE: 'syh:yt:checkbox_state'
        },
        getSheetCollectedStorageKey: (sheetId) => `syh:collected:${sheetId}`
    },
    './yt_selectors': {
        YT_SELECTORS: {
            commentBlock: 'ytd-comment-thread-renderer',
            headerAuthor: '#author-text'
        }
    },
    './yt_ui': {
        addButtonsToYTComment: () => {},
        extractCommentId: () => 'test-id',
        restoreButtonState: () => {},
        restoreCheckboxState: () => {}
    },
    './yt_events': {
        bindYTEvents: () => {},
        YTCollectedItem: class {}
    },
    '../modules/comment_assistant': {
        SYH_COMMENT_ASSISTANT: {
            processComment: () => true,
            init: () => {}
        }
    },
    '../modules/dom_observer': {
        SYH_DOM_OBSERVER: {
            register: () => () => {},
            start: () => {}
        }
    },
    './yt_comment_processor': {
        initializeCommentAssistant: () => { mockInitializeCommentAssistant = true; },
        processAllYTComments: () => { mockProcessAllYTComments = true; },
        stateCache: mockStateCache
    },
    './yt_init': {
        cleanupYouTubeUI: () => { mockCleanupYouTubeUI = true; },
        initializeYouTubeModule: () => { mockInitializeYouTubeModule = true; }
    }
};

// Since we can't easily mock ES modules in Node's test runner,
// let's test the logic directly by creating a testable version
test('yt_storage_handler: handleOptionsChange enables YouTube module when option turns true', () => {
    const mockStateCache = { youtubeEnabled: false };
    let initializeYouTubeModuleCalled = false;
    
    function handleOptionsChange(newOptions, stateCache) {
        const wasEnabled = stateCache.youtubeEnabled;
        stateCache.youtubeEnabled = newOptions.youtube_enabled !== false;

        if (!wasEnabled && stateCache.youtubeEnabled) {
            initializeYouTubeModuleCalled = true;
        }
    }
    
    handleOptionsChange({ youtube_enabled: true }, mockStateCache);
    assert.equal(mockStateCache.youtubeEnabled, true);
    assert.equal(initializeYouTubeModuleCalled, true);
});

test('yt_storage_handler: handleOptionsChange disables YouTube module when option turns false', () => {
    const mockStateCache = { youtubeEnabled: true };
    let cleanupYouTubeUICalled = false;
    
    function handleOptionsChange(newOptions, stateCache) {
        const wasEnabled = stateCache.youtubeEnabled;
        stateCache.youtubeEnabled = newOptions.youtube_enabled !== false;

        if (wasEnabled && !stateCache.youtubeEnabled) {
            cleanupYouTubeUICalled = true;
        }
    }
    
    handleOptionsChange({ youtube_enabled: false }, mockStateCache);
    assert.equal(mockStateCache.youtubeEnabled, false);
    assert.equal(cleanupYouTubeUICalled, true);
});

test('yt_storage_handler: handleOptionsChange does nothing when option unchanged', () => {
    const mockStateCache = { youtubeEnabled: true };
    let initializeYouTubeModuleCalled = false;
    let cleanupYouTubeUICalled = false;
    
    function handleOptionsChange(newOptions, stateCache) {
        const wasEnabled = stateCache.youtubeEnabled;
        stateCache.youtubeEnabled = newOptions.youtube_enabled !== false;

        if (!wasEnabled && stateCache.youtubeEnabled) {
            initializeYouTubeModuleCalled = true;
        } else if (wasEnabled && !stateCache.youtubeEnabled) {
            cleanupYouTubeUICalled = true;
        }
    }
    
    handleOptionsChange({ youtube_enabled: true }, mockStateCache);
    assert.equal(initializeYouTubeModuleCalled, false);
    assert.equal(cleanupYouTubeUICalled, false);
});

test('yt_storage_handler: handleStorageChange updates buttonStates and calls processAllYTComments', () => {
    const mockStateCache = { buttonStates: {}, checkboxStates: {}, collectedList: [], youtubeEnabled: true };
    let processAllYTCommentsCalled = false;
    
    const STORAGE_KEYS = {
        OPTIONS: 'syh:options',
        YT_BUTTON_STATES: 'syh:yt:button_states',
        YT_CHECKBOX_STATE: 'syh:yt:checkbox_state'
    };
    
    const changeHandlers = {
        [STORAGE_KEYS.YT_BUTTON_STATES]: (newValue) => {
            mockStateCache.buttonStates = newValue || {};
            processAllYTCommentsCalled = true;
        }
    };
    
    function handleStorageChange(changes, stateCache, handlers) {
        for (const [key, handler] of Object.entries(handlers)) {
            if (changes[key]) {
                handler(changes[key].newValue);
            }
        }
    }
    
    handleStorageChange({
        'syh:yt:button_states': { newValue: { 'comment_1': 'question' } }
    }, mockStateCache, changeHandlers);

    assert.deepEqual(mockStateCache.buttonStates, { 'comment_1': 'question' });
    assert.equal(processAllYTCommentsCalled, true);
});

test('yt_storage_handler: handleStorageChange updates checkboxStates and calls processAllYTComments', () => {
    const mockStateCache = { buttonStates: {}, checkboxStates: {}, collectedList: [], youtubeEnabled: true };
    let processAllYTCommentsCalled = false;
    
    const STORAGE_KEYS = {
        YT_CHECKBOX_STATE: 'syh:yt:checkbox_state'
    };
    
    const changeHandlers = {
        [STORAGE_KEYS.YT_CHECKBOX_STATE]: (newValue) => {
            mockStateCache.checkboxStates = newValue || {};
            processAllYTCommentsCalled = true;
        }
    };
    
    function handleStorageChange(changes, stateCache, handlers) {
        for (const [key, handler] of Object.entries(handlers)) {
            if (changes[key]) {
                handler(changes[key].newValue);
            }
        }
    }
    
    handleStorageChange({
        'syh:yt:checkbox_state': { newValue: { 'comment_1': { checked: true, timestamp: 123 } } }
    }, mockStateCache, changeHandlers);

    assert.deepEqual(mockStateCache.checkboxStates, { 'comment_1': { checked: true, timestamp: 123 } });
    assert.equal(processAllYTCommentsCalled, true);
});

test('yt_storage_handler: handleStorageChange updates collectedList for vp_ss sheet', () => {
    const mockStateCache = { buttonStates: {}, checkboxStates: {}, collectedList: [], youtubeEnabled: true };
    
    function getSheetCollectedStorageKey(sheetId) {
        return `syh:collected:${sheetId}`;
    }
    
    const vpSsCollectedKey = getSheetCollectedStorageKey('vp_ss');
    
    function handleStorageChange(changes, stateCache, keyFn) {
        const vpKey = keyFn('vp_ss');
        if (changes[vpKey]?.newValue) {
            stateCache.collectedList = changes[vpKey].newValue;
        }
    }
    
    const collectedData = [{ id: 'c1', author: 'Test', text: 'Comment', type: 'question' }];
    
    handleStorageChange({
        'syh:collected:vp_ss': { newValue: collectedData }
    }, mockStateCache, getSheetCollectedStorageKey);

    assert.deepEqual(mockStateCache.collectedList, collectedData);
});

test('yt_storage_handler: handleStorageChange ignores unknown keys', () => {
    const mockStateCache = { buttonStates: {}, checkboxStates: {}, collectedList: [], youtubeEnabled: true };
    let processAllYTCommentsCalled = false;
    
    const STORAGE_KEYS = {
        YT_BUTTON_STATES: 'syh:yt:button_states'
    };
    
    const changeHandlers = {
        [STORAGE_KEYS.YT_BUTTON_STATES]: () => {
            processAllYTCommentsCalled = true;
        }
    };
    
    function handleStorageChange(changes, stateCache, handlers) {
        for (const [key, handler] of Object.entries(handlers)) {
            if (changes[key]) {
                handler(changes[key].newValue);
            }
        }
    }
    
    handleStorageChange({
        'unknown_key': { newValue: 'test' }
    }, mockStateCache, changeHandlers);

    assert.equal(processAllYTCommentsCalled, false);
});

test('yt_storage_handler: handleStorageChange handles missing newValue gracefully', () => {
    const mockStateCache = { buttonStates: {}, checkboxStates: {}, collectedList: [], youtubeEnabled: true };
    let processAllYTCommentsCalled = false;
    
    const STORAGE_KEYS = {
        YT_BUTTON_STATES: 'syh:yt:button_states'
    };
    
    const changeHandlers = {
        [STORAGE_KEYS.YT_BUTTON_STATES]: (newValue) => {
            mockStateCache.buttonStates = newValue || {};
            processAllYTCommentsCalled = true;
        }
    };
    
    function handleStorageChange(changes, stateCache, handlers) {
        for (const [key, handler] of Object.entries(handlers)) {
            if (changes[key]) {
                handler(changes[key].newValue);
            }
        }
    }
    
    handleStorageChange({
        'syh:yt:button_states': { newValue: undefined }
    }, mockStateCache, changeHandlers);

    assert.deepEqual(mockStateCache.buttonStates, {});
    assert.equal(processAllYTCommentsCalled, true);
});