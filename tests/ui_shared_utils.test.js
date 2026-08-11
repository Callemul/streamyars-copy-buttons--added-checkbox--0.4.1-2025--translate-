// tests/ui_shared_utils.test.js
//
// Характеристичні тести публічного API `modules/ui_shared_utils.ts`.
// Написані ПЕРЕД декомпозицією, щоб зафіксувати поведінку 1-в-1:
// точкове оновлення DOM, скрол до активного елемента, трикутний стан
// master-чекбокса, підсвітка вкладок фільтра та біндінг пошуку.

import test, { describe, mock } from 'node:test';
import assert from 'node:assert/strict';

import { installChromeMock } from './setup/chrome_mock.ts';

installChromeMock();

const {
    safeTextUpdate,
    safeHtmlUpdate,
    updateTabCounts,
    scrollToActiveItem,
    scrollToActiveComment,
    updateMasterCheckboxFromElements,
    restoreCheckboxFromCache,
    updateFilterTabSelection,
    bindFilterSearchControls,
    bindFilterDocClickHandler
} = await import('../modules/ui_shared_utils.ts');

const { SYH_UI_STATE } = await import('../modules/ui_state.ts');
const { CommentService } = await import('../modules/comment_service.ts');

function resetDom(html = '') {
    document.body.innerHTML = html;
}

function makeCheckbox(checked) {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = checked;
    return cb;
}

// --- Точкове оновлення DOM --------------------------------------------------

describe('ui_shared_utils — точкове оновлення DOM', () => {
    test('1. safeTextUpdate пише текст лише коли він реально змінився', () => {
        resetDom('<span id="t">old</span>');
        const el = document.getElementById('t');

        safeTextUpdate('#t', 'new');
        assert.equal(el.textContent, 'new');

        // Повторний виклик з тим самим текстом не має нічого ламати.
        safeTextUpdate('#t', 'new');
        assert.equal(el.textContent, 'new');
    });

    test('2. safeTextUpdate мовчки ігнорує відсутній елемент', () => {
        resetDom('');
        assert.doesNotThrow(() => safeTextUpdate('#missing', 'x'));
    });

    test('3. safeHtmlUpdate оновлює innerHTML і терпить null', () => {
        resetDom('<div id="h"><b>a</b></div>');
        const el = document.getElementById('h');

        safeHtmlUpdate(el, '<i>b</i>');
        assert.equal(el.innerHTML, '<i>b</i>');

        assert.doesNotThrow(() => safeHtmlUpdate(null, '<i>c</i>'));
    });

    test('4. updateTabCounts проходить усю мапу «селектор → текст»', () => {
        resetDom('<span id="a">0</span><span id="b">0</span>');

        updateTabCounts({ '#a': '5', '#b': '7', '#missing': '9' });

        assert.equal(document.getElementById('a').textContent, '5');
        assert.equal(document.getElementById('b').textContent, '7');
    });

    test('5. updateTabCounts на порожній мапі — no-op', () => {
        resetDom('<span id="a">0</span>');
        updateTabCounts({});
        assert.equal(document.getElementById('a').textContent, '0');
    });
});

// --- Скрол ------------------------------------------------------------------

