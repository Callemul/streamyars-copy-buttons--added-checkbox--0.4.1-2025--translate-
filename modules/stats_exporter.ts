import { SYH_STORAGE } from './storage.ts';

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
    renderChart(todayData?: StreamChartSession | null, pastData?: StreamChartSession | null): Promise<void>;
    exportCSV(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): void;
    calcStats(arr: number[]): StatsSummary;
    exportPresentation(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): void;
}

declare const Chart: any;

export const SYH_STATS_EXPORTER: SyhStatsExporter = {
    chartInstance: null,

    // Головний метод виклику модального вікна
    showModal: function(currentBrand: string): void {
        if (document.getElementById('syh-chart-modal')) return;

        const modalHtml = `
            <div id="syh-chart-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 999999; display: flex; align-items: center; justify-content: center;">
                <div style="background: #1B1F29; border-radius: 12px; width: 900px; max-width: 95vw; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); color: white;">
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="margin: 0; font-size: 20px;">📈 Аналітика: <span style="color: #005DF7;">${currentBrand}</span></h2>
                        <button id="syh-close-chart" title="Закрити" aria-label="Закрити вікно аналітики" style="background: none; border: none; color: #aaa; font-size: 24px; cursor: pointer; padding: 0 10px;">&times;</button>
                    </div>

                    <div style="display: flex; gap: 10px; margin-bottom: 20px; align-items: center;">
                        <label style="font-size: 14px; color: #ccc;" for="syh-compare-select">Порівняти з:</label>
                        <select id="syh-compare-select" aria-label="Виберіть дату для порівняння аналітики" style="padding: 6px; border-radius: 4px; background: #2A303C; color: white; border: 1px solid #4F5461; outline: none; cursor: pointer;">
                            <option value="none">--- Ні ---</option>
                        </select>
                        <button id="syh-dl-csv-btn" aria-label="Завантажити аналітику у форматі CSV" style="background: #4F5461; color: white; border: none; border-radius: 4px; padding: 6px 15px; cursor: pointer; font-weight: bold; margin-left: auto;">CSV</button>
                        <button id="syh-dl-pres-btn" aria-label="Завантажити презентацію аналітики в HTML" style="background: #005DF7; color: white; border: none; border-radius: 4px; padding: 6px 15px; cursor: pointer; font-weight: bold;">📄 Презентація (HTML)</button>
                    </div>

                    <div style="position: relative; height: 400px; width: 100%;">
                        <canvas id="syhChartCanvas"></canvas>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const closeBtn = document.getElementById('syh-close-chart');
        if (closeBtn) {
            closeBtn.onclick = () => {
                const modal = document.getElementById('syh-chart-modal');
                if (modal) modal.remove();
                if (this.chartInstance) {
                    this.chartInstance.destroy();
                    this.chartInstance = null;
                }
            };
        }

        this.loadChartData(currentBrand);
    },

    loadChartData: function(currentBrand: string): void {
        const self = this;
        const today = (window as any).SYH_UTILS && typeof (window as any).SYH_UTILS.getTodayDateString === 'function'
            ? (window as any).SYH_UTILS.getTodayDateString()
            : new Date().toLocaleDateString('sv-SE');

        // ФІКС: Використовуємо захищений адаптер замість сирого chrome.storage
        const storage = SYH_STORAGE || ((window as any).SYH_UTILS && (window as any).SYH_UTILS.storage ? (window as any).SYH_UTILS.storage : null);
        
        if (storage) {
            storage.get(['syh_stream_charts'], function(result: any) {
                const db = (result && result.syh_stream_charts) ? result.syh_stream_charts : {};
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
                        self.renderChart(brandData[today], pastData);
                    };
                }

                self.renderChart(brandData[today], null);

                const csvBtn = document.getElementById('syh-dl-csv-btn');
                if (csvBtn) {
                    csvBtn.onclick = () => self.exportCSV(brandData[today], today, currentBrand);
                }

                const presBtn = document.getElementById('syh-dl-pres-btn');
                if (presBtn) {
                    presBtn.onclick = () => self.exportPresentation(brandData[today], today, currentBrand);
                }
            });
        }
    },

    loadChartJs: async function(): Promise<boolean> {
        if (typeof Chart !== 'undefined') return true;
        if (this._chartLoadingPromise) return this._chartLoadingPromise;

        this._chartLoadingPromise = (async () => {
            if (typeof Chart !== 'undefined') return true;
            try {
                const url = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) 
                    ? chrome.runtime.getURL('lib/chart.js') 
                    : 'lib/chart.js';
                const response = await fetch(url);
                const scriptText = await response.text();
                (0, eval)(scriptText);
                return typeof Chart !== 'undefined';
            } catch (err) {
                console.error("[SYH] Помилка завантаження Chart.js:", err);
                return false;
            }
        })();

        return this._chartLoadingPromise;
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

        this.chartInstance = new Chart(ctx, {
            data: { labels: labels, datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { ticks: { color: '#ccc' } },
                    y: { type: 'linear', display: true, position: 'left', ticks: { color: '#ccc' } }
                }
            },
            plugins: plugins
        });
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

    exportPresentation: function(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): void {
        if (!dataObj || !dataObj.data || dataObj.data.length === 0) return;

        const allViewers = dataObj.data.map(d => d.viewers);
        const overall = this.calcStats(allViewers);
        const initialViewers = dataObj.initial_viewers || allViewers[0] || 0;

        let p1: number[] = [], p2: number[] = [], p3: number[] = [];
        let tQ = dataObj.phase_questions_start || "99:99:99";
        let tP = dataObj.phase_prayers_start || "99:99:99";

        const toSec = (t?: string): number => {
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
        };

        dataObj.data.forEach(d => {
            const sTime = toSec(d.time);
            const sQ = toSec(tQ);
            const sP = toSec(tP);

            if (sTime < sQ) p1.push(d.viewers);
            else if (sTime >= sQ && sTime < sP) p2.push(d.viewers);
            else p3.push(d.viewers);
        });

        const st1 = this.calcStats(p1);
        const st2 = this.calcStats(p2);
        const st3 = this.calcStats(p3);

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

if (typeof window !== 'undefined') {
    (window as any).SYH_STATS_EXPORTER = SYH_STATS_EXPORTER;
}
