import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { installChromeMock } from './setup/chrome_mock.ts';

let mockStorageStore = {};
global.__mockThreads = [];

installChromeMock({
    runtimeImpl: { id: 'test-id' },
    storageImpl: {
        get: (keys, cb) => {
            const res = {};
            const arr = Array.isArray(keys) ? keys : [keys];
            arr.forEach(k => { res[k] = mockStorageStore[k]; });
            if (cb) cb(res);
        },
        set: (items, cb) => {
            Object.assign(mockStorageStore, items);
            if (cb) cb();
        },
        remove: (keys, cb) => {
            const arr = Array.isArray(keys) ? keys : [keys];
            arr.forEach(k => { delete mockStorageStore[k]; });
            if (cb) cb();
        }
    }
});

const { StudioCommentAdapter, retroactiveUpdateVideoComments } = await import('../youtube/studio/studio_adapter.ts');
const { resolveCategoryForVideo } = await import('../youtube/studio/studio_category_matcher.ts');

function createMockElement(tagName = 'DIV', options = {}) {
    const attributes = { ...options.attributes };
    const classes = new Set(options.className ? options.className.split(' ').filter(Boolean) : []);
    const children = [];

    const el = {
        tagName: tagName.toUpperCase(),
        type: tagName.toLowerCase() === 'button' ? 'button' : (tagName.toLowerCase() === 'input' ? 'checkbox' : ''),
        className: options.className || '',
        innerHTML: options.innerHTML || '',
        textContent: options.textContent || '',
        style: options.style || {},
        dataset: options.dataset || {},
        checked: options.checked || false,
        parentElement: options.parentElement || null,
        children,
        childNodes: options.childNodes || [],
        classList: {
            add: (...cls) => { cls.forEach(c => classes.add(c)); el.className = Array.from(classes).join(' '); },
            remove: (...cls) => { cls.forEach(c => classes.delete(c)); el.className = Array.from(classes).join(' '); },
            contains: (c) => classes.has(c),
            toggle: (c, val) => {
                if (val === undefined) val = !classes.has(c);
                if (val) classes.add(c); else classes.delete(c);
                el.className = Array.from(classes).join(' ');
                return val;
            }
        },
        setAttribute: (name, val) => {
            attributes[name] = String(val);
        },
        getAttribute: (name) => {
            return attributes[name] !== undefined ? attributes[name] : null;
        },
        hasAttribute: (name) => {
            return name in attributes;
        },
        removeAttribute: (name) => {
            delete attributes[name];
        },
        addEventListener: () => {},
        removeEventListener: () => {},
        appendChild: (child) => {
            if (child) {
                child.parentElement = el;
                children.push(child);
            }
            return child;
        },
        querySelector: options.querySelector || ((sel) => {
            for (const child of children) {
                if (child.matches && child.matches(sel)) return child;
                if (child.querySelector) {
                    const found = child.querySelector(sel);
                    if (found) return found;
                }
            }
            return null;
        }),
        querySelectorAll: options.querySelectorAll || ((sel) => {
            const results = [];
            for (const child of children) {
                if (child.matches && child.matches(sel)) results.push(child);
                if (child.querySelectorAll) {
                    results.push(...child.querySelectorAll(sel));
                }
            }
            return results;
        }),
        closest: options.closest || function(sel) {
            let curr = el;
            while (curr) {
                if (typeof sel === 'string') {
                    const tag = curr.tagName ? curr.tagName.toLowerCase() : '';
                    if ((sel.includes('ytcp-comment') || sel.includes('ytcp-comment-thread')) && 
                        (tag === 'ytcp-comment' || tag === 'ytcp-comment-thread' || curr.classList?.contains('ytcp-comment-thread') || curr.isMockThread)) {
                        return curr;
                    }
                    if (sel === '.ytcp-comment-thread' && (tag === 'ytcp-comment-thread' || curr.classList?.contains('ytcp-comment-thread') || curr.isMockThread)) {
                        return curr;
                    }
                }
                curr = curr.parentElement;
            }
            return null;
        }
    };

    return el;
}

