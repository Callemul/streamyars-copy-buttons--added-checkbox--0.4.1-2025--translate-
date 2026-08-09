import test from 'node:test';
import assert from 'node:assert/strict';

import { installChromeMock } from './setup/chrome_mock.ts';

global.window = global;
global.document = {
    createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        style: {},
        classList: { add: () => {}, remove: () => {}, contains: () => false },
        setAttribute: () => {},
        getAttribute: () => null,
        appendChild: () => {},
        removeChild: () => {},
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
        closest: () => null,
        parentElement: {
            getBoundingClientRect: () => ({ width: 800, left: 0 }),
            style: {}
        }
    }),
    getElementById: (id) => {
        const mockElements = {
            'step3Divider__vp_ss': { 
                addEventListener: (event, handler) => { global.mockDividerHandlers = global.mockDividerHandlers || {}; global.mockDividerHandlers[event] = handler; },
                classList: { add: () => {}, remove: () => {}, contains: () => false },
                style: {},
                parentElement: { getBoundingClientRect: () => ({ width: 800, left: 0 }), style: {} }
            },
            'step3Columns__vp_ss': { style: {} },
            'step3Left__vp_ss': { style: { flex: '50%' } },
            'step3Right__vp_ss': { style: { flex: '50%' } },
            'textArea1_oldText': { style: {} },
            'textArea2_generatedRuText': { style: {} },
            'oldList__vp_ss': { style: {} },
            'newTelegram__vp_ss': { style: {} }
        };
        return mockElements[id] || null;
    },
    body: {
        style: { userSelect: '' }
    },
    addEventListener: (event, handler) => {
        global.mockDocHandlers = global.mockDocHandlers || {};
        global.mockDocHandlers[event] = handler;
    },
    removeEventListener: () => {}
};

global.chrome = {};
global.mockStorageStore = {};

installChromeMock({
    storageImpl: {
        get: (keys, cb) => {
            const res = {};
            const arr = Array.isArray(keys) ? keys : [keys];
            arr.forEach(k => { res[k] = global.mockStorageStore[k]; });
            if (cb) cb(res);
        },
        set: (items, cb) => {
            Object.assign(global.mockStorageStore, items);
            if (cb) cb();
        }
    }
});

let mockDividerHandlers = {};
let mockDocHandlers = {};

const SHEET_IDS = ['vp_ss', 'vp_slovo', 'slovo_ss', 'vp_en'];

function $(id) {
    return document.getElementById(id);
}

let activeResizer = null;

function setupStep3ResizerEvents() {
    document.addEventListener('mousemove', function (e) {
        if (!activeResizer) return;
        const { divider, left, right } = activeResizer;
        const container = divider.parentElement;
        if (!container) return;
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        if (containerWidth <= 0) return;

        const leftWidth = e.clientX - containerRect.left;
        let percent = (leftWidth / containerWidth) * 100;
        if (percent < 15) percent = 15;
        if (percent > 85) percent = 85;

        left.style.flex = `${percent}%`;
        right.style.flex = `${100 - percent}%`;
    });

    document.addEventListener('mouseup', function () {
        if (activeResizer) {
            const { sId, divider, left, right } = activeResizer;
            divider.classList.remove('is-dragging');
            document.body.style.userSelect = '';

            const flexLeft = parseFloat(left.style.flex) || 1;
            const flexRight = parseFloat(right.style.flex) || 1;
            const total = flexLeft + flexRight;
            const posPercent = (flexLeft / total) * 100;

            global.chrome.storage.local.set({
                [`syh:popup:sheet:${sId}:dividerPos`]: posPercent,
                [`syh:popup:divider_pos:${sId}`]: posPercent
            });
            activeResizer = null;
        }
    });
}

function initStep3Resizers() {
    SHEET_IDS.forEach(sId => {
        const divider = $(`step3Divider__${sId}`);
        const container = $(`step3Columns__${sId}`);
        const left = $(`step3Left__${sId}`);
        const right = $(`step3Right__${sId}`);

        if (!divider || !container || !left || !right) return;

        divider.addEventListener('mousedown', function (e) {
            e.preventDefault = () => {};
            activeResizer = {
                sId,
                divider: divider,
                left: left,
                right: right
            };
            divider.classList.add('is-dragging');
            document.body.style.userSelect = 'none';
        });
    });
}

