import type { SelectorValue } from '../config';

export interface CommentAssistantInterface {
    triggerWords: string[];
    triggerWordsQuestion?: string[];
    triggerWordsPrayer?: string[];
    selectors: Record<string, SelectorValue>;
    init(config?: any): void;
    escapeHTML(str: string): string;
    createTriggerRegExp(word: string): RegExp;
    hasTrigger(text: string): boolean;
    highlightTriggers(text: string): { highlightedText: string; matchedWords: string[]; matchedCategories?: string[] };
    stripHighlights(text: string): string;
    findTextNode(commentBlock: HTMLElement | Element): Element | null;
    getOriginalText(textNode: Element): string;
    processComment(commentBlock: HTMLElement | Element): boolean;
    processAllComments(): void;
}