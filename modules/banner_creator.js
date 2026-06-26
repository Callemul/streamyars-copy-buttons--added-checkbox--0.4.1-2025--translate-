window.SYH_BANNER_CREATOR = {
    SELECTORS: null,
    UTILS: null,
    PARSERS: null,

    init: function(config, utils, parsers) {
        this.SELECTORS = config.SELECTORS;
        this.UTILS = utils;
        this.PARSERS = parsers;
    },

    log: function(msg) {
        console.log(`[SYH] ${msg}`);
    },

    processAndCreateBanners: async function(rawText) {
        let bannersToCreate = [];
        let hasStandardFormat = false;

        // Розбиваємо текст на блок питань та блок молитов
        const parts = rawText.split(/(?:^|\r?\n)\s*🙏+[^\r\nа-яА-Яa-zA-Z]*(?:МОЛИТ|ПРОХАН)[^\r\n]*/iu);
        const questionsText = parts[0] || "";
        const prayersText = parts[1] || "";

        const parseBlock = (text, defaultCat) => {
            if (!text.trim()) return [];
            let blockCategory = defaultCat;
            let blockQuestions = [];
            let isStd = false;

            const firstLine = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)[0] || "";
            const isQuestionStart = /^(?:\d+[\.\)]|(?:\d+\uFE0F?\u20E3|🔟)|🔹)/.test(firstLine);

            if (!isQuestionStart && firstLine) {
                const headerMatch = firstLine.split(/(?:^|\s)(?=\d+[\.\)])|(?:^|\s)(?=(?:\d+\uFE0F?\u20E3|🔟))|(?=🔹)/);
                const headerText = (headerMatch[0] || "").trim().toUpperCase();
                if (headerText.includes("МОЛИТВ") || headerText.includes("ПРОХАН") || headerText.includes("🙏")) {
                    blockCategory = "prayer";
                } else if (headerText.includes("СУББОТН") || headerText.includes("СУБОТН")) {
                    blockCategory = "stream";
                } else if (headerText.includes("ВОПРОС") || headerText.includes("ПИТАН") || headerText.includes("???") || headerText.includes("❓")) {
                    blockCategory = "audience";
                }
            }

            if (/памятн|пам'ятн|молчанов|опарин|опарін|молчанів/i.test(text) && !/(?:^|\s)\d+[\.\)]+(?!\d)/.test(text) && !/(?:\d+\uFE0F?\u20E3|🔟)/.test(text)) {
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
        return new Promise(async (resolve, reject) => {
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
        });
    },

};