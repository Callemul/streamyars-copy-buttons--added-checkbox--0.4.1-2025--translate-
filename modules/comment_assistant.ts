import { SYH_CONFIG } from './config';
import type { SelectorValue } from './config';

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

export class CommentAssistantService implements CommentAssistantInterface {
    public triggerWords: string[];
    public triggerWordsQuestion: string[];
    public triggerWordsPrayer: string[];
    public selectors: Record<string, SelectorValue>;
    private regexCache: Map<string, RegExp> = new Map();

    constructor(config = SYH_CONFIG) {
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

    public escapeHTML(str: string): string {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
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

    public highlightTriggers(text: string): { highlightedText: string; matchedWords: string[]; matchedCategories: string[] } {
        if (!text) return { highlightedText: '', matchedWords: [], matchedCategories: [] };
        
        let safeHTML = this.escapeHTML(text);
        const matchedWords: string[] = [];
        const matchedCategories: string[] = [];

        const lowerPrayerWords = (this.triggerWordsPrayer || []).map(w => w.toLowerCase());
        const lowerQuestionWords = (this.triggerWordsQuestion || []).map(w => w.toLowerCase());

        this.triggerWords.forEach(word => {
            const rx = this.createTriggerRegExp(word);
            const lowerWord = word.toLowerCase();
            const isPrayer = lowerPrayerWords.includes(lowerWord);
            const isQuestion = lowerQuestionWords.includes(lowerWord);
            const categoryClass = isPrayer ? 'syh-trigger-prayer' : (isQuestion ? 'syh-trigger-question' : '');
            
            safeHTML = safeHTML.replace(rx, (match, p1, p2, p3) => {
                const isFallback = typeof p2 === 'string';
                const targetWord = isFallback ? p2 : (p1 || match);
                
                if (!matchedWords.includes(lowerWord)) {
                    matchedWords.push(lowerWord);
                }
                const cat = isPrayer ? 'prayer' : (isQuestion ? 'question' : 'other');
                if (!matchedCategories.includes(cat)) {
                    matchedCategories.push(cat);
                }
                const markClasses = `syh-trigger-highlight ${categoryClass}`.trim();
                const replacement = `<mark class="${markClasses}" data-syh-trigger="${this.escapeHTML(lowerWord)}">${targetWord}</mark>`;
                
                if (isFallback) {
                    return `${p1}${replacement}${p3}`;
                }
                return replacement;
            });
        });

        return { highlightedText: safeHTML, matchedWords, matchedCategories };
    }

    public stripHighlights(text: string): string {
        if (!text) return '';
        return text.replace(/<mark class="syh-trigger-highlight[^"]*"[^>]*>(.*?)<\/mark>/gi, '$1');
    }

    public findTextNode(commentBlock: HTMLElement | Element): Element | null {
        const commentTextSelector = this.selectors.commentText;
        if (typeof commentTextSelector === 'string') {
            return commentBlock.querySelector(commentTextSelector);
        }
        for (const sel of commentTextSelector) {
            const textNode = commentBlock.querySelector(sel);
            if (textNode) return textNode;
        }
        return null;
    }

    public getOriginalText(textNode: Element): string {
        let originalText = textNode.getAttribute('data-syh-original-text');
        if (originalText === null) {
            originalText = textNode.textContent || '';
            textNode.setAttribute('data-syh-original-text', originalText);
        }
        return originalText;
    }

    private applyHighlight(commentBlock: HTMLElement | Element, textNode: Element, originalText: string): boolean {
        const { highlightedText, matchedWords, matchedCategories } = this.highlightTriggers(originalText);
        if (textNode.innerHTML !== highlightedText) {
            textNode.innerHTML = highlightedText;
        }
        if (textNode.hasAttribute('is-empty')) {
            textNode.removeAttribute('is-empty');
        }
        const primaryCategory = matchedCategories.includes('prayer')
            ? 'prayer'
            : (matchedCategories.includes('question') ? 'question' : matchedWords.join(','));
        commentBlock.setAttribute('data-syh-triggered', primaryCategory);
        return true;
    }

    private removeHighlight(commentBlock: HTMLElement | Element, textNode: Element, originalText: string): boolean {
        if (textNode.querySelector('mark.syh-trigger-highlight')) {
            textNode.textContent = originalText;
        }
        commentBlock.removeAttribute('data-syh-triggered');
        return false;
    }

    public processComment(commentBlock: HTMLElement | Element): boolean {
        if (!commentBlock) return false;

        const textNode = this.findTextNode(commentBlock);
        if (!textNode) return false;

        const originalText = this.getOriginalText(textNode);

        return this.hasTrigger(originalText)
            ? this.applyHighlight(commentBlock, textNode, originalText)
            : this.removeHighlight(commentBlock, textNode, originalText);
    }

    public processAllComments() {
        if (typeof document === 'undefined') return;
        const selector = this.selectors.commentBlock;
        let comments: NodeListOf<Element>;
        if (typeof selector === 'string') {
            comments = document.querySelectorAll(selector);
        } else {
            const selectors = selector.join(',');
            comments = document.querySelectorAll(selectors);
        }
        comments.forEach(block => this.processComment(block));
    }
}

export const SYH_COMMENT_ASSISTANT = new CommentAssistantService();
