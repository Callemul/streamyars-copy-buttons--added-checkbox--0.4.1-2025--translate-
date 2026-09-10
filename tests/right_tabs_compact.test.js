import assert from 'node:assert/strict';
import { test, describe, mock } from 'node:test';

// Мінімальний DOM-стаб: тести перевіряють чисті правила згортання, а не рушій браузера.
global.window = global;
global.document = {
    querySelectorAll: mock.fn(() => []),
    querySelector: mock.fn(() => null)
};

const {
    COLLAPSED_TAB_CLASS,
    SECONDARY_TAB_KEYS,
    createRightTabsState,
    getTabKey,
    isAutoCollapsed,
    isSecondaryTab,
    parseStoredTabIds,
    readCompactFlag,
    readExplicitPreference,
    resolveAutoCompactSecondary,
    setTabPreference,
    shouldTabBeCollapsed
} = await import('../modules/streamyard/right_tabs/right_tabs_rules.ts');

const {
    EXPANDED_TABS_KEY,
    extractCompactFlag,
    handleOptionsStorageChange,
    loadRightTabsState,
    saveRightTabsState,
    observeCompactOption
} = await import('../modules/streamyard/right_tabs/right_tabs_storage.ts');

const { SYH_STORAGE, STORAGE_KEYS } = await import('../modules/storage/storage.ts');

const {
    SyhRightTabsCompact,
    SYH_RIGHT_TABS_COMPACT,
    applyCollapsedClass,
    isTabButton
} = await import('../modules/streamyard/right_tabs/right_tabs_compact.ts');

const OPTIONS_KEY = 'syh:core:options';

function makeTabButton({ id = '', ariaControls = null, text = null } = {}) {
    const classes = new Set();
    return {
        id,
        dataset: {},
        textContent: text,
        classList: {
            add: name => classes.add(name),
            remove: name => classes.delete(name),
            contains: name => classes.has(name)
        },
        getAttribute: name => (name === 'aria-controls' ? ariaControls : null),
        addEventListener: mock.fn(),
        _classes: classes
    };
}

describe('right_tabs_rules — чисті правила згортання', () => {
    test('parseStoredTabIds приймає лише масиви, решту зводить до порожньої множини', () => {
        assert.deepEqual([...parseStoredTabIds(['a', 'b'])], ['a', 'b']);
        assert.equal(parseStoredTabIds(undefined).size, 0);
        assert.equal(parseStoredTabIds(null).size, 0);
        assert.equal(parseStoredTabIds('a,b').size, 0);
        assert.equal(parseStoredTabIds({ 0: 'a' }).size, 0);
    });

    test('readCompactFlag повертає null для будь-чого, крім boolean', () => {
        assert.equal(readCompactFlag({ compact_secondary_tabs_default: false }), false);
        assert.equal(readCompactFlag({ compact_secondary_tabs_default: true }), true);
        assert.equal(readCompactFlag({ compact_secondary_tabs_default: 'true' }), null);
        assert.equal(readCompactFlag({}), null);
        assert.equal(readCompactFlag(undefined), null);
    });

    test('resolveAutoCompactSecondary за замовчуванням вмикає автозгортання', () => {
        assert.equal(resolveAutoCompactSecondary(undefined), true);
        assert.equal(resolveAutoCompactSecondary({}), true);
        assert.equal(resolveAutoCompactSecondary({ compact_secondary_tabs_default: false }), false);
    });

    test('isSecondaryTab розпізнає і точні ключі, і підрядки recording/widgets', () => {
        for (const key of SECONDARY_TAB_KEYS) {
            assert.equal(isSecondaryTab(key), true, `очікували другорядну вкладку: ${key}`);
        }
        assert.equal(isSecondaryTab('some-recording-panel'), true);
        assert.equal(isSecondaryTab('custom-widgets'), true);
        assert.equal(isSecondaryTab('broadcast-aside-tab-comments'), false);
    });

    test('readExplicitPreference: expanded > collapsed > null', () => {
        const state = createRightTabsState();
        assert.equal(readExplicitPreference(state, 'tab'), null);

        state.collapsedTabIds.add('tab');
        assert.equal(readExplicitPreference(state, 'tab'), true);

        state.expandedTabIds.add('tab');
        assert.equal(readExplicitPreference(state, 'tab'), false, 'expanded має вищий пріоритет');
    });

    test('isAutoCollapsed працює лише коли увімкнено автокомпакт', () => {
        const state = createRightTabsState();
        assert.equal(isAutoCollapsed(state, 'text-Recording'), true);

        state.autoCompactSecondary = false;
        assert.equal(isAutoCollapsed(state, 'text-Recording'), false);
    });

    test('shouldTabBeCollapsed: явний вибір користувача перекриває автозгортання', () => {
        const state = createRightTabsState();

        // Другорядна вкладка згортається автоматично.
        assert.equal(shouldTabBeCollapsed(state, 'text-Widgets'), true);
        // Основна — ні.
        assert.equal(shouldTabBeCollapsed(state, 'broadcast-aside-tab-comments'), false);

        // ПКМ розгорнув другорядну — вона лишається розгорнутою.
        state.expandedTabIds.add('text-Widgets');
        assert.equal(shouldTabBeCollapsed(state, 'text-Widgets'), false);

        // ПКМ згорнув основну — вона згорнута.
        state.collapsedTabIds.add('broadcast-aside-tab-comments');
        assert.equal(shouldTabBeCollapsed(state, 'broadcast-aside-tab-comments'), true);
    });

    test('setTabPreference є взаємовиключним і ідемпотентним', () => {
        const state = createRightTabsState();

        setTabPreference(state, 'tab', true);
        assert.equal(state.collapsedTabIds.has('tab'), true);
        assert.equal(state.expandedTabIds.has('tab'), false);

        setTabPreference(state, 'tab', false);
        assert.equal(state.collapsedTabIds.has('tab'), false);
        assert.equal(state.expandedTabIds.has('tab'), true);

        setTabPreference(state, 'tab', false);
        assert.equal(state.expandedTabIds.size, 1, 'повторний виклик не дублює запис');
    });

    test('getTabKey має пріоритет id → aria-controls → текст', () => {
        assert.equal(getTabKey(makeTabButton({ id: 'tab-1', ariaControls: 'panel', text: 'Chat' })), 'tab-1');
        assert.equal(getTabKey(makeTabButton({ ariaControls: 'panel', text: 'Chat' })), 'aria-panel');
        assert.equal(getTabKey(makeTabButton({ text: '  Chat  ' })), 'text-Chat');
        assert.equal(getTabKey(makeTabButton({ text: '   ' })), null);
        assert.equal(getTabKey(makeTabButton()), null);
    });
});

