import { SYH_CONFIG } from './config';

export interface GroupedQuestion {
    number: string;
    author: string;
    textLines: string[];
}

export interface SyhParsers {
    parseEmojiNumberedQuestions(rawText: string): string[];
    parseStandardNumberedQuestions(rawText: string): string[];
    parseSabbathSchoolUnnumberedQuestions(rawText: string): string[];
}

export const SYH_PARSERS: SyhParsers = {
    /**
     * Парсер для формату з emoji-цифрами, що підтримує підпункти '🔹'.
     */
    parseEmojiNumberedQuestions: function(rawText: string): string[] {
        console.log("Parsing as Emoji-numbered questions with sub-item support.");
        const MAX_LENGTH = (SYH_CONFIG && SYH_CONFIG.LIMITS && SYH_CONFIG.LIMITS.TEXT_TRUNCATION_LENGTH) || 
                           (typeof window !== 'undefined' && (window as any).SYH_CONFIG && (window as any).SYH_CONFIG.LIMITS && (window as any).SYH_CONFIG.LIMITS.TEXT_TRUNCATION_LENGTH) || 195;
        const ELLIPSIS = "...";

        const truncate = (text: string): string => {
            if (text.length > MAX_LENGTH) {
                return text.substring(0, MAX_LENGTH - ELLIPSIS.length) + ELLIPSIS;
            }
            return text;
        };

        const groupedQuestions: GroupedQuestion[] = [];
        let currentQuestion: GroupedQuestion | null = null;
        const lines = rawText.split('\n').map(l => l.trim());

        for (const line of lines) {
            // Оновлена регулярка: підтримує всі варіанти цифр у квадратиках
            if (/^(?:\d+\uFE0F?\u20E3|🔟)+\s*$/.test(line)) {
                if (currentQuestion) groupedQuestions.push(currentQuestion);
                currentQuestion = { number: line, author: '', textLines: [] };
            } else if (currentQuestion && !currentQuestion.author && line) {
                currentQuestion.author = line;
            } else if (currentQuestion && line) {
                currentQuestion.textLines.push(line);
            }
        }
        if (currentQuestion) groupedQuestions.push(currentQuestion);

        const finalBanners: string[] = [];
        for (const group of groupedQuestions) {
            const fullText = group.textLines.join('\n');
            const subQuestions = fullText.split(/\n?(?=🔹)/);

            if (subQuestions.length <= 1) {
                const bannerText = `${group.number}\n${group.author}: \n${fullText}`;
                finalBanners.push(truncate(bannerText));
            } else {
                if (subQuestions[0].trim()) {
                    const firstBannerText = `${group.number}\n${group.author}: \n${subQuestions[0]}`;
                    finalBanners.push(truncate(firstBannerText));
                }
                for (let i = 1; i < subQuestions.length; i++) {
                    const subText = subQuestions[i].trim();
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
    },

    /**
     * Парсер для старого формату: "1. Текст питання (Автор)"
     */
    parseStandardNumberedQuestions: function(rawText: string): string[] {
        console.log("Parsing as Standard-numbered questions.");
        const formattedText = rawText.replace(/(?:^|\s)(\d+\.)/g, '\n$1');
        const maxLen = (typeof SYH_CONFIG !== 'undefined' && SYH_CONFIG && SYH_CONFIG.LIMITS && SYH_CONFIG.LIMITS.TEXT_TRUNCATION_LENGTH) || 
                       (typeof window !== 'undefined' && (window as any).SYH_CONFIG && (window as any).SYH_CONFIG.LIMITS && (window as any).SYH_CONFIG.LIMITS.TEXT_TRUNCATION_LENGTH) || 195;

        return formattedText.split('\n')
            .map(line => line.trim())
            .filter(line => /^\d+\./.test(line))
            .map(line => line.replace(/^\d+[.)]?\s*/, '').replace(/\s*\([^)]+\)$/, '').trim())
            .filter(line => line.length > 0)
            .map(line => {
                if (line.length >= 200) {
                    return line.substring(0, maxLen) + "...";
                }
                return line;
            });
    },

    parseSabbathSchoolUnnumberedQuestions: function(rawText: string): string[] {
        console.log("Parsing as Sabbath School Unnumbered questions.");
        const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
        const maxLen = (SYH_CONFIG && SYH_CONFIG.LIMITS && SYH_CONFIG.LIMITS.TEXT_TRUNCATION_LENGTH) || 
                       (typeof window !== 'undefined' && (window as any).SYH_CONFIG && (window as any).SYH_CONFIG.LIMITS && (window as any).SYH_CONFIG.LIMITS.TEXT_TRUNCATION_LENGTH) || 195;
        
        // Знаходимо перший рядок з ключовими словами
        const startIndex = lines.findIndex(l => /памятн|пам'ятн|молчанов|опарин|опарін|молчанів/i.test(l));
        if (startIndex === -1) return [];
        
        // Ігноруємо заголовок (все перед startIndex)
        const questionLines = lines.slice(startIndex);
        
        // Помилка якщо більше 10 питань
        if (questionLines.length > 10) {
            throw new Error("Помилка: Кількість питань перевищує ліміт (максимум 10)!");
        }
        
        return questionLines.map(line => {
            const cleanLine = line.replace(/\s*\([^)]+\)$/, '').trim();
            return cleanLine.length >= 200 ? cleanLine.substring(0, maxLen) + "..." : cleanLine;
        });
    }
};

if (typeof window !== 'undefined') {
    (window as any).SYH_PARSERS = SYH_PARSERS;
}
