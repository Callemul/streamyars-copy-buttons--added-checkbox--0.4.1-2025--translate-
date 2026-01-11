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
        // Це гарантує, що ми починаємо з закритої форми (Scenario A)
        await this.ensureCleanStart(); 

        let createdCount = 0;
        
        // 3. Створення банерів
        for (const [index, question] of questions.entries()) {
            this.log(`>>> Обробка банера ${index + 1} з ${questions.length}`);
            try {
                // Для першого банера даємо більше часу, бо React "прокидається"
                const pauseTime = index === 0 ? 1200 : 800;
                await new Promise(r => setTimeout(r, pauseTime));
                
                // createSingleBanner сама відкриє форму
                // true = це перший банер, треба "прогріти" меню
                await this.createSingleBanner(question, index === 0);
                createdCount++;
            } catch (error) {
                console.error(error);
                this.log(`Помилка: ${error.message}`);
                // Аварійне закриття, щоб спробувати наступний
                await this.finalCleanup();
            }
        }
        
        // 4. Розділювач (ТІЛЬКИ якщо це план ефіру)
        if (isStandardFormat) {
            this.log("Додаю розділювач...");
            await new Promise(r => setTimeout(r, 600));
            await this.createSingleBanner("----Питання глядачів----", false);
            createdCount++;
        }

        // 5. Фінальне прибирання
        await this.finalCleanup();

        alert(`Готово! Створено: ${createdCount}.`);
    },

    // Закриває форму, якщо вона була відкрита до запуску скрипта
    ensureCleanStart: async function() {
        this.log("Перевірка на чистоту старту...");
        const form = document.querySelector(this.SELECTORS.createBannerForm);
        
        if (form) {
            this.log("Форма була відкрита. Закриваю (Cancel)...");
            const cancelButton = form.querySelector('button:not([type="submit"])');
            if (cancelButton) cancelButton.click();
            // Чекаємо поки форма зникне
            await new Promise(r => setTimeout(r, 800));
        } else {
            this.log("Форма закрита. Старт нормальний.");
        }
    },

    // Закриває хвости (меню, форми) після роботи
    finalCleanup: async function() {
        // Закриваємо меню таймера, якщо висить (шукаємо ID, який є тільки в відкритому меню)
        const offOption = document.getElementById('banner-timer-dropdown-option-null');
        if (offOption) {
            this.log("Прибирання: Закриваю меню таймера...");
            const timerBtn = document.querySelector(this.SELECTORS.timerDropdownButton);
            if (timerBtn) {
                timerBtn.click();
                await new Promise(r => setTimeout(r, 300));
            }
        }

        // Закриваємо форму
        const form = document.querySelector(this.SELECTORS.createBannerForm);
        if (form) {
            this.log("Прибирання: Закриваю форму...");
            const cancelButton = form.querySelector('button:not([type="submit"])');
            if (cancelButton) cancelButton.click();
        }
    },

    // Циклічна спроба вимкнути таймер
    makeSureTimerIsOff: async function(isFirstRun) {
        const MAX_LOOPS = 4;
        const timerBtnSelector = this.SELECTORS.timerDropdownButton;
        const offOptionId = 'banner-timer-dropdown-option-null';

        // ХАК ДЛЯ ПЕРШОГО БАНЕРА: Відкрити/Закрити меню ("Прогрів")
        // Це змушує React завантажити елементи в кеш
        if (isFirstRun) {
            this.log("Перший прохід: Прогріваю меню...");
            const btn = document.querySelector(timerBtnSelector);
            if (btn) {
                btn.click(); // Відкрити
                await new Promise(r => setTimeout(r, 500));
                
                // Якщо відкрилось - закрити
                if (document.getElementById(offOptionId)) {
                    btn.click(); 
                    await new Promise(r => setTimeout(r, 500));
                }
            }
        }

        // Основний цикл перевірки
        for (let i = 0; i < MAX_LOOPS; i++) {
            const timerBtn = document.querySelector(timerBtnSelector);
            if (!timerBtn) return false;

            // Перевірка тексту
            const text = timerBtn.textContent || "";
            if (text.toLowerCase().includes("timer off")) {
                this.log(`Таймер вже OFF. ОК.`);
                return true;
            }

            this.log(`Спроба ${i+1}: Таймер зараз "${text.trim()}". Змінюю...`);

            // Клік по меню
            timerBtn.click();
            
            try {
                // Чекаємо ID кнопки OFF. 
                // Якщо ID не з'явиться за 1.5 сек, викине помилку і піде в catch
                const offOption = await this.UTILS.waitForElement(`#${offOptionId}`, 1500);
                
                this.log("Меню відкрито. Клікаю OFF...");
                offOption.click();

                // Чекаємо оновлення
                await new Promise(r => setTimeout(r, 600));

            } catch (e) {
                this.log(`Меню не прогрузилось (ID не знайдено). Закриваю/Відкриваю знову...`);
                // Якщо меню "зависло" або не відкрилось, клік по кнопці допоможе
                const btn = document.querySelector(timerBtnSelector);
                if (btn) btn.click();
                await new Promise(r => setTimeout(r, 400));
            }
        }
        
        return false;
    },

    createSingleBanner: function(text, isFirstBanner) {
        return new Promise(async (resolve, reject) => {
            try {
                // 1. Відкриваємо форму (вона гарантовано закрита функцією ensureCleanStart)
                let createBtn = document.querySelector(this.SELECTORS.createBannerButton);
                if (!createBtn) {
                     createBtn = await this.UTILS.waitForElement(this.SELECTORS.createBannerButton, 2000);
                }
                createBtn.click();
                
                // 2. Чекаємо поля
                const form = await this.UTILS.waitForElement(this.SELECTORS.createBannerForm, 3000);
                const textarea = form.querySelector('textarea');
                const addButton = form.querySelector('button[type="submit"]');
                
                // 3. Вставка тексту
                textarea.focus();
                textarea.value = text;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                textarea.blur(); // Знімаємо фокус (важливо!)
                
                const waitTime = text.length > 50 ? 800 : 400;
                await new Promise(r => setTimeout(r, waitTime));

                // 4. ТАЙМЕР
                await this.makeSureTimerIsOff(isFirstBanner);

                // 5. Add Banner
                if (addButton.disabled) await new Promise(r => setTimeout(r, 300));
                addButton.click();
                
                // 6. Чекаємо появи
                await this.UTILS.waitForNewBanner(text, 6000);
                
                // 7. Закриваємо форму
                if (document.querySelector(this.SELECTORS.createBannerForm)) {
                    const cancelButton = form.querySelector('button:not([type="submit"])');
                    if (cancelButton) cancelButton.click();
                }

                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }
};