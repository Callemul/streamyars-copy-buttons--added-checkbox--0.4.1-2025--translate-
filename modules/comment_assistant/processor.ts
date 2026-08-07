import { TriggerManager } from './trigger_manager';
import { TriggerHighlighter } from './highlighter';

export class CommentProcessor {
    private triggerManager: TriggerManager;
    private highlighter: TriggerHighlighter;

    constructor(triggerManager: TriggerManager) {
        this.triggerManager = triggerManager;
        this.highlighter = new TriggerHighlighter(triggerManager);
    }

    public findTextNode(commentBlock: HTMLElement | Element): Element | null {
        const commentTextSelector = this.triggerManager.selectors.commentText;
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
        const { highlightedText, matchedWords, matchedCategories } = this.highlighter.highlightTriggers(originalText);
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

        return this.triggerManager.hasTrigger(originalText)
            ? this.applyHighlight(commentBlock, textNode, originalText)
            : this.removeHighlight(commentBlock, textNode, originalText);
    }

    public processAllComments() {
        if (typeof document === 'undefined') return;
        const selector = this.triggerManager.selectors.commentBlock;
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