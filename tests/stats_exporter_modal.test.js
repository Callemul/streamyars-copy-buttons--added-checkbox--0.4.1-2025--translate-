/**
 * Характеристичні (characterization) тести для DOM/side-effect частини SYH_STATS_EXPORTER.
 *
 * Написані ДО декомпозиції `modules/stats_exporter.ts` (547 LOC, Fallow hotspot 21.4),
 * щоб зафіксувати поведінку 1-в-1: модальне вікно, завантаження даних графіка,
 * підготовка датасетів Chart.js, рендер порожнього стану, CSV/HTML експорт.
 *
 * Чисту математику (calcStats/parseTimeToSeconds/calculatePhaseStats) і форматери
 * покриває окремий `tests/stats_exporter.test.js` — тут вони свідомо не дублюються.
 */

import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach } from 'node:test';
import { installChromeMock } from './setup/chrome_mock.ts';
import { SYH_STATS_EXPORTER } from '../modules/stats_exporter.ts';
import { renderModalSummaryTable } from '../modules/stats_modal.ts';
import { STORAGE_KEYS } from '../modules/storage.ts';
import { SYH_UTILS } from '../modules/utils.ts';

const TODAY = SYH_UTILS.getTodayDateString();

/** Мінімальна сесія з двома фазами. */
function makeSession() {
    return {
        data: [
            { time: '00:10', viewers: 100 },
            { time: '00:40', viewers: 200 },
            { time: '01:10', viewers: 150 }
        ],
        phase_questions_start: '00:30',
        phase_prayers_start: '01:00',
        initial_viewers: 80
    };
}

/** Ставить у сховище розширення базу графіків для одного бренду. */
function seedCharts(brand, byDate) {
    installChromeMock({
        storageData: { [STORAGE_KEYS.STATS_CHARTS]: { [brand]: byDate } }
    });
}

/** Перехоплює document.createElement('a') і повертає список створених посилань. */
function captureAnchors() {
    const created = [];
    const originalCreate = document.createElement.bind(document);
    document.createElement = function (tagName, ...rest) {
        const el = originalCreate(tagName, ...rest);
        if (String(tagName).toLowerCase() === 'a') {
            el.click = () => { created.push({ el, clicked: true }); };
            created.push({ el, clicked: false });
        }
        return el;
    };
    return {
        created,
        restore() { document.createElement = originalCreate; }
    };
}

