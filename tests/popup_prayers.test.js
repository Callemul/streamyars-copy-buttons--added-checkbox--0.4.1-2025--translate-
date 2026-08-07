import assert from 'node:assert';
import { test, describe, beforeEach, mock } from 'node:test';

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
            content: { firstElementChild: el },
            parentNode: { removeChild: () => {} },
            insertAdjacentHTML: () => {}
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
    })),
    createRange: mock.fn(() => ({
        selectNodeContents: () => {},
        collapse: () => {}
    })),
    addEventListener: mock.fn(),
    removeEventListener: mock.fn()
};

global.chrome = {
    runtime: { id: 'test-extension-id', lastError: null },
    storage: {
        local: {
            get: mock.fn((keys, cb) => cb({})),
            set: mock.fn((items, cb) => cb && cb()),
            remove: mock.fn((keys, cb) => cb && cb())
        }
    },
    tabs: {
        query: mock.fn((queryInfo, callback) => {
            callback([{ url: 'https://streamyard.com/room123' }]);
        })
    }
};

global.navigator = Object.defineProperty(global, 'navigator', {
    value: {
        clipboard: {
            writeText: mock.fn(async () => {})
        }
    },
    configurable: true,
    writable: true
});

global.window.getSelection = mock.fn(() => ({
    removeAllRanges: () => {},
    addRange: () => {}
}));

const { SYH_STORAGE, STORAGE_KEYS } = await import('../modules/storage.ts');
const { SYH_MESSAGING } = await import('../modules/messaging.ts');
const { CommentService } = await import('../modules/comment_service.ts');
const { RetentionService } = await import('../modules/retention_service.ts');
const { batchRenderItems } = await import('../modules/render_utils.ts');

const {
    sendUnstarMessage,
    sendUnstarMessagesForList,
    renderPrayers,
    initPopupPrayersListeners
} = await import('../popup/popup_prayers.ts');

