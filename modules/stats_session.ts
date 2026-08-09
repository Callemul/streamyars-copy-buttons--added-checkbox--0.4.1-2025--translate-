/**
 * StreamYard Helper - Stats pure helpers
 * Винесено з `stats_tracker.ts`, щоб ізолювати чисту, детерміновану логіку
 * (робота з сесією статистики за день та пошук назви бренда в об'єкті)
 * від станful-оркестратора `SYH_STATS_TRACKER`. Знижує CRAP `stats_tracker.ts`
 * і робить ці функції незалежно тестованими без DOM/таймерів.
 */

/**
 * Повертає (створюючи за потреби) сесію статистики для бренда за вказану дату.
 * Мутує `db` in-place, створюючи вкладені структури, якщо їх немає.
 */
export function getOrCreateTodaySession(db: Record<string, any>, brand: string, today: string): any {
    if (!db[brand]) db[brand] = {};
    if (!db[brand][today]) db[brand][today] = { data: [] };
    return db[brand][today];
}

/**
 * Рекурсивний (поверхневий) сканер для автоматичного пошуку активного бренда
 * в довільному об'єкті стану без кліку по вкладці.
 */
export function searchBrandNameInObject(obj: any): string | null {
    if (!obj || typeof obj !== 'object') return null;
    return obj?.activeBrand?.name || obj?.brand?.name || null;
}