describe('SYH_STATS_EXPORTER — модальне вікно (showModal)', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        SYH_STATS_EXPORTER.chartInstance = null;
        installChromeMock({ storageData: {} });
    });

    afterEach(() => {
        document.body.innerHTML = '';
        SYH_STATS_EXPORTER.chartInstance = null;
    });

    test('1. створює оверлей із назвою бренду та всіма кнопками експорту', () => {
        SYH_STATS_EXPORTER.showModal('Канал Перемен');

        const modal = document.getElementById('syh-chart-modal');
        assert.ok(modal, 'модальне вікно має бути вставлене у body');
        assert.equal(modal.className, 'syh-chart-modal-overlay');

        const brandSpan = modal.querySelector('.syh-chart-brand-name');
        assert.equal(brandSpan.textContent, 'Канал Перемен');

        for (const id of [
            'syh-close-chart',
            'syh-compare-select',
            'syh-dl-csv-btn',
            'syh-dl-slide-btn',
            'syh-dl-pres-btn',
            'syh-copy-md-btn',
            'syh-copy-html-btn',
            'syhChartCanvas',
            'syh-stats-summary-container'
        ]) {
            assert.ok(document.getElementById(id), `елемент #${id} має існувати`);
        }
    });

    test('2. повторний виклик не дублює модальне вікно (ідемпотентність)', () => {
        SYH_STATS_EXPORTER.showModal('Brand');
        SYH_STATS_EXPORTER.showModal('Brand');

        assert.equal(document.querySelectorAll('#syh-chart-modal').length, 1);
    });

    test('3. select порівняння за замовчуванням має єдину опцію "--- Ні ---"', () => {
        SYH_STATS_EXPORTER.showModal('Brand');

        const select = document.getElementById('syh-compare-select');
        assert.equal(select.options.length, 1);
        assert.equal(select.options[0].value, 'none');
    });

    test('4. кнопка закриття прибирає вікно і знищує екземпляр графіка', () => {
        SYH_STATS_EXPORTER.showModal('Brand');

        let destroyed = 0;
        SYH_STATS_EXPORTER.chartInstance = { destroy() { destroyed++; } };

        document.getElementById('syh-close-chart').onclick();

        assert.equal(document.getElementById('syh-chart-modal'), null);
        assert.equal(destroyed, 1, 'chartInstance.destroy() має бути викликано рівно раз');
        assert.equal(SYH_STATS_EXPORTER.chartInstance, null);
    });

    test('5. Escape закриває вікно, а інші клавіші — ні', () => {
        SYH_STATS_EXPORTER.showModal('Brand');

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        assert.ok(document.getElementById('syh-chart-modal'), 'Enter не закриває вікно');

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        assert.equal(document.getElementById('syh-chart-modal'), null);
    });

    test('6. після закриття слухач Escape знято (повторний Escape безпечний)', () => {
        SYH_STATS_EXPORTER.showModal('Brand');
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        // друге вікно не має закритись від "хвоста" старого слухача
        SYH_STATS_EXPORTER.showModal('Brand');
        const before = document.getElementById('syh-chart-modal');
        assert.ok(before);

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        assert.equal(document.getElementById('syh-chart-modal'), null);
    });

    test('7. клік по самому оверлею закриває, клік по контейнеру — ні', () => {
        SYH_STATS_EXPORTER.showModal('Brand');
        const modal = document.getElementById('syh-chart-modal');
        const container = modal.querySelector('.syh-chart-modal-container');

        container.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        assert.ok(document.getElementById('syh-chart-modal'), 'клік усередині не закриває');

        modal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        assert.equal(document.getElementById('syh-chart-modal'), null);
    });
});

