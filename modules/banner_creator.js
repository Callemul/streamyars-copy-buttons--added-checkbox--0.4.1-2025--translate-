// modules/banner_creator.js
window.SYH_BANNER_CREATOR = {
    SELECTORS: null,
    UTILS: null,
    PARSERS: null,

    init: function(config, utils, parsers) {
        this.SELECTORS = config.SELECTORS;
        this.UTILS = utils;
        this.PARSERS = parsers;
    },

    processAndCreateBanners: async function(rawText) {
        let questions = [];

        if (/[1-9🔟]️⃣/.test(rawText)) {
            questions = this.PARSERS.parseEmojiNumberedQuestions(rawText);
        } else {
            questions = this.PARSERS.parseStandardNumberedQuestions(rawText);
        }

        if (questions.length === 0) {
            alert("Не знайдено пронумерованих питань у тексті. Перевірте формат.");
            return;
        }

        let createdCount = 0;
        for (const question of questions) {
            try {
                await this.createSingleBanner(question);
                createdCount++;
            } catch (error) {
                alert(`Не вдалося створити банер: "${question.substring(0, 50)}...".\nПричина: ${error.message}.\nПроцес перервано.`);
                break;
            }
        }
        await this.createSingleBanner("----Питання глядачів----");
        alert(`Створення завершено v0.6! Створено ${createdCount} з ${questions.length} банер(ів).`);
    },

    createSingleBanner: function(text) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!document.querySelector(this.SELECTORS.createBannerForm)) {
                    const createButton = await this.UTILS.waitForElement(this.SELECTORS.createBannerButton, 3000);
                    createButton.click();
                }
                
                const form = await this.UTILS.waitForElement(this.SELECTORS.createBannerForm, 3000);
                const textarea = form.querySelector('textarea');
                const addButton = form.querySelector('button[type="submit"]');
                if (!textarea || !addButton) return reject(new Error("Структура форми невірна."));
                
                textarea.focus();
                textarea.value = text;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                await new Promise(r => setTimeout(r, 150));
                
                if (addButton.disabled) return reject(new Error("Кнопка 'Add banner' неактивна."));
                addButton.click();
                
                await this.UTILS.waitForNewBanner(text, 5000);
                
                const cancelButton = form.querySelector('button:not([type="submit"])');
                if (cancelButton) cancelButton.click();

                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }
};