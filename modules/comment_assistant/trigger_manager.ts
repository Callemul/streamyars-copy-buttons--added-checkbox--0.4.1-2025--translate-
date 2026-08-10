/**
 * TriggerManager — тонкий оркестратор тригерних слів.
 *
 * Після рефакторингу клас лише тримає стан і делегує:
 *   - `trigger_words.ts`    — правила конфігурації списків слів і селекторів;
 *   - `trigger_regex.ts`    — побудова та кешування регулярок;
 *   - `trigger_category.ts` — визначення тематики збігу.
 *
 * Публічний контракт (властивості + чотири методи) не змінився: він зафіксований
 * у `tests/trigger_manager.test.js` і використовується `TriggerHighlighter`,
 * `CommentProcessor` та фасадом `CommentAssistantService`.
 */

import type { SelectorValue } from '../config';
import {
    resolveInitialTriggerWords,
    resolveInitialSelectors,
    applyTriggerWordsUpdate,
    type TriggerWordSet
} from './trigger_words';
import { TriggerRegexCache } from './trigger_regex';
import { resolveTriggerCategory, type TriggerCategory } from './trigger_category';

export class TriggerManager {
    public triggerWords: string[];
    public triggerWordsQuestion: string[];
    public triggerWordsPrayer: string[];
    public selectors: Record<string, SelectorValue>;
    private regexCache: TriggerRegexCache = new TriggerRegexCache();

    constructor(config: any = {}) {
        const words = resolveInitialTriggerWords(config);
        this.triggerWords = words.triggerWords;
        this.triggerWordsQuestion = words.triggerWordsQuestion;
        this.triggerWordsPrayer = words.triggerWordsPrayer;
        this.selectors = resolveInitialSelectors(config);
    }

    public init(config?: any) {
        const current: TriggerWordSet = {
            triggerWords: this.triggerWords,
            triggerWordsQuestion: this.triggerWordsQuestion,
            triggerWordsPrayer: this.triggerWordsPrayer
        };
        const next = applyTriggerWordsUpdate(current, config);
        this.triggerWords = next.triggerWords;
        this.triggerWordsQuestion = next.triggerWordsQuestion;
        this.triggerWordsPrayer = next.triggerWordsPrayer;

        this.regexCache.clear();

        if (config?.SELECTORS) {
            this.selectors = config.SELECTORS;
        }
    }

    public createTriggerRegExp(word: string): RegExp {
        return this.regexCache.get(word);
    }

    public hasTrigger(text: string): boolean {
        if (!text || !this.triggerWords || this.triggerWords.length === 0) return false;
        return this.triggerWords.some(word => {
            const rx = this.createTriggerRegExp(word);
            return rx.test(text);
        });
    }

    public resolveTriggerCategory(
        lowerWord: string,
        lowerPrayerWords: string[],
        lowerQuestionWords: string[]
    ): TriggerCategory {
        return resolveTriggerCategory(lowerWord, lowerPrayerWords, lowerQuestionWords);
    }
}
