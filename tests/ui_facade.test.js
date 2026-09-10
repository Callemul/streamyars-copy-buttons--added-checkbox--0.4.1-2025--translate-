// Характеристичні тести публічного API `SYH_UI` (modules/ui.ts).
//
// Написані ДО декомпозиції фасаду і звертаються ВИКЛЮЧНО до експортованих
// `SYH_UI` / `SYH_UI_STATE`, тому лишаються дійсними після розбиття на
// `ui_init` / `ui_selector_validator` / `ui_checkbox_restorer`.
// Мета — зафіксувати поведінку 1-в-1, а не внутрішню структуру.

import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach, mock } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock();

const { SYH_UI_STATE } = await import('../modules/streamyard/ui/ui_state.ts');
const { SYH_UI } = await import('../modules/streamyard/ui/ui.ts');
const { SYH_STORAGE, STORAGE_KEYS } = await import('../modules/storage.ts');
const { SYH_BUS } = await import('../modules/core/event_bus.ts');
const { SYH_CONFIG } = await import('../modules/config.ts');

const SELECTORS_FIXTURE = {
    commentBlock: '.comment-wrap',
    commentText: '.comment-text',
    bannerBlock: '.banner-wrap',
    bannerText: '.banner-text'
};

/** Прибирає діагностичний шум модуля з виводу тестів. */
function silenceConsole() {
    const { log, warn, error } = console;
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};
    return () => {
        console.log = log;
        console.warn = warn;
        console.error = error;
    };
}

/** Дає модулю догорнути ланцюжок `.then()` після init. */
const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

let restoreConsole = () => {};

beforeEach(() => {
    installChromeMock();
    restoreConsole = silenceConsole();
    document.body.innerHTML = '';
    SYH_UI_STATE.SELECTORS = null;
    SYH_UI_STATE.STATE = null;
    SYH_UI_STATE.prayersCache = [];
    SYH_UI_STATE.bannerCategoriesCache = {};
    SYH_BUS.clear();
});

afterEach(() => {
    restoreConsole();
    mock.restoreAll();
    SYH_BUS.clear();
});

// ---------------------------------------------------------------------------

describe('ui — контракт фасаду SYH_UI', () => {
    test('1. експонує повний набір методів інтерфейсу SyhUi', () => {
        const expected = [
            'init', 'validateSelectorsSyntax', 'restoreDomCheckboxes',
            'addButtonsToComment', 'updateCommentVisuals', 'applySavedLabels',
            'addStarredTabControls', 'addStarredTabCopyButton', 'bindStarredControls',
            'filterStarredComments', 'scrollToActiveComment',
            'addButtonsToBanner', 'updateBannerVisuals', 'applySavedBannerLabels',
            'addBannerHeaderControls', 'updateMasterCheckboxState',
            'filterBanners', 'scrollToActiveBanner'
        ];

        for (const name of expected) {
            assert.equal(typeof SYH_UI[name], 'function', `SYH_UI.${name} має бути функцією`);
        }
    });

    test('2. методи коментарів/банерів делегуються у профільні модулі без обгорток', async () => {
        const comments = await import('../modules/streamyard/ui/ui_comments.ts');
        const banners = await import('../modules/streamyard/ui/ui_banners.ts');
        const starred = await import('../modules/streamyard/ui/ui_starred_controls.ts');

        assert.equal(SYH_UI.addButtonsToComment, comments.addButtonsToComment);
        assert.equal(SYH_UI.updateCommentVisuals, comments.updateCommentVisuals);
        assert.equal(SYH_UI.applySavedLabels, comments.applySavedLabels);
        assert.equal(SYH_UI.addStarredTabControls, starred.addStarredTabControls);
        assert.equal(SYH_UI.filterStarredComments, starred.filterStarredComments);

        assert.equal(SYH_UI.addButtonsToBanner, banners.addButtonsToBanner);
        assert.equal(SYH_UI.updateBannerVisuals, banners.updateBannerVisuals);
        assert.equal(SYH_UI.filterBanners, banners.filterBanners);
        assert.equal(SYH_UI.updateMasterCheckboxState, banners.updateMasterCheckboxState);
    });

    test('3. усі поля стану проксіюються в SYH_UI_STATE в обидва боки', () => {
        const cases = [
            ['activeFilter', 'prayer'],
            ['searchQuery', 'запит'],
            ['bannerActiveFilter', 'stream'],
            ['bannerSearchQuery', 'банер'],
            ['prayersCache', [{ author: 'Іван', text: 'Мир', type: 'prayer' }]],
            ['bannerCategoriesCache', { 'Питання #1': 'stream' }],
            ['_filterBannersTimeout', 123],
            ['_filterCommentsTimeout', 456]
        ];

        for (const [key, value] of cases) {
            SYH_UI[key] = value;
            assert.deepEqual(SYH_UI_STATE[key], value, `запис SYH_UI.${key} -> SYH_UI_STATE`);
            assert.deepEqual(SYH_UI[key], value, `читання SYH_UI.${key} <- SYH_UI_STATE`);
        }

        SYH_UI_STATE.SELECTORS = SELECTORS_FIXTURE;
        assert.equal(SYH_UI.SELECTORS, SELECTORS_FIXTURE, 'читання SELECTORS з єдиного джерела');

        const state = { itemStates: {} };
        SYH_UI_STATE.STATE = state;
        assert.equal(SYH_UI.STATE, state);
    });
});

