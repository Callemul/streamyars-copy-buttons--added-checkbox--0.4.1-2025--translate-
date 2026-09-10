/**
 * StreamYard Helper — модальне вікно аналітики ефіру.
 *
 * Відповідає за розмітку оверлея, життєвий цикл (Escape / клік по підкладці /
 * хрестик) і за прив'язку кнопок експорту до даних із `chrome.storage`.
 * Виділено з `stats_exporter.ts`.
 */

import { SYH_STORAGE, STORAGE_KEYS } from '../storage';
import { SYH_UTILS } from '../utils';
import { escapeHtml } from '../escape_html';
import type { StreamChartSession, PhaseStatsReport } from './stats_types';

/**
 * Мінімальний контракт фасада, потрібний модальному вікну.
 *
 * Оголошений локально (а не імпортований із `stats_exporter`), щоб між
 * модулями не виникло циклу імпортів. `SYH_STATS_EXPORTER` задовольняє його
 * структурно, і будь-яка підміна методу на фасаді лишається видимою тут —
 * саме так працював оригінальний `this`-диспатч.
 */
export interface StatsModalHost {
    chartInstance: any;
    loadChartData(currentBrand: string): void;
    renderChart(todayData?: StreamChartSession | null, pastData?: StreamChartSession | null): Promise<void> | void;
    exportCSV(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): void;
    exportPresentation(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): void;
    exportSlidePng?(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): Promise<void> | void;
    getReportStats?(dataObj: StreamChartSession | null): PhaseStatsReport | null;
    formatSummaryMarkdown(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): string;
    formatSummaryHTML(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): string;
}

export const STATS_MODAL_ID = 'syh-chart-modal';

/** Розмітка оверлея аналітики. */
export function buildStatsModalMarkup(currentBrand: string): string {
    return `
            <div id="${STATS_MODAL_ID}" class="syh-chart-modal-overlay">
                <div class="syh-chart-modal-container">
                    
                    <div class="syh-chart-modal-header">
                        <h2 class="syh-chart-modal-title">📈 Аналітика: <span class="syh-chart-brand-name">${escapeHtml(currentBrand)}</span></h2>
                        <button id="syh-close-chart" title="Закрити" aria-label="Закрити вікно аналітики" class="syh-chart-modal-close">&times;</button>
                    </div>

                    <div class="syh-chart-controls-row">
                        <label class="syh-chart-label" for="syh-compare-select">Порівняти з:</label>
                        <select id="syh-compare-select" aria-label="Виберіть дату для порівняння аналітики" class="syh-chart-select">
                            <option value="none">--- Ні ---</option>
                        </select>
                        <button id="syh-dl-csv-btn" aria-label="Завантажити аналітику у форматі CSV" class="syh-chart-btn-csv">CSV</button>
                        <button id="syh-dl-slide-btn" aria-label="Завантажити слайд аналітики у PNG" class="syh-chart-btn-slide">🖼️ Слайд (PNG)</button>
                        <button id="syh-dl-pres-btn" aria-label="Завантажити презентацію аналітики в HTML" class="syh-chart-btn-pres">📄 Презентація (HTML)</button>
                        <button id="syh-copy-md-btn" aria-label="Копіювати звіт у форматі Markdown" class="syh-chart-btn-copy">📋 MD</button>
                        <button id="syh-copy-html-btn" aria-label="Копіювати звіт у форматі HTML" class="syh-chart-btn-copy">📋 HTML</button>
                    </div>

                    <div class="syh-chart-canvas-wrapper">
                        <canvas id="syhChartCanvas"></canvas>
                    </div>

                    <div id="syh-stats-summary-container" class="syh-stats-summary-container"></div>
                </div>
            </div>
        `;
}

/** Навішує три способи закриття вікна: хрестик, Escape і клік по підкладці. */
function bindModalDismissal(host: StatsModalHost): void {
    const closeModal = () => {
        const modal = document.getElementById(STATS_MODAL_ID);
        if (modal) modal.remove();
        if (host.chartInstance) {
            host.chartInstance.destroy();
            host.chartInstance = null;
        }
        document.removeEventListener('keydown', handleKeyDown);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    };

    document.addEventListener('keydown', handleKeyDown);

    const modalElement = document.getElementById(STATS_MODAL_ID);
    if (modalElement) {
        modalElement.addEventListener('click', (e: MouseEvent) => {
            if (e.target === modalElement) {
                closeModal();
            }
        });
    }

    const closeBtn = document.getElementById('syh-close-chart');
    if (closeBtn) {
        closeBtn.onclick = () => closeModal();
    }
}

/** Показує вікно аналітики (повторний виклик — no-op) і запускає завантаження даних. */
export function openStatsModal(host: StatsModalHost, currentBrand: string): void {
    if (document.getElementById(STATS_MODAL_ID)) return;

    document.body.insertAdjacentHTML('beforeend', buildStatsModalMarkup(currentBrand));
    bindModalDismissal(host);

    host.loadChartData(currentBrand);
}

