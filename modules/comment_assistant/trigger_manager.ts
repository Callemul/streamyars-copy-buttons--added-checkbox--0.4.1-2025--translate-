import type { SelectorValue } from '../config';

export class TriggerManager {
    public triggerWords: string[];
    public triggerWordsQuestion: string[];
    public triggerWordsPrayer: string[];
    public selectors: Record<string, SelectorValue>;
    private regexCache: Map<string, RegExp> = new Map();

    constructor(config: any = {}) {
        this.triggerWordsQuestion = config?.TRIGGER_WORDS_QUESTION || ['вопрос', 'питання', 'вопросы', 'вопросик', 'вопросом'];
        this.triggerWordsPrayer = config?.TRIGGER_WORDS_PRAYER || ['молитва', 'молитвенная', 'прошение', 'помолитесь', 'молитись', 'моліться', 'просьба'];
        this.triggerWords = config?.TRIGGER_WORDS || [...this.triggerWordsQuestion, ...this.triggerWordsPrayer];
        this.selectors = (config?.SELECTORS as Record<string, SelectorValue>) || {
            commentBlock: '[class*="PlatformComment__Wrap"]',
            commentText: '[class*="PlatformCommentShell__ContentSpan"]'
        };
    }

    public init(config?: any) {
        if (config?.TRIGGER_WORDS_QUESTION) {
            this.triggerWordsQuestion = config.TRIGGER_WORDS_QUESTION;
        }
        if (config?.TRIGGER_WORDS_PRAYER) {
            this.triggerWordsPrayer = config.TRIGGER_WORDS_PRAYER;
        }
        if (config?.TRIGGER_WORDS) {
            this.triggerWords = config.TRIGGER_WORDS;
        } else if (config?.TRIGGER_WORDS_QUESTION || config?.TRIGGER_WORDS_PRAYER) {
            this.triggerWords = [...this.triggerWordsQuestion, ...this.triggerWordsPrayer];
        }
        this.regexCache.clear();
        if (config?.SELECTORS) {
            this.selectors = config.SELECTORS;
        }
    }

    public createTriggerRegExp(word: string): RegExp {
        const lowerWord = word.toLowerCase();
        if (this.regexCache.has(lowerWord)) {
            const cached = this.regexCache.get(lowerWord)!;
            cached.lastIndex = 0;
            return cached;
        }

        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let rx: RegExp;
        try {
            rx = new RegExp(`(?<![\\p{L}\\p{N}])(${escapedWord})(?![\\p{L}\\p{N}])`, 'giu');
        } catch {
            rx = new RegExp(`(^|[^a-zA-Z0-9а-яА-ЯёЁіІїЇєЄґҐ])(${escapedWord})($|[^a-zA-Z0-9а-яА-ЯёЁіІїЇєЄґҐ])`, 'gi');
        }
        this.regexCache.set(lowerWord, rx);
        return rx;
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
    ): { categoryClass: string; categoryName: string } {
        const isPrayer = lowerPrayerWords.includes(lowerWord);
        const isQuestion = lowerQuestionWords.includes(lowerWord);
        return {
            categoryClass: isPrayer ? 'syh-trigger-prayer' : (isQuestion ? 'syh-trigger-question' : ''),
            categoryName: isPrayer ? 'prayer' : (isQuestion ? 'question' : 'other')
        };
    }
}