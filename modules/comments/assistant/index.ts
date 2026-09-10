import { TriggerManager } from './trigger_manager';
import { TriggerHighlighter } from './highlighter';
import { CommentProcessor } from './processor';
import type { CommentAssistantInterface } from './types';
import { SYH_CONFIG } from '../../registry/config';

export class CommentAssistantService implements CommentAssistantInterface {
    private triggerManager: TriggerManager;
    private highlighter: TriggerHighlighter;
    private processor: CommentProcessor;

    constructor(config = SYH_CONFIG) {
        this.triggerManager = new TriggerManager(config);
        this.highlighter = new TriggerHighlighter(this.triggerManager);
        this.processor = new CommentProcessor(this.triggerManager);
    }

    // Proxy properties
    get triggerWords(): string[] { return this.triggerManager.triggerWords; }
    get triggerWordsQuestion(): string[] { return this.triggerManager.triggerWordsQuestion; }
    get triggerWordsPrayer(): string[] { return this.triggerManager.triggerWordsPrayer; }
    get selectors(): Record<string, import('../../registry/config').SelectorValue> { return this.triggerManager.selectors; }

    public init(config?: any) {
        this.triggerManager.init(config);
    }

    public escapeHTML(str: string): string {
        return this.highlighter.escapeHTML(str);
    }

    public createTriggerRegExp(word: string): RegExp {
        return this.triggerManager.createTriggerRegExp(word);
    }

    public hasTrigger(text: string): boolean {
        return this.triggerManager.hasTrigger(text);
    }

    public highlightTriggers(text: string): { highlightedText: string; matchedWords: string[]; matchedCategories: string[] } {
        return this.highlighter.highlightTriggers(text);
    }

    public stripHighlights(text: string): string {
        return this.highlighter.stripHighlights(text);
    }

    public findTextNode(commentBlock: HTMLElement | Element): Element | null {
        return this.processor.findTextNode(commentBlock);
    }

    public getOriginalText(textNode: Element): string {
        return this.processor.getOriginalText(textNode);
    }

    public processComment(commentBlock: HTMLElement | Element): boolean {
        return this.processor.processComment(commentBlock);
    }

    public processAllComments() {
        this.processor.processAllComments();
    }
}

export const SYH_COMMENT_ASSISTANT = new CommentAssistantService();