describe('ui_shared_utils — скрол до активного елемента', () => {
    function buildList({ withActive = true, withScrollParent = false } = {}) {
        resetDom(`
            <div class="ScrollArea">
                <ul id="list">
                    <li id="i1"><span></span></li>
                    <li id="i2">${withActive ? '<span class="lucide-circle-minus"></span>' : '<span></span>'}</li>
                </ul>
            </div>
        `);
        if (!withScrollParent) {
            document.querySelector('.ScrollArea').className = 'plain';
        }
        const active = document.getElementById('i2');
        active.scrollIntoView = mock.fn();
        return active;
    }

    test('6. scrollToActiveItem скролить до елемента з .lucide-circle-minus', () => {
        const active = buildList();

        scrollToActiveItem('#list');

        assert.equal(active.scrollIntoView.mock.callCount(), 1);
        assert.deepEqual(active.scrollIntoView.mock.calls[0].arguments[0], {
            behavior: 'smooth',
            block: 'center'
        });
    });

    test('7. scrollToActiveItem нічого не робить без активного елемента', () => {
        const notActive = buildList({ withActive: false });
        scrollToActiveItem('#list');
        assert.equal(notActive.scrollIntoView.mock.callCount(), 0);
    });

    test('8. scrollToActiveItem мовчки ігнорує відсутній список', () => {
        resetDom('');
        assert.doesNotThrow(() => scrollToActiveItem('#nope'));
    });

    test('9. scrollToActiveItem не скролить, коли елемент уже видимий у скрол-контейнері', () => {
        const active = buildList({ withScrollParent: true });

        const parent = document.querySelector('div[class*="Scroll"]');
        parent.getBoundingClientRect = () => ({ top: 0, bottom: 500 });
        active.getBoundingClientRect = () => ({ top: 100, bottom: 200 });

        scrollToActiveItem('#list');

        assert.equal(active.scrollIntoView.mock.callCount(), 0);
    });

    test('10. scrollToActiveItem скролить, коли елемент виїхав за межі скрол-контейнера', () => {
        const active = buildList({ withScrollParent: true });

        const parent = document.querySelector('div[class*="Scroll"]');
        parent.getBoundingClientRect = () => ({ top: 0, bottom: 500 });
        active.getBoundingClientRect = () => ({ top: 600, bottom: 700 });

        scrollToActiveItem('#list');

        assert.equal(active.scrollIntoView.mock.callCount(), 1);
    });

    test('11. scrollToActiveComment достроково виходить на порожньому селекторі starredList', () => {
        resetDom('<ul id="list"><li><span class="lucide-circle-minus"></span></li></ul>');
        const original = SYH_UI_STATE.SELECTORS;
        SYH_UI_STATE.SELECTORS = { starredList: '' };

        assert.doesNotThrow(() => scrollToActiveComment());

        SYH_UI_STATE.SELECTORS = original;
    });

    test('12. scrollToActiveComment склеює масив селекторів через кому', () => {
        resetDom('<ul id="list"><li id="act"><span class="lucide-circle-minus"></span></li></ul>');
        const active = document.getElementById('act');
        active.scrollIntoView = mock.fn();

        const original = SYH_UI_STATE.SELECTORS;
        SYH_UI_STATE.SELECTORS = { starredList: ['#nope', '#list'] };

        scrollToActiveComment();

        assert.equal(active.scrollIntoView.mock.callCount(), 1);
        SYH_UI_STATE.SELECTORS = original;
    });
});

// --- Чекбокси ---------------------------------------------------------------