// ---------------------------------------------------------------------------

describe('ui — validateSelectorsSyntax', () => {
    test('4. без SELECTORS виходить тихо і не чіпає DOM', () => {
        SYH_UI_STATE.SELECTORS = null;
        const spy = mock.method(document, 'querySelector');

        assert.doesNotThrow(() => SYH_UI.validateSelectorsSyntax());
        assert.equal(spy.mock.callCount(), 0);
    });

    test('5. проганяє кожен непорожній селектор через document.querySelector', () => {
        SYH_UI_STATE.SELECTORS = { a: '.alpha', b: '.beta' };
        const spy = mock.method(document, 'querySelector');

        SYH_UI.validateSelectorsSyntax();

        const probed = spy.mock.calls.map((c) => c.arguments[0]);
        assert.deepEqual(probed, ['.alpha', '.beta']);
    });

    test('6. порожні значення пропускаються без звернення до DOM', () => {
        SYH_UI_STATE.SELECTORS = { empty: '', nullish: null, ok: '.ok' };
        const spy = mock.method(document, 'querySelector');

        SYH_UI.validateSelectorsSyntax();

        assert.deepEqual(spy.mock.calls.map((c) => c.arguments[0]), ['.ok']);
    });

    test('7. невалідний селектор логується як error, але не кидається назовні', () => {
        SYH_UI_STATE.SELECTORS = { broken: ':::not-a-selector' };
        let errors = 0;
        console.error = () => { errors += 1; };

        assert.doesNotThrow(() => SYH_UI.validateSelectorsSyntax());
        assert.equal(errors, 1, 'кожен зламаний селектор дає рівно один console.error');
    });

    // Регресія на латентний баг «валідатор склеює масив у CSS-групу».
    // Див. docs/audits/active/audit_2026-08-09_KILO_selector-array-validation-false-positive.md
    test('7a. масив валідних селекторів перевіряється почленно, без склеювання', () => {
        SYH_UI_STATE.SELECTORS = { pair: ['.a', '.b'] };
        const spy = mock.method(document, 'querySelector');
        let errors = 0;
        console.error = () => { errors += 1; };

        SYH_UI.validateSelectorsSyntax();

        assert.deepEqual(spy.mock.calls.map((c) => c.arguments[0]), ['.a', '.b']);
        assert.equal(errors, 0);
    });

    test('7b. порожній член масиву пропускається, а не валить увесь ключ', () => {
        SYH_UI_STATE.SELECTORS = { tail: ['.a', ''] };
        const spy = mock.method(document, 'querySelector');
        let errors = 0;
        console.error = () => { errors += 1; };

        assert.doesNotThrow(() => SYH_UI.validateSelectorsSyntax());

        assert.deepEqual(spy.mock.calls.map((c) => c.arguments[0]), ['.a']);
        assert.equal(errors, 0, 'хибної тривоги на порожньому «хвості» більше немає');
    });

    test('7c. у лог потрапляє саме зламаний член масиву, а не масив цілком', () => {
        // Селектори навмисно унікальні для кожного тесту: happy-dom кешує
        // результат розбору, тож повторно той самий рядок уже не кидає SyntaxError.
        SYH_UI_STATE.SELECTORS = { mixed: [':::broken-member', '.b'] };
        const logged = [];
        console.error = (...args) => { logged.push(args); };

        SYH_UI.validateSelectorsSyntax();

        assert.equal(logged.length, 1);
        assert.equal(logged[0][1], ':::broken-member', 'аргументом іде рядок, а не масив');
    });

    test('7d. кожен зламаний член масиву рахується окремо', () => {
        SYH_UI_STATE.SELECTORS = { both: [':::broken-one', ':::broken-two'] };
        let errors = 0;
        console.error = () => { errors += 1; };

        SYH_UI.validateSelectorsSyntax();

        assert.equal(errors, 2);
    });
});

