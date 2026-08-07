import { TriggerManager } from './trigger_manager';

export class TriggerHighlighter {
    private triggerManager: TriggerManager;

    constructor(triggerManager: TriggerManager) {
        this.triggerManager = triggerManager;
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

    public highlightTriggers(text: string): { highlightedText: string; matchedWords: string[]; matchedCategories: string[] } {
        if (!text) return { highlightedText: '', matchedWords: [], matchedCategories: [] };
        
        let safeHTML = this.escapeHTML(text);
        const matchedWords: string[] = [];
        const matchedCategories: string[] = [];

        const lowerPrayerWords = (this.triggerManager.triggerWordsPrayer || []).map(w => w.toLowerCase());
        const lowerQuestionWords = (this.triggerManager.triggerWordsQuestion || []).map(w => w.toLowerCase());

        this.triggerManager.triggerWords.forEach(word => {
            const rx = this.triggerManager.createTriggerRegExp(word);
            const lowerWord = word.toLowerCase();
            const { categoryClass, categoryName } = this.triggerManager.resolveTriggerCategory(lowerWord, lowerPrayerWords, lowerQuestionWords);
            
            safeHTML = safeHTML.replace(rx, (match, p1, p2, p3) => {
                const isFallback = typeof p2 === 'string';
                const targetWord = isFallback ? p2 : (p1 || match);
                
                if (!matchedWords.includes(lowerWord)) {
                    matchedWords.push(lowerWord);
                }
                if (!matchedCategories.includes(categoryName)) {
                    matchedCategories.push(categoryName);
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
}
