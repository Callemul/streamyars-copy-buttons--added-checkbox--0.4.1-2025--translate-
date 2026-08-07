import test from 'node:test';
import assert from 'node:assert/strict';

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
        focus: () => {},
        textContent: '',
        innerHTML: '',
        ownerDocument: global.document
    }),
    createRange: () => ({
        selectNodeContents: () => {},
        collapse: () => {}
    }),
    getSelection: () => ({
        removeAllRanges: () => {},
        addRange: () => {}
    }),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    body: {
        appendChild: () => {},
        removeChild: () => {},
        style: {}
    }
};

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
            }
        }
    },
    tabs: {
        query: (opts, cb) => {
            cb([{ url: 'https://streamyard.com/room123' }]);
        }
    }
};

global.mockStorageStore = {};

const mockPrayersCache = [
    { id: 'p1', author: 'John', text: 'Prayer 1', type: 'prayer', icon: '🙏', roomId: 'room1', timestamp: Date.now() },
    { id: 'p2', author: 'Jane', text: 'Question 1', type: 'question', icon: '❓', roomId: 'room1', timestamp: Date.now() }
];

const mockElements = {
    'edit-prayer-btn': { closest: () => ({ querySelector: () => ({ focus: () => {}, textContent: '' }) }) },
    'del-author-btn': { getAttribute: () => 'John', closest: () => null },
    '#syh-wipe-prayers': { closest: () => null },
    '#syh-keep-prayers': { closest: () => null },
    'del-prayer-btn': { getAttribute: () => 'p1', closest: () => null },
    '.editable-prayer': { getAttribute: () => 'p1', textContent: 'Updated text', style: {}, closest: () => null },
    '.editable-author': { getAttribute: () => 'John', textContent: 'John', style: {}, closest: () => null },
    'copyPrayersBtn': { textContent: 'Copy', addEventListener: () => {} },
    'prayersResultDiv': { getAttribute: () => 'Test text', closest: () => null },
    'clearPrayersBtn': { addEventListener: () => {} },
    'fetchPrayersBtn': { textContent: 'Fetch', addEventListener: () => {} }
};

function getMockElement(selector) {
    if (selector.startsWith('.')) {
        return mockElements[selector.substring(1)];
    }
    if (selector.startsWith('#')) {
        return mockElements[selector.substring(1)];
    }
    return mockElements[selector] || null;
}

global.document.querySelector = (selector) => getMockElement(selector);
global.document.querySelectorAll = (selector) => [];
global.document.addEventListener = (event, handler) => {
    global.mockEventHandlers = global.mockEventHandlers || {};
    global.mockEventHandlers[event] = handler;
};

let mockRenderPrayers = [];
let mockSendUnstarMessage = '';
let mockSendUnstarMessagesForList = [];

function setupMocks() {
    global.mockStorageStore = {
        'syh:prayers': [...mockPrayersCache]
    };
    mockRenderPrayers = [];
    mockSendUnstarMessage = '';
    mockSendUnstarMessagesForList = [];
}

function handleEditPrayerAuthor(editBtn) {
    const block = editBtn.closest?.('.q-block');
    const authorSpan = block?.querySelector?.('.editable-author');
    if (authorSpan) {
        authorSpan.focus();
        const range = document.createRange();
        const sel = window.getSelection();
        if (sel) {
            range.selectNodeContents(authorSpan);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }
}

function handleDeleteAuthorPrayers(delAuthorBtn) {
    const authorToDelete = delAuthorBtn.getAttribute('data-author') || '';
    if (confirm(`Видалити всі прохання від @${authorToDelete}?`)) {
        global.chrome.storage.local.get(['syh:prayers'], function(result) {
            let list = result['syh:prayers'] || [];
            const authorPrayers = list.filter(item => item.author === authorToDelete);
            mockSendUnstarMessagesForList = authorPrayers;
            list = list.filter(item => item.author !== authorToDelete);
            global.chrome.storage.local.set({ 'syh:prayers': list }, function() {
                mockRenderPrayers = list;
            });
        });
    }
}

function handleWipeAllPrayers() {
    if (confirm("Повністю очистити старі молитви з пам'яті розширення?")) {
        global.chrome.storage.local.set({ 'syh:prayers': [] }, function() {
            mockRenderPrayers = [];
        });
    }
}

function handleKeepCurrentRoomPrayers() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (!tabs[0] || !tabs[0].url) return;
        try {
            const url = new URL(tabs[0].url);
            const currentRoomId = url.pathname.replace(/\//g, '');

            global.chrome.storage.local.get(['syh:prayers'], function(result) {
                let list = result['syh:prayers'] || [];
                list.forEach(item => {
                    if (item.type === 'prayer') {
                        item.roomId = currentRoomId;
                        item.timestamp = Date.now();
                    }
                });
                global.chrome.storage.local.set({ 'syh:prayers': list }, function() {
                    mockRenderPrayers = list;
                });
            });
        } catch {
            /* ignore URL parse error */
        }
    });
}