// ---------------------------------------------------------------------------

describe('config — хелпери читання SelectorValue', () => {
    test('7e. queryBySelectorValue: рядок, масив-група, порожнє значення', async () => {
        const { queryBySelectorValue, closestBySelectorValue, toSelectorList } =
            await import('../modules/config.ts');

        document.body.innerHTML = `
            <div class="wrap"><span class="text" data-testid="content">Привіт</span></div>
        `;
        const span = document.querySelector('.text');

        assert.equal(queryBySelectorValue('.text'), span, 'рядок');
        assert.equal(queryBySelectorValue(['.missing', '[data-testid="content"]']), span, 'масив як CSS-група');

        // Ключова гарантія: порожнє/відсутнє значення НЕ кидає SyntaxError.
        assert.doesNotThrow(() => queryBySelectorValue(undefined));
        assert.equal(queryBySelectorValue(undefined), null);
        assert.equal(queryBySelectorValue(['']), null);

        assert.equal(closestBySelectorValue(span, '.wrap'), document.querySelector('.wrap'));
        assert.equal(closestBySelectorValue(span, undefined), null);
        assert.equal(closestBySelectorValue(null, '.wrap'), null);

        assert.deepEqual(toSelectorList(['.a', '', '.b']), ['.a', '.b']);
        assert.deepEqual(toSelectorList('.a'), ['.a']);
        assert.deepEqual(toSelectorList(null), []);
    });
});

// ---------------------------------------------------------------------------

