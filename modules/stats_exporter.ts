import { SYH_STORAGE, STORAGE_KEYS } from './storage';
import { SYH_UTILS } from './utils';

export interface ViewerDataPoint {
    time: string;
    viewers: number;
}

export interface StreamChartSession {
    data: ViewerDataPoint[];
    phase_questions_start?: string;
    phase_prayers_start?: string;
    initial_viewers?: number;
}

export interface StatsSummary {
    min: number;
    max: number;
    avg: number;
    median: number;
}

export interface SyhStatsExporter {
    chartInstance: any;
    _chartLoadingPromise?: Promise<boolean>;

    showModal(currentBrand: string): void;
    loadChartData(currentBrand: string): void;
    loadChartJs(): Promise<boolean>;
    prepareChartData(todayData: StreamChartSession): { labels: string[]; datasets: any[]; plugins: any[] };
    buildChart(ctx: CanvasRenderingContext2D, chartData: { labels: string[]; datasets: any[]; plugins: any[] }): any;
    renderChart(todayData?: StreamChartSession | null, pastData?: StreamChartSession | null): Promise<void>;
    exportCSV(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): void;
    calcStats(arr: number[]): StatsSummary;
    parseTimeToSeconds(t?: string): number;
    getReportStats(dataObj: StreamChartSession | null): {
        overall: StatsSummary;
        initialViewers: number;
        st1: StatsSummary;
        st2: StatsSummary;
        st3: StatsSummary;
    } | null;
    calculatePhaseStats(dataObj: StreamChartSession): {
        overall: StatsSummary;
        initialViewers: number;
        st1: StatsSummary;
        st2: StatsSummary;
        st3: StatsSummary;
    };
    exportPresentation(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): void;
    formatSummaryMarkdown(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): string;
    formatSummaryHTML(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): string;
}

import { Chart } from 'chart.js/auto';

