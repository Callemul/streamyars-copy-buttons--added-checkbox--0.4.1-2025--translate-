import assert from 'node:assert';
import { test, describe, beforeEach, mock } from 'node:test';

// Mock DOM
global.window = global;
global.document = {
    getElementById: mock.fn((id) => ({
        id,
        scrollTop: 0,
        scrollY: 0,
        style: {},
        classList: { add: mock.fn(), remove: mock.fn() },
        instanceof: true
    })),
    querySelectorAll: mock.fn(() => []),
    querySelector: mock.fn(),
    createElement: mock.fn(() => ({}))
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

// Mock storage and sheets
const { SYH_STORAGE, STORAGE_KEYS } = await import('../modules/storage.ts');
const { getAllSheetIds } = await import('../modules/sheets.ts');

// Mock popup_dom_utils
const mock$ = mock.fn((id) => global.document.getElementById(id));

// Import the module under test
const { setupScrollListeners } = await import('../popup/popup_scroll.ts');

describe('popup_scroll tests', () => {
    beforeEach(() => {
        mock$.mock.resetCalls();
        global.chrome.runtime.lastError = null;
        global.chrome.storage.local.get.mock.resetCalls();
        global.chrome.storage.local.set.mock.resetCalls();
    });

    describe('setupScrollListeners', () => {
        test('should set up scroll listeners on window and elements', () => {
            const windowAddEventListener = mock.fn();
            global.window.addEventListener = windowAddEventListener;
            global.window.scrollY = 100;
            
            const elementAddEventListener = mock.fn();
            const mockElements = {
                prayersResultDiv: { scrollTop: 10, addEventListener: elementAddEventListener, instanceof: true },
                textArea1_oldText: { scrollTop: 20, addEventListener: elementAddEventListener, instanceof: true },
                textArea2_generatedRuText: { scrollTop: 30, addEventListener: elementAddEventListener, instanceof: true },
                'finalResultDiv__vp_ss': { scrollTop: 40, addEventListener: elementAddEventListener, instanceof: true },
                'deletedLog__vp_ss': { scrollTop: 50, addEventListener: elementAddEventListener, instanceof: true },
                'oldList__vp_ss': { scrollTop: 60, addEventListener: elementAddEventListener, instanceof: true },
                'newTelegram__vp_ss': { scrollTop: 70, addEventListener: elementAddEventListener, instanceof: true },
                'finalResultDiv__oparin': { scrollTop: 80, addEventListener: elementAddEventListener, instanceof: true },
                'deletedLog__oparin': { scrollTop: 90, addEventListener: elementAddEventListener, instanceof: true },
                'oldList__oparin': { scrollTop: 100, addEventListener: elementAddEventListener, instanceof: true },
                'newTelegram__oparin': { scrollTop: 110, addEventListener: elementAddEventListener, instanceof: true }
            };
            
            global.document.getElementById = mock.fn((id) => mockElements[id] || null);
            
            setupScrollListeners();
            
            // Verify window scroll listener was added
            assert.ok(windowAddEventListener.mock.calls.some(c => c[0] === 'scroll'));
            
            // Verify element scroll listeners were added
            assert.ok(elementAddEventListener.mock.calls.some(c => c[0] === 'scroll'));
        });

        test('should save scroll positions to storage on scroll', () => {
            const windowAddEventListener = mock.fn((event, handler) => {
                // Simulate a scroll event
                if (event === 'scroll') {
                    global.window.scrollY = 200;
                    handler(new Event('scroll'));
                }
            });
            global.window.addEventListener = windowAddEventListener;
            global.window.scrollY = 100;
            
            const elementAddEventListener = mock.fn((event, handler) => {
                if (event === 'scroll') {
                    handler(new Event('scroll'));
                }
            });
            
            const mockElements = {
                prayersResultDiv: { scrollTop: 10, addEventListener: elementAddEventListener, instanceof: true },
                textArea1_oldText: { scrollTop: 20, addEventListener: elementAddEventListener, instanceof: true },
                textArea2_generatedRuText: { scrollTop: 30, addEventListener: elementAddEventListener, instanceof: true },
                'finalResultDiv__vp_ss': { scrollTop: 40, addEventListener: elementAddEventListener, instanceof: true },
                'deletedLog__vp_ss': { scrollTop: 50, addEventListener: elementAddEventListener, instanceof: true },
                'oldList__vp_ss': { scrollTop: 60, addEventListener: elementAddEventListener, instanceof: true },
                'newTelegram__vp_ss': { scrollTop: 70, addEventListener: elementAddEventListener, instanceof: true }
            };
            
            global.document.getElementById = mock.fn((id) => mockElements[id] || null);
            
            setupScrollListeners();
            
            // Wait for debounce
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Verify storage was called with scroll positions
            assert.ok(global.chrome.storage.local.set.mock.calls.length > 0);
            const call = global.chrome.storage.local.set.mock.calls[0];
            const storedData = call.arguments[0];
            assert.ok(storedData[STORAGE_KEYS.POPUP_SCROLL_POSITIONS]);
            assert.ok(storedData['tg_scroll_positions']);
            assert.strictEqual(storedData[STORAGE_KEYS.POPUP_SCROLL_POSITIONS].window, 200);
        });

        test('should handle missing elements gracefully', () => {
            const windowAddEventListener = mock.fn();
            global.window.addEventListener = windowAddEventListener;
            
            // Return null for all elements
            global.document.getElementById = mock.fn(() => null);
            
            assert.doesNotThrow(() => setupScrollListeners());
            
            // Should still add window listener
            assert.ok(windowAddEventListener.mock.calls.some(c => c[0] === 'scroll'));
        });
    });
});