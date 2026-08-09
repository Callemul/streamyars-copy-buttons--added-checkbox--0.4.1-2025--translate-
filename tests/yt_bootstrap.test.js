import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';

// ---------------------------------------------------------------------------
// Мінімальні DOM/chrome-моки (jsdom у проєкті не використовується).
// ---------------------------------------------------------------------------

let channelName = 'Время перемен';
let storage = {};
let querySelectorAllCalls = [];
let removedButtons = 0;
let observerStarts = 0;
let observedSelectors = [];

/** Вузли, які віддає `document.querySelectorAll` для конкретного селектора. */
let queryAllResults = {};

function makeButtonNode() {
    return { remove() { removedButtons++; } };
}

global.window = global;
global.MutationObserver = class {
    constructor(cb) { this.cb = cb; }
    observe() { observerStarts++; }
    disconnect() {}
};
global.Node = { ELEMENT_NODE: 1 };
global.requestAnimationFrame = (fn) => { fn(); return 1; };
global.cancelAnimationFrame = () => {};

global.document = {
    hidden: false,
    body: { nodeType: 1 },
    documentElement: { nodeType: 1 },
    // Гейт каналу читає назву каналу зі сторінки.
    querySelector: () => (channelName ? { textContent: channelName, getAttribute: () => null } : null),
    querySelectorAll: (selector) => {
        querySelectorAllCalls.push(selector);
        const nodes = queryAllResults[selector] || [];
        nodes.forEach = Array.prototype.forEach.bind(nodes);
        return nodes;
    },
    createElement: () => ({
        style: {}, dataset: {}, className: '', textContent: '', innerText: '',
        setAttribute() {}, getAttribute: () => null, appendChild() {}, append() {},
        addEventListener() {}, classList: { add() {}, remove() {} }
    }),
    addEventListener: () => {}
};

global.chrome = {
    runtime: { id: 'test-extension-id', lastError: null, onMessage: { addListener() {} } },
    storage: {
        local: {
            get(keys, cb) {
                const list = Array.isArray(keys) ? keys : [keys];
                const out = {};
                for (const k of list) { if (k in storage) out[k] = storage[k]; }
                cb(out);
            },
            set(items, cb) { Object.assign(storage, items); if (cb) cb(); },
            remove(_k, cb) { if (cb) cb(); }
        },
        onChanged: { addListener() {} }
    },
    tabs: { query(_o, cb) { cb([]); } }
};

const { canProcessComment, toSelectorString } = await import('../youtube/yt_comment_rules.ts');
const {
    applyYtInitState,
    buildYtInitStorageKeys,
    resolveYtInitState
} = await import('../youtube/yt_bootstrap_rules.ts');

const { STORAGE_KEYS, getSheetCollectedStorageKey } = await import('../modules/storage.ts');
const { YT_SELECTORS } = await import('../youtube/yt_selectors.ts');
const { YT_COLLECTED_SHEET_ID, stateCache } = await import('../youtube/yt_state.ts');
const { isCommentObserverActive, stopCommentObserver } = await import('../youtube/yt_observer.ts');
const { processAllYTComments, processYTComment, startObserver } = await import('../youtube/yt_comment_processor.ts');
const { cleanupYouTubeUI, initializeYouTubeModule } = await import('../youtube/yt_init.ts');

const COLLECTED_KEY = getSheetCollectedStorageKey(YT_COLLECTED_SHEET_ID);
const COMMENT_BLOCK_SELECTOR = toSelectorString(YT_SELECTORS.commentBlock);

function resetStateCache() {
    stateCache.youtubeEnabled = true;
    stateCache.buttonStates = {};
    stateCache.checkboxStates = {};
    stateCache.collectedList = [];
}

// ---------------------------------------------------------------------------
// Чисті правила: yt_comment_rules
// ---------------------------------------------------------------------------

describe('yt_comment_rules — нормалізація селекторів', () => {
    test('1. масив альтернатив стає CSS-групою', () => {
        assert.equal(toSelectorString(['a', 'b', 'c']), 'a,b,c');
    });

    test('2. рядок проходить наскрізь', () => {
        assert.equal(toSelectorString('ytd-comment-view-model'), 'ytd-comment-view-model');
    });

    test('3. реальні селектори YouTube нормалізуються без втрат', () => {
        assert.equal(COMMENT_BLOCK_SELECTOR, 'ytd-comment-thread-renderer,ytd-comment-view-model');
        assert.equal(toSelectorString(YT_SELECTORS.headerAuthor), '#header-author,#author-reputation,#main #header');
    });
});

