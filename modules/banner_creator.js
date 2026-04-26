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
        let questions = [];
        let isStandardFormat = false;

        // Оновлена перевірка формату
        if (/(?:\d+\uFE0F?\u20E3|🔟)/.test(rawText)) {
            this.log("Формат: Емодзі 1️⃣");
            questions = this.PARSERS.parseEmojiNumberedQuestions(rawText);
            isStandardFormat = false; 
        } else {
            this.log("Формат: Стандартний 1.");
            questions = this.PARSERS.parseStandardNumberedQuestions(rawText);
            isStandardFormat = true;
        }

        if (questions.length === 0) {
            alert("Питання не знайдені.");
            return;
        }

        await this.ensureCleanStart(); 

        let createdCount = 0;
        
        for (const [index, question] of questions.entries()) {
            this.log(`>>> Обробка банера ${index + 1} з ${questions.length}`);
            try {
                const pauseTime = index === 0 ? 600 : 250;
                await new Promise(r => setTimeout(r, pauseTime));
                
                await this.createSingleBanner(question);
                createdCount++;
            } catch (error) {
                console.error(error);
                this.log(`Помилка: ${error.message}`);
                await this.finalCleanup();
            }
        }
        
        if (isStandardFormat) {
            this.log("Додаю розділювач...");
            await new Promise(r => setTimeout(r, 300));
            await this.createSingleBanner("----Питання глядачів----");
            createdCount++;
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
    }
};