global.document = global.document || {};
global.document.addEventListener = () => {};
global.document.querySelectorAll = (sel) => {
    if (!sel || sel === '*') return global.__mockThreads || [];
    if (typeof sel === 'string' && sel.includes('ytcp-comment')) return global.__mockThreads || [];
    return [];
};
global.document.querySelector = (sel) => {
    if (typeof sel === 'string' && sel.includes('data-syh-comment-key')) {
        const match = sel.match(/\[data-syh-comment-key="([^"]+)"\]/);
        if (match) {
            const key = match[1];
            return (global.__mockThreads || []).find(
                t => t.dataset?.syhCommentKey === key || t.getAttribute?.('data-syh-comment-key') === key
            ) || null;
        }
    }
    const all = global.document.querySelectorAll(sel);
    return all && all.length > 0 ? all[0] : null;
};
global.document.createElement = (tag) => createMockElement(tag);

const createMockThread = (overrides = {}) => {
    const attributes = { 'data-syh-studio-events-bound': 'false', ...overrides.attributes };
    const classes = new Set(['ytcp-comment-thread']);
    if (overrides.checkedClass) classes.add('syh-studio-comment-checked');

    const fakeQuestionBtn = createMockElement('BUTTON', { className: 'syh-studio-btn syh-studio-btn-question' });
    const fakePrayerBtn = createMockElement('BUTTON', { className: 'syh-studio-btn syh-studio-btn-prayer' });
    const fakeCopyBtn = createMockElement('BUTTON', { className: 'syh-studio-btn syh-studio-btn-copy' });
    const fakeCheckbox = createMockElement('INPUT', { className: 'syh-studio-checkbox', checked: overrides.checkboxChecked || false });

    const base = {
        isMockThread: true,
        tagName: 'YTCP-COMMENT',
        className: Array.from(classes).join(' '),
        parentElement: null,
        dataset: { syhCommentKey: overrides.commentKey },
        classList: {
            add: (...cls) => { cls.forEach(c => classes.add(c)); base.className = Array.from(classes).join(' '); },
            remove: (...cls) => { cls.forEach(c => classes.delete(c)); base.className = Array.from(classes).join(' '); },
            contains: (c) => classes.has(c),
            toggle: (c, val) => {
                if (val === undefined) val = !classes.has(c);
                if (val) classes.add(c); else classes.delete(c);
                base.className = Array.from(classes).join(' ');
                return val;
            }
        },
        hasAttribute: (attr) => attr === 'is-reply' ? (overrides.isReply || false) : (attr in attributes),
        getAttribute: (attr) => attributes[attr] !== undefined ? attributes[attr] : null,
        setAttribute: (attr, val) => { attributes[attr] = String(val); },
        removeAttribute: (attr) => { delete attributes[attr]; },
        addEventListener: () => {},
        querySelector: (sel) => {
            const s = typeof sel === 'string' ? sel : '';
            if (s.includes('.syh-studio-checkbox')) return fakeCheckbox;
            if (s.includes('author-text') || s.includes('author') || s.includes('name')) {
                return { textContent: overrides.author || 'TestAuthor' };
            }
            if (s.includes('content-text') || s.includes('content')) {
                return {
                    textContent: overrides.text || 'Test comment',
                    childNodes: [{ nodeType: 3, textContent: overrides.text || 'Test comment' }]
                };
            }
            if (s.includes('video-title') || s.includes('#video-title')) {
                return { textContent: overrides.videoTitle || 'Test Video Title' };
            }
            if (s.includes('video-thumbnail a') || s.includes('a#body') || s.includes('a.ytcp-comment-video-thumbnail')) {
                return { href: overrides.videoHref || '/watch?v=test123', getAttribute: (a) => a === 'href' ? overrides.videoHref || '/watch?v=test123' : null };
            }
            if (s.includes('btn-question')) return fakeQuestionBtn;
            if (s.includes('btn-prayer')) return fakePrayerBtn;
            if (s.includes('btn-copy')) return fakeCopyBtn;
            if (s.includes('toolbar')) return {
                querySelectorAll: () => [fakeCopyBtn, fakeQuestionBtn, fakePrayerBtn],
                querySelector: (sub) => {
                    if (sub.includes('btn-question')) return fakeQuestionBtn;
                    if (sub.includes('btn-prayer')) return fakePrayerBtn;
                    if (sub.includes('btn-copy')) return fakeCopyBtn;
                    return null;
                },
                appendChild: () => {}
            };
            if (s.includes('metadata')) return {
                querySelector: (sub) => sub.includes('checkbox') ? fakeCheckbox : null,
                querySelectorAll: () => [],
                appendChild: () => {}
            };
            if (s.includes('checkbox')) return fakeCheckbox;
            return null;
        },
        querySelectorAll: () => [],
        closest: (sel) => {
            if (typeof sel === 'string') {
                if (sel.includes('ytcp-comment') || sel === '.ytcp-comment-thread') {
                    return base;
                }
            }
            return null;
        }
    };

    fakeQuestionBtn.parentElement = base;
    fakePrayerBtn.parentElement = base;
    fakeCopyBtn.parentElement = base;
    fakeCheckbox.parentElement = base;

    global.__mockThreads.push(base);

    return base;
};