describe('yt_comment_rules — передумови обробки коментаря', () => {
    const node = { nodeType: 1 };

    test('4. обробляємо лише коли є вузол, модуль увімкнено і знайдено шапку автора', () => {
        assert.equal(canProcessComment(node, true, () => true), true);
    });

    test('5. вимкнений модуль зупиняє обробку', () => {
        assert.equal(canProcessComment(node, false, () => true), false);
    });

    test('6. відсутній вузол зупиняє обробку', () => {
        assert.equal(canProcessComment(null, true, () => true), false);
        assert.equal(canProcessComment(undefined, true, () => true), false);
    });

    test('7. заготовка без шапки автора (рециклінг YouTube) пропускається', () => {
        assert.equal(canProcessComment(node, true, () => false), false);
    });

    test('8. DOM-запит не виконується, доки не пройдено дешеві перевірки', () => {
        let probes = 0;
        const probe = () => { probes++; return true; };

        canProcessComment(null, true, probe);
        canProcessComment(node, false, probe);
        assert.equal(probes, 0, 'жодного querySelector для вимкненого модуля');

        canProcessComment(node, true, probe);
        assert.equal(probes, 1);
    });
});

// ---------------------------------------------------------------------------
// Чисті правила: yt_bootstrap_rules
// ---------------------------------------------------------------------------

describe('yt_bootstrap_rules — ключі сховища', () => {
    test('9. порядок і склад ключів зафіксовано', () => {
        assert.deepEqual(buildYtInitStorageKeys('syh:popup:collected:vp_ss'), [
            STORAGE_KEYS.OPTIONS,
            STORAGE_KEYS.YT_BUTTON_STATES,
            STORAGE_KEYS.YT_CHECKBOX_STATE,
            'syh:popup:collected:vp_ss'
        ]);
    });

    test('10. аркуш зібраних коментарів — vp_ss', () => {
        assert.equal(YT_COLLECTED_SHEET_ID, 'vp_ss');
        assert.equal(COLLECTED_KEY, 'syh:popup:collected:vp_ss');
    });
});

describe('yt_bootstrap_rules — відновлення стану зі сховища', () => {
    test('11. порожнє сховище дає увімкнений модуль і порожні колекції', () => {
        assert.deepEqual(resolveYtInitState({}, COLLECTED_KEY), {
            youtubeEnabled: true,
            buttonStates: {},
            checkboxStates: {},
            collectedList: []
        });
    });

    test('12. null/undefined від сховища не ламає старт', () => {
        assert.equal(resolveYtInitState(null, COLLECTED_KEY).youtubeEnabled, true);
        assert.deepEqual(resolveYtInitState(undefined, COLLECTED_KEY).collectedList, []);
    });

    test('13. модуль вимикає лише строгий youtube_enabled === false', () => {
        assert.equal(resolveYtInitState({ [STORAGE_KEYS.OPTIONS]: { youtube_enabled: false } }, COLLECTED_KEY).youtubeEnabled, false);
        assert.equal(resolveYtInitState({ [STORAGE_KEYS.OPTIONS]: { youtube_enabled: 0 } }, COLLECTED_KEY).youtubeEnabled, true);
        assert.equal(resolveYtInitState({ [STORAGE_KEYS.OPTIONS]: {} }, COLLECTED_KEY).youtubeEnabled, true);
    });

    test('14. збережені стани та зібраний список читаються зі своїх ключів', () => {
        const next = resolveYtInitState({
            [STORAGE_KEYS.YT_BUTTON_STATES]: { c1: 'question' },
            [STORAGE_KEYS.YT_CHECKBOX_STATE]: { c1: { checked: true, timestamp: 5 } },
            [COLLECTED_KEY]: [{ id: 'c1' }]
        }, COLLECTED_KEY);

        assert.deepEqual(next.buttonStates, { c1: 'question' });
        assert.deepEqual(next.checkboxStates, { c1: { checked: true, timestamp: 5 } });
        assert.deepEqual(next.collectedList, [{ id: 'c1' }]);
    });

    test('15. applyYtInitState переносить колекції, але не чіпає прапорець модуля', () => {
        const cache = { youtubeEnabled: false, buttonStates: {}, checkboxStates: {}, collectedList: [] };

        applyYtInitState(cache, {
            youtubeEnabled: true,
            buttonStates: { c1: 'prayer' },
            checkboxStates: {},
            collectedList: [{ id: 'c1' }]
        });

        assert.equal(cache.youtubeEnabled, false, 'прапорець виставляє викликач, а не ця функція');
        assert.deepEqual(cache.buttonStates, { c1: 'prayer' });
        assert.deepEqual(cache.collectedList, [{ id: 'c1' }]);
    });
});

// ---------------------------------------------------------------------------
// Публічний API: процесор коментарів і життєвий цикл модуля
// ---------------------------------------------------------------------------

