import { SYH_CONFIG } from './config';
import type { SelectorValue } from './config';

export interface CommentAssistantInterface {
    triggerWords: string[];
    selectors: Record<string, SelectorValue>;
    init(config?: any): void;
    escapeHTML(str: string): string;
    createTriggerRegExp(word: string): RegExp;
    hasTrigger(text: string): boolean;
    highlightTriggers(text: string): { highlightedText: string; matchedWords: string[] };
    stripHighlights(text: string): string;
    processComment(commentBlock: HTMLElement | Element): boolean;
    processAllComments(): void;
}

export class CommentAssistantService implements CommentAssistantInterface {
    public triggerWords: string[];
    public selectors: Record<string, SelectorValue>;
    private regexCache: Map<string, RegExp> = new Map();

    constructor(config = SYH_CONFIG) {
        this.triggerWords = config?.TRIGGER_WORDS || ['вопрос'];
        this.selectors = (config?.SELECTORS as Record<string, SelectorValue>) || {
            commentBlock: '[class*="PlatformComment__Wrap"]',
            commentText: '[class*="PlatformCommentShell__ContentSpan"]'
        };
    }

    public init(config?: any) {
        if (config?.TRIGGER_WORDS) {
            this.triggerWords = config.TRIGGER_WORDS;
            this.regexCache.clear();
        }
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
        } catch (e) {
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

    public highlightTriggers(text: string): { highlightedText: string; matchedWords: string[] } {
        if (!text) return { highlightedText: '', matchedWords: [] };
        
        let safeHTML = this.escapeHTML(text);
        const matchedWords: string[] = [];

        this.triggerWords.forEach(word => {
            const rx = this.createTriggerRegExp(word);
            safeHTML = safeHTML.replace(rx, (match, p1, p2, p3) => {
                const isFallback = typeof p2 === 'string';
                const targetWord = isFallback ? p2 : (p1 || match);
                
                if (!matchedWords.includes(word.toLowerCase())) {
                    matchedWords.push(word.toLowerCase());
                }
                const replacement = `<mark class="syh-trigger-highlight" data-syh-trigger="${this.escapeHTML(word.toLowerCase())}">${targetWord}</mark>`;
                
                if (isFallback) {
                    return `${p1}${replacement}${p3}`;
                }
                return replacement;
            });
        });

        return { highlightedText: safeHTML, matchedWords };
    }

    public stripHighlights(text: string): string {
        if (!text) return '';
        return text.replace(/<mark class="syh-trigger-highlight"[^>]*>(.*?)<\/mark>/gi, '$1');
    }

    public processComment(commentBlock: HTMLElement | Element): boolean {
        if (!commentBlock) return false;

        const commentTextSelector = this.selectors.commentText;
        
        let textNode: Element | null = null;
        if (typeof commentTextSelector === 'string') {
            textNode = commentBlock.querySelector(commentTextSelector);
        } else {
            for (const sel of commentTextSelector) {
                textNode = commentBlock.querySelector(sel);
                if (textNode) break;
            }
        }
        
        if (!textNode) return false;

        let originalText = textNode.getAttribute('data-syh-original-text');
        if (originalText === null) {
            originalText = textNode.textContent || '';
            textNode.setAttribute('data-syh-original-text', originalText);
        }

        if (this.hasTrigger(originalText)) {
            const { highlightedText, matchedWords } = this.highlightTriggers(originalText);
            textNode.innerHTML = highlightedText;
            commentBlock.setAttribute('data-syh-triggered', matchedWords.join(','));
            return true;
        } else {
            textNode.textContent = originalText;
            commentBlock.removeAttribute('data-syh-triggered');
            return false;
        }
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