describe('right_tabs_storage — обробка змін chrome.storage', () => {
    test('extractCompactFlag читає лише ключ опцій', () => {
        assert.equal(extractCompactFlag({}), null);
        assert.equal(extractCompactFlag({ 'other:key': { newValue: {} } }), null);
        assert.equal(extractCompactFlag({ [OPTIONS_KEY]: { newValue: {} } }), null);
        assert.equal(
            extractCompactFlag({ [OPTIONS_KEY]: { newValue: { compact_secondary_tabs_default: false } } }),
            false
        );
    });

    test('handleOptionsStorageChange ігнорує не-local області та порожні зміни', () => {
        const changes = { [OPTIONS_KEY]: { newValue: { compact_secondary_tabs_default: false } } };

        const onSync = mock.fn();
        handleOptionsStorageChange(changes, 'sync', onSync);
        assert.equal(onSync.mock.callCount(), 0);

        const onEmpty = mock.fn();
        handleOptionsStorageChange({}, 'local', onEmpty);
        assert.equal(onEmpty.mock.callCount(), 0);

        const onLocal = mock.fn();
        handleOptionsStorageChange(changes, 'local', onLocal);
        assert.equal(onLocal.mock.callCount(), 1);
        assert.equal(onLocal.mock.calls[0].arguments[0], false);
    });

    test('observeCompactOption не падає без chrome.storage', () => {
        assert.equal(typeof chrome, 'undefined');
        assert.doesNotThrow(() => observeCompactOption(() => {}));
    });

    test('EXPANDED_TABS_KEY лишається сумісним із раніше збереженими даними', () => {
        assert.equal(EXPANDED_TABS_KEY, 'syh:streamyard:expanded_tabs');
    });

    test('loadRightTabsState відновлює збережений стан через getAsync', async () => {
        const origGetAsync = SYH_STORAGE.getAsync;
        SYH_STORAGE.getAsync = mock.fn(async () => ({
            [STORAGE_KEYS.COLLAPSED_TABS]: ['text-Widgets'],
            [EXPANDED_TABS_KEY]: ['text-Recording'],
            [STORAGE_KEYS.OPTIONS]: { compact_secondary_tabs_default: false }
        }));

        try {
            const state = await loadRightTabsState();

            assert.ok(state.collapsedTabIds instanceof Set);
            assert.ok(state.collapsedTabIds.has('text-Widgets'));
            assert.ok(state.expandedTabIds instanceof Set);
            assert.ok(state.expandedTabIds.has('text-Recording'));
            assert.equal(state.autoCompactSecondary, false);
        } finally {
            SYH_STORAGE.getAsync = origGetAsync;
        }
    });

    test('saveRightTabsState зберігає масиви ідентифікаторів через setAsync', async () => {
        const setAsyncSpy = mock.fn(async () => {});
        const origSetAsync = SYH_STORAGE.setAsync;
        SYH_STORAGE.setAsync = setAsyncSpy;

        try {
            const state = createRightTabsState();
            state.collapsedTabIds.add('text-Widgets');
            state.expandedTabIds.add('text-Recording');

            await saveRightTabsState(state);

            assert.equal(setAsyncSpy.mock.callCount(), 1);
            const savedData = setAsyncSpy.mock.calls[0].arguments[0];
            assert.deepEqual(savedData[STORAGE_KEYS.COLLAPSED_TABS], ['text-Widgets']);
            assert.deepEqual(savedData[EXPANDED_TABS_KEY], ['text-Recording']);
        } finally {
            SYH_STORAGE.setAsync = origSetAsync;
        }
    });
});

