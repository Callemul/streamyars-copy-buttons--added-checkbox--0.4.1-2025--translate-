/**
 * StreamYard Helper — типи доменів аналітики ефіру.
 *
 * Єдине джерело правди для форми даних, якими обмінюються збирач статистики
 * (`stats_tracker`), математика фаз (`stats_math`), побудова графіка
 * (`stats_chart_data`), шаблони звітів (`stats_report_templates`) і
 * вивантаження файлів (`stats_downloads`).
 */

/** Одна точка вимірювання: час на таймері ефіру + кількість глядачів. */
export interface ViewerDataPoint {
    time: string;
    viewers: number;
}

/** Сесія одного ефіру за конкретну дату. */
export interface StreamChartSession {
    data: ViewerDataPoint[];
    phase_questions_start?: string;
    phase_prayers_start?: string;
    initial_viewers?: number;
}

/** Зведення по вибірці глядачів. */
export interface StatsSummary {
    min: number;
    max: number;
    avg: number;
    median: number;
}

/**
 * Повний звіт по ефіру: загальні показники + розбивка по трьох фазах
 * (st1 — до початку питань, st2 — питання, st3 — молитви).
 */
export interface PhaseStatsReport {
    overall: StatsSummary;
    initialViewers: number;
    st1: StatsSummary;
    st2: StatsSummary;
    st3: StatsSummary;
}

/** Готові дані для передачі в Chart.js. */
export interface ChartRenderData {
    labels: string[];
    datasets: any[];
    plugins: any[];
}
