// modules/fuzzy_match.ts

/**
 * Стандартна реалізація відстані Левенштейна (Dynamic Programming)
 */
export function levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const row = new Array<number>(b.length + 1);
    for (let j = 0; j <= b.length; j++) row[j] = j;

    for (let i = 1; i <= a.length; i++) {
        let prev = row[0];
        row[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const temp = row[j];
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
            prev = temp;
        }
    }
    return row[b.length];
}

/**
 * Нормалізація рядка: нижній регістр, схлопування пробілів, trim
 */
export function normalize(s: string): string {
    if (!s) return '';
    return s
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Пошук підрядка needle у haystack з урахуванням помилок (опечаток)
 */
export function fuzzyIncludes(haystack: string, needle: string, maxErrorRatio = 0.25): boolean {
    if (!haystack || !needle) return false;
    const h = normalize(haystack);
    const n = normalize(needle);
    if (!h || !n) return false;

    // Швидка перевірка на точний збіг підрядка
    if (h.includes(n)) return true;

    const maxDist = Math.max(1, Math.ceil(n.length * maxErrorRatio));
    
    const windowSizes: number[] = [];
    for (let delta = -3; delta <= 3; delta++) {
        const sz = n.length + delta;
        if (sz > 0) windowSizes.push(sz);
    }

    for (let i = 0; i <= h.length; i++) {
        for (const winLen of windowSizes) {
            if (i + winLen > h.length) continue;
            const window = h.slice(i, i + winLen);
            if (window.length === 0) continue;
            if (levenshtein(window, n) <= maxDist) return true;
        }
    }

    return false;
}

// Pure ESM exports without window global pollution
