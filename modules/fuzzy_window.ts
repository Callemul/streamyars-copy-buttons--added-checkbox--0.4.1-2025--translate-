// modules/fuzzy_window.ts
//
// Стратегія «ковзного вікна», винесена з `fuzzy_match.fuzzyIncludes`
// (CRAP-хотспот за звітом Fallow: cyclomatic 13, cognitive 20 — три вкладені
// цикли з чотирма умовами виходу в одному тілі).
//
// Тут зібрано лише геометрію пошуку (які підрядки перевіряти і з яким
// бюджетом помилок). Сама метрика відстані лишається у `fuzzy_match.ts`,
// що робить обидві частини незалежно тестованими.
//
// ⚠️ Семантика збережена 1-в-1: ті самі межі вікон (±3), той самий
// `Math.max(1, ceil(len * ratio))` і той самий порядок обходу.

/** Наскільки вікно може бути коротшим/довшим за сам запит. */
const WINDOW_DELTA = 3;

/**
 * Максимально допустима відстань Левенштейна для запиту заданої довжини.
 * Завжди щонайменше 1 — навіть за `ratio = 0` одна помилка пробачається
 * (зафіксовано тестом №10).
 */
export function maxAllowedDistance(needleLength: number, maxErrorRatio: number): number {
    return Math.max(1, Math.ceil(needleLength * maxErrorRatio));
}

/**
 * Довжини вікон, які перевіряються для запиту заданої довжини:
 * від `len - 3` до `len + 3`, з відкиданням недодатних значень.
 * Порядок зростання зберігає порядок обходу оригіналу.
 */
export function buildWindowSizes(needleLength: number): number[] {
    const sizes: number[] = [];
    for (let delta = -WINDOW_DELTA; delta <= WINDOW_DELTA; delta++) {
        const size = needleLength + delta;
        if (size > 0) sizes.push(size);
    }
    return sizes;
}

/**
 * Чи існує у `haystack` вікно, віддалене від `needle` не більше ніж на `maxDist`.
 *
 * Обхід: зовнішній цикл — стартова позиція, внутрішній — довжина вікна;
 * вікна, що виходять за межі рядка, пропускаються. Повертає `true` на
 * першому ж збігу (ранній вихід збережено з оригіналу).
 *
 * @param distance функція відстані між двома рядками (інжектується, щоб
 *                 модуль не залежав від конкретної метрики)
 */
export function hasApproximateWindow(
    haystack: string,
    needle: string,
    maxDist: number,
    distance: (a: string, b: string) => number
): boolean {
    const windowSizes = buildWindowSizes(needle.length);

    for (let start = 0; start <= haystack.length; start++) {
        for (const winLen of windowSizes) {
            if (start + winLen > haystack.length) continue;

            const window = haystack.slice(start, start + winLen);
            if (window.length === 0) continue;

            if (distance(window, needle) <= maxDist) return true;
        }
    }

    return false;
}