describe('popup_prayers tests', () => {
    beforeEach(() => {
        global.chrome.runtime.lastError = null;
        global.chrome.storage.local.get.mock.resetCalls();
        global.chrome.storage.local.set.mock.resetCalls();
        global.chrome.storage.local.remove.mock.resetCalls();
        global.chrome.tabs.query.mock.resetCalls();
        global.navigator.clipboard.writeText.mock.resetCalls();
        
        global.document.getElementById.mock.resetCalls();
        global.document.querySelectorAll.mock.resetCalls();
        global.document.querySelector.mock.resetCalls();
        global.document.createElement.mock.resetCalls();
        global.document.addEventListener.mock.resetCalls();
        
        SYH_MESSAGING.sendToActiveTab.mock?.resetCalls?.();
        SYH_MESSAGING.isExtensionValid.mock?.resetCalls?.();
        CommentService.copyToClipboard.mock?.resetCalls?.();
        RetentionService.filterFreshPrayers.mock?.resetCalls?.();
        batchRenderItems.mock?.resetCalls?.();
    });

    describe('sendUnstarMessage', () => {
        test('should not send if text is empty', () => {
            sendUnstarMessage('');
            sendUnstarMessage(null);
            sendUnstarMessage(undefined);
            assert.strictEqual(SYH_MESSAGING.sendToActiveTab.mock.calls.length, 0);
        });

        test('should send unstar_comment action with text', () => {
            sendUnstarMessage('test prayer');
            assert.strictEqual(SYH_MESSAGING.sendToActiveTab.mock.calls.length, 1);
            const call = SYH_MESSAGING.sendToActiveTab.mock.calls[0];
            assert.strictEqual(call.arguments[0].action, 'unstar_comment');
            assert.strictEqual(call.arguments[0].text, 'test prayer');
        });
    });

    describe('sendUnstarMessagesForList', () => {
        test('should not send if list is empty', () => {
            sendUnstarMessagesForList([]);
            sendUnstarMessagesForList(null);
            sendUnstarMessagesForList(undefined);
            assert.strictEqual(SYH_MESSAGING.sendToActiveTab.mock.calls.length, 0);
        });

        test('should send unstar for each item with text', () => {
            const prayersList = [
                { id: '1', author: 'author1', text: 'prayer 1', type: 'prayer' },
                { id: '2', author: 'author2', text: 'prayer 2', type: 'prayer' },
                { id: '3', author: 'author3', text: '', type: 'prayer' }
            ];
            sendUnstarMessagesForList(prayersList);
            assert.strictEqual(SYH_MESSAGING.sendToActiveTab.mock.calls.length, 2);
            assert.strictEqual(SYH_MESSAGING.sendToActiveTab.mock.calls[0].arguments[0].text, 'prayer 1');
            assert.strictEqual(SYH_MESSAGING.sendToActiveTab.mock.calls[1].arguments[0].text, 'prayer 2');
        });
    });

    describe('renderPrayers', () => {
        test('should handle empty prayers list', () => {
            const outputDiv = { 
                id: 'prayersResultDiv', 
                innerHTML: '', 
                setAttribute: mock.fn(),
                removeAttribute: mock.fn(),
                querySelector: () => null
            };
            global.document.getElementById.mock.implementation((id) => {
                if (id === 'prayersResultDiv') return outputDiv;
                if (id === 'prayersTotalCount') return { textContent: '' };
                return null;
            });

            renderPrayers([]);
            
            assert.strictEqual(outputDiv.innerHTML, '<span style="color:#999; font-style:italic;">Список порожній. Натисніть кнопку 🔄 "Підтягнути", щоб завантажити зіркові коментарі з ефіру, або маркуйте їх вручну.</span>');
            assert.strictEqual(outputDiv.getAttribute('data-raw-text'), '');
        });

        test('should handle null prayers list', () => {
            const outputDiv = { 
                id: 'prayersResultDiv', 
                innerHTML: '', 
                setAttribute: mock.fn(),
                removeAttribute: mock.fn(),
                querySelector: () => null
            };
            global.document.getElementById.mock.implementation((id) => {
                if (id === 'prayersResultDiv') return outputDiv;
                if (id === 'prayersTotalCount') return { textContent: '' };
                return null;
            });

            renderPrayers(null);
            
            assert.ok(outputDiv.innerHTML.includes('Список порожній'));
        });

        test('should generate IDs for items without IDs', () => {
            const prayersList = [
                { author: 'author1', text: 'prayer 1', type: 'prayer' },
                { author: 'author2', text: 'prayer 2', type: 'prayer' }
            ];
            
            const outputDiv = { 
                id: 'prayersResultDiv', 
                innerHTML: '', 
                setAttribute: mock.fn(),
                removeAttribute: mock.fn(),
                querySelector: () => null
            };
            global.document.getElementById.mock.implementation((id) => {
                if (id === 'prayersResultDiv') return outputDiv;
                if (id === 'prayersTotalCount') return { textContent: '' };
                return null;
            });
            
            RetentionService.filterFreshPrayers.mock.implementation((list) => list);
            batchRenderItems.mock.implementation((container, items, renderer, options) => () => {});

            renderPrayers(prayersList);
            
            assert.ok(prayersList[0].id && prayersList[0].id.startsWith('p_'));
            assert.ok(prayersList[1].id && prayersList[1].id.startsWith('p_'));
        });

        test('should call RetentionService.filterFreshPrayers', () => {
            const prayersList = [
                { id: '1', author: 'author1', text: 'prayer 1', type: 'prayer', timestamp: Date.now() },
                { id: '2', author: 'author2', text: 'prayer 2', type: 'prayer', timestamp: Date.now() }
            ];
            
            const outputDiv = { 
                id: 'prayersResultDiv', 
                innerHTML: '', 
                setAttribute: mock.fn(),
                removeAttribute: mock.fn(),
                querySelector: () => null
            };
            global.document.getElementById.mock.implementation((id) => {
                if (id === 'prayersResultDiv') return outputDiv;
                if (id === 'prayersTotalCount') return { textContent: '' };
                return null;
            });
            
            const filteredList = [prayersList[0]];
            RetentionService.filterFreshPrayers.mock.implementation((list) => filteredList);
            batchRenderItems.mock.implementation((container, items, renderer, options) => () => {});

            renderPrayers(prayersList);
            
            assert.strictEqual(RetentionService.filterFreshPrayers.mock.calls.length, 1);
        });

        test('should update total count element', () => {
            const prayersList = [
                { id: '1', author: 'author1', text: 'prayer 1', type: 'prayer' },
                { id: '2', author: 'author2', text: 'prayer 2', type: 'prayer' }
            ];
            
            const outputDiv = { 
                id: 'prayersResultDiv', 
                innerHTML: '', 
                setAttribute: mock.fn(),
                removeAttribute: mock.fn(),
                querySelector: () => null
            };
            const totalCountEl = { textContent: '' };
            global.document.getElementById.mock.implementation((id) => {
                if (id === 'prayersResultDiv') return outputDiv;
                if (id === 'prayersTotalCount') return totalCountEl;
                return null;
            });
            
            RetentionService.filterFreshPrayers.mock.implementation((list) => list);
            batchRenderItems.mock.implementation((container, items, renderer, options) => () => {});

            renderPrayers(prayersList);
            
            assert.strictEqual(totalCountEl.textContent, '2 люд. - 2 прохань');
        });

        test('should set data-raw-text attribute with formatted text', () => {
            const prayersList = [
                { id: '1', author: 'author1', text: 'prayer 1', type: 'prayer', icon: '🙏🙏🙏' },
                { id: '2', author: 'author2', text: 'prayer 2', type: 'prayer', icon: '❤️❤️❤️' }
            ];
            
            const outputDiv = { 
                id: 'prayersResultDiv', 
                innerHTML: '', 
                setAttribute: mock.fn(),
                removeAttribute: mock.fn(),
                querySelector: () => null
            };
            global.document.getElementById.mock.implementation((id) => {
                if (id === 'prayersResultDiv') return outputDiv;
                if (id === 'prayersTotalCount') return { textContent: '' };
                return null;
            });
            
            RetentionService.filterFreshPrayers.mock.implementation((list) => list);
            batchRenderItems.mock.implementation((container, items, renderer, options) => () => {});

            renderPrayers(prayersList);
            
            const rawText = outputDiv.getAttribute.mock.calls.find(c => c.arguments[0] === 'data-raw-text')?.arguments[1];
            assert.ok(rawText);
            assert.ok(rawText.includes('🙏🙏🙏 МОЛИТВЕННЫЕ ПРОСЬБЫ'));
            assert.ok(rawText.includes('@author1'));
            assert.ok(rawText.includes('prayer 1'));
            assert.ok(rawText.includes('@author2'));
            assert.ok(rawText.includes('prayer 2'));
        });

        test('should group prayers by author', () => {
            const prayersList = [
                { id: '1', author: 'author1', text: 'prayer 1', type: 'prayer', icon: '🙏🙏🙏' },
                { id: '2', author: 'author1', text: 'prayer 2', type: 'prayer', icon: '🙏🙏🙏' },
                { id: '3', author: 'author2', text: 'prayer 3', type: 'prayer', icon: '❤️❤️❤️' }
            ];
            
            const outputDiv = { 
                id: 'prayersResultDiv', 
                innerHTML: '', 
                setAttribute: mock.fn(),
                removeAttribute: mock.fn(),
                querySelector: () => null
            };
            const totalCountEl = { textContent: '' };
            global.document.getElementById.mock.implementation((id) => {
                if (id === 'prayersResultDiv') return outputDiv;
                if (id === 'prayersTotalCount') return totalCountEl;
                return null;
            });
            
            RetentionService.filterFreshPrayers.mock.implementation((list) => list);
            batchRenderItems.mock.implementation((container, items, renderer, options) => () => {});

            renderPrayers(prayersList);
            
            assert.strictEqual(totalCountEl.textContent, '2 люд. - 3 прохань');
        });
    });

    describe('initPopupPrayersListeners', () => {
        test('should bind focus, click, and toolbar listeners', () => {
            initPopupPrayersListeners();
            
            assert.ok(global.document.addEventListener.mock.calls.length >= 3);
            const eventTypes = global.document.addEventListener.mock.calls.map(c => c.arguments[0]);
            assert.ok(eventTypes.includes('focusin'));
            assert.ok(eventTypes.includes('focusout'));
            assert.ok(eventTypes.includes('click'));
        });
    });
});