describe('ui — restoreDomCheckboxes', () => {
    function seedComment(text, checked = false) {
        const wrap = document.createElement('div');
        wrap.className = 'comment-wrap';
        wrap.innerHTML = `
            <span class="comment-text">${text}</span>
            <input type="checkbox" class="syh-checkbox" data-type="comment">
        `;
        document.body.appendChild(wrap);
        const box = wrap.querySelector('.syh-checkbox');
        box.checked = checked;
        return box;
    }

    function seedBanner(text, checked = false) {
        const wrap = document.createElement('div');
        wrap.className = 'banner-wrap';
        wrap.innerHTML = `
            <span class="banner-text">${text}</span>
            <input type="checkbox" class="syh-checkbox" data-type="banner">
        `;
        document.body.appendChild(wrap);
        const box = wrap.querySelector('.syh-checkbox');
        box.checked = checked;
        return box;
    }

    test('8. вмикає чекбокси коментарів, для яких є збережений стан', () => {
        SYH_UI_STATE.SELECTORS = SELECTORS_FIXTURE;
        SYH_UI_STATE.STATE = { itemStates: { 'Питання про молитву': true } };

        const marked = seedComment('Питання про молитву');
        const other = seedComment('Інший коментар');

        SYH_UI.restoreDomCheckboxes();

        assert.equal(marked.checked, true);
        assert.equal(other.checked, false);
    });

    test('9. знімає галочку, коли збережений стан false (синхронізація в обидва боки)', () => {
        SYH_UI_STATE.SELECTORS = SELECTORS_FIXTURE;
        SYH_UI_STATE.STATE = { itemStates: { 'Знято': false } };

        const box = seedComment('Знято', true);

        SYH_UI.restoreDomCheckboxes();

        assert.equal(box.checked, false, 'відсутній/false стан завжди перетирає DOM');
    });

    test('10. працює для банерів через власну пару селекторів', () => {
        SYH_UI_STATE.SELECTORS = SELECTORS_FIXTURE;
        SYH_UI_STATE.STATE = { itemStates: { 'Банер про ефір': true } };

        const box = seedBanner('Банер про ефір');

        SYH_UI.restoreDomCheckboxes();

        assert.equal(box.checked, true);
    });

    test('11. без STATE трактує всі стани як false', () => {
        SYH_UI_STATE.SELECTORS = SELECTORS_FIXTURE;
        SYH_UI_STATE.STATE = null;

        const box = seedComment('Будь-що', true);

        SYH_UI.restoreDomCheckboxes();

        assert.equal(box.checked, false);
    });

    test('12. чекбокс невідомого data-type лишається недоторканим', () => {
        SYH_UI_STATE.SELECTORS = SELECTORS_FIXTURE;
        SYH_UI_STATE.STATE = { itemStates: { 'Текст': true } };

        const wrap = document.createElement('div');
        wrap.innerHTML = `<input type="checkbox" class="syh-checkbox" data-type="unknown">`;
        document.body.appendChild(wrap);
        const box = wrap.querySelector('.syh-checkbox');
        box.checked = true;

        SYH_UI.restoreDomCheckboxes();

        assert.equal(box.checked, true, 'порожній textKey => жодного запису в DOM');
    });

    test('13. відновлює стан за дефолтні StreamYard-селектори з SYH_CONFIG', () => {
        SYH_UI_STATE.SELECTORS = SYH_CONFIG.SELECTORS;
        SYH_UI_STATE.STATE = { itemStates: { 'Через дефолт': true } };

        const wrap = document.createElement('div');
        wrap.className = 'PlatformComment__Wrap';
        wrap.innerHTML = `
            <span class="PlatformCommentShell__ContentSpan">Через дефолт</span>
            <input type="checkbox" class="syh-checkbox" data-type="comment">
        `;
        document.body.appendChild(wrap);

        SYH_UI.restoreDomCheckboxes();

        assert.equal(wrap.querySelector('.syh-checkbox').checked, true);
    });
});

// ---------------------------------------------------------------------------

