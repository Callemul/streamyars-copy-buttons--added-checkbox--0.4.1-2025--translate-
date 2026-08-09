import assert from 'node:assert/strict';
import { test, describe, mock } from 'node:test';

// ---------------------------------------------------------------------------
// Мінімальні DOM/chrome-моки (jsdom у проєкті не використовується)
// ---------------------------------------------------------------------------

const listeners = [];

global.window = global;
global.window.location = { href: 'https://streamyard.com/abcd-efgh-ijk' };
global.document = {
    addEventListener: (type, handler, capture) => listeners.push({ type, handler, capture }),
    removeEventListener: () => {},
    querySelectorAll: () => [],
    getElementById: () => null,
    body: {},
    createElement: () => ({
        style: {},
        classList: { add() {}, remove() {}, contains() { return false; } },
        setAttribute() {},
        getAttribute() { return null; },
        appendChild() {},
        append() {}
    })
};
global.chrome = {
    runtime: { id: 'test-extension-id', lastError: null, onMessage: { addListener() {} } },
    storage: {
        local: { get(_k, cb) { if (cb) cb({}); }, set(_i, cb) { if (cb) cb(); } },
        onChanged: { addListener() {} }
    },
    tabs: { query(_o, cb) { cb([]); } }
};

const {
    STREAMYARD_URL_MARKER,
    currentBrowserUrl,
    isStreamYardUrl,
    preferOverride,
    resolveBannerSelectors,
    resolveEventBannerDeps
} = await import('../modules/event_banners/deps.ts');

const {
    SYH_EVENT_BANNERS,
    SYH_EVENT_BANNERS_PLUGIN
} = await import('../modules/event_banners/index.ts');

// ---------------------------------------------------------------------------

describe('event_banners/deps — resolveBannerSelectors', () => {
    const passed = { SELECTORS: { bannerBlock: '.passed' } };
    const global_ = { SELECTORS: { bannerBlock: '.global' } };

    test('1. явний конфіг має пріоритет над глобальним', () => {
        assert.deepEqual(resolveBannerSelectors(passed, global_), passed.SELECTORS);
    });

    test('2. без явного конфігу береться глобальний', () => {
        assert.deepEqual(resolveBannerSelectors(undefined, global_), global_.SELECTORS);
        assert.deepEqual(resolveBannerSelectors(null, global_), global_.SELECTORS);
    });

    test('3. без жодного конфігу — null', () => {
        assert.equal(resolveBannerSelectors(undefined, undefined), null);
        assert.equal(resolveBannerSelectors(null, null), null);
    });

    test('4. перевіряється сам конфіг, а не наявність у ньому SELECTORS', () => {
        // Конфіг без селекторів НЕ падає на фолбек — це задокументована поведінка оригіналу.
        assert.equal(resolveBannerSelectors({}, global_), undefined);
    });
});

describe('event_banners/deps — preferOverride', () => {
    test('5. повертає override, коли він truthy', () => {
        const override = { id: 'override' };
        const fallback = { id: 'fallback' };
        assert.equal(preferOverride(override, fallback), override);
    });

    test('6. падає на fallback для будь-якого falsy override', () => {
        const fallback = { id: 'fallback' };
        for (const falsy of [undefined, null, 0, '', false, NaN]) {
            assert.equal(preferOverride(falsy, fallback), fallback);
        }
    });

    test('7. без fallback повертає null', () => {
        assert.equal(preferOverride(undefined, null), null);
    });
});

describe('event_banners/deps — resolveEventBannerDeps', () => {
    const defaults = {
        config: { SELECTORS: { bannerBlock: '.global' } },
        state: { id: 'global-state' },
        utils: { id: 'global-utils' },
        ui: { id: 'global-ui' },
        bannerCreator: { id: 'global-creator' }
    };

    test('8. порожні overrides дають повний набір глобальних синглтонів', () => {
        const deps = resolveEventBannerDeps({}, defaults);

        assert.deepEqual(deps.SELECTORS, defaults.config.SELECTORS);
        assert.equal(deps.STATE, defaults.state);
        assert.equal(deps.UTILS, defaults.utils);
        assert.equal(deps.UI, defaults.ui);
        assert.equal(deps.BANNER_CREATOR, defaults.bannerCreator);
    });

    test('9. кожна залежність перекривається незалежно від інших', () => {
        const utils = { id: 'injected-utils' };
        const deps = resolveEventBannerDeps({ utils }, defaults);

        assert.equal(deps.UTILS, utils);
        assert.equal(deps.STATE, defaults.state, 'решта лишається глобальною');
        assert.equal(deps.UI, defaults.ui);
    });

    test('10. повертає рівно п’ять полів контракту SYH_EVENT_BANNERS', () => {
        const deps = resolveEventBannerDeps({}, defaults);
        assert.deepEqual(
            Object.keys(deps).sort(),
            ['BANNER_CREATOR', 'SELECTORS', 'STATE', 'UI', 'UTILS']
        );
    });
});