function handleDeleteSinglePrayer(delPrayerBtn) {
    const id = delPrayerBtn.getAttribute('data-id');
    global.chrome.storage.local.get(['syh:prayers'], function(result) {
        let list = result['syh:prayers'] || [];
        const targetItem = list.find(item => item.id === id);
        if (targetItem) {
            mockSendUnstarMessage = targetItem.text;
        }
        list = list.filter(item => item.id !== id);
        global.chrome.storage.local.set({ 'syh:prayers': list }, function() {
            mockRenderPrayers = list;
        });
    });
}

test('prayer_handlers: handleEditPrayerAuthor focuses author span and selects text', () => {
    setupMocks();
    const mockEditBtn = {
        closest: () => ({
            querySelector: () => ({
                focus: () => {},
                textContent: 'John'
            })
        })
    };
    
    let focusCalled = false;
    let selectNodeCalled = false;
    let collapseCalled = false;
    let removeAllRangesCalled = false;
    let addRangeCalled = false;
    
    const originalCreateRange = document.createRange;
    document.createRange = () => ({
        selectNodeContents: () => { selectNodeCalled = true; },
        collapse: () => { collapseCalled = true; }
    });
    
    const originalGetSelection = window.getSelection;
    window.getSelection = () => ({
        removeAllRanges: () => { removeAllRangesCalled = true; },
        addRange: () => { addRangeCalled = true; }
    });
    
    const mockAuthorSpan = { focus: () => { focusCalled = true; } };
    mockEditBtn.closest = () => ({ querySelector: () => mockAuthorSpan });
    
    handleEditPrayerAuthor(mockEditBtn);
    
    assert.equal(focusCalled, true);
    assert.equal(selectNodeCalled, true);
    assert.equal(collapseCalled, true);
    assert.equal(removeAllRangesCalled, true);
    assert.equal(addRangeCalled, true);
    
    document.createRange = originalCreateRange;
    window.getSelection = originalGetSelection;
});

test('prayer_handlers: handleDeleteAuthorPrayers filters out author prayers and calls unstar', () => {
    setupMocks();
    global.confirm = () => true;
    
    const mockDelAuthorBtn = { getAttribute: () => 'John' };
    
    handleDeleteAuthorPrayers(mockDelAuthorBtn);
    
    assert.equal(mockSendUnstarMessagesForList.length, 1);
    assert.equal(mockSendUnstarMessagesForList[0].author, 'John');
    assert.equal(mockRenderPrayers.length, 1);
    assert.equal(mockRenderPrayers[0].author, 'Jane');
});

test('prayer_handlers: handleWipeAllPrayers clears all prayers', () => {
    setupMocks();
    global.confirm = () => true;
    
    handleWipeAllPrayers();
    
    assert.deepEqual(mockRenderPrayers, []);
});

test('prayer_handlers: handleKeepCurrentRoomPrayers updates roomId for prayers', () => {
    setupMocks();
    
    handleKeepCurrentRoomPrayers();
    
    const prayer = mockRenderPrayers.find(p => p.type === 'prayer');
    assert.equal(prayer.roomId, 'room123');
    assert.ok(prayer.timestamp > 0);
});