describe('ui — init', () => {
    /** Перехоплює storage-залежності init і повертає доступ до колбека onChanged. */
    function stubStorage(initialData = {}) {
        const capture = { changeHandler: null, requestedKeys: null };

        mock.method(SYH_STORAGE, 'getAsync', (keys) => {
            capture.requestedKeys = keys;
            return Promise.resolve(initialData);
        });
        mock.method(SYH_STORAGE, 'onChanged', (cb) => {
            capture.changeHandler = cb;
        });

        return capture;
    }

    test('14. переданий конфіг і стан мають пріоритет над глобальними синглтонами', () => {
        stubStorage();
        const config = { SELECTORS: SELECTORS_FIXTURE };
        const state = { itemStates: {}, onStateLoaded: null };

        SYH_UI.init(config, state);

        assert.equal(SYH_UI_STATE.SELECTORS, SELECTORS_FIXTURE);
        assert.equal(SYH_UI_STATE.STATE, state);
    });

    test('15. без аргументів підтягує SYH_CONFIG.SELECTORS та SYH_STATE', async () => {
        stubStorage();
        const { SYH_STATE } = await import('../modules/core/state.ts');

        SYH_UI.init();

        assert.equal(SYH_UI_STATE.SELECTORS, SYH_CONFIG.SELECTORS);
        assert.equal(SYH_UI_STATE.STATE, SYH_STATE);
    });

    test('16. вішає onStateLoaded, який відновлює чекбокси в DOM', () => {
        stubStorage();
        const state = { itemStates: { 'Відновлено': true }, onStateLoaded: null };

        SYH_UI.init({ SELECTORS: SELECTORS_FIXTURE }, state);

        assert.equal(typeof state.onStateLoaded, 'function');

        const wrap = document.createElement('div');
        wrap.className = 'comment-wrap';
        wrap.innerHTML = `
            <span class="comment-text">Відновлено</span>
            <input type="checkbox" class="syh-checkbox" data-type="comment">
        `;
        document.body.appendChild(wrap);

        state.onStateLoaded(state.itemStates);

        assert.equal(wrap.querySelector('.syh-checkbox').checked, true);
    });

    test('17. первинно наповнює кеші молитов і категорій зі сховища', async () => {
        const prayers = [{ author: 'Іван', text: 'Мир', type: 'prayer' }];
        const categories = { 'Питання #1': 'stream' };
        const capture = stubStorage({
            [STORAGE_KEYS.PRAYERS]: prayers,
            [STORAGE_KEYS.CATEGORIES]: categories
        });

        SYH_UI.init({ SELECTORS: SELECTORS_FIXTURE }, { itemStates: {}, onStateLoaded: null });
        await flushMicrotasks();

        assert.deepEqual(capture.requestedKeys, [STORAGE_KEYS.PRAYERS, STORAGE_KEYS.CATEGORIES]);
        assert.equal(SYH_UI_STATE.prayersCache, prayers);
        assert.equal(SYH_UI_STATE.bannerCategoriesCache, categories);
    });

    test('18. порожнє сховище дає порожні кеші, а не undefined', async () => {
        stubStorage({});

        SYH_UI.init({ SELECTORS: SELECTORS_FIXTURE }, { itemStates: {}, onStateLoaded: null });
        await flushMicrotasks();

        assert.deepEqual(SYH_UI_STATE.prayersCache, []);
        assert.deepEqual(SYH_UI_STATE.bannerCategoriesCache, {});
    });

    test('19. підписка на storage оновлює кеш молитов при зміні ключа PRAYERS', async () => {
        const capture = stubStorage({});
        SYH_UI.init({ SELECTORS: SELECTORS_FIXTURE }, { itemStates: {}, onStateLoaded: null });
        await flushMicrotasks();

        assert.equal(typeof capture.changeHandler, 'function', 'init має підписатись на storage');

        const next = [{ author: 'Оля', text: 'Нова молитва', type: 'prayer' }];
        capture.changeHandler({ [STORAGE_KEYS.PRAYERS]: { newValue: next } });

        assert.equal(SYH_UI_STATE.prayersCache, next);
    });

    test('20. підписка на storage оновлює кеш категорій банерів', async () => {
        const capture = stubStorage({});
        SYH_UI.init({ SELECTORS: SELECTORS_FIXTURE }, { itemStates: {}, onStateLoaded: null });
        await flushMicrotasks();

        const next = { 'Банер': 'audience' };
        capture.changeHandler({ [STORAGE_KEYS.CATEGORIES]: { newValue: next } });

        assert.equal(SYH_UI_STATE.bannerCategoriesCache, next);
    });

    test('21. null у newValue нормалізується у порожню колекцію', async () => {
        const capture = stubStorage({});
        SYH_UI.init({ SELECTORS: SELECTORS_FIXTURE }, { itemStates: {}, onStateLoaded: null });
        await flushMicrotasks();

        SYH_UI_STATE.prayersCache = [{ author: 'x', text: 'y', type: 'prayer' }];
        SYH_UI_STATE.bannerCategoriesCache = { a: 'stream' };

        capture.changeHandler({
            [STORAGE_KEYS.PRAYERS]: { newValue: null },
            [STORAGE_KEYS.CATEGORIES]: { newValue: null }
        });

        assert.deepEqual(SYH_UI_STATE.prayersCache, []);
        assert.deepEqual(SYH_UI_STATE.bannerCategoriesCache, {});
    });

    test('22. зміни інших ключів і undefined-newValue кеші не чіпають', async () => {
        const capture = stubStorage({});
        SYH_UI.init({ SELECTORS: SELECTORS_FIXTURE }, { itemStates: {}, onStateLoaded: null });
        await flushMicrotasks();

        const prayers = [{ author: 'Іван', text: 'Мир', type: 'prayer' }];
        SYH_UI_STATE.prayersCache = prayers;

        capture.changeHandler({ 'syh:core:options': { newValue: { x: 1 } } });
        assert.equal(SYH_UI_STATE.prayersCache, prayers, 'сторонній ключ ігнорується');

        capture.changeHandler({ [STORAGE_KEYS.PRAYERS]: { oldValue: [] } });
        assert.equal(SYH_UI_STATE.prayersCache, prayers, 'undefined newValue ігнорується');
    });

    test('23. виняток усередині storage-обробника не спливає у chrome.storage', async () => {
        const capture = stubStorage({});
        SYH_UI.init({ SELECTORS: SELECTORS_FIXTURE }, { itemStates: {}, onStateLoaded: null });
        await flushMicrotasks();

        // Гетер, що вибухає під час читання newValue.
        const hostile = {};
        Object.defineProperty(hostile, 'newValue', {
            get() { throw new Error('storage boom'); }
        });

        assert.doesNotThrow(() => capture.changeHandler({ [STORAGE_KEYS.PRAYERS]: hostile }));
    });

    test('24. підписується на COMMENT_MARKED і малює візуал коментаря', async () => {
        stubStorage({});
        SYH_UI.init({ SELECTORS: SELECTORS_FIXTURE }, { itemStates: {}, onStateLoaded: null });

        assert.equal(SYH_BUS.listenerCount('COMMENT_MARKED'), 1);

        const element = document.createElement('div');
        document.body.appendChild(element);

        SYH_BUS.emit('COMMENT_MARKED', { element, type: 'prayer', author: 'Іван', text: 'Мир' });
        assert.equal(element.getAttribute('data-syh-type'), 'prayer');

        SYH_BUS.emit('COMMENT_MARKED', { element, type: 'question', author: 'Іван', text: 'Мир' });
        assert.equal(element.getAttribute('data-syh-type'), 'question');

        SYH_BUS.emit('COMMENT_MARKED', { element, type: 'none', author: 'Іван', text: 'Мир' });
        assert.equal(element.hasAttribute('data-syh-type'), false);
    });

    test('25. збій усередині init проковтується і не валить bootstrap', () => {
        mock.method(SYH_STORAGE, 'getAsync', () => {
            throw new Error('storage unavailable');
        });
        mock.method(SYH_STORAGE, 'onChanged', () => {});

        assert.doesNotThrow(() => {
            SYH_UI.init({ SELECTORS: SELECTORS_FIXTURE }, { itemStates: {}, onStateLoaded: null });
        });
    });

    test('26. відкинутий промис сховища не лишає unhandled rejection', async () => {
        mock.method(SYH_STORAGE, 'getAsync', () => Promise.reject(new Error('quota')));
        mock.method(SYH_STORAGE, 'onChanged', () => {});

        SYH_UI.init({ SELECTORS: SELECTORS_FIXTURE }, { itemStates: {}, onStateLoaded: null });

        await flushMicrotasks();
        assert.ok(true, 'catch у init перехопив відмову');
    });
});

