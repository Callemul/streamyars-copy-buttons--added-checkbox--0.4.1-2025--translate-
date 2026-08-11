/**
 * StreamYard Helper — «розумний» пошук по тексту.
 *
 * Винесено з `modules/utils.ts` (`smartSearch` мав найбільшу когнітивну вагу
 * серед текстових методів фасада: 5 перетворень цілі + 4 перетворення на слово).
 *
 * Ключова вимога сумісності: перетворення НЕ імпортуються напряму, а приходять
 * через `ops`. Фасад передає сюди `this`, тому підміна `SYH_UTILS.normalizeText`
 * та решти методів споживачем і далі впливає на результат пошуку — так само,
 * як у вихідному коді (`this.normalizeText(...)` всередині `smartSearch`).
 */

/** Набір текстових перетворень, від яких залежить пошук (пізнє зв'язування). */
export interface SmartSearchTextOps {
    normalizeText(str: string | null | undefined): string;
    transliterate(str: string | null | undefined): string;
    switchKeyboardLayout(str: string | null | undefined): string;
    toFuzzy(str: string | null | undefined): string;
}

/**
 * Чи міститься `query` в `targetText` з урахуванням кирилиця/латиниця,
 * помилкової розкладки та «нечіткого» написання.
 *
 * Семантика: порожній запит — завжди збіг; порожня ціль — завжди не збіг;
 * решта — AND по всіх словах запиту (порядок слів не важливий).
 */
export function smartSearch(
    query: string | null | undefined,
    targetText: string | null | undefined,
    ops: SmartSearchTextOps
): boolean {
    if (!query) return true;
    if (!targetText) return false;

    const rawTarget = targetText.toLowerCase();
    const normTarget = ops.normalizeText(rawTarget);
    const transTarget = ops.transliterate(rawTarget);
    const layoutTarget = ops.switchKeyboardLayout(rawTarget);
    const fuzzyTarget = ops.toFuzzy(rawTarget);
    const fuzzyTransTarget = ops.toFuzzy(transTarget);

    const fullTarget = `${normTarget} ${transTarget} ${layoutTarget} ${fuzzyTarget} ${fuzzyTransTarget}`;
    const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);

    return queryWords.every(word => matchesWord(word, fullTarget, ops));
}

/** Одне слово запиту проти вже зібраного «розширеного» подання цілі. */
function matchesWord(word: string, fullTarget: string, ops: SmartSearchTextOps): boolean {
    const normWord = ops.normalizeText(word);
    if (fullTarget.includes(normWord)) return true;

    const transWord = ops.transliterate(word);
    if (fullTarget.includes(transWord)) return true;

    const layoutWord = ops.switchKeyboardLayout(word);
    if (fullTarget.includes(layoutWord)) return true;

    const fuzzyWord = ops.toFuzzy(word);
    return !!fuzzyWord && fullTarget.includes(fuzzyWord);
}
