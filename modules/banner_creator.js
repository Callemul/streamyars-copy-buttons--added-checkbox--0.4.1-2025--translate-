import { SYH_CONFIG } from './config.ts';
import { SYH_UTILS } from './utils.js';
import { SYH_PARSERS } from './parsers.js';

export const SYH_BANNER_CREATOR = {
    SELECTORS: null,
    UTILS: null,
    PARSERS: null,

    init: function(config, utils, parsers) {
        this.SELECTORS = config ? config.SELECTORS : (SYH_CONFIG ? SYH_CONFIG.SELECTORS : null);
        this.UTILS = utils || SYH_UTILS;
        this.PARSERS = parsers || SYH_PARSERS;
    },

    log: function(msg) {
        console.log(`[SYH] ${msg}`);
    },

    processAndCreateBanners: async function(rawText) {
        let bannersToCreate = [];
        let hasStandardFormat = false;

        // 1. Розбиваємо загальний текст на повідомлення Telegram, якщо скопійовано декілька
        const tgHeaderRegex = /(?:^|\r?\n)\s*\[\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\](?:[^\r\n:]*:\s*|[^\r\n]*(?=\r?\n|$))/g;
        
        let messages = [];
        let match;
        let lastIdx = 0;
        
        while ((match = tgHeaderRegex.exec(rawText)) !== null) {
            const part = rawText.substring(lastIdx, match.index).trim();
            if (part) messages.push(part);
            lastIdx = tgHeaderRegex.lastIndex;
        }
        const lastPart = rawText.substring(lastIdx).trim();
        if (lastPart) messages.push(lastPart);
        if (messages.length === 0) messages = [rawText];

        const parseBlock = (text, defaultCat) => {
            if (!text.trim()) return [];
            let blockCategory = defaultCat;
            let blockQuestions;
            let isStd = false;

            const firstLine = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)[0] || "";
            const isQuestionStart = /^(?:\d+[.)]|(?:\d+\uFE0F?\u20E3|🔟)|🔹)/.test(firstLine);

            if (!isQuestionStart && firstLine) {
                const headerMatch = firstLine.split(/(?:^|\s)(?=\d+[.)])|(?:^|\s)(?=(?:\d+\uFE0F?\u20E3|🔟))|(?=🔹)/);
                const headerText = (headerMatch[0] || "").trim().toUpperCase();
                if (headerText.includes("МОЛИТВ") || headerText.includes("ПРОХАН") || headerText.includes("🙏")) {
                    blockCategory = "prayer";
                } else if (headerText.includes("СУББОТ") || headerText.includes("СУБОТ") || headerText.includes("УРОК")) {
                    blockCategory = "stream";
                } else if (headerText.includes("ВОПРОС") || headerText.includes("ПИТАН") || headerText.includes("???") || headerText.includes("❓")) {
                    blockCategory = "audience";
                }
            }

            if (/памятн|пам'ятн|молчанов|опарин|опарін|молчанів/i.test(text) && !/(?:^|\s)\d+[.)]+(?!\d)/.test(text) && !/(?:\d+\uFE0F?\u20E3|🔟)/.test(text)) {
                this.log("Формат: Суботня Школа (без нумерації)");
                blockQuestions = this.PARSERS.parseSabbathSchoolUnnumberedQuestions(text);
                blockCategory = "stream"; 
            } else if (/(?:\d+\uFE0F?\u20E3|🔟)/.test(text)) {
                this.log("Формат: Емодзі 1️⃣");
                blockQuestions = this.PARSERS.parseEmojiNumberedQuestions(text);
            } else {
                this.log("Формат: Стандартний 1.");
                blockQuestions = this.PARSERS.parseStandardNumberedQuestions(text);
                isStd = true;
            }

            return blockQuestions.map(q => ({ text: q, category: blockCategory, isStandard: isStd }));
        };

        try {
            for (const msg of messages) {
                const parts = msg.split(/(?:^|\r?\n)\s*🙏+[^\r\nа-яА-Яa-zA-Z]*(?:МОЛИТ|ПРОХАН)[^\r\n]*/iu);
                const questionsText = parts[0] || "";
                const prayersText = parts[1] || "";

                if (questionsText.trim()) {
                    const qItems = parseBlock(questionsText, "stream");
                    bannersToCreate = bannersToCreate.concat(qItems);
                    if (qItems.some(item => item.isStandard)) {
                        hasStandardFormat = true;
                    }
                }
                if (prayersText.trim()) {
                    const pItems = parseBlock(prayersText, "prayer");
                    bannersToCreate = bannersToCreate.concat(pItems);
                }
            }
        } catch (error) {
            alert(error.message);
            return;
        }

        if (bannersToCreate.length === 0) {
            alert("Питання не знайдені.");
            return;
        }

        await this.ensureCleanStart(); 

        let createdCount = 0;
        
        for (const [index, item] of bannersToCreate.entries()) {
            this.log(`>>> Обробка банера ${index + 1} з ${bannersToCreate.length}`);
            try {
                const pauseTime = index === 0 ? 600 : 250;
                await new Promise(r => setTimeout(r, pauseTime));
                
                // Очищення дужок з авторами, навіть якщо дужка не закрита (наприклад, " ( Опарин , Молчанов")
                const cleanQuestion = item.text.replace(/\s*\(\s*(?:Опарин|Молчанов|Василенко|Жаловага|Молчанів|Опарін).*?$/gi, "").trim();

                await this.createSingleBanner(cleanQuestion);
                
                // Автоматично проштамповуємо створений банер у правильну категорію
                await window.SYH_UTILS.saveBannerCategory(cleanQuestion, item.category);

                createdCount++;
            } catch (error) {
                console.error(error);
                this.log(`Помилка: ${error.message}`);
                await this.finalCleanup();
            }
        }
        
        if (hasStandardFormat) {
            this.log("Додаю розділювач...");
            await new Promise(r => setTimeout(r, 300));
            await this.createSingleBanner("----Питання глядачів----");
        }

        await this.finalCleanup();

        alert(`Готово! Створено: ${createdCount}.`);
    },

    clickCancelButton: function(form) {
        const buttons = Array.from(form.querySelectorAll('button'));
        const cancelButton = buttons.find(b => 
            b.type !== 'submit' && 
            b.id !== 'banner-timer-dropdown-button' && 
            !b.closest('#banner-timer-dropdown-button')
        );
        if (cancelButton) {
            cancelButton.click();
        }
    },

    ensureCleanStart: async function() {
        this.log("Перевірка на чистоту старту...");
        const form = document.querySelector(this.SELECTORS.createBannerForm);
        
        if (form) {
            this.log("Форма була відкрита. Закриваю...");
            this.clickCancelButton(form);
            await new Promise(r => setTimeout(r, 300));
        }
    },

    finalCleanup: async function() {
        const form = document.querySelector(this.SELECTORS.createBannerForm);
        if (form) {
            this.log("Прибирання: Закриваю форму...");
            this.clickCancelButton(form);
        }
    },

    createSingleBanner: function(text) {
        return new Promise((resolve, reject) => {
            (async () => {
                try {
                let createBtn = document.querySelector(this.SELECTORS.createBannerButton);
                if (!createBtn) {
                     createBtn = await this.UTILS.waitForElement(this.SELECTORS.createBannerButton, 2000);
                }
                createBtn.click();
                
                const form = await this.UTILS.waitForElement(this.SELECTORS.createBannerForm, 2000);
                const textarea = form.querySelector('textarea');
                const addButton = form.querySelector('button[type="submit"]');
                
                textarea.focus();
                textarea.value = text;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                textarea.blur(); 
                
                const waitTime = text.length > 50 ? 300 : 150;
                await new Promise(r => setTimeout(r, waitTime));

                if (addButton.disabled) await new Promise(r => setTimeout(r, 200));
                addButton.click();
                
                await this.UTILS.waitForNewBanner(text, 5000);
                
                if (document.querySelector(this.SELECTORS.createBannerForm)) {
                    this.clickCancelButton(form);
                }

                resolve();
            } catch (error) {
                reject(error);
            }
        })();
        });
    }
};

if (typeof window !== 'undefined') {
    window.SYH_BANNER_CREATOR = SYH_BANNER_CREATOR;
}