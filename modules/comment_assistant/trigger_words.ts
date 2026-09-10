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

import { SYH_CONFIG, type SelectorValue } from '../config';

const DEFAULT_TRIGGER_WORDS_QUESTION: readonly string[] = [
    'вопрос', 'питання', 'вопросы', 'вопросик', 'вопросом'
];

const DEFAULT_TRIGGER_WORDS_PRAYER: readonly string[] = [
    'молитва', 'молитвенная', 'прошение', 'помолитесь', 'молитись', 'моліться', 'просьба'
];

/**
 * Копія (а не посилання) — той самий принцип, що й для списків слів вище.
 * `noUncheckedIndexedAccess` типує читання з `Record<string, SelectorValue>`
 * як `SelectorValue | undefined`, хоча `commentBlock`/`commentText` завжди
 * задані буквально в `SYH_CONFIG.SELECTORS` (це не рантайм-інваріант, який
 * можна порушити, а факт літералу об'єкта) — тому `?? ''` тут недосяжний.
 */
function cloneSelectorValue(value: SelectorValue | undefined): SelectorValue {
    if (!value) return '';
    return Array.isArray(value) ? [...value] : value;
}

/**
 * Дефолтні селектори, коли конструктору не передали `config.SELECTORS`
 * узагалі (реальний прод-шлях завжди передає `SYH_CONFIG` — див.
 * `CommentAssistantService`). Значення беруться з реєстру `modules/config.ts`,
 * а не дублюються рядком, щоб не розходитись з ним.
 */
function buildDefaultTriggerSelectors(): Readonly<Record<string, SelectorValue>> {
    return {
        commentBlock: cloneSelectorValue(SYH_CONFIG.SELECTORS.commentBlock),
        commentText: cloneSelectorValue(SYH_CONFIG.SELECTORS.commentText)
    };
}

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
    return (config?.SELECTORS as Record<string, SelectorValue>) || buildDefaultTriggerSelectors();
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
