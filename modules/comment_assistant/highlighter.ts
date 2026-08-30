import { TriggerManager } from './trigger_manager';
import { escapeHtml } from '../escape_html';

interface TriggerMatch {
    start: number;
    end: number;
    targetWord: string;
    lowerWord: string;
    categoryClass: string;
    categoryName: string;
    triggerOrder: number;
    discoveryOrder: number;
}

export class TriggerHighlighter {
    private triggerManager: TriggerManager;

    constructor(triggerManager: TriggerManager) {
        this.triggerManager = triggerManager;
    }

    public escapeHTML(str: string): string {
        return escapeHtml(str);
    }

    public highlightTriggers(text: string): { highlightedText: string; matchedWords: string[]; matchedCategories: string[] } {
        if (!text) return { highlightedText: '', matchedWords: [], matchedCategories: [] };

        const lowerPrayerWords = (this.triggerManager.triggerWordsPrayer || []).map(w => w.toLowerCase());
        const lowerQuestionWords = (this.triggerManager.triggerWordsQuestion || []).map(w => w.toLowerCase());
        const candidates: TriggerMatch[] = [];
        let discoveryOrder = 0;

        this.triggerManager.triggerWords.forEach((word, triggerOrder) => {
            const rx = this.triggerManager.createTriggerRegExp(word);
            const lowerWord = word.toLowerCase();
            const { categoryClass, categoryName } = this.triggerManager.resolveTriggerCategory(lowerWord, lowerPrayerWords, lowerQuestionWords);
            rx.lastIndex = 0;

            let match: RegExpExecArray | null;
            while ((match = rx.exec(text)) !== null) {
                const isFallback = typeof match[2] === 'string';
                const targetWord = isFallback ? match[2] : (match[1] || match[0]);
                const start = match.index + (isFallback ? (match[1]?.length || 0) : 0);

                if (targetWord) {
                    candidates.push({
                        start,
                        end: start + targetWord.length,
                        targetWord,
                        lowerWord,
                        categoryClass,
                        categoryName,
                        triggerOrder,
                        discoveryOrder: discoveryOrder++
                    });
                }

                if (match[0].length === 0) {
                    rx.lastIndex++;
                }
            }
        });

        candidates.sort((a, b) =>
            a.start - b.start
            || (b.end - b.start) - (a.end - a.start)
            || a.triggerOrder - b.triggerOrder
            || a.discoveryOrder - b.discoveryOrder
        );

        const acceptedMatches: TriggerMatch[] = [];
        let acceptedEnd = 0;
        for (const candidate of candidates) {
            if (candidate.start < acceptedEnd) continue;
            acceptedMatches.push(candidate);
            acceptedEnd = candidate.end;
        }

        const matchedWords: string[] = [];
        const matchedCategories: string[] = [];
        let highlightedText = '';
        let cursor = 0;

        for (const match of acceptedMatches) {
            highlightedText += escapeHtml(text.slice(cursor, match.start));

            const markClasses = `syh-trigger-highlight ${match.categoryClass}`.trim();
            highlightedText += `<mark class="${markClasses}" data-syh-trigger="${escapeHtml(match.lowerWord)}">${escapeHtml(match.targetWord)}</mark>`;
            cursor = match.end;

            if (!matchedWords.includes(match.lowerWord)) {
                matchedWords.push(match.lowerWord);
            }
            if (!matchedCategories.includes(match.categoryName)) {
                matchedCategories.push(match.categoryName);
            }
        }

        highlightedText += escapeHtml(text.slice(cursor));
        return { highlightedText, matchedWords, matchedCategories };
    }

    public stripHighlights(text: string): string {
        if (!text) return '';
        return text.replace(/<mark class="syh-trigger-highlight[^"]*"[^>]*>(.*?)<\/mark>/gi, '$1');
    }
}