describe('ui_shared_utils — стан master-чекбокса', () => {
    function setupMaster() {
        resetDom('<input type="checkbox" id="master">');
        return document.getElementById('master');
    }

    test('13. порожній список знімає і checked, і indeterminate', () => {
        const master = setupMaster();
        master.checked = true;
        master.indeterminate = true;

        updateMasterCheckboxFromElements('#master', []);

        assert.equal(master.checked, false);
        assert.equal(master.indeterminate, false);
    });

    test('14. жодного відміченого → checked=false, indeterminate=false', () => {
        const master = setupMaster();
        updateMasterCheckboxFromElements('#master', [makeCheckbox(false), makeCheckbox(false)]);

        assert.equal(master.checked, false);
        assert.equal(master.indeterminate, false);
    });

    test('15. усі відмічені → checked=true, indeterminate=false', () => {
        const master = setupMaster();
        updateMasterCheckboxFromElements('#master', [makeCheckbox(true), makeCheckbox(true)]);

        assert.equal(master.checked, true);
        assert.equal(master.indeterminate, false);
    });

    test('16. частково відмічені → indeterminate=true, checked=false', () => {
        const master = setupMaster();
        updateMasterCheckboxFromElements('#master', [makeCheckbox(true), makeCheckbox(false)]);

        assert.equal(master.checked, false);
        assert.equal(master.indeterminate, true);
    });

    test('17. відсутній master-чекбокс — тихий вихід', () => {
        resetDom('');
        assert.doesNotThrow(() => updateMasterCheckboxFromElements('#master', [makeCheckbox(true)]));
    });

    test('18. restoreCheckboxFromCache ставить галочку лише за станом CommentService', () => {
        resetDom('<div id="box"><input type="checkbox" class="syh-checkbox"></div>');
        const container = document.getElementById('box');
        const cb = container.querySelector('.syh-checkbox');

        const getState = mock.method(CommentService, 'getStreamYardCheckboxState', () => false);
        restoreCheckboxFromCache(container, 'key-1');
        assert.equal(cb.checked, false);

        getState.mock.mockImplementation(() => true);
        restoreCheckboxFromCache(container, 'key-1');
        assert.equal(cb.checked, true);

        assert.deepEqual(getState.mock.calls[0].arguments, ['key-1']);
        getState.mock.restore();
    });

    test('19. restoreCheckboxFromCache не падає, коли чекбокса немає в контейнері', () => {
        resetDom('<div id="box"></div>');
        const getState = mock.method(CommentService, 'getStreamYardCheckboxState', () => true);

        assert.doesNotThrow(() => restoreCheckboxFromCache(document.getElementById('box'), 'k'));

        getState.mock.restore();
    });
});

// --- Вкладки фільтра --------------------------------------------------------

describe('ui_shared_utils — підсвітка вкладок фільтра', () => {
    test('20. updateFilterTabSelection виставляє active/aria/стилі рівно одній вкладці', () => {
        resetDom(`
            <button class="tab" id="t1"></button>
            <button class="tab" id="t2"></button>
        `);
        const t1 = document.getElementById('t1');
        const t2 = document.getElementById('t2');

        updateFilterTabSelection(t2, '.tab');

        assert.equal(t2.classList.contains('active'), true);
        assert.equal(t2.getAttribute('aria-selected'), 'true');
        assert.equal(t2.style.fontWeight, 'bold');
        assert.equal(t2.style.color, '#000');

        assert.equal(t1.classList.contains('active'), false);
        assert.equal(t1.getAttribute('aria-selected'), 'false');
        assert.equal(t1.style.background, 'transparent');
        assert.equal(t1.style.boxShadow, 'none');
    });

    test('21. повторний виклик перемикає підсвітку без залишків', () => {
        resetDom('<button class="tab" id="t1"></button><button class="tab" id="t2"></button>');
        const t1 = document.getElementById('t1');
        const t2 = document.getElementById('t2');

        updateFilterTabSelection(t1, '.tab');
        updateFilterTabSelection(t2, '.tab');

        assert.equal(t1.classList.contains('active'), false);
        assert.equal(t2.classList.contains('active'), true);
    });
});

// --- Біндінг контролів фільтра ----------------------------------------------

