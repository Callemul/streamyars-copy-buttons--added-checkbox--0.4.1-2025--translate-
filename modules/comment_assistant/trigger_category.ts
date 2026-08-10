/**
 * Trigger category resolution.
 *
 * Виділено з `trigger_manager.ts`. Єдина відповідальність: за словом у нижньому
 * регістрі визначити тематику збігу та відповідний CSS-клас підсвітки.
 *
 * Пріоритет `prayer` над `question` — навмисний: слово, що присутнє в обох
 * списках (наприклад «просьба»), трактується як молитовне.
 */

export interface TriggerCategory {
    categoryClass: string;
    categoryName: string;
}

export function resolveTriggerCategory(
    lowerWord: string,
    lowerPrayerWords: string[],
    lowerQuestionWords: string[]
): TriggerCategory {
    const isPrayer = lowerPrayerWords.includes(lowerWord);
    const isQuestion = lowerQuestionWords.includes(lowerWord);
    return {
        categoryClass: isPrayer ? 'syh-trigger-prayer' : (isQuestion ? 'syh-trigger-question' : ''),
        categoryName: isPrayer ? 'prayer' : (isQuestion ? 'question' : 'other')
    };
}
