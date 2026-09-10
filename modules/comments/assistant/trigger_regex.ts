/**
 * Trigger regular-expression construction and caching.
 *
 * Виділено з `trigger_manager.ts`. Побудова регулярки для тригерного слова —
 * найтонше місце модуля, тож воно тепер ізольоване:
 *
 *   - слово екранується, щоб спецсимволи читались літерально (`c++`);
 *   - основний шаблон використовує юнікодні межі слова через lookbehind/lookahead,
 *     тож «вопрос» не підсвічується всередині «вопросник»;
 *   - якщо рушій не підтримує lookbehind, є запасний шаблон із трьома групами
 *     захоплення (`TriggerHighlighter` розрізняє ці дві форми за наявністю p2).
 *
 * Кеш обов'язковий не лише заради швидкодії: регулярки глобальні (`g`), тому
 * після збігу в них лишається `lastIndex`. Повернення з кешу СКИДАЄ `lastIndex`
 * у 0 — без цього повторний `hasTrigger()` на тому самому тексті давав би
 * помилковий `false`.
 */

function buildTriggerRegExp(word: string): RegExp {
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
        return new RegExp(`(?<![\\p{L}\\p{N}])(${escapedWord})(?![\\p{L}\\p{N}])`, 'giu');
    } catch {
        return new RegExp(
            `(^|[^a-zA-Z0-9а-яА-ЯёЁіІїЇєЄґҐ])(${escapedWord})($|[^a-zA-Z0-9а-яА-ЯёЁіІїЇєЄґҐ])`,
            'gi'
        );
    }
}

export class TriggerRegexCache {
    private cache: Map<string, RegExp> = new Map();

    /**
     * Регулярка для слова. Ключ кешу — слово в нижньому регістрі (самі регулярки
     * і так побудовані з прапорцем `i`), тож «Вопрос» і «вопрос» ділять інстанс.
     */
    public get(word: string): RegExp {
        const lowerWord = word.toLowerCase();
        const cached = this.cache.get(lowerWord);
        if (cached) {
            cached.lastIndex = 0;
            return cached;
        }

        const rx = buildTriggerRegExp(word);
        this.cache.set(lowerWord, rx);
        return rx;
    }

    public clear(): void {
        this.cache.clear();
    }
}