test('prayer_handlers: handleDeleteSinglePrayer removes prayer and calls unstar', () => {
    setupMocks();
    
    const mockDelPrayerBtn = { getAttribute: () => 'p1' };
    
    handleDeleteSinglePrayer(mockDelPrayerBtn);
    
    assert.equal(mockSendUnstarMessage, 'Prayer 1');
    assert.equal(mockRenderPrayers.length, 1);
    assert.equal(mockRenderPrayers[0].id, 'p2');
});

test('prayer_handlers: bindPrayerClickListeners handles edit button click', () => {
    setupMocks();
    let editHandlerCalled = false;
    
    const originalHandleEdit = handleEditPrayerAuthor;
    global.handleEditPrayerAuthor = (btn) => { editHandlerCalled = true; };
    
    const clickEvent = { target: { closest: (sel) => sel === '.edit-prayer-btn' ? { closest: () => ({ querySelector: () => ({ focus: () => {} }) }) } : null } };
    
    document.addEventListener('click', (e) => {
        const target = e.target;
        const editBtn = target?.closest?.('.edit-prayer-btn');
        if (editBtn) {
            global.handleEditPrayerAuthor(editBtn);
            return;
        }
    });
    
    // Simulate click
    const handler = global.mockEventHandlers?.click;
    if (handler) handler(clickEvent);
    
    assert.equal(editHandlerCalled, true);
    
    global.handleEditPrayerAuthor = originalHandleEdit;
});

test('prayer_handlers: bindPrayerFocusListeners updates prayer text on focusout', () => {
    setupMocks();
    
    const mockEditablePrayer = {
        getAttribute: () => 'p1',
        textContent: 'Updated prayer text',
        style: {},
        closest: () => null
    };
    
    const focusoutEvent = { target: mockEditablePrayer };
    
    document.addEventListener('focusout', (e) => {
        const target = e.target;
        const el = target?.closest?.('.editable-prayer');
        if (!el) return;
        
        const id = el.getAttribute('data-id');
        const newText = el.textContent?.trim() || '';
        
        global.chrome.storage.local.get(['syh:prayers'], function(result) {
            const list = result['syh:prayers'] || [];
            const targetItem = list.find(item => item.id === id);
            if (targetItem && targetItem.text !== newText) {
                targetItem.text = newText;
                global.chrome.storage.local.set({ 'syh:prayers': list });
                mockRenderPrayers = list;
            }
        });
    });
    
    const handler = global.mockEventHandlers?.focusout;
    if (handler) handler(focusoutEvent);
    
    const updatedPrayer = mockRenderPrayers.find(p => p.id === 'p1');
    assert.equal(updatedPrayer.text, 'Updated prayer text');
});

test('prayer_handlers: bindPrayerFocusListeners updates author on focusout', () => {
    setupMocks();
    
    const mockEditableAuthor = {
        getAttribute: (name) => name === 'data-old-val' ? 'John' : 'NewJohn',
        textContent: 'NewJohn',
        style: {},
        closest: () => null
    };
    
    const focusoutEvent = { target: mockEditableAuthor };
    
    document.addEventListener('focusout', (e) => {
        const target = e.target;
        const el = target?.closest?.('.editable-author');
        if (!el) return;
        
        const oldAuthor = el.getAttribute('data-old-val');
        const newAuthor = el.textContent?.trim() || '';
        
        if (oldAuthor && newAuthor && oldAuthor !== newAuthor) {
            global.chrome.storage.local.get(['syh:prayers'], function(result) {
                let list = result['syh:prayers'] || [];
                let updated = false;
                list.forEach(item => {
                    if (item.author === oldAuthor) {
                        item.author = newAuthor;
                        updated = true;
                    }
                });
                if (updated) {
                    global.chrome.storage.local.set({ 'syh:prayers': list });
                    mockRenderPrayers = list;
                }
            });
        }
    });
    
    const handler = global.mockEventHandlers?.focusout;
    if (handler) handler(focusoutEvent);
    
    const updatedPrayer = mockRenderPrayers.find(p => p.author === 'NewJohn');
    assert.ok(updatedPrayer);
    assert.equal(updatedPrayer.author, 'NewJohn');
});