/** Читає базу графіків із `chrome.storage` і повертає зріз по одному бренду. */
async function readBrandSessions(currentBrand: string): Promise<Record<string, StreamChartSession>> {
    const result = await SYH_STORAGE.getAsync([STORAGE_KEYS.STATS_CHARTS]);
    const db = result?.[STORAGE_KEYS.STATS_CHARTS] || {};
    return db[currentBrand] || {};
}

/** Відмальовує HTML-таблицю фаз для модального вікна. */
export function renderModalSummaryTable(report: PhaseStatsReport | null): string {
    if (!report) {
        return '<div class="syh-stats-no-data">Немає розширених даних за цю дату</div>';
    }

    const phases = [
        { name: '📖 Суботня школа', data: report.st1, isTotal: false },
        { name: '❓ Питання', data: report.st2, isTotal: false },
        { name: '🙏 Молитви', data: report.st3, isTotal: false },
        { name: '🌐 Загалом за ефір', data: report.overall, isTotal: true }
    ];

    const rows = phases.map(p => `
        <tr class="${p.isTotal ? 'syh-stats-total-row' : ''}">
            <td><strong>${p.name}</strong></td>
            <td>${p.data.min}</td>
            <td class="syh-stats-val-max">${p.data.max}</td>
            <td>${p.data.median}</td>
            <td class="syh-stats-val-avg">${p.data.avg}</td>
        </tr>
    `).join('');

    return `
        <div class="syh-stats-table-wrapper">
            <table class="syh-stats-table">
                <thead>
                    <tr>
                        <th>Блок (Фаза)</th>
                        <th>Мінімум</th>
                        <th>Максимум (Пік)</th>
                        <th>Медіана</th>
                        <th>Середнє</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

/** Оновлює вміст контейнера зведеної таблиці у модальному вікні. */
function updateModalSummary(host: StatsModalHost, dataObj?: StreamChartSession | null): void {
    const summaryContainer = document.getElementById('syh-stats-summary-container');
    if (!summaryContainer) return;
    if (typeof host.getReportStats === 'function') {
        const report = host.getReportStats(dataObj ?? null);
        summaryContainer.innerHTML = renderModalSummaryTable(report);
    }
}

/** Заповнює селект порівняння датами й вішає слухач зміни вибору. */
function populateCompareSelect(
    select: HTMLSelectElement,
    brandData: Record<string, StreamChartSession>,
    today: string,
    host: StatsModalHost
): void {
    const dates = Object.keys(brandData).filter(d => d !== today).sort().reverse();

    dates.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.innerText = d;
        select.appendChild(opt);
    });

    select.onchange = (e: Event) => {
        const pastDate = (e.target as HTMLSelectElement).value;
        const pastData = pastDate !== 'none' ? brandData[pastDate] : null;
        host.renderChart(brandData[today], pastData);
        updateModalSummary(host, pastData || brandData[today]);
    };
}

/** Вішає обробник на кнопку, якщо вона присутня в DOM. */
function bindButton(id: string, handler: () => void): void {
    const btn = document.getElementById(id);
    if (btn) {
        (btn as HTMLElement & { onclick: (() => void) | null }).onclick = handler;
    }
}

/** Прив'язує кнопки CSV / слайда / презентації / копіювання MD і HTML до даних за сьогодні. */
function bindExportButtons(
    host: StatsModalHost,
    todayData: StreamChartSession | undefined,
    today: string,
    currentBrand: string
): void {
    bindButton('syh-dl-csv-btn', () => host.exportCSV(todayData ?? null, today, currentBrand));
    bindButton('syh-dl-slide-btn', () => host.exportSlidePng?.(todayData ?? null, today, currentBrand));
    bindButton('syh-dl-pres-btn', () => host.exportPresentation(todayData ?? null, today, currentBrand));

    bindButton('syh-copy-md-btn', () => {
        const md = host.formatSummaryMarkdown(todayData ?? null, today, currentBrand);
        if (md) {
            SYH_UTILS.copyAndShowBanner(md, 'Markdown звіт скопійовано!');
        }
    });

    bindButton('syh-copy-html-btn', () => {
        const html = host.formatSummaryHTML(todayData ?? null, today, currentBrand);
        if (html) {
            SYH_UTILS.copyAndShowBanner(html, 'HTML звіт скопійовано!');
        }
    });
}

/** Завантажує дані бренду, малює графік за сьогодні й прив'язує керування вікна. */
export async function loadStatsChartData(host: StatsModalHost, currentBrand: string): Promise<void> {
    const today = SYH_UTILS.getTodayDateString();
    const brandData = await readBrandSessions(currentBrand);

    const select = document.getElementById('syh-compare-select') as HTMLSelectElement | null;
    if (select) {
        populateCompareSelect(select, brandData, today, host);
    }

    host.renderChart(brandData[today], null);
    updateModalSummary(host, brandData[today]);

    bindExportButtons(host, brandData[today], today, currentBrand);
}