describe('event_banners/deps — розпізнавання URL', () => {
    test('11. isStreamYardUrl приймає лише домен StreamYard', () => {
        assert.equal(isStreamYardUrl('https://streamyard.com/abcd'), true);
        assert.equal(isStreamYardUrl('https://app.streamyard.com/broadcasts'), true);
        assert.equal(isStreamYardUrl('https://studio.youtube.com/'), false);
        assert.equal(isStreamYardUrl(''), false);
    });

    test('12. STREAMYARD_URL_MARKER — єдине джерело правди для домену', () => {
        assert.equal(STREAMYARD_URL_MARKER, 'streamyard.com');
        assert.equal(isStreamYardUrl(`https://${STREAMYARD_URL_MARKER}/x`), true);
    });

    test('13. currentBrowserUrl бере href з window', () => {
        assert.equal(currentBrowserUrl(), 'https://streamyard.com/abcd-efgh-ijk');
    });
});

describe('event_banners — публічний API SYH_EVENT_BANNERS', () => {
    test('14. init без аргументів підтягує глобальні синглтони, а не лишає null', () => {
        SYH_EVENT_BANNERS.init();

        assert.ok(SYH_EVENT_BANNERS.SELECTORS, 'SELECTORS заповнено з SYH_CONFIG');
        assert.ok(SYH_EVENT_BANNERS.STATE, 'STATE заповнено з SYH_STATE');
        assert.ok(SYH_EVENT_BANNERS.UTILS, 'UTILS заповнено з SYH_UTILS');
        assert.ok(SYH_EVENT_BANNERS.UI, 'UI заповнено з SYH_UI');
        assert.ok(SYH_EVENT_BANNERS.BANNER_CREATOR, 'BANNER_CREATOR заповнено з SYH_BANNER_CREATOR');
    });

    test('15. init з явними залежностями (DI) перекриває глобальні', () => {
        const config = { SELECTORS: { bannerBlock: '.injected-banner' } };
        const state = { injected: 'state' };
        const utils = { injected: 'utils' };
        const ui = { injected: 'ui' };
        const bannerCreator = { injected: 'creator' };

        SYH_EVENT_BANNERS.init(config, state, utils, ui, bannerCreator);

        assert.deepEqual(SYH_EVENT_BANNERS.SELECTORS, config.SELECTORS);
        assert.equal(SYH_EVENT_BANNERS.STATE, state);
        assert.equal(SYH_EVENT_BANNERS.UTILS, utils);
        assert.equal(SYH_EVENT_BANNERS.UI, ui);
        assert.equal(SYH_EVENT_BANNERS.BANNER_CREATOR, bannerCreator);

        // повертаємо модуль у стан за замовчуванням для решти тестів
        SYH_EVENT_BANNERS.init();
    });

    test('16. bindEvents вішає рівно 4 делеговані слухачі й лише один раз', () => {
        listeners.length = 0;

        SYH_EVENT_BANNERS.bindEvents();
        const afterFirst = listeners.length;

        assert.equal(afterFirst, 4, 'contextmenu + mousedown + mouseup + change');
        assert.deepEqual(
            listeners.map(l => l.type).sort(),
            ['change', 'contextmenu', 'mousedown', 'mouseup']
        );

        const contextMenu = listeners.find(l => l.type === 'contextmenu');
        assert.equal(contextMenu.capture, true, 'contextmenu слухається у фазі capture');

        SYH_EVENT_BANNERS.bindEvents();
        assert.equal(listeners.length, afterFirst, 'повторний виклик — no-op (idempotent)');
    });
});

describe('event_banners — плагін SYH_EVENT_BANNERS_PLUGIN', () => {
    test('17. декларує стабільні id/name та ввімкнений за замовчуванням', () => {
        assert.equal(SYH_EVENT_BANNERS_PLUGIN.id, 'syh_event_banners');
        assert.equal(SYH_EVENT_BANNERS_PLUGIN.name, 'StreamYard Banners Handler');
        assert.equal(SYH_EVENT_BANNERS_PLUGIN.enabled, true);
    });

    test('18. isSupported вмикається лише на StreamYard', () => {
        assert.equal(SYH_EVENT_BANNERS_PLUGIN.isSupported('https://streamyard.com/room'), true);
        assert.equal(SYH_EVENT_BANNERS_PLUGIN.isSupported('https://studio.youtube.com/'), false);
    });

    test('19. isSupported без аргументу бере поточний URL вкладки', () => {
        assert.equal(SYH_EVENT_BANNERS_PLUGIN.isSupported(), true);
    });

    test('20. init плагіна ініціалізує залежності та біндить події', () => {
        const initSpy = mock.method(SYH_EVENT_BANNERS, 'init');
        const bindSpy = mock.method(SYH_EVENT_BANNERS, 'bindEvents');

        SYH_EVENT_BANNERS_PLUGIN.init();

        assert.equal(initSpy.mock.callCount(), 1);
        assert.equal(bindSpy.mock.callCount(), 1);

        initSpy.mock.restore();
        bindSpy.mock.restore();
    });
});
