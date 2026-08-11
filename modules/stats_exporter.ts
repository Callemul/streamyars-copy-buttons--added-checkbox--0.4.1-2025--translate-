/**
 * StreamYard Helper — фасад аналітики ефіру (`SYH_STATS_EXPORTER`).
 *
 * Тонкий делегат зі 100% зворотно сумісним публічним API. Реалізація розкладена
 * по доменах:
 *   - `stats_types`             — форма даних;
 *   - `stats_math`              — чисті обчислення (мін/макс/медіана, фази);
 *   - `stats_chart_data`        — підготовка й побудова графіка Chart.js;
 *   - `stats_report_templates`  — Markdown/HTML-звіти та презентація;
 *   - `stats_downloads`         — вивантаження CSV і HTML-файлів;
 *   - `stats_modal`             — модальне вікно і прив'язка керування.
 *
 * Диспетчеризація через `this` збережена свідомо: підміна будь-якого методу на
 * об'єкті (наприклад `renderChart` у тестах) має впливати на решту ланцюга —
 * саме так поводився оригінальний монолітний модуль.
 */

import { calcStats, parseTimeToSeconds, computePhaseStats } from './stats_math';
import { prepareChartData, buildChart, drawNoDataPlaceholder } from './stats_chart_data';
import { renderSummaryMarkdown, renderSummaryHtml } from './stats_report_templates';
import { downloadSessionCsv, downloadPresentation } from './stats_downloads';
import { openStatsModal, loadStatsChartData } from './stats_modal';
import type {
    StreamChartSession,
    StatsSummary,
    PhaseStatsReport,
    ChartRenderData
} from './stats_types';

export type {
    ViewerDataPoint,
    StreamChartSession,
    StatsSummary,
    PhaseStatsReport,
    ChartRenderData
} from './stats_types';

export interface SyhStatsExporter {
    chartInstance: any;
    _chartLoadingPromise?: Promise<boolean>;

    showModal(currentBrand: string): void;
    /**
     * Історично інтерфейс оголошував `void`, хоча реалізація завжди була `async`.
     * Тип приведено до фактичної поведінки, щоб виклики можна було дочікувати.
     */
    loadChartData(currentBrand: string): Promise<void>;
    loadChartJs(): Promise<boolean>;
    prepareChartData(todayData: StreamChartSession): ChartRenderData;
    buildChart(ctx: CanvasRenderingContext2D, chartData: ChartRenderData): any;
    renderChart(todayData?: StreamChartSession | null, pastData?: StreamChartSession | null): Promise<void>;
    exportCSV(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): void;
    calcStats(arr: number[]): StatsSummary;
    parseTimeToSeconds(t?: string): number;
    getReportStats(dataObj: StreamChartSession | null): PhaseStatsReport | null;
    getSummaryData(dataObj: StreamChartSession | null): PhaseStatsReport | null;
    calculatePhaseStats(dataObj: StreamChartSession): PhaseStatsReport;
    exportPresentation(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): void;
    formatSummaryMarkdown(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): string;
    formatSummaryHTML(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): string;
}

export const SYH_STATS_EXPORTER: SyhStatsExporter = {
    chartInstance: null,

    // --- Модальне вікно -----------------------------------------------------

    showModal: function(currentBrand: string): void {
        openStatsModal(this, currentBrand);
    },

    loadChartData: async function(currentBrand: string): Promise<void> {
        await loadStatsChartData(this, currentBrand);
    },

    // --- Графік -------------------------------------------------------------

    /** Chart.js входить у бандл, тож окреме підвантаження більше не потрібне. */
    loadChartJs: async function(): Promise<boolean> {
        return true;
    },

    prepareChartData: function(todayData: StreamChartSession): ChartRenderData {
        return prepareChartData(todayData);
    },

    buildChart: function(ctx: CanvasRenderingContext2D, chartData: ChartRenderData): any {
        return buildChart(ctx, chartData);
    },

    renderChart: async function(
        todayData?: StreamChartSession | null,
        _pastData?: StreamChartSession | null
    ): Promise<void> {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }

        const canvas = document.getElementById('syhChartCanvas') as HTMLCanvasElement | null;
        if (!canvas) return;

        if (!todayData || !todayData.data || todayData.data.length === 0) {
            const emptyCtx = canvas.getContext('2d');
            if (emptyCtx) drawNoDataPlaceholder(emptyCtx);
            return;
        }

        const loaded = await this.loadChartJs();
        if (!loaded) {
            console.warn('[SYH] Chart.js недоступний.');
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        this.chartInstance = this.buildChart(ctx, this.prepareChartData(todayData));
    },

    // --- Обчислення ---------------------------------------------------------

    calcStats: function(arr: number[]): StatsSummary {
        return calcStats(arr);
    },

    parseTimeToSeconds: function(t?: string): number {
        return parseTimeToSeconds(t);
    },

    calculatePhaseStats: function(dataObj: StreamChartSession): PhaseStatsReport {
        return computePhaseStats(dataObj, {
            calcStats: (arr) => this.calcStats(arr),
            parseTimeToSeconds: (t) => this.parseTimeToSeconds(t)
        });
    },

    getReportStats: function(dataObj: StreamChartSession | null): PhaseStatsReport | null {
        if (!dataObj || !dataObj.data || dataObj.data.length === 0) return null;
        return this.calculatePhaseStats(dataObj);
    },

    getSummaryData: function(dataObj: StreamChartSession | null): PhaseStatsReport | null {
        const stats = this.getReportStats(dataObj);
        return stats ? {
            overall: stats.overall,
            initialViewers: stats.initialViewers,
            st1: stats.st1,
            st2: stats.st2,
            st3: stats.st3
        } : null;
    },

    // --- Звіти й експорт ----------------------------------------------------

    formatSummaryMarkdown: function(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): string {
        const report = this.getSummaryData(dataObj);
        if (!report) return '';
        return renderSummaryMarkdown(report, dateStr, currentBrand);
    },

    formatSummaryHTML: function(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): string {
        const report = this.getSummaryData(dataObj);
        if (!report) return '';
        return renderSummaryHtml(report, dateStr, currentBrand);
    },

    exportCSV: function(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): void {
        downloadSessionCsv(dataObj, dateStr, currentBrand);
    },

    exportPresentation: function(dataObj: StreamChartSession | null, dateStr: string, currentBrand: string): void {
        const report = this.getReportStats(dataObj);
        if (!report) return;
        downloadPresentation(report, dateStr, currentBrand);
    }
};