describe('ui_shared_utils — біндінг пошуку та фільтра', () => {
    function setupControls() {
        resetDom(`
            <input id="search">
            <button id="clear" style="display:none"></button>
            <button id="scroll"></button>
        `);
        return {
            search: document.getElementById('search'),
            clear: document.getElementById('clear'),
            scroll: document.getElementById('scroll')
        };
    }

    test('22. ввід у пошук нормалізується у нижній регістр і показує кнопку очищення', () => {
        const els = setupControls();
        const onSearch = mock.fn();

        bindFilterSearchControls({
            searchInputSelector: '#search',
            clearBtnSelector: '#clear',
            scrollBtnSelector: '#scroll',
            onSearch,
            onClear: () => {},
            onScroll: () => {}
        });

        els.search.value = 'AbC';
        els.search.oninput();

        assert.deepEqual(onSearch.mock.calls[0].arguments, ['abc']);
        assert.equal(els.clear.style.display, 'flex');
    });

    test('23. порожній запит ховає кнопку очищення', () => {
        const els = setupControls();
        const onSearch = mock.fn();

        bindFilterSearchControls({
            searchInputSelector: '#search',
            clearBtnSelector: '#clear',
            scrollBtnSelector: '#scroll',
            onSearch,
            onClear: () => {},
            onScroll: () => {}
        });

        els.search.value = '';
        els.search.oninput();

        assert.deepEqual(onSearch.mock.calls[0].arguments, ['']);
        assert.equal(els.clear.style.display, 'none');
    });

    test('24. клік по «очистити» скидає інпут, ховає кнопку і кличе onClear', () => {
        const els = setupControls();
        const onClear = mock.fn();

        bindFilterSearchControls({
            searchInputSelector: '#search',
            clearBtnSelector: '#clear',
            scrollBtnSelector: '#scroll',
            onSearch: () => {},
            onClear,
            onScroll: () => {}
        });

        els.search.value = 'text';
        els.clear.onclick();

        assert.equal(els.search.value, '');
        assert.equal(els.clear.style.display, 'none');
        assert.equal(onClear.mock.callCount(), 1);
    });

    test('25. кнопка скролу гасить дефолт і кличе onScroll', () => {
        const els = setupControls();
        const onScroll = mock.fn();
        const preventDefault = mock.fn();

        bindFilterSearchControls({
            searchInputSelector: '#search',
            clearBtnSelector: '#clear',
            scrollBtnSelector: '#scroll',
            onSearch: () => {},
            onClear: () => {},
            onScroll
        });

        els.scroll.onclick({ preventDefault });

        assert.equal(preventDefault.mock.callCount(), 1);
        assert.equal(onScroll.mock.callCount(), 1);
    });

    test('26. bindFilterSearchControls не падає, коли жодного контрола немає', () => {
        resetDom('');
        assert.doesNotThrow(() => bindFilterSearchControls({
            searchInputSelector: '#nope',
            clearBtnSelector: '#nope2',
            scrollBtnSelector: '#nope3',
            onSearch: () => {},
            onClear: () => {},
            onScroll: () => {}
        }));
    });

    test('27. делегований клік по «скинути все» чистить пошук і кличе onClearAll', () => {
        resetDom(`
            <input id="search" value="q">
            <button id="clear" style="display:flex"></button>
            <a id="clearLink" href="#"></a>
            <button class="fbtn" id="f1"></button>
        `);
        const onClearAll = mock.fn();
        const onFilterSelect = mock.fn();

        bindFilterDocClickHandler({
            searchInputSelector: '#search',
            clearBtnSelector: '#clear',
            clearLinkSelector: '#clearLink',
            filterBtnClass: '.fbtn',
            onClearAll,
            onFilterSelect
        });

        document.getElementById('clearLink').click();

        assert.equal(onClearAll.mock.callCount(), 1);
        assert.equal(onFilterSelect.mock.callCount(), 0, 'гілки взаємовиключні');
        assert.equal(document.getElementById('search').value, '');
        assert.equal(document.getElementById('clear').style.display, 'none');
    });

    test('28. делегований клік по кнопці фільтра віддає саме її елемент', () => {
        resetDom(`
            <input id="search2">
            <button id="clear2"></button>
            <a id="clearLink2"></a>
            <button class="fbtn2" id="f1"><span id="inner"></span></button>
        `);
        const onFilterSelect = mock.fn();

        bindFilterDocClickHandler({
            searchInputSelector: '#search2',
            clearBtnSelector: '#clear2',
            clearLinkSelector: '#clearLink2',
            filterBtnClass: '.fbtn2',
            onClearAll: () => {},
            onFilterSelect
        });

        // Клік по вкладеному елементу має піднятись до кнопки через closest().
        document.getElementById('inner').click();

        assert.equal(onFilterSelect.mock.callCount(), 1);
        assert.equal(onFilterSelect.mock.calls[0].arguments[0], document.getElementById('f1'));
    });
});
