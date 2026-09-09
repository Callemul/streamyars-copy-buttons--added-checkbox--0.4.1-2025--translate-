/**
 * StreamYard Helper — чиста математика статистики ефіру.
 *
 * Жодного DOM, сховища чи Chart.js: лише обчислення над масивами чисел
 * і часовими мітками таймера StreamYard. Виділено з `stats_exporter.ts`.
 */

import type { StatsSummary, StreamChartSession, PhaseStatsReport } from './stats_types';

/** Порожнє зведення — використовується для порожніх вибірок. */
const EMPTY_SUMMARY: StatsSummary = { min: 0, max: 0, avg: 0, median: 0 };

/**
 * Мін/макс/середнє/медіана по вибірці. Середнє і медіана округлюються до цілого,
 * бо кількість глядачів — завжди ціле число.
 */
export function calcStats(arr: number[]): StatsSummary {
    if (!arr || arr.length === 0) return { ...EMPTY_SUMMARY };

    const sum = arr.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / arr.length);
    const max = Math.max(...arr);
    const min = Math.min(...arr);
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    // `sorted` непорожній (перевірено вище), а `mid` і `mid - 1` завжди в межах,
    // тож фолбеки `?? 0` тут недосяжні.
    const midValue = sorted[mid] ?? 0;
    const beforeMid = sorted[mid - 1] ?? 0;
    const median = sorted.length % 2 !== 0
        ? midValue
        : Math.round((beforeMid + midValue) / 2);

    return { min, max, avg, median };
}

/**
 * Перетворює мітку таймера у секунди. Приймає "SS", "MM:SS" і "HH:MM:SS",
 * ігнорує пробіли, а нечислові сегменти рахує як 0.
 */
export function parseTimeToSeconds(t?: string): number {
    if (!t || typeof t !== 'string') return 0;

    const clean = t.replace(/\s/g, '');
    if (!clean) return 0;

    const parsedParts = clean.split(':').map(part => {
        const parsed = parseInt(part, 10);
        return isNaN(parsed) ? 0 : parsed;
    });

    let sec = 0;
    parsedParts.reverse().forEach((val, i) => {
        sec += val * Math.pow(60, i);
    });

    return sec;
}

/**
 * Залежності, які `computePhaseStats` бере ззовні, щоб фасад `SYH_STATS_EXPORTER`
 * міг і далі диспетчеризувати через `this` (та лишатись підмінюваним у тестах).
 */
export interface PhaseStatsDeps {
    calcStats(arr: number[]): StatsSummary;
    parseTimeToSeconds(t?: string): number;
}

/** Мітка-«нескінченність»: фаза, якої не було, ніколи не настає. */
const NEVER_TIME = '99:99:99';

/**
 * Розкладає точки сесії на три фази за мітками початку питань і молитов,
 * і рахує зведення для кожної фази та для ефіру загалом.
 */
export function computePhaseStats(
    dataObj: StreamChartSession,
    deps: PhaseStatsDeps
): PhaseStatsReport {
    const points = dataObj?.data || [];
    const allViewers = points.map(d => d.viewers);
    const overall = deps.calcStats(allViewers);
    const initialViewers = dataObj?.initial_viewers || allViewers[0] || 0;

    const questionsStart = deps.parseTimeToSeconds(dataObj?.phase_questions_start || NEVER_TIME);
    const prayersStart = deps.parseTimeToSeconds(dataObj?.phase_prayers_start || NEVER_TIME);

    const beforeQuestions: number[] = [];
    const duringQuestions: number[] = [];
    const duringPrayers: number[] = [];

    points.forEach(d => {
        const seconds = deps.parseTimeToSeconds(d.time);
        if (seconds < questionsStart) beforeQuestions.push(d.viewers);
        else if (seconds < prayersStart) duringQuestions.push(d.viewers);
        else duringPrayers.push(d.viewers);
    });

    return {
        overall,
        initialViewers,
        st1: deps.calcStats(beforeQuestions),
        st2: deps.calcStats(duringQuestions),
        st3: deps.calcStats(duringPrayers)
    };
}
