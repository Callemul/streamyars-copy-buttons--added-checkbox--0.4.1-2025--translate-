// modules/parsers/emoji_parser.ts
import { EMOJI_NUMBER_LINE_REGEX } from './regex';
import { truncate } from './truncation';
import type { GroupedQuestion } from './types';

function groupEmojiQuestions(rawText: string): GroupedQuestion[] {
    const groupedQuestions: GroupedQuestion[] = [];
    let currentQuestion: GroupedQuestion | null = null;
    const lines = rawText.split('\n').map(l => l.trim());

    for (const line of lines) {
        if (EMOJI_NUMBER_LINE_REGEX.test(line)) {
            if (currentQuestion) groupedQuestions.push(currentQuestion);
            currentQuestion = { number: line, author: '', textLines: [] };
        } else if (currentQuestion && !currentQuestion.author && line) {
            currentQuestion.author = line;
        } else if (currentQuestion && line) {
            currentQuestion.textLines.push(line);
        }
    }
    if (currentQuestion) groupedQuestions.push(currentQuestion);

    return groupedQuestions;
}

function splitSubQuestions(text: string): string[] {
    return text.split(/\n?(?=🔹)/);
}

export function parseEmojiNumberedQuestions(rawText: string): string[] {
    if (!rawText) return [];

    const groupedQuestions = groupEmojiQuestions(rawText);
    const finalBanners: string[] = [];

    for (const group of groupedQuestions) {
        const fullText = group.textLines.join('\n');
        const subQuestions = splitSubQuestions(fullText);

        if (subQuestions.length <= 1) {
            const bannerText = `${group.number}\n${group.author}: \n${fullText}`;
            finalBanners.push(truncate(bannerText));
        } else {
            const firstSubQuestion = subQuestions[0] ?? '';
            if (firstSubQuestion.trim()) {
                const firstBannerText = `${group.number}\n${group.author}: \n${firstSubQuestion}`;
                finalBanners.push(truncate(firstBannerText));
            }
            for (let i = 1; i < subQuestions.length; i++) {
                const subText = (subQuestions[i] ?? '').trim();
                if (!subText) continue;
                const subLines = subText.split('\n');
                const newHeader = subLines.shift();
                const newBody = subLines.join('\n');
                const subsequentBannerText = `${newHeader}: \n${newBody}`;
                finalBanners.push(truncate(subsequentBannerText));
            }
        }
    }
    return finalBanners;
}