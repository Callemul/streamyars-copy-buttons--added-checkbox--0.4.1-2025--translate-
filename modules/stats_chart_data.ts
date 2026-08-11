/**
 * StreamYard Helper — підготовка даних і побудова графіка Chart.js.
 *
 * Виділено з `stats_exporter.ts`: тут живе все, що знає про формат Chart.js,
 * і нічого — про сховище, модальне вікно чи експорт файлів.
 */

import { Chart } from 'chart.js/auto';
import { parseTimeToSeconds } from './stats_math';
import type { StreamChartSession, ChartRenderData } from './stats_types';

/** Колір лінії глядачів і її заливки. */
const VIEWERS_LINE_COLOR = '#3498db';
const VIEWERS_FILL_COLOR = 'rgba(52, 152, 219, 0.2)';

/** Кольори вертикальних роздільників фаз. */
const PHASE_QUESTIONS_COLOR = '#f39c12';
const PHASE_PRAYERS_COLOR = '#28a745';

/**
 * Плагін Chart.js, що малює вертикальну лінію-роздільник фази.
 *
 * Позицію обирає як найближчу за часом мітку серед `labels` (через
 * `parseTimeToSeconds`): `value` (час натискання кнопки фази) має довільні
 * секунди, а вибірки графіка дискретизовано раз на 60 с, тому строгий збіг
 * рядків майже ніколи не спрацьовував би і лінія не малювалася.
 */
export function createPhaseLinePlugin(
    label: string,
    value: string,
    color: string,
    labels: string[]
): any {
    return {
        id: label,
        beforeDraw: (chart: any) => {
            if (!labels || labels.length === 0) return;

            const targetSec = parseTimeToSeconds(value);
            let bestIndex = 0;
            let bestDiff = Infinity;
            labels.forEach((lbl, i) => {
                const diff = Math.abs(parseTimeToSeconds(lbl) - targetSec);
                if (diff < bestDiff) {
                    bestDiff = diff;
                    bestIndex = i;
                }
            });
            if (bestDiff === Infinity) return;

            const x = chart.scales.x.getPixelForTick(bestIndex);
            const yAxis = chart.scales.y;
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
    };
}

/** Збирає labels, datasets і плагіни-роздільники фаз для одного ефіру. */
export function prepareChartData(todayData: StreamChartSession): ChartRenderData {
    const labels = todayData.data.map(item => item.time);

    const datasets = [{
        label: 'Глядачі',
        data: todayData.data.map(item => item.viewers),
        borderColor: VIEWERS_LINE_COLOR,
        backgroundColor: VIEWERS_FILL_COLOR,
        fill: true,
        tension: 0.3
    }];

    const plugins: any[] = [];
    if (todayData.phase_questions_start) {
        plugins.push(createPhaseLinePlugin('Питання', todayData.phase_questions_start, PHASE_QUESTIONS_COLOR, labels));
    }
    if (todayData.phase_prayers_start) {
        plugins.push(createPhaseLinePlugin('Молитви', todayData.phase_prayers_start, PHASE_PRAYERS_COLOR, labels));
    }

    return { labels, datasets, plugins };
}

/** Створює екземпляр лінійного графіка Chart.js у переданому контексті. */
export function buildChart(ctx: CanvasRenderingContext2D, chartData: ChartRenderData): any {
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
}

/** Малює текст-заглушку, коли за сьогодні немає жодної точки вимірювання. */
export function drawNoDataPlaceholder(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, 800, 400);
    ctx.font = '16px Arial';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Немає даних для побудови графіка.', 20, 50);
}
