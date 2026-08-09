import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

// Global mocks for Node environment
global.window = global;
let mockStorageStore = {};

global.chrome = {
    runtime: { id: 'test-id' },
    storage: {
        local: {
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
    }
};

const { matchCategory } = await import('../modules/channel_config.ts');
const { resolveCategoryForVideo } = await import('../youtube/studio/studio_category_matcher.ts');
const { CommentInjector } = await import('../modules/comment_injector.ts');
const { StudioCommentAdapter, retroactiveUpdateVideoComments } = await import('../youtube/studio/studio_adapter.ts');
const { YouTubeCommentAdapter } = await import('../youtube/yt_adapter.ts');
const { CommentService } = await import('../modules/comment_service.ts');
const { SheetStateService } = await import('../modules/sheet_state_service.ts');

describe('YouTube Studio Category & Question Sync Safeguard Tests', () => {
    test('1. matchCategory correctly identifies Oparin videos on VP channel', () => {
        const title1 = "Что значит служить Богу не от полного сердца?  | Алексей Опарин";
        assert.equal(matchCategory(title1, 'vp'), 'oparin');

        const title2 = "Не затворили ли мы вотрота Дома Господня?  | Алексей Опарин";
        assert.equal(matchCategory(title2, 'vp'), 'oparin');

        const title3 = "Проповідь Опарін О.О.";
        assert.equal(matchCategory(title3, 'vp'), 'oparin');
    });

    test('2. matchCategory does NOT falsely match words containing "сш" substring (like масштаб, высший)', () => {
        assert.equal(matchCategory("Масштабные события церкви", 'vp'), null);
        assert.equal(matchCategory("Высший суд Божией справедливости", 'vp'), null);
        assert.equal(matchCategory("Сшить новую одежду праведности", 'vp'), null);
    });

    test('3. matchCategory correctly identifies Sabbath School videos on VP channel', () => {
        assert.equal(matchCategory("СУББОТНЯЯ ШКОЛА | УРОК 6 Духовные дары | Молчанов, Опарин", 'vp'), 'vp_ss');
        assert.equal(matchCategory("13 июля. Итоги. Урок субботней школы. Марк 1", 'vp'), 'vp_ss');
        assert.equal(matchCategory("Урок СШ №5", 'vp'), 'vp_ss');
    });

    test('4. resolveCategoryForVideo respects manual overrides over auto detection', () => {
        const videoTitle = "СУББОТНЯЯ ШКОЛА | УРОК 6";
        const videoKey = "video-123";
        const map = {
            "video-123": { sheetId: 'oparin', source: 'manual' }
        };

        const res = resolveCategoryForVideo(videoTitle, videoKey, 'vp', map);
        assert.equal(res.sheetId, 'oparin');
        assert.equal(res.source, 'manual');
    });

    test('5. CommentInjector cancels action if adapter beforeAction returns null (unresolved category)', async () => {
        const dummyAdapter = {
            isEventsBound: () => false,
            markEventsBound: () => {},
            getCommentContext: () => ({ id: 'c1', author: 'User', text: 'Question?', videoId: 'v1', videoTitle: 'Test' }),
            getButtons: () => ({
                questionBtn: { addEventListener: () => {} },
                prayerBtn: null,
                copyBtn: null,
                checkboxEl: null,
                bodyEl: null
            }),
            beforeAction: async () => null, // Category unresolved -> return null
            getSheetId: () => 'vp_ss',
            getButtonStatesKey: () => 'syh_button_states',
            getCheckboxStatesKey: () => 'syh_checkbox_states',
            applyButtonState: () => {},
            markChecked: async () => {},
            buildCollectedItem: (key, ctx, type) => ({ id: key, author: ctx.author, text: ctx.text, type })
        };

        const caches = { buttonStates: {}, checkboxStates: {} };
        const injector = new CommentInjector(dummyAdapter, caches);

        let questionListener;
        const fakeBtn = {
            addEventListener: (evt, fn) => { if (evt === 'click') questionListener = fn; }
        };
        dummyAdapter.getButtons = () => ({ questionBtn: fakeBtn });

        const fakeElement = {};
        injector.bindCommentEvents(fakeElement, 'c1');

        assert.equal(typeof questionListener, 'function');
        // Trigger click — beforeAction returning null should prevent saving to fallback sheetId
        await questionListener({ stopPropagation: () => {} });

        assert.equal(caches.buttonStates['c1'], undefined);
    });

    test('6. StudioCommentAdapter getCommentContext extracts title cleanly for reply comments without dataset pollution', () => {
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', { videoSheetMap: {}, buttonStates: {}, checkboxStates: {} });

        const thread = {
            tagName: 'YTCP-COMMENT',
            hasAttribute: (attr) => attr === 'is-reply',
            querySelector: (sel) => {
                if (typeof sel === 'string' && (sel.includes('author-text') || sel.includes('name'))) return { textContent: 'John' };
                if (typeof sel === 'string' && sel.includes('content-text')) return { textContent: 'Some comment text' };
                return null;
            },
            closest: (sel) => {
                if (sel === '.ytcp-comment-thread') {
                    return {
                        querySelector: (subSel) => {
                            if (typeof subSel === 'string' && (subSel.includes('video-title') || subSel.includes('#video-title'))) {
                                return { textContent: '  Что значит служить Богу не от полного сердца?  | Алексей Опарин  ' };
                            }
                            return null;
                        }
                    };
                }
                return null;
            }
        };

        const ctx = adapter.getCommentContext(thread);
        assert.ok(ctx);
        assert.equal(ctx.author, 'John');
        assert.equal(ctx.text, 'Some comment text');
        assert.equal(ctx.videoTitle, 'Что значит служить Богу не от полного сердца?  | Алексей Опарин');
        assert.equal(ctx.videoId, 'Что значит служить Богу не от полного сердца?  | Алексей Опарин');
    });

    test('7. StudioCommentAdapter fallback to Popup collectedItems when local buttonStates key differs', () => {
        if (!global.document) {
            global.document = {
                createElement: (tag) => ({
                    tagName: tag.toUpperCase(),
                    type: tag === 'button' ? 'button' : '',
                    className: '',
                    style: {},
                    dataset: {},
                    classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => false },
                    setAttribute: () => {},
                    getAttribute: () => null,
                    addEventListener: () => {},
                    querySelectorAll: () => [],
                    querySelector: () => null,
                    appendChild: () => {},
                    closest: () => null
                }),
                querySelectorAll: () => [],
                addEventListener: () => {}
            };
        }

        let thread;
        const fakeCopyBtn = { classList: { contains: () => false }, innerHTML: '', title: '', closest: (sel) => sel && (sel.includes('ytcp-comment') || sel.includes('ytcp-comment-thread')) ? thread : null };
        const fakeQuestionBtn = { classList: { contains: () => false }, innerHTML: '', title: '', closest: (sel) => sel && (sel.includes('ytcp-comment') || sel.includes('ytcp-comment-thread')) ? thread : null };
        const fakePrayerBtn = { classList: { contains: () => false }, innerHTML: '', title: '', closest: (sel) => sel && (sel.includes('ytcp-comment') || sel.includes('ytcp-comment-thread')) ? thread : null };

        const caches = {
            videoSheetMap: {},
            buttonStates: {},
            checkboxStates: {},
            collectedItems: [
                { id: 'c-popup-1', author: 'Алексей', text: 'Вопрос по Библии?', type: 'question', timestamp: Date.now() }
            ]
        };
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);

        thread = {
            tagName: 'YTCP-COMMENT',
            hasAttribute: () => false,
            querySelector: (sel) => {
                if (typeof sel === 'string' && (sel.includes('author-text') || sel.includes('name'))) return { textContent: 'Алексей' };
                if (typeof sel === 'string' && sel.includes('content-text')) return {
                    textContent: 'Вопрос по Библии?',
                    childNodes: [{ nodeType: 3, textContent: 'Вопрос по Библии?' }]
                };
                if (typeof sel === 'string' && (sel.includes('video-title') || sel.includes('#video-title'))) return { textContent: 'Что значит служить Богу...' };
                if (typeof sel === 'string' && sel.includes('btn-copy')) return fakeCopyBtn;
                if (typeof sel === 'string' && sel.includes('btn-question')) return fakeQuestionBtn;
                if (typeof sel === 'string' && sel.includes('btn-prayer')) return fakePrayerBtn;
                if (typeof sel === 'string' && sel.includes('toolbar')) return {
                    querySelectorAll: () => [fakeCopyBtn, fakeQuestionBtn, fakePrayerBtn],
                    querySelector: (sub) => {
                        if (sub.includes('btn-question')) return fakeQuestionBtn;
                        if (sub.includes('btn-prayer')) return fakePrayerBtn;
                        if (sub.includes('btn-copy')) return fakeCopyBtn;
                        return null;
                    },
                    appendChild: () => {}
                };
                return null;
            },
            closest: (sel) => sel && (sel.includes('ytcp-comment') || sel.includes('ytcp-comment-thread')) ? thread : null
        };

        const ctx = adapter.getCommentContext(thread);
        assert.ok(ctx);

        const isOutOfSync = adapter.isButtonOutOfSync(thread, ctx.id);
        assert.equal(isOutOfSync, true);
    });

    test('8. StudioCommentAdapter detects stripped syh-studio-comment-checked class on Polymer re-render', () => {
        const fakeCheckbox = { checked: true };
        const fakeQuestionBtn = { classList: { contains: () => false } };
        const fakePrayerBtn = { classList: { contains: () => false } };

        const caches = {
            videoSheetMap: {},
            buttonStates: {},
            checkboxStates: {
                'studio_c_10_abc_def': { checked: true, timestamp: Date.now() }
            }
        };
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);

        const thread = {
            tagName: 'YTCP-COMMENT',
            classList: { contains: () => false },
            hasAttribute: () => false,
            querySelector: (sel) => {
                if (typeof sel === 'string' && sel.includes('checkbox')) return fakeCheckbox;
                if (typeof sel === 'string' && sel.includes('btn-question')) return fakeQuestionBtn;
                if (typeof sel === 'string' && sel.includes('btn-prayer')) return fakePrayerBtn;
                if (typeof sel === 'string' && sel.includes('metadata')) return {
                    querySelector: () => null,
                    querySelectorAll: () => [],
                    appendChild: () => {}
                };
                if (typeof sel === 'string' && sel.includes('toolbar')) return {
                    querySelectorAll: () => [],
                    querySelector: (sub) => {
                        if (sub.includes('btn-question')) return fakeQuestionBtn;
                        if (sub.includes('btn-prayer')) return fakePrayerBtn;
                        return null;
                    },
                    appendChild: () => {}
                };
                return null;
            },
            closest: function() { return this; }
        };

        const isOutOfSync = adapter.isCheckboxOutOfSync(thread, 'studio_c_10_abc_def');
        assert.equal(isOutOfSync, true);
    });

    test('9. getCommentText extracts text from emoji alt attributes and single punctuation comments', () => {
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', { videoSheetMap: {}, buttonStates: {}, checkboxStates: {} });

        // Case A: Single punctuation comment ","
        const threadComma = {
            tagName: 'YTCP-COMMENT',
            hasAttribute: () => false,
            querySelector: (sel) => {
                if (typeof sel === 'string' && sel.includes('author-text')) return { textContent: '@Людмила' };
                if (typeof sel === 'string' && sel.includes('content-text')) return { textContent: ',', childNodes: [{ nodeType: 3, textContent: ',' }] };
                return null;
            },
            closest: () => null
        };
        const ctxComma = adapter.getCommentContext(threadComma);
        assert.ok(ctxComma);
        assert.equal(ctxComma.text, ',');

        // Case B: Emoji-only comment (where Polymer renders <img alt="🙏">)
        const threadEmoji = {
            tagName: 'YTCP-COMMENT',
            hasAttribute: () => false,
            querySelector: (sel) => {
                if (typeof sel === 'string' && sel.includes('author-text')) return { textContent: '@danamitkovetskaya' };
                if (typeof sel === 'string' && sel.includes('content-text')) return {
                    textContent: '',
                    childNodes: [
                        { nodeType: 1, tagName: 'IMG', alt: '🙏' },
                        { nodeType: 1, tagName: 'IMG', alt: '🙏' },
                        { nodeType: 1, tagName: 'IMG', alt: '❤️' }
                    ]
                };
                return null;
            },
            closest: () => null
        };
        const ctxEmoji = adapter.getCommentContext(threadEmoji);
        assert.ok(ctxEmoji);
        assert.equal(ctxEmoji.text, '🙏🙏❤️');
    });

    test('10. studio_header_counters correctly resolves sheets and renders badges for each channel', async () => {
        const { getSheetsForChannel, renderStudioHeaderCounters } = await import('../youtube/studio/studio_header_counters.ts');
        const { getCurrentStudioChannelKey } = await import('../youtube/studio/studio_channel.ts');

        assert.deepEqual(getSheetsForChannel('vp'), ['vp_ss', 'oparin']);
        assert.deepEqual(getSheetsForChannel('slovo'), ['molchanov_ss', 'molchanov_preach']);
        assert.deepEqual(getSheetsForChannel('unknown'), []);

        // Mock parent DOM element
        const children = [];
        const parent = {
            querySelector: (sel) => children.find(c => c.className === sel.replace('.', '')),
            appendChild: (child) => { children.push(child); return child; }
        };

        // Node fake element creation helper
        global.document = global.document || {
            createElement: (tag) => ({
                tagName: tag.toUpperCase(),
                className: '',
                innerHTML: '',
                appendChild: function(c) { this.children = this.children || []; this.children.push(c); }
            })
        };

        // Test rendering for channel 'slovo'
        const statsSlovo = {
            molchanov_ss: { questions: 5, prayers: 1 },
            molchanov_preach: { questions: 2, prayers: 0 }
        };
        const wrapperSlovo = renderStudioHeaderCounters(parent, 'slovo', statsSlovo);

        assert.ok(wrapperSlovo);
        assert.ok(wrapperSlovo.innerHTML.includes('Молчанов <b>СШ</b>'));
        assert.ok(wrapperSlovo.innerHTML.includes('Молчанов <b>проповеди</b>'));
        assert.ok(wrapperSlovo.innerHTML.includes('❓ <b class="syh-counter-num-q">5</b>'));
        assert.ok(wrapperSlovo.innerHTML.includes('🙏 <b class="syh-counter-num-p">1</b>'));
        assert.ok(wrapperSlovo.innerHTML.includes('❓ <b class="syh-counter-num-q">2</b>'));
        assert.ok(!wrapperSlovo.innerHTML.includes('Нові з YouTube'));
        assert.ok(!wrapperSlovo.innerHTML.includes('Время перемен'));
        assert.ok(!wrapperSlovo.innerHTML.includes('Опарин'));

        // Test rendering for channel 'vp'
        const statsVp = {
            vp_ss: { questions: 3, prayers: 4 },
            oparin: { questions: 1, prayers: 0 }
        };
        const wrapperVp = renderStudioHeaderCounters(parent, 'vp', statsVp);

        assert.ok(wrapperVp.innerHTML.includes('Время перемен <b>СШ</b>'));
        assert.ok(wrapperVp.innerHTML.includes('Опарин <b>проповеди</b>'));
        assert.ok(wrapperVp.innerHTML.includes('❓ <b class="syh-counter-num-q">3</b>'));
        assert.ok(wrapperVp.innerHTML.includes('🙏 <b class="syh-counter-num-p">4</b>'));
        assert.ok(wrapperVp.innerHTML.includes('❓ <b class="syh-counter-num-q">1</b>'));
        assert.ok(!wrapperVp.innerHTML.includes('Молчанов'));

        // Test rendering for unknown channel
        const wrapperUnknown = renderStudioHeaderCounters(parent, 'unknown', {});
        assert.ok(wrapperUnknown.innerHTML.includes('Канал не розпізнано'));
    });

    test('11. CommentInjector untoggles on repeat click, removes collected item, and unchecks checkbox', async () => {
        let appliedState = 'initial';
        let appliedCheckbox = null;

        const dummyAdapter = {
            isEventsBound: () => false,
            markEventsBound: () => {},
            getCommentContext: () => ({ id: 'c_toggle_1', author: 'User1', text: 'Prayer request', videoId: 'v1', videoTitle: 'Test' }),
            getButtons: () => ({
                questionBtn: null,
                prayerBtn: null,
                copyBtn: null,
                checkboxEl: { checked: true },
                bodyEl: null
            }),
            getSheetId: () => 'vp_ss',
            getButtonStatesKey: () => 'syh_button_states',
            getCheckboxStatesKey: () => 'syh_checkbox_states',
            applyButtonState: (btns, state) => { appliedState = state; },
            applyCheckboxState: (btns, isChecked) => { appliedCheckbox = isChecked; },
            markChecked: async () => {},
            unmarkChecked: async (el, key, caches) => {
                caches.checkboxStates[key] = { checked: false, timestamp: Date.now() };
            },
            buildCollectedItem: (key, ctx, type) => ({ id: key, author: ctx.author, text: ctx.text, type })
        };

        const caches = { buttonStates: {}, checkboxStates: {} };
        const injector = new CommentInjector(dummyAdapter, caches);

        let prayerListener;
        const fakePrayerBtn = {
            addEventListener: (evt, fn) => { if (evt === 'click') prayerListener = fn; }
        };
        dummyAdapter.getButtons = () => ({
            prayerBtn: fakePrayerBtn,
            checkboxEl: { checked: true, addEventListener: () => {} }
        });

        injector.bindCommentEvents({}, 'c_toggle_1');

        // First click -> sets to prayer
        await prayerListener({ stopPropagation: () => {} });
        assert.equal(caches.buttonStates['c_toggle_1'], 'prayer');
        assert.equal(appliedState, 'prayer');

        // Second click on same prayer button -> untoggles!
        await prayerListener({ stopPropagation: () => {} });
        assert.equal(caches.buttonStates['c_toggle_1'], undefined);
        assert.equal(appliedState, null);
        assert.equal(appliedCheckbox, false);
        assert.equal(caches.checkboxStates['c_toggle_1'].checked, false);
    });

    test('12. CommentInjector untoggles correctly when adapter provides getButtonState (e.g. fallback resolution)', async () => {
        let appliedState = 'initial';

        const adapterWithGetState = {
            isEventsBound: () => false,
            markEventsBound: () => {},
            getCommentContext: () => ({ id: 'c_fallback_99', author: 'Author99', text: 'Some text' }),
            getButtons: () => ({
                questionBtn: null,
                prayerBtn: null,
                copyBtn: null,
                checkboxEl: null,
                bodyEl: null
            }),
            getSheetId: () => 'vp_ss',
            getButtonStatesKey: () => 'syh_button_states',
            getCheckboxStatesKey: () => 'syh_checkbox_states',
            getButtonState: (ctx, key, caches) => 'question', // State resolved via adapter getButtonState
            applyButtonState: (btns, state) => { appliedState = state; },
            applyCheckboxState: () => {},
            markChecked: async () => {},
            unmarkChecked: async () => {},
            buildCollectedItem: (key, ctx, type) => ({ id: key, author: ctx.author, text: ctx.text, type })
        };

        const caches = { buttonStates: {}, checkboxStates: {} };
        const injector = new CommentInjector(adapterWithGetState, caches);

        let questionListener;
        adapterWithGetState.getButtons = () => ({
            questionBtn: { addEventListener: (evt, fn) => { if (evt === 'click') questionListener = fn; } }
        });

        injector.bindCommentEvents({}, 'c_fallback_99');

        // Click when adapter.getButtonState returns 'question' -> untoggles to null!
        await questionListener({ stopPropagation: () => {} });
        assert.equal(appliedState, null);
    });

    test('13. End-to-End Pipeline: CommentInjector -> Adapter -> CommentService -> Storage -> SheetStateService', async () => {
        mockStorageStore = {};
        global.document = global.document || {};
        if (typeof global.document.querySelector !== 'function') {
            global.document.querySelector = () => null;
        }
        const adapter = new YouTubeCommentAdapter();
        const caches = { buttonStates: {}, checkboxStates: {}, collectedList: [] };
        const injector = new CommentInjector(adapter, caches);

        let questionBtnListener;
        adapter.getButtons = () => ({
            questionBtn: { addEventListener: (evt, fn) => { if (evt === 'click') questionBtnListener = fn; } },
            prayerBtn: null,
            copyBtn: null,
            checkboxEl: null,
            bodyEl: null
        });

        const elementNode = {
            id: 'yt_comment_e2e_1',
            querySelector: (sel) => {
                const s = Array.isArray(sel) ? sel.join(',') : String(sel || '');
                if (s.includes('author')) return { textContent: '@Mariya' };
                if (s.includes('content-text')) return { textContent: 'Питання про молитву?', getAttribute: () => null };
                if (s.includes('lc=')) return { getAttribute: (a) => a === 'href' ? '/watch?v=123&lc=yt_comment_e2e_1' : null };
                return null;
            },
            getAttribute: (attr) => attr === 'data-syh-yt-events-bound' ? 'false' : null,
            setAttribute: () => {}
        };

        injector.bindCommentEvents(elementNode, 'yt_comment_e2e_1');

        assert.equal(typeof questionBtnListener, 'function');
        await questionBtnListener({ stopPropagation: () => {} });

        // Verify state saved via CommentService
        assert.equal(caches.buttonStates['yt_comment_e2e_1'], 'question');

        // Verify storage item loaded via SheetStateService
        const loadedState = await SheetStateService.loadSheetState('vp_ss');
        assert.ok(loadedState.ytCollected);
        assert.equal(loadedState.ytCollected.length, 1);
        assert.equal(loadedState.ytCollected[0].author, 'Mariya');
        assert.equal(loadedState.ytCollected[0].text, 'Питання про молитву?');
    });

    test('14. CommentService.subscribeToStateChanges receives event notifications', async () => {
        let notifiedKey = null;
        let notifiedValue = null;

        const unsubscribe = CommentService.subscribeToStateChanges((data) => {
            notifiedKey = data.key;
            notifiedValue = data.value;
        });

        const caches = { buttonStates: {} };
        await CommentService.saveButtonState('test_key', caches.buttonStates, 'c_sub_1', 'prayer');

        assert.equal(notifiedKey, 'c_sub_1');
        assert.equal(notifiedValue, true);

        unsubscribe();
    });

    test('15. retroactiveUpdateVideoComments updates matching comment threads in DOM', () => {
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
                    querySelectorAll: () => [],
                    appendChild: () => {}
                };
                if (s.includes('metadata')) return { querySelector: () => null, querySelectorAll: () => [], appendChild: () => {} };
                return null;
            },
            closest: () => null
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

        assert.equal(fakeThread.dataset.syhCommentKey, 'c_retro_1');
        assert.equal(fakeQuestionBtn.classList.contains('syh-btn-active'), true);
    });

    test('16. StudioCommentAdapter markChecked and unmarkChecked properly toggle checkbox and storage', async () => {
        mockStorageStore = {};
        const fakeCheckbox = { checked: false };
        const fakeThread = {
            tagName: 'YTCP-COMMENT',
            classList: {
                add: (cls) => { if (cls === 'syh-studio-comment-checked') fakeThread.checkedClass = true; },
                remove: (cls) => { if (cls === 'syh-studio-comment-checked') fakeThread.checkedClass = false; }
            },
            querySelector: (sel) => sel.includes('checkbox') ? fakeCheckbox : null,
            closest: function() { return this; }
        };

        const caches = { videoSheetMap: {}, buttonStates: {}, checkboxStates: {} };
        const adapter = new StudioCommentAdapter('vp', 'Время перемен', caches);

        await adapter.markChecked(fakeThread, 'c_mark_1', caches);
        assert.equal(fakeCheckbox.checked, true);
        assert.equal(fakeThread.checkedClass, true);

        await adapter.unmarkChecked(fakeThread, 'c_mark_1', caches);
        assert.equal(fakeCheckbox.checked, false);
        assert.equal(fakeThread.checkedClass, false);
    });
});


