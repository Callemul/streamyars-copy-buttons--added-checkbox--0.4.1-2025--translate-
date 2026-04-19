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

        // 1. Визначаємо формат
        if (/[1-9🔟]️⃣/.test(rawText)) {
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

        // 2. ПРИМУСОВЕ ОЧИЩЕННЯ ПЕРЕД СТАРТОМ
        await this.ensureCleanStart(); 

        let createdCount = 0;
        
        // 3. Створення банерів
        for (const [index, question] of questions.entries()) {
            this.log(`>>> Обробка банера ${index + 1} з ${questions.length}`);
            try {
                // ПРИСКОРЕНО: 600мс для першого (прогрів), 250мс для наступних
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
        
        // 4. Розділювач (ТІЛЬКИ якщо це план ефіру)
        if (isStandardFormat) {
            this.log("Додаю розділювач...");
            await new Promise(r => setTimeout(r, 300));
            await this.createSingleBanner("----Питання глядачів----");
            createdCount++;
        }

        // 5. Фінальне прибирання
        await this.finalCleanup();

        alert(`Готово! Створено: ${createdCount}.`);
    },

    // Правильний пошук кнопки Cancel (ігноруємо таймер)
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
            await new Promise(r => setTimeout(r, 300)); // ПРИСКОРЕНО
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
                // 1. Відкриваємо форму
                let createBtn = document.querySelector(this.SELECTORS.createBannerButton);
                if (!createBtn) {
                     createBtn = await this.UTILS.waitForElement(this.SELECTORS.createBannerButton, 2000);
                }
                createBtn.click();
                
                // 2. Чекаємо поля
                const form = await this.UTILS.waitForElement(this.SELECTORS.createBannerForm, 2000);
                const textarea = form.querySelector('textarea');
                const addButton = form.querySelector('button[type="submit"]');
                
                // 3. Вставка тексту
                textarea.focus();
                textarea.value = text;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                textarea.blur(); 
                
                // ПРИСКОРЕНО: чекаємо відмальовки тексту
                const waitTime = text.length > 50 ? 300 : 150;
                await new Promise(r => setTimeout(r, waitTime));

                // 4. Зберігаємо банер (Таймер повністю ігнорується)
                if (addButton.disabled) await new Promise(r => setTimeout(r, 200));
                addButton.click();
                
                // 5. Чекаємо появи в списку
                await this.UTILS.waitForNewBanner(text, 5000);
                
                // 6. Закриваємо форму
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