describe('yt_comment_processor — публічний API', () => {
    beforeEach(() => {
        resetStateCache();
        stopCommentObserver();
        querySelectorAllCalls = [];
        queryAllResults = {};
        observerStarts = 0;
        observedSelectors = [];
    });

    test('16. вимкнений модуль не сканує сторінку', () => {
        stateCache.youtubeEnabled = false;
        processAllYTComments();

        assert.deepEqual(querySelectorAllCalls, []);
    });

    test('17. увімкнений модуль шукає коментарі нормалізованим селектором', () => {
        processAllYTComments();

        assert.deepEqual(querySelectorAllCalls, [COMMENT_BLOCK_SELECTOR]);
    });

    test('18. вимкнений модуль не чіпає окремий коментар', () => {
        stateCache.youtubeEnabled = false;
        let probed = 0;
        const node = { querySelector: () => { probed++; return {}; } };

        processYTComment(node);
        assert.equal(probed, 0, 'DOM-запит не робиться для вимкненого модуля');
    });

    test('19. вузол без шапки автора пропускається без помилок', () => {
        const node = { querySelector: () => null };

        assert.doesNotThrow(() => processYTComment(node));
    });

    test('20. startObserver піднімає підписку і запускає спостерігач', () => {
        assert.equal(isCommentObserverActive(), false);

        startObserver();

        assert.equal(isCommentObserverActive(), true);
        assert.equal(observerStarts, 1);
    });

    test('21. повторний startObserver перепідписується, а не дублює підписку', () => {
        startObserver();
        startObserver();

        assert.equal(isCommentObserverActive(), true);
        assert.equal(observerStarts, 2, 'спостерігач перезапускається');
    });
});

describe('yt_init — публічний API життєвого циклу', () => {
    beforeEach(() => {
        resetStateCache();
        stopCommentObserver();
        storage = {};
        channelName = 'Время перемен';
        querySelectorAllCalls = [];
        queryAllResults = {};
        removedButtons = 0;
        observerStarts = 0;
    });

    test('22. чужий канал: модуль не піднімається, UI прибирається', async () => {
        channelName = 'Random Cooking Channel';
        queryAllResults['.syh-yt-buttons'] = [makeButtonNode(), makeButtonNode()];

        await initializeYouTubeModule();

        assert.equal(isCommentObserverActive(), false, 'підписка не створюється');
        assert.equal(removedButtons, 2, 'старі панелі кнопок прибрано');
        assert.equal(querySelectorAllCalls.includes(COMMENT_BLOCK_SELECTOR), false);
    });

    test('23. дозволений канал: стан читається зі сховища і піднімається спостерігач', async () => {
        storage[STORAGE_KEYS.YT_BUTTON_STATES] = { c1: 'question' };
        storage[STORAGE_KEYS.YT_CHECKBOX_STATE] = { c1: { checked: true, timestamp: 7 } };
        storage[COLLECTED_KEY] = [{ id: 'c1', text: 'зібрано' }];

        await initializeYouTubeModule();

        assert.equal(stateCache.youtubeEnabled, true);
        assert.deepEqual(stateCache.buttonStates, { c1: 'question' });
        assert.deepEqual(stateCache.checkboxStates, { c1: { checked: true, timestamp: 7 } });
        assert.deepEqual(stateCache.collectedList, [{ id: 'c1', text: 'зібрано' }]);
        assert.equal(isCommentObserverActive(), true);
        assert.ok(querySelectorAllCalls.includes(COMMENT_BLOCK_SELECTOR), 'сторінку просканували');
    });

    test('24. вимкнений в опціях модуль не читає стани, але спостерігач стартує', async () => {
        storage[STORAGE_KEYS.OPTIONS] = { youtube_enabled: false };
        storage[STORAGE_KEYS.YT_BUTTON_STATES] = { c1: 'question' };

        await initializeYouTubeModule();

        assert.equal(stateCache.youtubeEnabled, false);
        assert.deepEqual(stateCache.buttonStates, {}, 'стани кнопок не підвантажуються');
        assert.equal(querySelectorAllCalls.includes(COMMENT_BLOCK_SELECTOR), false, 'сканування не запускається');
        assert.equal(isCommentObserverActive(), true, 'підписка є, але обробник мовчить');
    });

    test('25. cleanupYouTubeUI знімає підписку і прибирає панелі кнопок', async () => {
        await initializeYouTubeModule();
        assert.equal(isCommentObserverActive(), true);

        queryAllResults['.syh-yt-buttons'] = [makeButtonNode(), makeButtonNode(), makeButtonNode()];
        cleanupYouTubeUI();

        assert.equal(isCommentObserverActive(), false);
        assert.equal(removedButtons, 3);
    });

    test('26. повторний cleanupYouTubeUI безпечний (ідемпотентний)', () => {
        queryAllResults['.syh-yt-buttons'] = [];

        assert.doesNotThrow(() => { cleanupYouTubeUI(); cleanupYouTubeUI(); });
        assert.equal(isCommentObserverActive(), false);
    });
});
