/**
 * Trigger word-list configuration rules.
 *
 * Виділено з `trigger_manager.ts`: чисті правила того, ЯК конфіг перетворюється
 * на три списки слів. Жодного DOM і жодного стану — лише детерміновані функції,
 * які легко перевірити.
 *
 * Семантика збережена 1-в-1 з попередньою реалізацією, включно з двома
 * неочевидними деталями:
 *   1. Дефолтні списки віддаються КОПІЯМИ, тому два `TriggerManager` ніколи не
 *      ділять один масив (мутація одного не протікає в інший).
 *   2. Списки, передані через конфіг, беруться ЗА ПОСИЛАННЯМ — саме так
 *      поводився старий код, і на це може спиратися гаряче перезавантаження
 *      конфігу.
 */

import type { SelectorValue } from '../config';

const DEFAULT_TRIGGER_WORDS_QUESTION: readonly string[] = [
    'вопрос', 'питання', 'вопросы', 'вопросик', 'вопросом'
];

const DEFAULT_TRIGGER_WORDS_PRAYER: readonly string[] = [
    'молитва', 'молитвенная', 'прошение', 'помолитесь', 'молитись', 'моліться', 'просьба'
];

const DEFAULT_TRIGGER_SELECTORS: Readonly<Record<string, SelectorValue>> = {
    commentBlock: '[class*="PlatformComment__Wrap"]',
    commentText: '[class*="PlatformCommentShell__ContentSpan"]'
};

export interface TriggerWordSet {
    triggerWords: string[];
    triggerWordsQuestion: string[];
    triggerWordsPrayer: string[];
}

/** Початкові списки слів для конструктора. */
export function resolveInitialTriggerWords(config: any): TriggerWordSet {
    const triggerWordsQuestion = config?.TRIGGER_WORDS_QUESTION || [...DEFAULT_TRIGGER_WORDS_QUESTION];
    const triggerWordsPrayer = config?.TRIGGER_WORDS_PRAYER || [...DEFAULT_TRIGGER_WORDS_PRAYER];
    const triggerWords = config?.TRIGGER_WORDS || [...triggerWordsQuestion, ...triggerWordsPrayer];
    return { triggerWords, triggerWordsQuestion, triggerWordsPrayer };
}

/** Початкові селектори для конструктора. */
export function resolveInitialSelectors(config: any): Record<string, SelectorValue> {
    return (config?.SELECTORS as Record<string, SelectorValue>) || { ...DEFAULT_TRIGGER_SELECTORS };
}

/**
 * Часткове оновлення списків через `init()`.
 *
 * Пріоритет: явний `TRIGGER_WORDS` завжди виграє; інакше — якщо прийшов хоча б
 * один із тематичних списків, зведений список перераховується; якщо не прийшло
 * нічого, поточний зведений список лишається недоторканим.
 */
export function applyTriggerWordsUpdate(current: TriggerWordSet, config: any): TriggerWordSet {
    const triggerWordsQuestion = config?.TRIGGER_WORDS_QUESTION || current.triggerWordsQuestion;
    const triggerWordsPrayer = config?.TRIGGER_WORDS_PRAYER || current.triggerWordsPrayer;

    let triggerWords = current.triggerWords;
    if (config?.TRIGGER_WORDS) {
        triggerWords = config.TRIGGER_WORDS;
    } else if (config?.TRIGGER_WORDS_QUESTION || config?.TRIGGER_WORDS_PRAYER) {
        triggerWords = [...triggerWordsQuestion, ...triggerWordsPrayer];
    }

    return { triggerWords, triggerWordsQuestion, triggerWordsPrayer };
}
