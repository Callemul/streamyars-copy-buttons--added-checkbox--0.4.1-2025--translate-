/**
 * Характеристичні (characterization) тести для `modules/ui_banners.ts`.
 *
 * Модуль на 309 LOC (cyclomatic 79, complexity_density 0.26) не мав жодного
 * прямого тесту — лише опосередкований `tests/ui_facade.test.js`, який перевіряє
 * саму лише наявність методів у фасаді. Ці тести фіксують поведінку 1-в-1 ПЕРЕД
 * винесенням HTML-розмітки в окремий модуль.
 */

import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach } from 'node:test';
import { installChromeMock } from './setup/chrome_mock.ts';
import { SYH_UI_STATE } from '../modules/streamyard/ui/ui_state.ts';
import { SYH_CONFIG } from '../modules/config.ts';
import {
    updateBannerVisuals,
    applySavedBannerLabels,
    injectHeaderButtons,
    injectSearchAndFilterContainer,
    addBannerHeaderControls,
    updateMasterCheckboxState,
    filterBannerListItems,
    updateBannerTabCounts,
    renderBannerEmptyState,
    filterBanners
} from '../modules/streamyard/ui/ui_banners.ts';

const SELECTORS = SYH_CONFIG.SELECTORS;

/** Будує <ul> зі списком банерів у розмітці, наближеній до StreamYard. */
function buildBannerList(entries) {
    const ul = document.createElement('ul');
    ul.className = 'BannerList__ListWrap-xyz';
    for (const entry of entries) {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="Banner__LiWrap-a">
                <div class="Banner__Wrap-b">
                    <span class="Banner__BannerText-c">${entry.text}</span>
                </div>
            </div>
        `;
        ul.appendChild(li);
    }
    document.body.appendChild(ul);
    return ul;
}

function resetUiState() {
    SYH_UI_STATE.SELECTORS = SELECTORS;
    SYH_UI_STATE.bannerActiveFilter = 'all';
    SYH_UI_STATE.bannerSearchQuery = '';
    SYH_UI_STATE.bannerCategoriesCache = {};
}

describe('ui_banners — updateBannerVisuals / applySavedBannerLabels', () => {
    beforeEach(() => { document.body.innerHTML = ''; resetUiState(); });
    afterEach(() => { document.body.innerHTML = ''; });

    test('1. відомі категорії пишуться в data-syh-banner-type', () => {
        for (const type of ['stream', 'audience', 'prayer']) {
            const node = document.createElement('div');
            updateBannerVisuals(node, type);
            assert.equal(node.getAttribute('data-syh-banner-type'), type);
        }
    });

    test('2. невідома категорія знімає атрибут', () => {
        const node = document.createElement('div');
        node.setAttribute('data-syh-banner-type', 'stream');

        updateBannerVisuals(node, 'none');
        assert.equal(node.hasAttribute('data-syh-banner-type'), false);

        node.setAttribute('data-syh-banner-type', 'stream');
        updateBannerVisuals(node, '');
        assert.equal(node.hasAttribute('data-syh-banner-type'), false);
    });

    test('3. applySavedBannerLabels бере категорію з кешу за текстом банера', () => {
        SYH_UI_STATE.bannerCategoriesCache = { 'Текст банера': 'prayer' };
        const node = document.createElement('div');

        applySavedBannerLabels(node, 'Текст банера');

        assert.equal(node.getAttribute('data-syh-banner-type'), 'prayer');
    });

    test('4. порожній або пробільний текст не змінює вузол зовсім', () => {
        const node = document.createElement('div');
        node.setAttribute('data-syh-banner-type', 'stream');

        applySavedBannerLabels(node, '');
        applySavedBannerLabels(node, '   ');

        assert.equal(
            node.getAttribute('data-syh-banner-type'), 'stream',
            'ранній вихід зберігає попередню категорію'
        );
    });

    test('5. текст, якого немає в кеші, трактується як "none"', () => {
        SYH_UI_STATE.bannerCategoriesCache = {};
        const node = document.createElement('div');
        node.setAttribute('data-syh-banner-type', 'audience');

        applySavedBannerLabels(node, 'невідомий текст');

        assert.equal(node.hasAttribute('data-syh-banner-type'), false);
    });
});

describe('ui_banners — injectHeaderButtons', () => {
    beforeEach(() => { document.body.innerHTML = ''; resetUiState(); });
    afterEach(() => { document.body.innerHTML = ''; });

    test('6. додає блок керування з трьома контролами', () => {
        const header = document.createElement('div');
        document.body.appendChild(header);

        injectHeaderButtons(header);

        const controls = header.querySelector('.syh-banner-header-controls');
        assert.ok(controls);
        assert.ok(controls.querySelector('[data-action="create-from-text"]'));
        assert.ok(controls.querySelector('input.syh-master-checkbox'));
        assert.ok(controls.querySelector('[data-action="delete-selected-banners"]'));
    });

    test('7. повторний виклик не дублює блок керування', () => {
        const header = document.createElement('div');
        document.body.appendChild(header);

        injectHeaderButtons(header);
        injectHeaderButtons(header);

        assert.equal(header.querySelectorAll('.syh-banner-header-controls').length, 1);
    });

    test('8. кнопки мають aria-label для доступності', () => {
        const header = document.createElement('div');
        document.body.appendChild(header);

        injectHeaderButtons(header);

        assert.equal(
            header.querySelector('[data-action="create-from-text"]').getAttribute('aria-label'),
            'Створити банери з тексту'
        );
        assert.equal(
            header.querySelector('input.syh-master-checkbox').getAttribute('aria-label'),
            'Вибрати все або зняти все'
        );
    });
});

describe('ui_banners — injectSearchAndFilterContainer', () => {
    beforeEach(() => { document.body.innerHTML = ''; resetUiState(); });
    afterEach(() => { document.body.innerHTML = ''; });

    test('9. вставляє пошук і чотири вкладки-фільтри перед списком', () => {
        const list = buildBannerList([]);

        injectSearchAndFilterContainer(list);

        const container = document.getElementById('syh-banner-search-container');
        assert.ok(container);
        assert.ok(document.getElementById('syh-banner-search'));
        assert.ok(document.getElementById('syh-clear-banner-search-btn'));
        assert.ok(document.getElementById('syh-scroll-to-active-banner-btn'));

        const tabs = container.querySelectorAll('.syh-banner-filter-btn');
        assert.deepEqual(
            Array.from(tabs).map(t => t.dataset.filter),
            ['all', 'stream', 'audience', 'prayer']
        );
    });

    test('10. вставляє блок порожнього стану одразу після списку', () => {
        const list = buildBannerList([]);

        injectSearchAndFilterContainer(list);

        const empty = document.getElementById('syh-banner-empty-state-msg');
        assert.ok(empty);
        assert.equal(list.nextElementSibling, empty);
        assert.ok(document.getElementById('syh-banner-empty-query'));
        assert.ok(document.getElementById('syh-banner-empty-suggestion'));
    });

    test('11. повторний виклик — no-op (контейнер уже існує)', () => {
        const list = buildBannerList([]);

        injectSearchAndFilterContainer(list);
        injectSearchAndFilterContainer(list);

        assert.equal(document.querySelectorAll('#syh-banner-search-container').length, 1);
    });

    test('12. активна вкладка та збережений запит відновлюються в розмітці', () => {
        SYH_UI_STATE.bannerActiveFilter = 'prayer';
        SYH_UI_STATE.bannerSearchQuery = 'молитва';
        const list = buildBannerList([]);

        injectSearchAndFilterContainer(list);

        const input = document.getElementById('syh-banner-search');
        assert.equal(input.getAttribute('value'), 'молитва');

        const prayerTab = document.getElementById('syh-banner-filter-prayer');
        assert.equal(prayerTab.getAttribute('aria-selected'), 'true');
        assert.ok(prayerTab.className.includes('active'));

        const allTab = document.getElementById('syh-banner-filter-all');
        assert.equal(allTab.getAttribute('aria-selected'), 'false');

        const clearBtn = document.getElementById('syh-clear-banner-search-btn');
        assert.equal(clearBtn.style.display, 'flex', 'хрестик показано, бо запит непорожній');
    });

    test('13. без збереженого запиту хрестик очищення прихований', () => {
        const list = buildBannerList([]);

        injectSearchAndFilterContainer(list);

        assert.equal(document.getElementById('syh-clear-banner-search-btn').style.display, 'none');
    });

    test('14. addBannerHeaderControls зшиває шапку і контейнер пошуку разом', () => {
        const header = document.createElement('div');
        document.body.appendChild(header);
        buildBannerList([]);

        addBannerHeaderControls(header);

        assert.ok(header.querySelector('.syh-banner-header-controls'));
        assert.ok(document.getElementById('syh-banner-search-container'));
    });
});

describe('ui_banners — filterBannerListItems', () => {
    beforeEach(() => { document.body.innerHTML = ''; resetUiState(); });
    afterEach(() => { document.body.innerHTML = ''; });

    test('15. без фільтра й пошуку видимі всі, лічильники повні', () => {
        const list = buildBannerList([{ text: 'A' }, { text: 'B' }, { text: 'C' }]);
        const cache = { A: 'stream', B: 'audience', C: 'prayer' };

        const res = filterBannerListItems(list, SELECTORS, cache, 'all', '');

        assert.equal(res.visibleCount, 3);
        assert.deepEqual(res.countAbsolute, { all: 3, stream: 1, audience: 1, prayer: 1 });
        assert.deepEqual(res.countSearch, { all: 3, stream: 1, audience: 1, prayer: 1 });
    });

    test('16. фільтр за категорією ховає інші, але countAbsolute лишається повним', () => {
        const list = buildBannerList([{ text: 'A' }, { text: 'B' }, { text: 'C' }]);
        const cache = { A: 'stream', B: 'audience', C: 'prayer' };

        const res = filterBannerListItems(list, SELECTORS, cache, 'prayer', '');

        assert.equal(res.visibleCount, 1);
        assert.deepEqual(res.countAbsolute, { all: 3, stream: 1, audience: 1, prayer: 1 });

        const displays = Array.from(list.children).map(li => li.style.display);
        assert.deepEqual(displays, ['none', 'none', '']);
    });

    test('17. пошук звужує countSearch, не чіпаючи countAbsolute', () => {
        const list = buildBannerList([{ text: 'Молитва про мир' }, { text: 'Питання ефіру' }]);
        const cache = { 'Молитва про мир': 'prayer', 'Питання ефіру': 'stream' };

        const res = filterBannerListItems(list, SELECTORS, cache, 'all', 'молитва');

        assert.equal(res.visibleCount, 1);
        assert.deepEqual(res.countAbsolute, { all: 2, stream: 1, audience: 0, prayer: 1 });
        assert.deepEqual(res.countSearch, { all: 1, stream: 0, audience: 0, prayer: 1 });
    });

    test('18. банери без категорії рахуються лише в all', () => {
        const list = buildBannerList([{ text: 'A' }, { text: 'B' }]);

        const res = filterBannerListItems(list, SELECTORS, {}, 'all', '');

        assert.deepEqual(res.countAbsolute, { all: 2, stream: 0, audience: 0, prayer: 0 });
        assert.equal(res.visibleCount, 2);
    });

    test('19. функція попутно проставляє data-syh-banner-type на обгортках', () => {
        const list = buildBannerList([{ text: 'A' }, { text: 'B' }]);
        const cache = { A: 'stream' };

        filterBannerListItems(list, SELECTORS, cache, 'all', '');

        const wraps = list.querySelectorAll('[class*="Banner__Wrap"]');
        assert.equal(wraps[0].getAttribute('data-syh-banner-type'), 'stream');
        assert.equal(wraps[1].hasAttribute('data-syh-banner-type'), false);
    });

    test('20. елементи списку без обгортки банера пропускаються', () => {
        const list = buildBannerList([{ text: 'A' }]);
        const stray = document.createElement('li');
        stray.textContent = 'сторонній рядок';
        list.appendChild(stray);

        const res = filterBannerListItems(list, SELECTORS, { A: 'stream' }, 'all', '');

        assert.equal(res.countAbsolute.all, 1, 'сторонній <li> не потрапляє в підрахунок');
        assert.equal(stray.style.display, '', 'і не ховається');
    });

    test('21. фільтр + пошук комбінуються через логічне І', () => {
        const list = buildBannerList([
            { text: 'Молитва про мир' },
            { text: 'Молитва про здоровя' },
            { text: 'Молитва подяки' }
        ]);
        const cache = {
            'Молитва про мир': 'prayer',
            'Молитва про здоровя': 'stream',
            'Молитва подяки': 'prayer'
        };

        const res = filterBannerListItems(list, SELECTORS, cache, 'prayer', 'молитва');

        assert.equal(res.visibleCount, 2);
        assert.deepEqual(res.countSearch, { all: 3, stream: 1, audience: 0, prayer: 2 });
    });

    test('22. порожній список дає нульові лічильники', () => {
        const list = buildBannerList([]);

        const res = filterBannerListItems(list, SELECTORS, {}, 'all', '');

        assert.equal(res.visibleCount, 0);
        assert.deepEqual(res.countAbsolute, { all: 0, stream: 0, audience: 0, prayer: 0 });
    });
});

describe('ui_banners — updateBannerTabCounts', () => {
    beforeEach(() => { document.body.innerHTML = ''; resetUiState(); });
    afterEach(() => { document.body.innerHTML = ''; });

    test('23. проставляє лічильники у дужках на всі чотири вкладки', () => {
        buildBannerList([]);
        injectSearchAndFilterContainer(document.querySelector('ul'));

        updateBannerTabCounts({ all: 7, stream: 3, audience: 2, prayer: 2 });

        assert.equal(document.querySelector('#syh-banner-filter-all .tab-count').textContent, '(7)');
        assert.equal(document.querySelector('#syh-banner-filter-stream .tab-count').textContent, '(3)');
        assert.equal(document.querySelector('#syh-banner-filter-audience .tab-count').textContent, '(2)');
        assert.equal(document.querySelector('#syh-banner-filter-prayer .tab-count').textContent, '(2)');
    });

    test('24. відсутні ключі показуються як (0)', () => {
        buildBannerList([]);
        injectSearchAndFilterContainer(document.querySelector('ul'));

        updateBannerTabCounts({});

        assert.equal(document.querySelector('#syh-banner-filter-all .tab-count').textContent, '(0)');
        assert.equal(document.querySelector('#syh-banner-filter-prayer .tab-count').textContent, '(0)');
    });
});

describe('ui_banners — renderBannerEmptyState', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        resetUiState();
        buildBannerList([]);
        injectSearchAndFilterContainer(document.querySelector('ul'));
    });
    afterEach(() => { document.body.innerHTML = ''; });

    test('25. за наявності видимих банерів порожній стан прихований', () => {
        renderBannerEmptyState(3, '', 'all', { all: 3, stream: 0, audience: 0, prayer: 0 });

        assert.equal(document.getElementById('syh-banner-empty-state-msg').style.display, 'none');
    });

    test('26. нуль видимих показує порожній стан', () => {
        renderBannerEmptyState(0, '', 'all', { all: 0, stream: 0, audience: 0, prayer: 0 });

        assert.notEqual(document.getElementById('syh-banner-empty-state-msg').style.display, 'none');
        assert.ok(document.getElementById('syh-banner-empty-query').innerHTML.length > 0);
    });

    test('27. підказка пропонує перейти на вкладку, де збіги є', () => {
        renderBannerEmptyState(0, 'молитва', 'stream', { all: 2, stream: 0, audience: 0, prayer: 2 });

        const suggestion = document.getElementById('syh-banner-empty-suggestion');
        assert.notEqual(suggestion.style.display, 'none');
        assert.ok(suggestion.innerHTML.includes('Молитви'));
    });

    test('28. без збігів в інших вкладках підказка прихована', () => {
        renderBannerEmptyState(0, 'абракадабра', 'all', { all: 0, stream: 0, audience: 0, prayer: 0 });

        assert.equal(document.getElementById('syh-banner-empty-suggestion').style.display, 'none');
    });
});

describe('ui_banners — filterBanners (оркестрація)', () => {
    beforeEach(() => { document.body.innerHTML = ''; resetUiState(); });
    afterEach(() => { document.body.innerHTML = ''; });

    test('29. без списку банерів у DOM виходить мовчки', () => {
        assert.doesNotThrow(() => filterBanners());
    });

    test('30. зшиває фільтрацію, лічильники вкладок і порожній стан', () => {
        const list = buildBannerList([{ text: 'Молитва' }, { text: 'Питання' }]);
        injectSearchAndFilterContainer(list);
        SYH_UI_STATE.bannerCategoriesCache = { 'Молитва': 'prayer', 'Питання': 'stream' };
        SYH_UI_STATE.bannerActiveFilter = 'prayer';

        filterBanners();

        assert.equal(document.querySelector('#syh-banner-filter-all .tab-count').textContent, '(2)');
        assert.equal(document.querySelector('#syh-banner-filter-prayer .tab-count').textContent, '(1)');
        assert.deepEqual(Array.from(list.children).map(li => li.style.display), ['', 'none']);
        assert.equal(document.getElementById('syh-banner-empty-state-msg').style.display, 'none');
    });

    test('31. фільтр без збігів показує порожній стан', () => {
        const list = buildBannerList([{ text: 'Питання' }]);
        injectSearchAndFilterContainer(list);
        SYH_UI_STATE.bannerCategoriesCache = { 'Питання': 'stream' };
        SYH_UI_STATE.bannerActiveFilter = 'prayer';

        filterBanners();

        assert.notEqual(document.getElementById('syh-banner-empty-state-msg').style.display, 'none');
    });
});

describe('ui_banners — updateMasterCheckboxState', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        resetUiState();
        installChromeMock({ storageData: {} });
    });
    afterEach(() => { document.body.innerHTML = ''; });

    /** Створює список банерів із чекбоксами у заданих станах. */
    function buildWithCheckboxes(states) {
        const ul = buildBannerList(states.map((_, i) => ({ text: `B${i}` })));
        Array.from(ul.children).forEach((li, i) => {
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'syh-checkbox';
            cb.dataset.type = 'banner';
            cb.checked = states[i];
            li.querySelector('[class*="Banner__LiWrap"]').appendChild(cb);
        });
        const header = document.createElement('div');
        document.body.appendChild(header);
        injectHeaderButtons(header);
        return document.querySelector('.syh-master-checkbox');
    }

    test('32. усі відмічені → master відмічений і не indeterminate', () => {
        const master = buildWithCheckboxes([true, true]);

        updateMasterCheckboxState();

        assert.equal(master.checked, true);
        assert.equal(master.indeterminate, false);
    });

    test('33. частково відмічені → indeterminate', () => {
        const master = buildWithCheckboxes([true, false]);

        updateMasterCheckboxState();

        assert.equal(master.indeterminate, true);
    });

    test('34. жодного відміченого → master знятий', () => {
        const master = buildWithCheckboxes([false, false]);

        updateMasterCheckboxState();

        assert.equal(master.checked, false);
        assert.equal(master.indeterminate, false);
    });
});