// ---------------------------------------------------------------------------
// Одиниці, що з'явилися після декомпозиції modules/ui.ts. Перевіряємо їх
// напряму — зокрема гілки, недосяжні через фасад.
// ---------------------------------------------------------------------------

describe('ui — декомпозовані одиниці', () => {
    test('27. фасад експонує рівно ті самі функції, що й профільні модулі', async () => {
        const init = await import('../modules/streamyard/ui/ui_init.ts');
        const validator = await import('../modules/streamyard/ui/ui_selector_validator.ts');
        const restorer = await import('../modules/streamyard/ui/ui_checkbox_restorer.ts');

        assert.equal(SYH_UI.init, init.initUiModule, 'жодної обгортки навколо init');
        assert.equal(SYH_UI.validateSelectorsSyntax, validator.validateSelectorsSyntax);
        assert.equal(SYH_UI.restoreDomCheckboxes, restorer.restoreDomCheckboxes);
    });

    test('28. applyCheckboxStates без селекторів попереджає і не чіпає DOM', async () => {
        const { applyCheckboxStates } = await import('../modules/streamyard/ui/ui_checkbox_restorer.ts');

        let warnings = 0;
        console.warn = () => { warnings += 1; };

        const wrap = document.createElement('div');
        wrap.innerHTML = `<input type="checkbox" class="syh-checkbox" data-type="comment">`;
        document.body.appendChild(wrap);
        const box = wrap.querySelector('.syh-checkbox');
        box.checked = true;

        applyCheckboxStates(null, { anything: false });

        assert.equal(warnings, 1, 'гілка «конфіг ще не завантажено» логує попередження');
        assert.equal(box.checked, true, 'DOM лишається недоторканим');
    });

    test('29. getCheckboxTextKey читає текст за типом чекбокса', async () => {
        const { getCheckboxTextKey } = await import('../modules/streamyard/ui/ui_checkbox_restorer.ts');

        document.body.innerHTML = `
            <div class="comment-wrap">
                <span class="comment-text">  Текст коментаря  </span>
                <input type="checkbox" class="syh-checkbox" data-type="comment">
            </div>
            <div class="banner-wrap">
                <span class="banner-text">Текст банера</span>
                <input type="checkbox" class="syh-checkbox" data-type="banner">
            </div>
        `;

        const commentBox = document.querySelector('.comment-wrap .syh-checkbox');
        const bannerBox = document.querySelector('.banner-wrap .syh-checkbox');

        assert.equal(
            getCheckboxTextKey(commentBox, SELECTORS_FIXTURE),
            '  Текст коментаря  ',
            'textContent береться як є, без trim'
        );
        assert.equal(getCheckboxTextKey(bannerBox, SELECTORS_FIXTURE), 'Текст банера');
    });

    test('30. getCheckboxTextKey розвʼязує масив-селектор пріоритетним перебором (як write-path), а не лише [0]', async () => {
        const { getCheckboxTextKey } = await import('../modules/streamyard/ui/ui_checkbox_restorer.ts');

        // Регресія на audit_2026-08-10_KILO_checkbox-text-key-mismatch:
        // read-path має збігатися з write-path (queryBySelectorValue), який
        // перебирає масив через CSS-групу, а не бере лише перший елемент.
        document.body.innerHTML = `
            <div class="fallback-wrap">
                <span class="fallback-text">Через фолбек-масив</span>
                <input type="checkbox" class="syh-checkbox" data-type="comment">
            </div>
        `;

        const box = document.querySelector('.syh-checkbox');
        const key = getCheckboxTextKey(box, {
            commentBlock: ['.primary-wrap', '.fallback-wrap'],
            commentText: ['.primary-text', '.fallback-text']
        });

        assert.equal(key, 'Через фолбек-масив', 'знайдено через другий член масиву');
    });

    test('30a. read- і write-path дають однаковий ключ (реальний масив commentText)', async () => {
        const { getCheckboxTextKey } = await import('../modules/streamyard/ui/ui_checkbox_restorer.ts');
        const { queryBySelectorValue } = await import('../modules/config.ts');

        // Реальний конфіг StreamYard: commentText — масив із class- та data-testid-варіантів.
        document.body.innerHTML = `
            <div class="PlatformComment__Wrap" data-testid="platform-comment">
                <span data-testid="comment-content">Текст коментаря</span>
                <input type="checkbox" class="syh-checkbox" data-type="comment">
            </div>
        `;

        const commentBlock = document.querySelector('[data-testid="platform-comment"]');
        const box = document.querySelector('.syh-checkbox');

        // Те, що пишуть handleCheckboxChange / applyCommentActionState:
        const writeKey = queryBySelectorValue(SYH_CONFIG.SELECTORS.commentText, commentBlock)?.textContent || '';
        // Те, що читає restoreDomCheckboxes:
        const readKey = getCheckboxTextKey(box, SYH_CONFIG.SELECTORS);

        assert.equal(writeKey, 'Текст коментаря');
        assert.equal(readKey, writeKey, 'read- і write-path дають однаковий ключ');
    });

    test('30b. на fallback-лейауті (лише data-testid у DOM) стан відновлюється, а не губиться', async () => {
        const { getCheckboxTextKey } = await import('../modules/streamyard/ui/ui_checkbox_restorer.ts');
        const { queryBySelectorValue } = await import('../modules/config.ts');

        document.body.innerHTML = `
            <div data-testid="platform-comment">
                <span data-testid="comment-content">Лише фолбек</span>
                <input type="checkbox" class="syh-checkbox" data-type="comment">
            </div>
        `;

        const commentBlock = document.querySelector('[data-testid="platform-comment"]');
        const box = document.querySelector('.syh-checkbox');
        const writeKey = queryBySelectorValue(SYH_CONFIG.SELECTORS.commentText, commentBlock)?.textContent || '';
        const readKey = getCheckboxTextKey(box, SYH_CONFIG.SELECTORS);

        assert.equal(writeKey, 'Лише фолбек');
        assert.equal(readKey, writeKey, 'ключ не порожній — стан відновиться після перезавантаження');
    });

    test('31. getCheckboxTextKey повертає порожній рядок для чужого/відсутнього типу', async () => {
        const { getCheckboxTextKey } = await import('../modules/streamyard/ui/ui_checkbox_restorer.ts');

        document.body.innerHTML = `
            <input type="checkbox" class="syh-checkbox" id="a" data-type="unknown">
            <input type="checkbox" class="syh-checkbox" id="b">
        `;

        assert.equal(getCheckboxTextKey(document.getElementById('a'), SELECTORS_FIXTURE), '');
        assert.equal(getCheckboxTextKey(document.getElementById('b'), SELECTORS_FIXTURE), '');
    });

    test('32. getCheckboxTextKey повертає порожній рядок, коли блок/текст не знайдено', async () => {
        const { getCheckboxTextKey } = await import('../modules/streamyard/ui/ui_checkbox_restorer.ts');

        document.body.innerHTML = `
            <div class="comment-wrap">
                <input type="checkbox" class="syh-checkbox" data-type="comment">
            </div>
        `;

        const box = document.querySelector('.syh-checkbox');
        assert.equal(getCheckboxTextKey(box, SELECTORS_FIXTURE), '', 'немає вузла тексту -> ""');
    });

    test('33. applyStorageChangesToUiCaches викликається і без init (чиста одиниця)', async () => {
        const { applyStorageChangesToUiCaches } = await import('../modules/streamyard/ui/ui_init.ts');

        const prayers = [{ author: 'Оля', text: 'Молитва', type: 'prayer' }];
        applyStorageChangesToUiCaches({ [STORAGE_KEYS.PRAYERS]: { newValue: prayers } });
        assert.equal(SYH_UI_STATE.prayersCache, prayers);

        const categories = { 'Банер': 'prayer' };
        applyStorageChangesToUiCaches({ [STORAGE_KEYS.CATEGORIES]: { newValue: categories } });
        assert.equal(SYH_UI_STATE.bannerCategoriesCache, categories);

        applyStorageChangesToUiCaches({});
        assert.equal(SYH_UI_STATE.prayersCache, prayers, 'порожні зміни нічого не скидають');
    });
});