describe('SYH_STATS_EXPORTER — loadChartData', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <select id="syh-compare-select"><option value="none">--- Ні ---</option></select>
            <button id="syh-dl-csv-btn"></button>
            <button id="syh-dl-pres-btn"></button>
            <button id="syh-copy-md-btn"></button>
            <button id="syh-copy-html-btn"></button>
            <canvas id="syhChartCanvas"></canvas>
        `;
        SYH_STATS_EXPORTER.chartInstance = null;
    });

    afterEach(() => {
        document.body.innerHTML = '';
        SYH_STATS_EXPORTER.chartInstance = null;
    });

    test('8. наповнює select датами бренду, крім сьогоднішньої, у спадному порядку', async () => {
        seedCharts('Brand', {
            '2026-01-01': makeSession(),
            '2026-03-05': makeSession(),
            '2026-02-02': makeSession(),
            [TODAY]: makeSession()
        });

        await SYH_STATS_EXPORTER.loadChartData('Brand');

        const select = document.getElementById('syh-compare-select');
        const values = Array.from(select.options).map(o => o.value);
        assert.deepEqual(values, ['none', '2026-03-05', '2026-02-02', '2026-01-01']);
    });

    test('9. невідомий бренд не додає опцій і не кидає помилок', async () => {
        seedCharts('Other', { '2026-01-01': makeSession() });

        await SYH_STATS_EXPORTER.loadChartData('Brand');

        const select = document.getElementById('syh-compare-select');
        assert.deepEqual(Array.from(select.options).map(o => o.value), ['none']);
    });

    test('10. порожнє сховище не ламає завантаження (db === {})', async () => {
        installChromeMock({ storageData: {} });

        await SYH_STATS_EXPORTER.loadChartData('Brand');

        const select = document.getElementById('syh-compare-select');
        assert.deepEqual(Array.from(select.options).map(o => o.value), ['none']);
    });

    test('11. кнопка "📋 MD" копіює markdown-звіт за сьогоднішню дату', async () => {
        seedCharts('Brand', { [TODAY]: makeSession() });

        const calls = [];
        const original = SYH_UTILS.copyAndShowBanner;
        SYH_UTILS.copyAndShowBanner = (text, message) => calls.push({ text, message });

        try {
            await SYH_STATS_EXPORTER.loadChartData('Brand');
            document.getElementById('syh-copy-md-btn').onclick();
        } finally {
            SYH_UTILS.copyAndShowBanner = original;
        }

        assert.equal(calls.length, 1);
        assert.equal(calls[0].message, 'Markdown звіт скопійовано!');
        assert.ok(calls[0].text.startsWith('# 📊 Підсумкова аналітика ефіру: Brand'));
    });

    test('12. кнопка "📋 HTML" копіює HTML-звіт', async () => {
        seedCharts('Brand', { [TODAY]: makeSession() });

        const calls = [];
        const original = SYH_UTILS.copyAndShowBanner;
        SYH_UTILS.copyAndShowBanner = (text, message) => calls.push({ text, message });

        try {
            await SYH_STATS_EXPORTER.loadChartData('Brand');
            document.getElementById('syh-copy-html-btn').onclick();
        } finally {
            SYH_UTILS.copyAndShowBanner = original;
        }

        assert.equal(calls.length, 1);
        assert.equal(calls[0].message, 'HTML звіт скопійовано!');
        assert.ok(calls[0].text.includes('<div class="syh-summary-report">'));
    });

    test('13. без даних за сьогодні кнопки копіювання нічого не копіюють', async () => {
        seedCharts('Brand', { '2026-01-01': makeSession() });

        const calls = [];
        const original = SYH_UTILS.copyAndShowBanner;
        SYH_UTILS.copyAndShowBanner = (text, message) => calls.push({ text, message });

        try {
            await SYH_STATS_EXPORTER.loadChartData('Brand');
            document.getElementById('syh-copy-md-btn').onclick();
            document.getElementById('syh-copy-html-btn').onclick();
        } finally {
            SYH_UTILS.copyAndShowBanner = original;
        }

        assert.equal(calls.length, 0, 'порожній звіт не має потрапляти у буфер');
    });

    test('14. зміна select перемальовує графік із вибраною датою порівняння', async () => {
        seedCharts('Brand', { '2026-01-01': makeSession(), [TODAY]: makeSession() });

        const seen = [];
        const original = SYH_STATS_EXPORTER.renderChart;
        SYH_STATS_EXPORTER.renderChart = async (todayData, pastData) => { seen.push({ todayData, pastData }); };

        try {
            await SYH_STATS_EXPORTER.loadChartData('Brand');
            const select = document.getElementById('syh-compare-select');
            select.value = '2026-01-01';
            select.onchange({ target: select });
        } finally {
            SYH_STATS_EXPORTER.renderChart = original;
        }

        assert.equal(seen.length, 2, 'початковий рендер + рендер після зміни select');
        assert.equal(seen[0].pastData, null);
        assert.ok(seen[1].pastData, 'друга відмальовка отримує дані порівняння');
        assert.equal(seen[1].pastData.initial_viewers, 80);
    });

    test('15. вибір "none" у select скидає дані порівняння в null', async () => {
        seedCharts('Brand', { '2026-01-01': makeSession(), [TODAY]: makeSession() });

        const seen = [];
        const original = SYH_STATS_EXPORTER.renderChart;
        SYH_STATS_EXPORTER.renderChart = async (todayData, pastData) => { seen.push(pastData); };

        try {
            await SYH_STATS_EXPORTER.loadChartData('Brand');
            const select = document.getElementById('syh-compare-select');
            select.value = 'none';
            select.onchange({ target: select });
        } finally {
            SYH_STATS_EXPORTER.renderChart = original;
        }

        assert.equal(seen[1], null);
    });
});

describe('SYH_STATS_EXPORTER — prepareChartData', () => {
    test('16. будує labels/dataset із точок сесії', () => {
        const { labels, datasets } = SYH_STATS_EXPORTER.prepareChartData(makeSession());

        assert.deepEqual(labels, ['00:10', '00:40', '01:10']);
        assert.equal(datasets.length, 1);
        assert.equal(datasets[0].label, 'Глядачі');
        assert.deepEqual(datasets[0].data, [100, 200, 150]);
        assert.equal(datasets[0].borderColor, '#3498db');
        assert.equal(datasets[0].fill, true);
    });

    test('17. додає по одному плагіну-лінії на кожну задану фазу', () => {
        const { plugins } = SYH_STATS_EXPORTER.prepareChartData(makeSession());

        assert.deepEqual(plugins.map(p => p.id), ['Питання', 'Молитви']);
    });

    test('18. без міток фаз плагінів немає', () => {
        const { plugins } = SYH_STATS_EXPORTER.prepareChartData({
            data: [{ time: '00:10', viewers: 10 }]
        });

        assert.deepEqual(plugins, []);
    });

    test('19. плагін фази малює вертикальну лінію на найближчій за часом мітці', () => {
        // Мітка фази '00:40' збігається з часом точки (індекс 1); за відсутності
        // точного збігу плагін усе одно малює на найближчій мітці (див. fix нижче).
        const { plugins } = SYH_STATS_EXPORTER.prepareChartData({
            data: [
                { time: '00:10', viewers: 100 },
                { time: '00:40', viewers: 200 },
                { time: '01:10', viewers: 150 }
            ],
            phase_questions_start: '00:40'
        });

        const ops = [];
        const ctx = new Proxy({}, {
            get: (_t, prop) => {
                if (prop === 'save' || prop === 'restore' || prop === 'beginPath' || prop === 'stroke') {
                    return () => ops.push([prop]);
                }
                if (prop === 'moveTo' || prop === 'lineTo' || prop === 'fillText') {
                    return (...args) => ops.push([prop, ...args]);
                }
                return undefined;
            },
            set: () => true
        });

        plugins[0].beforeDraw({
            scales: { x: { getPixelForTick: (i) => i * 10 }, y: { top: 0, bottom: 100 } },
            ctx
        });

        assert.deepEqual(ops.map(o => o[0]), ['save', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'fillText', 'restore']);
        // '00:40' — індекс 1 => x = 10
        assert.deepEqual(ops.find(o => o[0] === 'moveTo'), ['moveTo', 10, 0]);
        assert.deepEqual(ops.find(o => o[0] === 'lineTo'), ['lineTo', 10, 100]);
        assert.deepEqual(ops.find(o => o[0] === 'fillText'), ['fillText', 'Питання', 15, 15]);
    });

    test('20. мітка фази, якої немає серед labels, малюється на найближчій мітці', () => {
        // Реальні сесії: markPhase пише довільну секунду таймера, а точки
        // збираються раз на 60 с. Плагін тепер малює лінію на найближчій
        // за часом мітці, а не ігнорує фазу через строгий збіг рядків.
        const { plugins } = SYH_STATS_EXPORTER.prepareChartData({
            data: [{ time: '00:10', viewers: 10 }],
            phase_questions_start: '00:37'
        });
        let touched = false;
        let usedIndex = -1;
        const chart = {
            scales: { x: { getPixelForTick: (i) => { touched = true; usedIndex = i; return 0; } }, y: { top: 0, bottom: 1 } },
            ctx: { save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fillText() {} }
        };

        plugins[0].beforeDraw(chart);

        assert.equal(touched, true, 'найближча мітка (індекс 0) обирається при відсутності точного збігу');
        assert.equal(usedIndex, 0);
    });

    test('20a. мітки фаз із makeSession() малюються на найближчих тіках', () => {
        const { plugins } = SYH_STATS_EXPORTER.prepareChartData(makeSession());
        const drawn = [];
        const chart = {
            scales: { x: { getPixelForTick: () => { drawn.push(1); return 0; } }, y: { top: 0, bottom: 1 } },
            ctx: { save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fillText() {} }
        };

        plugins.forEach(p => p.beforeDraw(chart));

        assert.equal(plugins.length, 2, 'плагіни створюються...');
        assert.equal(drawn.length, 2, '...і кожен малює лінію на найближчій мітці (fix: більше не ігнорується)');
    });
});

describe('SYH_STATS_EXPORTER — renderChart', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        SYH_STATS_EXPORTER.chartInstance = null;
    });

    afterEach(() => {
        document.body.innerHTML = '';
        SYH_STATS_EXPORTER.chartInstance = null;
    });

    test('21. без canvas виходить мовчки, але спершу знищує старий графік', async () => {
        let destroyed = 0;
        SYH_STATS_EXPORTER.chartInstance = { destroy() { destroyed++; } };

        await SYH_STATS_EXPORTER.renderChart(makeSession(), null);

        assert.equal(destroyed, 1);
        assert.equal(SYH_STATS_EXPORTER.chartInstance, null);
    });

    test('22. порожні дані малюють текст-заглушку і не будують графік', async () => {
        const calls = [];
        const canvas = document.createElement('canvas');
        canvas.id = 'syhChartCanvas';
        canvas.getContext = () => ({
            clearRect: (...a) => calls.push(['clearRect', ...a]),
            fillText: (...a) => calls.push(['fillText', ...a]),
            set font(v) { calls.push(['font', v]); },
            set fillStyle(v) { calls.push(['fillStyle', v]); }
        });
        document.body.appendChild(canvas);

        await SYH_STATS_EXPORTER.renderChart({ data: [] }, null);

        assert.deepEqual(calls.find(c => c[0] === 'clearRect'), ['clearRect', 0, 0, 800, 400]);
        assert.deepEqual(
            calls.find(c => c[0] === 'fillText'),
            ['fillText', 'Немає даних для побудови графіка.', 20, 50]
        );
        assert.equal(SYH_STATS_EXPORTER.chartInstance, null);
    });

    test('23. відсутність todayData обробляється як порожні дані', async () => {
        const calls = [];
        const canvas = document.createElement('canvas');
        canvas.id = 'syhChartCanvas';
        canvas.getContext = () => ({
            clearRect: () => {},
            fillText: (...a) => calls.push(a),
            set font(_v) {},
            set fillStyle(_v) {}
        });
        document.body.appendChild(canvas);

        await SYH_STATS_EXPORTER.renderChart(null, null);
        await SYH_STATS_EXPORTER.renderChart(undefined, null);

        assert.equal(calls.length, 2);
    });

    test('24. із даними викликає buildChart і зберігає екземпляр у chartInstance', async () => {
        const canvas = document.createElement('canvas');
        canvas.id = 'syhChartCanvas';
        const fakeCtx = { marker: 'ctx' };
        canvas.getContext = () => fakeCtx;
        document.body.appendChild(canvas);

        const sentinel = { fake: 'chart' };
        const seen = [];
        const original = SYH_STATS_EXPORTER.buildChart;
        SYH_STATS_EXPORTER.buildChart = (ctx, chartData) => { seen.push({ ctx, chartData }); return sentinel; };

        try {
            await SYH_STATS_EXPORTER.renderChart(makeSession(), null);
        } finally {
            SYH_STATS_EXPORTER.buildChart = original;
        }

        assert.equal(seen.length, 1);
        assert.equal(seen[0].ctx, fakeCtx);
        assert.deepEqual(seen[0].chartData.labels, ['00:10', '00:40', '01:10']);
        assert.equal(SYH_STATS_EXPORTER.chartInstance, sentinel);
    });

    test('25. loadChartJs завжди резолвиться в true (Chart.js вбудований у бандл)', async () => {
        assert.equal(await SYH_STATS_EXPORTER.loadChartJs(), true);
    });
});

describe('SYH_STATS_EXPORTER — exportCSV', () => {
    beforeEach(() => { document.body.innerHTML = ''; });
    afterEach(() => { document.body.innerHTML = ''; });

    test('26. формує CSV з BOM, заголовком і рядками, та клікає посилання', () => {
        const anchors = captureAnchors();
        try {
            SYH_STATS_EXPORTER.exportCSV(makeSession(), '2026-08-10', 'Brand');
        } finally {
            anchors.restore();
        }

        const link = anchors.created[0].el;
        assert.equal(link.getAttribute('download'), 'StreamStats_Brand_2026-08-10.csv');

        const href = decodeURI(link.getAttribute('href'));
        assert.ok(href.startsWith('data:text/csv;charset=utf-8,\uFEFFЧас Ефіру,Глядачі'));
        assert.ok(href.includes('00:10,100'));
        assert.ok(href.includes('00:40,200'));
        assert.ok(href.includes('01:10,150'));

        assert.ok(anchors.created.some(a => a.clicked), 'посилання має бути клікнуте');
        assert.equal(document.body.contains(link), false, 'тимчасове посилання прибирається з DOM');
    });

    test('27. null/без data не створює жодного посилання', () => {
        const anchors = captureAnchors();
        try {
            SYH_STATS_EXPORTER.exportCSV(null, '2026-08-10', 'Brand');
            SYH_STATS_EXPORTER.exportCSV({}, '2026-08-10', 'Brand');
        } finally {
            anchors.restore();
        }

        assert.equal(anchors.created.length, 0);
    });
});

describe('SYH_STATS_EXPORTER — exportPresentation', () => {
    beforeEach(() => { document.body.innerHTML = ''; });
    afterEach(() => { document.body.innerHTML = ''; });

    test('28. генерує HTML-презентацію з обома слайдами та коректним іменем файлу', async () => {
        const anchors = captureAnchors();
        const originalCreate = URL.createObjectURL;
        const originalRevoke = URL.revokeObjectURL;
        let blob = null;
        URL.createObjectURL = (b) => { blob = b; return 'blob:mock-url'; };
        URL.revokeObjectURL = () => {};

        try {
            SYH_STATS_EXPORTER.exportPresentation(makeSession(), '2026-08-10', 'Brand');
        } finally {
            anchors.restore();
            URL.createObjectURL = originalCreate;
            URL.revokeObjectURL = originalRevoke;
        }

        const link = anchors.created[0].el;
        assert.equal(link.download, 'Presentation_Brand_2026-08-10.html');
        assert.equal(link.href, 'blob:mock-url');
        assert.ok(anchors.created.some(a => a.clicked));

        assert.ok(blob, 'має бути створений Blob');
        assert.equal(blob.type, 'text/html');

        const html = await blob.text();
        assert.ok(html.includes('<title>Аналітика ефіру - Brand</title>'));
        assert.ok(html.includes('📊 Загальна статистика: Brand'));
        assert.ok(html.includes('📑 Розподіл по блоках (Фази)'));
        assert.ok(html.includes('Дата: <b>2026-08-10</b>'));
        assert.ok(html.includes('<b>80</b>'), 'початкова кількість глядачів у банері');
        assert.equal((html.match(/class="slide"/g) || []).length, 2);
    });

    test('29. без даних нічого не завантажує', () => {
        const anchors = captureAnchors();
        let createdUrl = 0;
        const originalCreate = URL.createObjectURL;
        URL.createObjectURL = () => { createdUrl++; return 'blob:x'; };

        try {
            SYH_STATS_EXPORTER.exportPresentation(null, '2026-08-10', 'Brand');
            SYH_STATS_EXPORTER.exportPresentation({ data: [] }, '2026-08-10', 'Brand');
        } finally {
            anchors.restore();
            URL.createObjectURL = originalCreate;
        }

        assert.equal(anchors.created.length, 0);
        assert.equal(createdUrl, 0);
    });
});

describe('SYH_STATS_EXPORTER — getReportStats / getSummaryData', () => {
    test('30. повертають null для null, відсутнього data та порожнього масиву', () => {
        for (const bad of [null, {}, { data: [] }]) {
            assert.equal(SYH_STATS_EXPORTER.getReportStats(bad), null);
            assert.equal(SYH_STATS_EXPORTER.getSummaryData(bad), null);
        }
    });

    test('31. getSummaryData дзеркалить п’ять полів getReportStats', () => {
        const session = makeSession();
        const report = SYH_STATS_EXPORTER.getReportStats(session);
        const summary = SYH_STATS_EXPORTER.getSummaryData(session);

        assert.deepEqual(Object.keys(summary).sort(), ['initialViewers', 'overall', 'st1', 'st2', 'st3']);
        assert.deepEqual(summary.overall, report.overall);
        assert.deepEqual(summary.st1, report.st1);
        assert.deepEqual(summary.st2, report.st2);
        assert.deepEqual(summary.st3, report.st3);
        assert.equal(summary.initialViewers, report.initialViewers);
    });

    test('32. initial_viewers за відсутності береться з першої точки', () => {
        const stats = SYH_STATS_EXPORTER.getReportStats({
            data: [{ time: '00:01', viewers: 42 }, { time: '00:02', viewers: 7 }]
        });

        assert.equal(stats.initialViewers, 42);
    });
});

describe('SYH_STATS_EXPORTER — exportSlidePng & renderModalSummaryTable', () => {
    beforeEach(() => { document.body.innerHTML = ''; });
    afterEach(() => { document.body.innerHTML = ''; });

    test('33. renderModalSummaryTable коректно генерує розмітку з 4 метриками для всіх блоків', () => {
        const session = makeSession();
        const report = SYH_STATS_EXPORTER.getReportStats(session);
        const html = renderModalSummaryTable(report);

        assert.ok(html.includes('📖 Суботня школа'));
        assert.ok(html.includes('❓ Питання'));
        assert.ok(html.includes('🙏 Молитви'));
        assert.ok(html.includes('🌐 Загалом за ефір'));
        assert.ok(html.includes('Мінімум'));
        assert.ok(html.includes('Максимум (Пік)'));
        assert.ok(html.includes('Медіана'));
        assert.ok(html.includes('Середнє'));
    });

    test('34. renderModalSummaryTable повертає повідомлення-заглушку при null', () => {
        const html = renderModalSummaryTable(null);
        assert.ok(html.includes('Немає розширених даних за цю дату'));
    });

    test('35. exportSlidePng формує файл з розширенням .png і правильним ім’ям', async () => {
        const anchors = captureAnchors();
        const originalCreate = URL.createObjectURL;
        const originalRevoke = URL.revokeObjectURL;
        let createdBlob = null;
        URL.createObjectURL = (b) => { createdBlob = b; return 'blob:mock-png-url'; };
        URL.revokeObjectURL = () => {};

        try {
            await SYH_STATS_EXPORTER.exportSlidePng(makeSession(), '2026-08-10', 'Brand');
        } finally {
            anchors.restore();
            URL.createObjectURL = originalCreate;
            URL.revokeObjectURL = originalRevoke;
        }

        const link = anchors.created[0]?.el;
        assert.ok(link, 'посилання для скачування слайда має бути створено');
        assert.equal(link.download, 'Slide_Stats_Brand_2026-08-10.png');
        assert.equal(link.href, 'blob:mock-png-url');
        assert.ok(createdBlob, 'має бути сформовано Blob для зображення');
    });

    test('36. клік по syh-dl-slide-btn викликає exportSlidePng', async () => {
        seedCharts('Brand', { [TODAY]: makeSession() });

        let called = false;
        const originalExport = SYH_STATS_EXPORTER.exportSlidePng;
        SYH_STATS_EXPORTER.exportSlidePng = async () => { called = true; };

        try {
            SYH_STATS_EXPORTER.showModal('Brand');
            await SYH_STATS_EXPORTER.loadChartData('Brand');
            document.getElementById('syh-dl-slide-btn').onclick();
        } finally {
            SYH_STATS_EXPORTER.exportSlidePng = originalExport;
        }

        assert.equal(called, true, 'кнопка має викликати exportSlidePng');
    });
});