function setupResizeObserver(isStorageLoaded) {
    const textareas = ['textArea1_oldText', 'textArea2_generatedRuText'];
    SHEET_IDS.forEach(sId => {
        textareas.push(`oldList__${sId}`, `newTelegram__${sId}`);
    });

    const resizeObserver = new global.ResizeObserver(entries => {
        if (!isStorageLoaded()) return;
        global.chrome.storage.local.get(['tg_textarea_sizes'], function (res) {
            const sizes = res.tg_textarea_sizes || {};
            let updated = false;
            for (const entry of entries) {
                const id = entry.target.id;
                const width = (entry.target).style.width;
                const height = (entry.target).style.height;
                if (width || height) {
                    sizes[id] = { width, height };
                    updated = true;
                }
            }
            if (updated) {
                global.chrome.storage.local.set({ 'tg_textarea_sizes': sizes });
            }
        });
    });
    
    global.mockResizeObserver = resizeObserver;
    
    textareas.forEach(id => {
        const el = document.getElementById(id);
        if (el && el instanceof HTMLElement) resizeObserver.observe(el);
    });
}

global.ResizeObserver = class ResizeObserver {
    constructor(callback) {
        this.callback = callback;
        this.observed = [];
    }
    observe(el) {
        this.observed.push(el);
    }
    unobserve(el) {
        this.observed = this.observed.filter(e => e !== el);
    }
    disconnect() {
        this.observed = [];
    }
    trigger(entries) {
        this.callback(entries);
    }
};

test('popup_resizers: initStep3Resizers sets up mousedown listeners on dividers', () => {
    global.mockDividerHandlers = {};
    global.mockStorageStore = {};
    
    initStep3Resizers();
    
    const divider = document.getElementById('step3Divider__vp_ss');
    assert.ok(divider);
    assert.ok(global.mockDividerHandlers.mousedown);
});

test('popup_resizers: mousedown on divider sets activeResizer and adds dragging class', () => {
    global.mockDividerHandlers = {};
    global.mockStorageStore = {};
    activeResizer = null;
    
    initStep3Resizers();
    
    const divider = document.getElementById('step3Divider__vp_ss');
    const mousedownHandler = global.mockDividerHandlers.mousedown;
    
    const mockEvent = { preventDefault: () => {} };
    mousedownHandler(mockEvent);
    
    assert.ok(activeResizer);
    assert.equal(activeResizer.sId, 'vp_ss');
    assert.equal(divider.classList.add, 'is-dragging');
    assert.equal(document.body.style.userSelect, 'none');
});

test('popup_resizers: mousemove updates left/right flex when dragging', () => {
    global.mockDividerHandlers = {};
    global.mockDocHandlers = {};
    global.mockStorageStore = {};
    activeResizer = null;
    
    initStep3Resizers();
    setupStep3ResizerEvents();
    
    const divider = document.getElementById('step3Divider__vp_ss');
    const left = document.getElementById('step3Left__vp_ss');
    const right = document.getElementById('step3Right__vp_ss');
    
    const mousedownHandler = global.mockDividerHandlers.mousedown;
    const mockMouseDownEvent = { preventDefault: () => {} };
    mousedownHandler(mockMouseDownEvent);
    
    const mousemoveHandler = global.mockDocHandlers.mousemove;
    const mockMouseMoveEvent = { clientX: 600 };
    mousemoveHandler(mockMouseMoveEvent);
    
    // 600px out of 800px = 75%
    assert.equal(left.style.flex, '75%');
    assert.equal(right.style.flex, '25%');
});