describe('SyhRightTabsCompact — публічний API оркестратора', () => {
    test('isTabButton приймає лише елементоподібні обʼєкти', () => {
        assert.equal(isTabButton(makeTabButton({ id: 'x' })), true);
        assert.equal(isTabButton(null), false);
        assert.equal(isTabButton(undefined), false);
        assert.equal(isTabButton({}), false);
        assert.equal(isTabButton({ classList: {} }), false);
    });

    test('applyCollapsedClass додає і знімає клас згортання', () => {
        const btn = makeTabButton({ id: 'tab' });

        applyCollapsedClass(btn, true);
        assert.equal(btn.classList.contains(COLLAPSED_TAB_CLASS), true);

        applyCollapsedClass(btn, false);
        assert.equal(btn.classList.contains(COLLAPSED_TAB_CLASS), false);
    });

    test('processTabButton згортає другорядну вкладку і привʼязує ПКМ рівно один раз', () => {
        const service = new SyhRightTabsCompact();
        const btn = makeTabButton({ id: 'broadcast-aside-tab-recording' });

        service.processTabButton(btn);
        assert.equal(btn.classList.contains(COLLAPSED_TAB_CLASS), true);
        assert.equal(btn.dataset.syhCompactBound, 'true');
        assert.equal(btn.addEventListener.mock.callCount(), 1);

        service.processTabButton(btn);
        assert.equal(btn.addEventListener.mock.callCount(), 1, 'повторна обробка не дублює слухач');
    });

    test('processTabButton не чіпає основну вкладку', () => {
        const service = new SyhRightTabsCompact();
        const btn = makeTabButton({ id: 'broadcast-aside-tab-comments' });

        service.processTabButton(btn);
        assert.equal(btn.classList.contains(COLLAPSED_TAB_CLASS), false);
    });

    test('processTabButton ігнорує елементи без ключа та не-елементи', () => {
        const service = new SyhRightTabsCompact();
        const keyless = makeTabButton();

        assert.doesNotThrow(() => service.processTabButton(keyless));
        assert.equal(keyless.addEventListener.mock.callCount(), 0);
        assert.doesNotThrow(() => service.processTabButton(null));
    });

    test('ПКМ перемикає стан вкладки та зупиняє нативне меню', () => {
        const service = new SyhRightTabsCompact();
        const btn = makeTabButton({ id: 'broadcast-aside-tab-recording' });
        service.processTabButton(btn);

        const handler = btn.addEventListener.mock.calls[0].arguments[1];
        const event = { preventDefault: mock.fn(), stopPropagation: mock.fn() };

        // Вкладка згорнута автоматично → ПКМ має її розгорнути.
        handler(event);
        assert.equal(event.preventDefault.mock.callCount(), 1);
        assert.equal(event.stopPropagation.mock.callCount(), 1);
        assert.equal(btn.classList.contains(COLLAPSED_TAB_CLASS), false);
        assert.equal(service.getState().expandedTabIds.has('broadcast-aside-tab-recording'), true);

        // Повторний ПКМ — знову згортає.
        handler(event);
        assert.equal(btn.classList.contains(COLLAPSED_TAB_CLASS), true);
        assert.equal(service.getState().collapsedTabIds.has('broadcast-aside-tab-recording'), true);
        assert.equal(service.getState().expandedTabIds.has('broadcast-aside-tab-recording'), false);
    });

    test('setAutoCompactSecondary(false) розгортає другорядні вкладки', () => {
        const service = new SyhRightTabsCompact();
        assert.equal(service.shouldTabBeCollapsed('text-Recording'), true);

        service.setAutoCompactSecondary(false);
        assert.equal(service.shouldTabBeCollapsed('text-Recording'), false);
    });

    test('init виконується лише один раз', async () => {
        const service = new SyhRightTabsCompact();
        const processAllTabs = mock.method(service, 'processAllTabs');

        await service.init();
        await service.init();

        assert.equal(processAllTabs.mock.callCount(), 1);
    });

    test('експортується готовий синглтон', () => {
        assert.ok(SYH_RIGHT_TABS_COMPACT instanceof SyhRightTabsCompact);
    });
});