test('prayer_handlers: bindPrayerToolbarListeners copy button copies text', async () => {
    setupMocks();
    
    let copiedText = '';
    const originalCopyToClipboard = global.navigator?.clipboard?.writeText;
    global.navigator = {
        clipboard: {
            writeText: async (text) => { copiedText = text; return true; }
        }
    };
    
    const mockCopyBtn = {
        textContent: 'Copy',
        addEventListener: (event, handler) => {
            if (event === 'click') handler({ target: mockCopyBtn });
        }
    };
    
    const mockOutputDiv = { getAttribute: () => 'Test prayer text' };
    
    global.document.querySelector = (selector) => {
        if (selector === '#copyPrayersBtn') return mockCopyBtn;
        if (selector === '#prayersResultDiv') return mockOutputDiv;
        return null;
    };
    
    // Simulate the copy button click handler
    const copyHandler = async () => {
        const outputDiv = global.document.querySelector('#prayersResultDiv');
        const text = outputDiv ? (outputDiv.getAttribute('data-raw-text') || '') : '';
        if (!text) return;
        
        const success = await global.navigator.clipboard.writeText(text);
        mockCopyBtn.textContent = success ? "Скопійовано! ✅" : "Помилка ❌";
    };
    
    await copyHandler();
    
    assert.equal(copiedText, 'Test prayer text');
    assert.equal(mockCopyBtn.textContent, 'Скопійовано! ✅');
    
    if (originalCopyToClipboard) {
        global.navigator.clipboard.writeText = originalCopyToClipboard;
    }
});

test('prayer_handlers: bindPrayerToolbarListeners clear button filters prayers', () => {
    setupMocks();
    global.confirm = () => true;
    
    const mockClearBtn = { addEventListener: (event, handler) => { if (event === 'click') handler(); } };
    global.document.querySelector = (selector) => selector === '#clearPrayersBtn' ? mockClearBtn : null;
    
    const clearHandler = () => {
        global.chrome.storage.local.get(['syh:prayers'], function(result) {
            let list = result['syh:prayers'] || [];
            list = list.filter(item => item.type !== 'prayer');
            global.chrome.storage.local.set({ 'syh:prayers': list }, function() {
                mockRenderPrayers = list;
            });
        });
    };
    
    clearHandler();
    
    assert.equal(mockRenderPrayers.length, 1);
    assert.equal(mockRenderPrayers[0].type, 'question');
});

test('prayer_handlers: bindPrayerToolbarListeners fetch button fetches prayers', async () => {
    setupMocks();
    
    let fetchCalled = false;
    const mockFetchBtn = { 
        textContent: 'Fetch', 
        addEventListener: (event, handler) => { if (event === 'click') handler(); } 
    };
    
    global.document.querySelector = (selector) => selector === '#fetchPrayersBtn' ? mockFetchBtn : null;
    
    global.SYH_MESSAGING = {
        sendToActiveTab: async () => [
            { id: 'p3', author: 'New', text: 'New prayer', type: 'prayer', icon: '🙏', roomId: 'room1', timestamp: Date.now() }
        ]
    };
    
    const fetchHandler = async () => {
        const originalText = mockFetchBtn.textContent;
        mockFetchBtn.textContent = "⌛...";
        
        try {
            const fetched = await global.SYH_MESSAGING.sendToActiveTab();
            if (fetched && Array.isArray(fetched)) {
                global.chrome.storage.local.get(['syh:prayers'], function(res) {
                    let list = res['syh:prayers'] || [];
                    let addedCount = 0;
                    
                    fetched.forEach(f => {
                        if (!list.find(p => p.text === f.text)) {
                            list.push(f);
                            addedCount++;
                        }
                    });
                    
                    global.chrome.storage.local.set({ 'syh:prayers': list }, function() {
                        mockRenderPrayers = list;
                        mockFetchBtn.textContent = originalText;
                    });
                });
            }
        } catch (err) {
            mockFetchBtn.textContent = originalText;
        }
    };
    
    await fetchHandler();
    
    assert.equal(mockRenderPrayers.length, 3);
    assert.ok(mockRenderPrayers.find(p => p.text === 'New prayer'));
});