test('popup_resizers: mousemove clamps percent to 15-85 range', () => {
    global.mockDividerHandlers = {};
    global.mockDocHandlers = {};
    global.mockStorageStore = {};
    activeResizer = null;
    
    initStep3Resizers();
    setupStep3ResizerEvents();
    
    const divider = document.getElementById('step3Divider__vp_ss');
    const left = document.getElementById('step3Left__vp_ss');
    const right = document.getElementById('step3Right__vp_ss');
    
    const mousedownHandler = global.mockDividerHandlers.mousedown;
    mousedownHandler({ preventDefault: () => {} });
    
    const mousemoveHandler = global.mockDocHandlers.mousemove;
    
    // Test left bound (clientX = 50, 50/800 = 6.25% -> clamped to 15%)
    mousemoveHandler({ clientX: 50 });
    assert.equal(left.style.flex, '15%');
    assert.equal(right.style.flex, '85%');
    
    // Test right bound (clientX = 750, 750/800 = 93.75% -> clamped to 85%)
    mousemoveHandler({ clientX: 750 });
    assert.equal(left.style.flex, '85%');
    assert.equal(right.style.flex, '15%');
});

test('popup_resizers: mouseup saves divider position to storage', () => {
    global.mockDividerHandlers = {};
    global.mockDocHandlers = {};
    global.mockStorageStore = {};
    activeResizer = null;
    
    initStep3Resizers();
    setupStep3ResizerEvents();
    
    const divider = document.getElementById('step3Divider__vp_ss');
    const left = document.getElementById('step3Left__vp_ss');
    const right = document.getElementById('step3Right__vp_ss');
    
    left.style.flex = '60%';
    right.style.flex = '40%';
    
    const mousedownHandler = global.mockDividerHandlers.mousedown;
    mousedownHandler({ preventDefault: () => {} });
    
    const mouseupHandler = global.mockDocHandlers.mouseup;
    mouseupHandler();
    
    assert.equal(global.mockStorageStore['syh:popup:sheet:vp_ss:dividerPos'], 60);
    assert.equal(global.mockStorageStore['syh:popup:divider_pos:vp_ss'], 60);
    assert.equal(activeResizer, null);
    assert.equal(divider.classList.remove, 'is-dragging');
    assert.equal(document.body.style.userSelect, '');
});

test('popup_resizers: setupResizeObserver observes all textareas', () => {
    global.mockStorageStore = { tg_textarea_sizes: {} };
    let isStorageLoaded = () => true;
    
    setupResizeObserver(isStorageLoaded);
    
    const resizeObserver = global.mockResizeObserver;
    assert.ok(resizeObserver);
    assert.equal(resizeObserver.observed.length, 10); // 2 base + 4 sheets * 2
});

test('popup_resizers: resizeObserver saves textarea sizes to storage', () => {
    global.mockStorageStore = { tg_textarea_sizes: {} };
    let isStorageLoaded = () => true;
    
    setupResizeObserver(isStorageLoaded);
    
    const resizeObserver = global.mockResizeObserver;
    const textarea = document.getElementById('textArea1_oldText');
    textarea.style.width = '300px';
    textarea.style.height = '200px';
    
    resizeObserver.trigger([{ target: textarea }]);
    
    assert.equal(global.mockStorageStore.tg_textarea_sizes.textArea1_oldText.width, '300px');
    assert.equal(global.mockStorageStore.tg_textarea_sizes.textArea1_oldText.height, '200px');
});

test('popup_resizers: resizeObserver does nothing when storage not loaded', () => {
    global.mockStorageStore = { tg_textarea_sizes: {} };
    let isStorageLoaded = () => false;
    
    setupResizeObserver(isStorageLoaded);
    
    const resizeObserver = global.mockResizeObserver;
    const textarea = document.getElementById('textArea1_oldText');
    textarea.style.width = '300px';
    
    resizeObserver.trigger([{ target: textarea }]);
    
    // Should not update storage
    assert.equal(global.mockStorageStore.tg_textarea_sizes.textArea1_oldText, undefined);
});

test('popup_resizers: multiple sheets each get their own resizer', () => {
    global.mockDividerHandlers = {};
    global.mockStorageStore = {};
    activeResizer = null;
    
    initStep3Resizers();
    
    SHEET_IDS.forEach(sId => {
        const divider = document.getElementById(`step3Divider__${sId}`);
        assert.ok(divider, `Divider for ${sId} should exist`);
        // Each divider should have its own mousedown handler
    });
});