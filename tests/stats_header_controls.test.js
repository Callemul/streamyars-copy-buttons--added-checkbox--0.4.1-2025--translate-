import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach, mock } from 'node:test';

import { installChromeMock } from './setup/chrome_mock.ts';

// Характеризаційні тести header-контролів StreamYard, які історично жили
// всередині `SYH_STATS_TRACKER.setupObservers()` (153 рядки, 4 вкладені замикання,
// `checkSabbathSchoolBrandMismatch` = cognitive 16 у звіті Fallow).
//
// Тести написані ДО рефакторингу і фіксують поведінку 1-в-1, тому вони мають
// проходити і на старому монолітному `setupObservers`, і на винесеному
// `modules/stats_header_controls.ts`.

/** @type {Record<string, any>} */
let mockStorageStore = {};

installChromeMock({
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

const { SYH_STATS_TRACKER } = await import('../modules/stats_tracker.ts');

const HEADER_FIXTURE = `
<header>
  <div data-testid="header-center">
    <div data-testid="header-status-wrap"></div>
  </div>
  <div data-testid="header-title-wrap"><p>Субботняя школа — Молчанов и Опарин</p></div>
</header>
<button id="broadcast-aside-tab-assets" title="Media assets"></button>
`;

const q = (sel) => document.querySelector(sel);

/** Виконує відкладену ін'єкцію header-контролів (setTimeout(..., 1000) у setupObservers). */
function runHeaderInjection() {
    SYH_STATS_TRACKER.setupObservers();
    mock.timers.tick(1000);
}

/** Замінює текст заголовка ефіру (використовується для детекції «Суботньої школи»). */
function setBroadcastTitle(text) {
    q('[data-testid="header-title-wrap"] p').textContent = text;
}

/** Додає вузол із назвою бренда StreamYard. */
function setBrandNode(text) {
    const node = document.createElement('div');
    node.className = 'BrandSelect__BrandNameText-sc-16g9tfx-1';
    node.textContent = text;
    document.body.appendChild(node);
}

describe('stats header controls — ін\'єкція кнопок у шапку', () => {
    beforeEach(() => {
        mock.timers.enable({ apis: ['setTimeout'] });
        mockStorageStore = {};
        document.body.innerHTML = HEADER_FIXTURE;
        SYH_STATS_TRACKER.currentBrand = 'DefaultShow';
        SYH_STATS_TRACKER.lastKnownBrand = '';
        localStorage.clear();
    });

    afterEach(() => {
        SYH_STATS_TRACKER.destroy();
        mock.timers.reset();
        mock.restoreAll();
        document.body.innerHTML = '';
    });

    test('1. створює #syh-header-controls усередині header-center перед header-status-wrap', () => {
        runHeaderInjection();

        const container = q('#syh-header-controls');
        assert.ok(container, 'контейнер має бути створений');

        const headerCenter = q('[data-testid="header-center"]');
        assert.equal(container.parentElement, headerCenter);
        assert.equal(container.nextElementSibling, q('[data-testid="header-status-wrap"]'));
    });

    test('2. виставляє flex-розкладку контейнеру header-center', () => {
        runHeaderInjection();

        const headerCenter = q('[data-testid="header-center"]');
        assert.equal(headerCenter.style.display, 'flex');
        assert.equal(headerCenter.style.alignItems, 'center');
        assert.equal(headerCenter.style.flexDirection, 'row');
    });

    test('3. створює рівно 4 контроли: питання, молитви, аналітика, інфо', () => {
        runHeaderInjection();

        const container = q('#syh-header-controls');
        assert.equal(container.children.length, 4);

        assert.ok(container.querySelector('[data-action="phase-questions"]'));
        assert.ok(container.querySelector('[data-action="phase-prayers"]'));
        assert.ok(container.querySelector('#syh-analytics-btn'));
        assert.ok(container.querySelector('#syh-info-btn'));
    });

    test('4. кнопки фаз мають a11y-підписи та іконки', () => {
        runHeaderInjection();

        const btnQ = q('[data-action="phase-questions"]');
        const btnP = q('[data-action="phase-prayers"]');

        assert.equal(btnQ.getAttribute('aria-label'), 'Натисни, коли починається блок питань');
        assert.equal(btnP.getAttribute('aria-label'), 'Натисни, коли починається молитовний блок');
        assert.ok(btnQ.innerHTML.includes('❓ Старт: Питання'));
        assert.ok(btnP.innerHTML.includes('🙏 Старт: Молитви'));
    });

    test('5. кнопки аналітики та інфо мають a11y-підписи', () => {
        runHeaderInjection();

        assert.equal(q('#syh-analytics-btn').getAttribute('aria-label'), 'Відкрити аналітику');
        assert.equal(q('#syh-info-btn').getAttribute('aria-label'), 'Відкрити довідку та оновлення');
        assert.equal(q('#syh-info-btn').title, 'Оновлення та Інструкції');
    });

    test('6. повторна ін\'єкція не дублює контейнер', () => {
        runHeaderInjection();
        SYH_STATS_TRACKER.destroy();
        runHeaderInjection();

        assert.equal(document.querySelectorAll('#syh-header-controls').length, 1);
    });

    test('7. без header-center/header-status-wrap нічого не ін\'єктується', () => {
        document.body.innerHTML = '<header></header>';
        runHeaderInjection();

        assert.equal(q('#syh-header-controls'), null);
    });
});

describe('stats header controls — делегування кліків у трекер (пізнє зв\'язування)', () => {
    let originalMarkPhase;
    let originalShowAnalyticsModal;

    beforeEach(() => {
        mock.timers.enable({ apis: ['setTimeout'] });
        mockStorageStore = {};
        document.body.innerHTML = HEADER_FIXTURE;
        SYH_STATS_TRACKER.currentBrand = 'DefaultShow';
        SYH_STATS_TRACKER.lastKnownBrand = '';
        originalMarkPhase = SYH_STATS_TRACKER.markPhase;
        originalShowAnalyticsModal = SYH_STATS_TRACKER.showAnalyticsModal;
    });

    afterEach(() => {
        SYH_STATS_TRACKER.markPhase = originalMarkPhase;
        SYH_STATS_TRACKER.showAnalyticsModal = originalShowAnalyticsModal;
        SYH_STATS_TRACKER.destroy();
        mock.timers.reset();
        mock.restoreAll();
        delete globalThis.SYH_INFO_MODAL;
        document.body.innerHTML = '';
    });

    test('8. клік по «Старт: Питання» викликає markPhase(\'questions\', btn)', () => {
        const calls = [];
        SYH_STATS_TRACKER.markPhase = (phase, el) => calls.push([phase, el]);

        runHeaderInjection();
        const btnQ = q('[data-action="phase-questions"]');
        btnQ.click();

        assert.equal(calls.length, 1);
        assert.equal(calls[0][0], 'questions');
        assert.equal(calls[0][1], btnQ);
    });

    test('9. клік по «Старт: Молитви» викликає markPhase(\'prayers\', btn)', () => {
        const calls = [];
        SYH_STATS_TRACKER.markPhase = (phase, el) => calls.push([phase, el]);

        runHeaderInjection();
        const btnP = q('[data-action="phase-prayers"]');
        btnP.click();

        assert.deepEqual(calls.map(c => c[0]), ['prayers']);
        assert.equal(calls[0][1], btnP);
    });

    test('10. клік по «Аналітика» викликає showAnalyticsModal', () => {
        let called = 0;
        SYH_STATS_TRACKER.showAnalyticsModal = () => { called += 1; };

        runHeaderInjection();
        q('#syh-analytics-btn').click();

        assert.equal(called, 1);
    });

    test('11. клік по «ⓘ» відкриває глобальну info-модалку, якщо вона є', () => {
        let shown = 0;
        globalThis.SYH_INFO_MODAL = { showModal: () => { shown += 1; } };

        runHeaderInjection();
        q('#syh-info-btn').click();

        assert.equal(shown, 1);
    });

    test('12. клік по «ⓘ» без модалки лише попереджає в консоль (не кидає)', () => {
        const warn = mock.method(console, 'warn', () => {});

        runHeaderInjection();
        assert.doesNotThrow(() => q('#syh-info-btn').click());

        assert.ok(warn.mock.calls.some(c => String(c.arguments[0]).includes('info_modal')));
    });

    test('13. hover по «ⓘ» перемикає фон кнопки', () => {
        runHeaderInjection();
        const btnInfo = q('#syh-info-btn');

        btnInfo.onmouseover();
        assert.equal(btnInfo.style.background, '#636979');

        btnInfo.onmouseout();
        assert.equal(btnInfo.style.background, '#4F5461');
    });
});

describe('stats header controls — відновлення стану кнопок фаз зі сховища', () => {
    beforeEach(() => {
        mock.timers.enable({ apis: ['setTimeout'] });
        mockStorageStore = {};
        document.body.innerHTML = HEADER_FIXTURE;
        SYH_STATS_TRACKER.currentBrand = 'DefaultShow';
        SYH_STATS_TRACKER.lastKnownBrand = '';
    });

    afterEach(() => {
        SYH_STATS_TRACKER.destroy();
        mock.timers.reset();
        mock.restoreAll();
        document.body.innerHTML = '';
    });

    test('14. збережені фази роблять кнопки «✅» та напівпрозорими', () => {
        const today = new Date().toLocaleDateString('sv-SE');
        mockStorageStore['syh:stats:charts'] = {
            DefaultShow: { [today]: { data: [], phase_questions_start: '00:10', phase_prayers_start: '00:40' } }
        };

        runHeaderInjection();

        const btnQ = q('[data-action="phase-questions"]');
        const btnP = q('[data-action="phase-prayers"]');
        assert.equal(btnQ.innerText, '✅ Питання');
        assert.equal(btnP.innerText, '✅ Молитви');
        assert.equal(btnQ.style.opacity, '0.7');
        assert.equal(btnP.style.opacity, '0.7');
    });

    test('15. без збережених фаз кнопки лишаються у стартовому вигляді', () => {
        runHeaderInjection();

        const btnQ = q('[data-action="phase-questions"]');
        assert.ok(btnQ.innerHTML.includes('❓ Старт: Питання'));
        assert.notEqual(btnQ.style.opacity, '0.7');
    });
});

describe('stats header controls — детекція бренда', () => {
    beforeEach(() => {
        mock.timers.enable({ apis: ['setTimeout'] });
        mockStorageStore = {};
        document.body.innerHTML = HEADER_FIXTURE;
        SYH_STATS_TRACKER.currentBrand = 'DefaultShow';
        SYH_STATS_TRACKER.lastKnownBrand = '';
        localStorage.clear();
    });

    afterEach(() => {
        SYH_STATS_TRACKER.destroy();
        mock.timers.reset();
        mock.restoreAll();
        localStorage.clear();
        document.body.innerHTML = '';
    });

    test('16. бренд із DOM записується у lastKnownBrand', () => {
        setBrandNode('Слово жизни');
        runHeaderInjection();

        assert.equal(SYH_STATS_TRACKER.lastKnownBrand, 'Слово жизни');
    });

    test('17. службовий текст «chevron-down» вирізається з назви бренда', () => {
        setBrandNode('Слово жизни chevron-down');
        runHeaderInjection();

        assert.equal(SYH_STATS_TRACKER.lastKnownBrand, 'Слово жизни');
    });

    test('18. плейсхолдери «Share ▾» / «Return to dashboard» не вважаються брендом', () => {
        setBrandNode('Share ▾');
        runHeaderInjection();
        assert.equal(SYH_STATS_TRACKER.lastKnownBrand, '');

        SYH_STATS_TRACKER.destroy();
        document.body.innerHTML = HEADER_FIXTURE;
        setBrandNode('Return to dashboard');
        runHeaderInjection();
        assert.equal(SYH_STATS_TRACKER.lastKnownBrand, '');
    });

    test('19. без вузла бренда використовується localStorage', () => {
        localStorage.setItem('streamyard_brand', '{"name":"Канал зі сховища"}');
        runHeaderInjection();

        assert.equal(SYH_STATS_TRACKER.lastKnownBrand, 'Канал зі сховища');
    });

    test('20. без вузла і без localStorage лишається попередній lastKnownBrand', () => {
        SYH_STATS_TRACKER.lastKnownBrand = 'Попередній';
        // setupObservers скидає lastKnownBrand у "" на старті, тож після ін'єкції
        // без жодного джерела бренда він лишається порожнім.
        runHeaderInjection();

        assert.equal(SYH_STATS_TRACKER.lastKnownBrand, '');
    });
});

describe('stats header controls — попередження про невідповідність папки медіа', () => {
    const WARNING_TITLE = '⚠️ ПОМИЛКА: Папка медіа має бути "Субботняя школа"!';

    beforeEach(() => {
        mock.timers.enable({ apis: ['setTimeout'] });
        mockStorageStore = {};
        document.body.innerHTML = HEADER_FIXTURE;
        SYH_STATS_TRACKER.currentBrand = 'DefaultShow';
        SYH_STATS_TRACKER.lastKnownBrand = '';
        localStorage.clear();
    });

    afterEach(() => {
        SYH_STATS_TRACKER.destroy();
        mock.timers.reset();
        mock.restoreAll();
        localStorage.clear();
        document.body.innerHTML = '';
    });

    test('21. суботня школа + НЕвідповідний бренд -> червона підсвітка і warning-title', () => {
        setBrandNode('Слово жизни');
        runHeaderInjection();

        const tab = q('#broadcast-aside-tab-assets');
        assert.equal(tab.getAttribute('title'), WARNING_TITLE);
        assert.equal(tab.dataset.originalTitle, 'Media assets');
        assert.ok(tab.style.cssText.includes('e74c3c'));
        assert.ok(tab.style.cssText.includes('syhActivePulse'));
    });

    test('22. суботня школа + правильний бренд -> без підсвітки', () => {
        setBrandNode('Субботняя школа');
        runHeaderInjection();

        const tab = q('#broadcast-aside-tab-assets');
        assert.equal(tab.style.cssText, '');
        assert.equal(tab.getAttribute('title'), 'Media assets');
    });

    test('23. українське написання «субот» теж вважається правильним брендом', () => {
        setBrandNode('Суботня школа');
        runHeaderInjection();

        assert.equal(q('#broadcast-aside-tab-assets').style.cssText, '');
    });

    test('24. звичайний ефір (не суботня школа) -> без підсвітки при будь-якому бренді', () => {
        setBroadcastTitle('Вечір молитви');
        setBrandNode('Слово жизни');
        runHeaderInjection();

        assert.equal(q('#broadcast-aside-tab-assets').style.cssText, '');
    });

    test('25. заголовок без «молчанов»/«опар» не вмикає режим суботньої школи', () => {
        setBroadcastTitle('Субботняя школа з іншими ведучими');
        setBrandNode('Слово жизни');
        runHeaderInjection();

        assert.equal(q('#broadcast-aside-tab-assets').style.cssText, '');
    });

    test('26. попереднє попередження знімається і title відновлюється', () => {
        const tab = q('#broadcast-aside-tab-assets');
        tab.dataset.originalTitle = 'Media assets';
        tab.setAttribute('title', WARNING_TITLE);
        tab.style.cssText = 'background: #e74c3c !important;';

        setBrandNode('Субботняя школа');
        runHeaderInjection();

        assert.equal(tab.style.cssText, '');
        assert.equal(tab.getAttribute('title'), 'Media assets');
        assert.equal(tab.dataset.originalTitle, undefined);
    });

    test('27. порожній бренд лише скидає стилі, але НЕ відновлює title (історичний квірк)', () => {
        const tab = q('#broadcast-aside-tab-assets');
        tab.dataset.originalTitle = 'Media assets';
        tab.setAttribute('title', WARNING_TITLE);
        tab.style.cssText = 'background: #e74c3c !important;';

        // жодного джерела бренда -> brandName === ''
        runHeaderInjection();

        assert.equal(tab.style.cssText, '');
        assert.equal(tab.getAttribute('title'), WARNING_TITLE, 'title навмисно НЕ відновлюється');
        assert.equal(tab.dataset.originalTitle, 'Media assets');
    });

    test('28. fallback-селектор [id*="tab-assets"] теж підхоплюється', () => {
        q('#broadcast-aside-tab-assets').remove();
        const alt = document.createElement('button');
        alt.id = 'some-tab-assets-btn';
        alt.setAttribute('aria-label', 'Assets aria');
        document.body.appendChild(alt);

        setBrandNode('Слово жизни');
        runHeaderInjection();

        assert.equal(alt.getAttribute('title'), WARNING_TITLE);
        assert.equal(alt.dataset.originalTitle, 'Assets aria');
    });

    test('29. відсутня вкладка медіа -> тиха відсутність дії', () => {
        q('#broadcast-aside-tab-assets').remove();
        setBrandNode('Слово жизни');

        assert.doesNotThrow(() => runHeaderInjection());
        assert.ok(q('#syh-header-controls'));
    });

    test('30. вкладка без title та aria-label отримує дефолт "Media assets"', () => {
        const tab = q('#broadcast-aside-tab-assets');
        tab.removeAttribute('title');

        setBrandNode('Слово жизни');
        runHeaderInjection();

        assert.equal(tab.dataset.originalTitle, 'Media assets');
    });
});

describe('stats header controls — життєвий цикл спостерігача', () => {
    beforeEach(() => {
        mock.timers.enable({ apis: ['setTimeout'] });
        mockStorageStore = {};
        document.body.innerHTML = HEADER_FIXTURE;
        SYH_STATS_TRACKER.lastKnownBrand = 'щось';
    });

    afterEach(() => {
        SYH_STATS_TRACKER.destroy();
        mock.timers.reset();
        mock.restoreAll();
        document.body.innerHTML = '';
    });

    test('31. setupObservers скидає lastKnownBrand і створює MutationObserver', () => {
        SYH_STATS_TRACKER.setupObservers();

        assert.equal(SYH_STATS_TRACKER.lastKnownBrand, '');
        assert.ok(SYH_STATS_TRACKER.observer);
    });

    test('32. повторний виклик setupObservers переприв\'язує спостерігача', () => {
        SYH_STATS_TRACKER.setupObservers();
        const first = SYH_STATS_TRACKER.observer;

        SYH_STATS_TRACKER.setupObservers();
        assert.notEqual(SYH_STATS_TRACKER.observer, first);
    });

    test('33. destroy відключає спостерігача', () => {
        SYH_STATS_TRACKER.setupObservers();
        SYH_STATS_TRACKER.destroy();

        assert.equal(SYH_STATS_TRACKER.observer, null);
    });
});