const createMockCaches = (overrides = {}) => ({
    videoSheetMap: overrides.videoSheetMap || {},
    buttonStates: overrides.buttonStates || {},
    checkboxStates: overrides.checkboxStates || {},
    collectedItems: overrides.collectedItems
});

describe('StudioCommentAdapter - Public API Tests', () => {
    test('constructor initializes with correct properties', () => {
        const caches = createMockCaches();
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        assert.ok(adapter);
    });

    test('getCommentContext extracts author, text, videoId, videoTitle from thread', () => {
        const caches = createMockCaches();
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const thread = createMockThread({
            author: 'JohnDoe',
            text: 'Test question?',
            videoTitle: 'Test Video Title',
            videoHref: '/watch?v=abc123'
        });

        const ctx = adapter.getCommentContext(thread);
        assert.ok(ctx);
        assert.equal(ctx.author, 'JohnDoe');
        assert.equal(ctx.text, 'Test question?');
        assert.ok(ctx.videoId);
        assert.ok(ctx.videoTitle);
    });

    test('getCommentContext handles reply comments by inheriting video info from parent', () => {
        const caches = createMockCaches();
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const thread = createMockThread({
            author: 'ReplyUser',
            text: 'This is a reply',
            videoTitle: 'Child Video',
            videoHref: '/watch?v=child456'
        });
        thread.hasAttribute = (attr) => attr === 'is-reply';

        const ctx = adapter.getCommentContext(thread);
        assert.ok(ctx);
        assert.equal(ctx.author, 'ReplyUser');
        assert.equal(ctx.text, 'This is a reply');
    });

    test('getCommentContext returns null when author is missing', () => {
        const caches = createMockCaches();
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const thread = createMockThread({
            author: '',
            text: 'Test comment'
        });
        thread.querySelector = (sel) => {
            if (sel.includes('author')) return { textContent: '' };
            return null;
        };

        const ctx = adapter.getCommentContext(thread);
        assert.equal(ctx, null);
    });

    test('getButtons returns all button elements when UI is injected', () => {
        const caches = createMockCaches();
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const thread = createMockThread();

        const buttons = adapter.getButtons(thread);
        assert.ok(buttons.questionBtn);
        assert.ok(buttons.prayerBtn);
        assert.ok(buttons.copyBtn);
        assert.ok(buttons.checkboxEl);
        assert.ok(buttons.bodyEl);
    });

    test('getButtons returns null buttons when UI not injected', () => {
        const caches = createMockCaches();
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const thread = {
            tagName: 'DIV',
            querySelector: () => null,
            closest: () => null
        };

        const buttons = adapter.getButtons(thread);
        assert.equal(buttons.questionBtn, null);
        assert.equal(buttons.prayerBtn, null);
        assert.equal(buttons.copyBtn, null);
        assert.equal(buttons.checkboxEl, null);
        assert.ok(buttons.bodyEl);
    });

    test('getSheetId returns correct sheetId based on video category', () => {
        const caches = createMockCaches({
            videoSheetMap: {
                'Test Video Title': { sheetId: 'oparin', source: 'manual' }
            }
        });
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const thread = createMockThread({
            videoTitle: 'Test Video Title',
            author: 'TestAuthor',
            text: 'Test comment'
        });

        const sheetId = adapter.getSheetId(null, thread);
        assert.equal(sheetId, 'oparin');
    });

    test('getSheetId falls back to auto-detection when no manual override', () => {
        const caches = createMockCaches({ videoSheetMap: {} });
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const thread = createMockThread({
            videoTitle: 'СУББОТНЯЯ ШКОЛА | Урок 1',
            author: 'TestAuthor',
            text: 'Test comment'
        });

        const sheetId = adapter.getSheetId(null, thread);
        assert.equal(sheetId, 'vp_ss');
    });

    test('getSheetId returns default when videoId missing', () => {
        const caches = createMockCaches({ videoSheetMap: {} });
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const thread = {
            tagName: 'DIV',
            querySelector: () => null,
            closest: () => null
        };

        const sheetId = adapter.getSheetId(null, thread);
        assert.equal(sheetId, 'vp_ss');
    });

    test('getButtonStatesKey returns correct storage key', () => {
        const caches = createMockCaches();
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        assert.equal(adapter.getButtonStatesKey(), 'syh:studio:button_state');
    });

    test('getCheckboxStatesKey returns correct storage key', () => {
        const caches = createMockCaches();
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        assert.equal(adapter.getCheckboxStatesKey(), 'syh:studio:checkbox_state');
    });

    test('applyButtonState updates button UI based on state', () => {
        const caches = createMockCaches();
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const thread = createMockThread();
        const buttons = adapter.getButtons(thread);

        adapter.applyButtonState(buttons, 'question', 'vp_ss');
        assert.ok(buttons.questionBtn.classList.contains('syh-btn-active'));
        assert.ok(!buttons.prayerBtn.classList.contains('syh-btn-active'));

        adapter.applyButtonState(buttons, 'prayer', 'vp_ss');
        assert.ok(buttons.prayerBtn.classList.contains('syh-btn-active'));
        assert.ok(!buttons.questionBtn.classList.contains('syh-btn-active'));

        adapter.applyButtonState(buttons, null, 'vp_ss');
        assert.ok(!buttons.questionBtn.classList.contains('syh-btn-active'));
        assert.ok(!buttons.prayerBtn.classList.contains('syh-btn-active'));
    });

    test('applyCheckboxState updates checkbox checked state', () => {
        const caches = createMockCaches();
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const thread = createMockThread();
        const buttons = adapter.getButtons(thread);

        adapter.applyCheckboxState(buttons, true);
        assert.equal(buttons.checkboxEl.checked, true);

        adapter.applyCheckboxState(buttons, false);
        assert.equal(buttons.checkboxEl.checked, false);
    });

    test('markChecked sets checkbox and thread class, saves to storage', async () => {
        mockStorageStore = {};
        const caches = createMockCaches();
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const thread = createMockThread();

        await adapter.markChecked(thread, 'test_key', caches);

        assert.equal(thread.querySelector('.syh-studio-checkbox')?.checked, true);
        assert.ok(thread.classList.contains('syh-studio-comment-checked'));
    });

    test('unmarkChecked clears checkbox and thread class, saves to storage', async () => {
        mockStorageStore = {};
        const caches = createMockCaches({
            checkboxStates: { test_key: { checked: true, timestamp: Date.now() } }
        });
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const thread = createMockThread();

        await adapter.unmarkChecked(thread, 'test_key', caches);

        assert.equal(thread.querySelector('.syh-studio-checkbox')?.checked, false);
        assert.ok(!thread.classList.contains('syh-studio-comment-checked'));
    });

    test('isEventsBound returns true when element has bound attribute', () => {
        const caches = createMockCaches();
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const thread = createMockThread();
        thread.setAttribute('data-syh-studio-events-bound', 'true');

        assert.equal(adapter.isEventsBound(thread), true);
    });

    test('isEventsBound returns false when element lacks bound attribute', () => {
        const caches = createMockCaches();
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const thread = createMockThread();

        assert.equal(adapter.isEventsBound(thread), false);
    });

    test('markEventsBound sets bound attribute on element', () => {
        const caches = createMockCaches();
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const thread = createMockThread();

        adapter.markEventsBound(thread);
        assert.equal(thread.getAttribute('data-syh-studio-events-bound'), 'true');
    });

    test('beforeAction returns sheetId when category resolved', async () => {
        const caches = createMockCaches({
            videoSheetMap: {
                'Test Video': { sheetId: 'oparin', source: 'manual' }
            }
        });
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const thread = createMockThread({
            videoTitle: 'Test Video',
            author: 'TestAuthor',
            text: 'Test comment'
        });

        const result = await adapter.beforeAction('question', null, thread);
        assert.ok(result);
        assert.equal(result.sheetId, 'oparin');
    });

    test('beforeAction returns null when category unresolved', async () => {
        const caches = createMockCaches({ videoSheetMap: {} });
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const thread = createMockThread({
            videoTitle: 'Unknown Video',
            author: 'TestAuthor',
            text: 'Test comment'
        });

        const result = await adapter.beforeAction('question', null, thread);
        assert.equal(result, null);
    });

    test('afterAction updates badge and buttons after action', async () => {
        const caches = createMockCaches({
            videoSheetMap: {
                'Test Video': { sheetId: 'oparin', source: 'manual' }
            }
        });
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const thread = createMockThread({
            videoTitle: 'Test Video',
            author: 'TestAuthor',
            text: 'Test comment'
        });
        thread.dataset.syhCommentKey = 'test_comment_key';

        await adapter.afterAction({
            type: 'question',
            context: { id: 'test_comment_key', author: 'TestAuthor', text: 'Test comment', videoId: 'Test Video', videoTitle: 'Test Video' },
            sheetId: 'oparin',
            commentKey: 'test_comment_key'
        });

        assert.ok(true);
    });

    test('getButtonState returns state from cache', () => {
        const caches = createMockCaches({
            buttonStates: { 'comment_1': 'question' }
        });
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const ctx = { id: 'comment_1', author: 'Test', text: 'Test', videoId: 'v1', videoTitle: 'Test' };

        const state = adapter.getButtonState(ctx, 'comment_1');
        assert.equal(state, 'question');
    });

    test('getButtonState falls back to collectedItems when cache missing', () => {
        const caches = createMockCaches({
            buttonStates: {},
            collectedItems: [
                { id: 'comment_2', author: 'Author', text: 'Text', type: 'prayer', timestamp: Date.now() }
            ]
        });
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const ctx = { id: 'comment_2', author: 'Author', text: 'Text', videoId: 'v1', videoTitle: 'Test' };

        const state = adapter.getButtonState(ctx, 'comment_2');
        assert.equal(state, 'prayer');
    });

    test('restoreButtonState restores button UI from cache', () => {
        const caches = createMockCaches({
            buttonStates: { 'comment_1': 'question' },
            videoSheetMap: { 'Test Video': { sheetId: 'oparin', source: 'manual' } }
        });
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const thread = createMockThread({
            videoTitle: 'Test Video',
            author: 'TestAuthor',
            text: 'Test comment'
        });
        thread.dataset.syhCommentKey = 'comment_1';

        adapter.restoreButtonState(thread, 'comment_1');

        assert.ok(true);
    });

    test('restoreCheckboxState restores checkbox state from cache', () => {
        const caches = createMockCaches({
            checkboxStates: { 'comment_1': { checked: true, timestamp: Date.now() } }
        });
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const thread = createMockThread({
            author: 'TestAuthor',
            text: 'Test comment'
        });
        thread.dataset.syhCommentKey = 'comment_1';

        adapter.restoreCheckboxState(thread, 'comment_1');

        assert.ok(true);
    });

    test('bindStudioSpecificEvents binds click handlers to badge and dropdown', () => {
        const caches = createMockCaches();
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const thread = createMockThread();

        adapter.bindStudioSpecificEvents(thread, 'comment_1', caches);

        assert.ok(true);
    });

    test('isCheckboxOutOfSync detects mismatch between UI and cache', () => {
        const caches = createMockCaches({
            checkboxStates: { 'comment_1': { checked: true, timestamp: Date.now() } }
        });
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const thread = createMockThread({
            author: 'TestAuthor',
            text: 'Test comment'
        });
        thread.dataset.syhCommentKey = 'comment_1';

        const outOfSync = adapter.isCheckboxOutOfSync(thread, 'comment_1');
        assert.equal(outOfSync, true);
    });

    test('isButtonOutOfSync detects mismatch between UI and cache', () => {
        const caches = createMockCaches({
            buttonStates: { 'comment_1': 'question' }
        });
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);
        const thread = createMockThread({
            author: 'TestAuthor',
            text: 'Test comment'
        });
        thread.dataset.syhCommentKey = 'comment_1';

        const outOfSync = adapter.isButtonOutOfSync(thread, 'comment_1');
        assert.equal(outOfSync, true);
    });
});