export const SYH_STATS_EXPORTER: SyhStatsExporter = {
    chartInstance: null,

    // Головний метод виклику модального вікна
    showModal: function(currentBrand: string): void {
        if (document.getElementById('syh-chart-modal')) return;

        const modalHtml = `
            <div id="syh-chart-modal" class="syh-chart-modal-overlay">
                <div class="syh-chart-modal-container">
                    
                    <div class="syh-chart-modal-header">
                        <h2 class="syh-chart-modal-title">📈 Аналітика: <span class="syh-chart-brand-name">${currentBrand}</span></h2>
                        <button id="syh-close-chart" title="Закрити" aria-label="Закрити вікно аналітики" class="syh-chart-modal-close">&times;</button>
                    </div>

                    <div class="syh-chart-controls-row">
                        <label class="syh-chart-label" for="syh-compare-select">Порівняти з:</label>
                        <select id="syh-compare-select" aria-label="Виберіть дату для порівняння аналітики" class="syh-chart-select">
                            <option value="none">--- Ні ---</option>
                        </select>
                        <button id="syh-dl-csv-btn" aria-label="Завантажити аналітику у форматі CSV" class="syh-chart-btn-csv">CSV</button>
                        <button id="syh-dl-pres-btn" aria-label="Завантажити презентацію аналітики в HTML" class="syh-chart-btn-pres">📄 Презентація (HTML)</button>
                        <button id="syh-copy-md-btn" aria-label="Копіювати звіт у форматі Markdown" class="syh-chart-btn-copy">📋 MD</button>
                        <button id="syh-copy-html-btn" aria-label="Копіювати звіт у форматі HTML" class="syh-chart-btn-copy">📋 HTML</button>
                    </div>

                    <div class="syh-chart-canvas-wrapper">
                        <canvas id="syhChartCanvas"></canvas>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const closeModal = () => {
            const modal = document.getElementById('syh-chart-modal');
            if (modal) modal.remove();
            if (this.chartInstance) {
                this.chartInstance.destroy();
                this.chartInstance = null;
            }
            document.removeEventListener('keydown', handleKeyDown);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        const modalElement = document.getElementById('syh-chart-modal');
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

        this.loadChartData(currentBrand);
    },

    loadChartData: async function(currentBrand: string): Promise<void> {
        const today = SYH_UTILS.getTodayDateString();

        const result = await SYH_STORAGE.getAsync<Record<string, any>>([STORAGE_KEYS.STATS_CHARTS]);
        const db = result?.[STORAGE_KEYS.STATS_CHARTS] || {};
        const brandData = db[currentBrand] || {};

        const select = document.getElementById('syh-compare-select') as HTMLSelectElement | null;
        const dates = Object.keys(brandData).filter(d => d !== today).sort().reverse();

        if (select) {
            dates.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d;
                opt.innerText = d;
                select.appendChild(opt);
            });

            select.onchange = (e: Event) => {
                const pastDate = (e.target as HTMLSelectElement).value;
                const pastData = pastDate !== 'none' ? brandData[pastDate] : null;
                this.renderChart(brandData[today], pastData);
            };
        }

        this.renderChart(brandData[today], null);

        const csvBtn = document.getElementById('syh-dl-csv-btn');
        if (csvBtn) {
            csvBtn.onclick = () => this.exportCSV(brandData[today], today, currentBrand);
        }

        const presBtn = document.getElementById('syh-dl-pres-btn');
        if (presBtn) {
            presBtn.onclick = () => this.exportPresentation(brandData[today], today, currentBrand);
        }

        const copyMDBtn = document.getElementById('syh-copy-md-btn');
        if (copyMDBtn) {
            copyMDBtn.onclick = () => {
                const md = this.formatSummaryMarkdown(brandData[today], today, currentBrand);
                if (md) {
                    SYH_UTILS.copyAndShowBanner(md, 'Markdown звіт скопійовано!');
                }
            };
        }

        const copyHTMLBtn = document.getElementById('syh-copy-html-btn');
        if (copyHTMLBtn) {
            copyHTMLBtn.onclick = () => {
                const html = this.formatSummaryHTML(brandData[today], today, currentBrand);
                if (html) {
                    SYH_UTILS.copyAndShowBanner(html, 'HTML звіт скопійовано!');
                }
            };
        }
    },

    loadChartJs: async function(): Promise<boolean> {
        return true;
    },

    prepareChartData: function(todayData: StreamChartSession): { labels: string[]; datasets: any[]; plugins: any[] } {
        const labels = todayData.data.map(item => item.time);
        const datasets = [{
            label: 'Глядачі',
            data: todayData.data.map(item => item.viewers),
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.2)',
            fill: true,
            tension: 0.3
        }];
        
        // Малювання ліній вертикальних фаз
        const plugins: any[] = [];
        const createLine = (label: string, value: string, color: string) => ({
            id: label,
            beforeDraw: (chart: any) => {
                const index = labels.indexOf(value);
                if (index === -1) return;
                const xAxis = chart.scales.x;
                const yAxis = chart.scales.y;
                const x = xAxis.getPixelForTick(index);
                const ctxCanvas = chart.ctx;
                ctxCanvas.save();
                ctxCanvas.beginPath();
                ctxCanvas.moveTo(x, yAxis.top);
                ctxCanvas.lineTo(x, yAxis.bottom);
                ctxCanvas.lineWidth = 2;
                ctxCanvas.strokeStyle = color;
                ctxCanvas.stroke();
                ctxCanvas.fillStyle = color;
                ctxCanvas.fillText(label, x + 5, yAxis.top + 15);
                ctxCanvas.restore();
            }
        });

        if (todayData.phase_questions_start) plugins.push(createLine('Питання', todayData.phase_questions_start, '#f39c12'));
        if (todayData.phase_prayers_start) plugins.push(createLine('Молитви', todayData.phase_prayers_start, '#28a745'));

        return { labels, datasets, plugins };
    },

    buildChart: function(ctx: CanvasRenderingContext2D, chartData: { labels: string[]; datasets: any[]; plugins: any[] }): any {
        return new Chart(ctx, {
            type: 'line',
            data: { labels: chartData.labels, datasets: chartData.datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { ticks: { color: '#ccc' } },
                    y: { type: 'linear', display: true, position: 'left', ticks: { color: '#ccc' } }
                }
            },
            plugins: chartData.plugins
        });
    },

    renderChart: async function(todayData?: StreamChartSession | null, _pastData?: StreamChartSession | null): Promise<void> {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }

        const canvas = document.getElementById('syhChartCanvas') as HTMLCanvasElement | null;
        if (!canvas) return;

        if (!todayData || !todayData.data || todayData.data.length === 0) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, 800, 400);
                ctx.font = "16px Arial";
                ctx.fillStyle = "#aaa";
                ctx.fillText("Немає даних для побудови графіка.", 20, 50);
            }
            return;
        }

        const loaded = await this.loadChartJs();
        if (!loaded || typeof Chart === 'undefined') {
            console.warn("[SYH] Chart.js недоступний.");
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const chartData = this.prepareChartData(todayData);
        this.chartInstance = this.buildChart(ctx, chartData);
    },

    exportCSV: function(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): void {
        if (!dataObj || !dataObj.data) return;
        let csv = "data:text/csv;charset=utf-8,\uFEFFЧас Ефіру,Глядачі\n";
        dataObj.data.forEach(row => csv += `${row.time},${row.viewers}\n`);
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csv));
        link.setAttribute("download", `StreamStats_${currentBrand}_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    calcStats: function(arr: number[]): StatsSummary {
        if (!arr || arr.length === 0) return { min: 0, max: 0, avg: 0, median: 0 };
        const sum = arr.reduce((a, b) => a + b, 0);
        const avg = Math.round(sum / arr.length);
        const max = Math.max(...arr);
        const min = Math.min(...arr);
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
        return { min, max, avg, median };
    },

    parseTimeToSeconds: function(t?: string): number {
        if (!t || typeof t !== 'string') return 0;
        const clean = t.replace(/\s/g, '');
        if (!clean) return 0;
        
        const parts = clean.split(':');
        let sec = 0;
        
        const parsedParts = parts.map(part => {
            const parsed = parseInt(part, 10);
            return isNaN(parsed) ? 0 : parsed;
        });
        
        parsedParts.reverse().forEach((val, i) => {
            sec += val * Math.pow(60, i);
        });
        
        return sec;
    },

    getReportStats: function(dataObj: StreamChartSession | null): {
        overall: StatsSummary;
        initialViewers: number;
        st1: StatsSummary;
        st2: StatsSummary;
        st3: StatsSummary;
    } | null {
        if (!dataObj || !dataObj.data || dataObj.data.length === 0) return null;
        return this.calculatePhaseStats(dataObj);
    },

    calculatePhaseStats: function(dataObj: StreamChartSession): {
        overall: StatsSummary;
        initialViewers: number;
        st1: StatsSummary;
        st2: StatsSummary;
        st3: StatsSummary;
    } {
        const allViewers = (dataObj?.data || []).map(d => d.viewers);
        const overall = this.calcStats(allViewers);
        const initialViewers = dataObj?.initial_viewers || allViewers[0] || 0;

        const p1: number[] = [], p2: number[] = [], p3: number[] = [];
        const tQ = dataObj?.phase_questions_start || "99:99:99";
        const tP = dataObj?.phase_prayers_start || "99:99:99";

        (dataObj?.data || []).forEach(d => {
            const sTime = this.parseTimeToSeconds(d.time);
            const sQ = this.parseTimeToSeconds(tQ);
            const sP = this.parseTimeToSeconds(tP);

            if (sTime < sQ) p1.push(d.viewers);
            else if (sTime >= sQ && sTime < sP) p2.push(d.viewers);
            else p3.push(d.viewers);
        });

        const st1 = this.calcStats(p1);
        const st2 = this.calcStats(p2);
        const st3 = this.calcStats(p3);

        return { overall, initialViewers, st1, st2, st3 };
    },

    formatSummaryMarkdown: function(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): string {
        const stats = this.getReportStats(dataObj);
        if (!stats) return "";

        const { overall, initialViewers, st1, st2, st3 } = stats;

        return `# 📊 Підсумкова аналітика ефіру: ${currentBrand}
**Дата:** ${dateStr}
**Глядачів на старті:** ${initialViewers}

## 📈 Загальні показники
- **Пік онлайн:** ${overall.max}
- **Середній онлайн:** ${overall.avg}
- **Медіана:** ${overall.median}
- **Мінімум:** ${overall.min}

## 📑 Розподіл по блоках (Фази)
| Фаза | Середній онлайн | Пік у фазі | Медіана |
| --- | --- | --- | --- |
| 📖 Суботня школа | ${st1.avg} | ${st1.max} | ${st1.median} |
| ❓ Питання | ${st2.avg} | ${st2.max} | ${st2.median} |
| 🙏 Молитви | ${st3.avg} | ${st3.max} | ${st3.median} |`;
    },

    formatSummaryHTML: function(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): string {
        const stats = this.getReportStats(dataObj);
        if (!stats) return "";

        const { overall, initialViewers, st1, st2, st3 } = stats;

        return `<div class="syh-summary-report">
  <h2>📊 Підсумкова аналітика ефіру: ${currentBrand}</h2>
  <p><strong>Дата:</strong> ${dateStr}</p>
  <p><strong>Глядачів на старті:</strong> ${initialViewers}</p>

  <h3>📈 Загальні показники</h3>
  <ul>
    <li><strong>Пік онлайн:</strong> ${overall.max}</li>
    <li><strong>Середній онлайн:</strong> ${overall.avg}</li>
    <li><strong>Медіана:</strong> ${overall.median}</li>
    <li><strong>Мінімум:</strong> ${overall.min}</li>
  </ul>

  <h3>📑 Розподіл по блоках (Фази)</h3>
  <table border="1" cellpadding="5" cellspacing="0">
    <thead>
      <tr>
        <th>Фаза</th>
        <th>Середній онлайн</th>
        <th>Пік у фазі</th>
        <th>Медіана</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>📖 Суботня школа</td>
        <td>${st1.avg}</td>
        <td>${st1.max}</td>
        <td>${st1.median}</td>
      </tr>
      <tr>
        <td>❓ Питання</td>
        <td>${st2.avg}</td>
        <td>${st2.max}</td>
        <td>${st2.median}</td>
      </tr>
      <tr>
        <td>🙏 Молитви</td>
        <td>${st3.avg}</td>
        <td>${st3.max}</td>
        <td>${st3.median}</td>
      </tr>
    </tbody>
  </table>
</div>`;
    },

    exportPresentation: function(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): void {
        const stats = this.getReportStats(dataObj);
        if (!stats) return;

        const { overall, initialViewers, st1, st2, st3 } = stats;

        const htmlTemplate = `
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <title>Аналітика ефіру - ${currentBrand}</title>
    <style>
        body { background: #e2e8f0; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 20px; gap: 20px; margin: 0; }
        .slide { width: 1000px; height: 562px; background: white; box-shadow: 0 5px 15px rgba(0,0,0,0.1); border-radius: 8px; padding: 40px; display: flex; flex-direction: column; box-sizing: border-box; }
        h1 { color: #005DF7; border-bottom: 2px solid #005DF7; padding-bottom: 10px; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 20px; }
        .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; text-align: center; border-radius: 8px; }
        .val { font-size: 36px; font-weight: bold; color: #005DF7; }
        .lab { font-size: 14px; color: #64748b; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 15px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 18px; }
        th { background: #005DF7; color: white; }
        .accent { color: #005DF7; font-weight: bold; }
    </style>
</head>
<body>
    <div class="slide">
        <h1>📊 Загальна статистика: ${currentBrand}</h1>
        <p>Дата: <b>${dateStr}</b></p>
        <div style="background: #fff3cd; border-left: 5px solid #ffc107; padding: 15px; font-size: 18px;">
            👀 Глядачів, які очікували на старті ефіру: <b>${initialViewers}</b>
        </div>
        <div class="grid">
            <div class="card"><div class="val">${overall.max}</div><div class="lab">Пік онлайн</div></div>
            <div class="card"><div class="val">${overall.avg}</div><div class="lab">Середнє</div></div>
            <div class="card"><div class="val">${overall.median}</div><div class="lab">Медіана</div></div>
            <div class="card"><div class="val">${overall.min}</div><div class="lab">Мінімум</div></div>
        </div>
    </div>

    <div class="slide">
        <h1>📑 Розподіл по блоках (Фази)</h1>
        <table>
            <tr>
                <th>Фаза</th>
                <th>Середній онлайн</th>
                <th>Пік у фазі</th>
                <th>Медіана</th>
            </tr>
            <tr>
                <td>📖 Субботняя школа</td>
                <td class="accent">${st1.avg ?? '-'}</td>
                <td>${st1.max ?? '-'}</td>
                <td>${st1.median ?? '-'}</td>
            </tr>
            <tr>
                <td>❓ Питання</td>
                <td class="accent">${st2.avg ?? '-'}</td>
                <td>${st2.max ?? '-'}</td>
                <td>${st2.median ?? '-'}</td>
            </tr>
            <tr>
                <td>🙏 Молитви</td>
                <td class="accent">${st3.avg ?? '-'}</td>
                <td>${st3.max ?? '-'}</td>
                <td>${st3.median ?? '-'}</td>
            </tr>
        </table>
    </div>
</body>
</html>`;

        const blob = new Blob([htmlTemplate], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Presentation_${currentBrand}_${dateStr}.html`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
};

// Pure ESM Module Export
