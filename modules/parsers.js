// modules/parsers.js
window.SYH_PARSERS = {
    /**
     * Парсер для формату з emoji-цифрами, що підтримує підпункти '🔹'.
     */
    parseEmojiNumberedQuestions: function(rawText) {
        console.log("Parsing as Emoji-numbered questions with sub-item support.");
        const MAX_LENGTH = 195;
        const ELLIPSIS = "...";

        const truncate = (text) => {
            if (text.length > MAX_LENGTH) {
                return text.substring(0, MAX_LENGTH - ELLIPSIS.length) + ELLIPSIS;
            }
            return text;
        };

        const groupedQuestions = [];
        let currentQuestion = null;
        const lines = rawText.split('\n').map(l => l.trim());

        for (const line of lines) {
            if (/^([1-9]️⃣|🔟)+$/.test(line)) {
                if (currentQuestion) groupedQuestions.push(currentQuestion);
                currentQuestion = { number: line, author: '', textLines: [] };
            } else if (currentQuestion && !currentQuestion.author && line) {
                currentQuestion.author = line;
            } else if (currentQuestion && line) {
                currentQuestion.textLines.push(line);
            }
        }
        if (currentQuestion) groupedQuestions.push(currentQuestion);

        const finalBanners = [];
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
    parseStandardNumberedQuestions: function(rawText) {
        console.log("Parsing as Standard-numbered questions.");
        return rawText.split('\n')
            .map(line => line.trim())
            .filter(line => /^\d/.test(line))
            .map(line => line.replace(/^\d+[\.\)]?\s*/, '').replace(/\s*\([^)]+\)$/, '').trim())
            .filter(line => line.length > 0 && line.length < 200);
    }
};