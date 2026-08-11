/**
 * StreamYard Helper — читання назви бренда з `localStorage`.
 *
 * Винесено з `modules/stats_tracker.ts`, де `getBrandFromLocalStorage()` була
 * найскладнішою функцією модуля (cyclomatic 11 / cognitive 15 за `fallow health`)
 * через потрійну вкладеність try → for → try/if-else.
 *
 * Поведінка збережена 1-в-1, включно з текстами `console.warn`
 * (див. `tests/stats_tracker_api.test.js`, кейси 21–28).
 */

/** Ключі, під якими StreamYard тримає активний бренд. Порядок = пріоритет. */
const BRAND_STORAGE_KEYS = ['streamyard_brand', 'sy_active_brand', 'brand_state'];

/** Розбирає JSON-значення ключа; зіпсований JSON не перериває перебір. */
function parseBrandJson(rawValue: string): { name?: unknown } | null {
    try {
        return JSON.parse(rawValue);
    } catch {
        console.warn("[SYH StatsTracker] Corrupted JSON in localStorage key:");
        return null;
    }
}

/**
 * Дістає назву бренда з одного значення `localStorage`.
 * JSON-об'єкт → поле `name`; звичайний рядок → він сам (трімнутий).
 * Порожній рядок означає «у цьому ключі бренда немає».
 */
function readBrandFromValue(rawValue: string): string {
    if (rawValue.startsWith('{')) {
        const parsed = parseBrandJson(rawValue);
        if (parsed?.name && typeof parsed.name === 'string') return parsed.name;
        return '';
    }
    return rawValue.trim().length > 0 ? rawValue.trim() : '';
}

/**
 * Рекурсивний сканер для автоматичного пошуку активного бренда в сховищі
 * без кліку по вкладці. Повертає порожній рядок, якщо бренд не знайдено
 * або `localStorage` недоступний.
 */
export function readBrandFromLocalStorage(): string {
    try {
        for (const key of BRAND_STORAGE_KEYS) {
            const rawValue = localStorage.getItem(key);
            if (!rawValue) continue;

            const brand = readBrandFromValue(rawValue);
            if (brand) return brand;
        }
    } catch (e) {
        console.warn("[SYH] Помилка зчитування бренда з localStorage:", e);
    }
    return "";
}