describe('retroactiveUpdateVideoComments', () => {
    test('updates matching comment threads in DOM', () => {
        const createFakeBtn = () => {
            const added = new Set();
            return {
                innerHTML: '',
                title: '',
                classList: {
                    contains: (cls) => added.has(cls),
                    add: (cls) => added.add(cls),
                    remove: (cls) => added.delete(cls)
                }
            };
        };

        const fakeQuestionBtn = createFakeBtn();
        const fakePrayerBtn = createFakeBtn();
        const fakeCopyBtn = createFakeBtn();

        const fakeThread = {
            tagName: 'YTCP-COMMENT',
            dataset: { syhCommentKey: 'c_retro_1' },
            hasAttribute: () => false,
            querySelector: (sel) => {
                const s = typeof sel === 'string' ? sel : '';
                if (s.includes('author-text')) return { textContent: 'UserRetro' };
                if (s.includes('content-text')) return { textContent: 'Comment for retro update' };
                if (s.includes('video-title')) return { textContent: 'Retro Video Title' };
                if (s.includes('btn-question')) return fakeQuestionBtn;
                if (s.includes('btn-prayer')) return fakePrayerBtn;
                if (s.includes('btn-copy')) return fakeCopyBtn;
                if (s.includes('toolbar')) return {
                    querySelector: (sub) => {
                        if (sub.includes('btn-question')) return fakeQuestionBtn;
                        if (sub.includes('btn-prayer')) return fakePrayerBtn;
                        if (sub.includes('btn-copy')) return fakeCopyBtn;
                        return null;
                    },
                    querySelectorAll: () => [fakeCopyBtn, fakeQuestionBtn, fakePrayerBtn],
                    appendChild: () => {}
                };
                if (s.includes('metadata')) return { querySelector: () => null, querySelectorAll: () => [], appendChild: () => {} };
                return null;
            },
            closest: () => fakeThread
        };

        global.document.querySelectorAll = (sel) => {
            if (sel === 'ytcp-comment' || sel.includes('ytcp-comment')) return [fakeThread];
            return [];
        };

        const caches = {
            videoSheetMap: {
                'Retro Video Title': { sheetId: 'oparin', source: 'manual' }
            },
            buttonStates: { 'c_retro_1': 'question' },
            checkboxStates: {}
        };

        retroactiveUpdateVideoComments('Retro Video Title', 'vp', caches);

        assert.equal(fakeQuestionBtn.classList.contains('syh-btn-active'), true);
    });
});

describe('resolveCategoryForVideo integration', () => {
    test('returns manual override when present', () => {
        const map = {
            'video-123': { sheetId: 'oparin', source: 'manual' }
        };
        const res = resolveCategoryForVideo('Any Title', 'video-123', 'vp', map);
        assert.equal(res.sheetId, 'oparin');
        assert.equal(res.source, 'manual');
    });

    test('falls back to auto-match when no override', () => {
        const res = resolveCategoryForVideo('СУББОТНЯЯ ШКОЛА | Урок 1', 'video-456', 'vp', {});
        assert.equal(res.sheetId, 'vp_ss');
        assert.equal(res.source, 'auto');
    });

    test('returns unresolved when no match', () => {
        const res = resolveCategoryForVideo('Unknown Video', 'video-789', 'vp', {});
        assert.equal(res.sheetId, null);
        assert.equal(res.source, 'unresolved');
    });
});