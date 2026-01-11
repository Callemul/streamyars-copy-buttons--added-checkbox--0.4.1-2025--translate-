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

        if (/[1-9🔟]️⃣/.test(rawText)) {
            questions = this.PARSERS.parseEmojiNumberedQuestions(rawText);
        } else {
            questions = this.PARSERS.parseStandardNumberedQuestions(rawText);
        }

        if (questions.length === 0) {
            alert("Питання не знайдені.");
            return;
        }

        let createdCount = 0;
        for (const [index, question] of questions.entries()) {
            this.log(`>>> Обробка банера ${index + 1} з ${questions.length}`);
            try {
                // Для ПЕРШОГО банера даємо трохи більше часу на "розгон" інтерфейсу
                const pauseTime = index === 0 ? 1500 : 800;
                await new Promise(r => setTimeout(r, pauseTime));
                
                await this.createSingleBanner(question);
                createdCount++;
            } catch (error) {
                console.error(error);
                this.log(`Помилка: ${error.message}`);
            }
        }
        
        await this.createSingleBanner("----Питання глядачів----");
        alert(`Готово! Створено: ${createdCount} з ${questions.length}.`);
    },

    // Ця функція не випустить скрипт далі, поки таймер реально не стане OFF
    makeSureTimerIsOff: async function() {
        const MAX_ATTEMPTS = 5;
        const timerBtnSelector = this.SELECTORS.timerDropdownButton;
        // Використовуємо селектор з конфігу (там має бути #banner-timer-dropdown-option-null)
        const offOptionSelector = this.SELECTORS.timerOptionOffId || '#banner-timer-dropdown-option-null';

        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            // 1. Отримуємо актуальну кнопку
            const timerBtn = document.querySelector(timerBtnSelector);
            if (!timerBtn) return false;

            // 2. Читаємо, що там написано ЗАРАЗ
            const text = timerBtn.textContent || "";
            // Якщо вже Timer off - чудово, виходимо
            if (text.toLowerCase().includes("timer off")) {
                this.log(`Перевірка: Таймер вимкнено (Спроба ${i+1}). ОК.`);
                return true;
            }

            this.log(`Таймер стоїть на: "${text.trim()}". Пробую змінити... (Спроба ${i+1})`);

            // 3. Відкриваємо меню
            timerBtn.click();
            
            // 4. Чекаємо меню і клікаємо опцію
            try {
                // ВАЖЛИВА ЗМІНА: Ми не просто чекаємо паузу, ми чекаємо саме ПОЯВУ елемента
                // Це вирішує проблему першого банера, коли меню вантажиться довше
                const offOption = await this.UTILS.waitForElement(offOptionSelector, 2000);
                
                this.log(`Меню відкрито. Клікаю опцію (ID знайдено)...`);
                offOption.click();

                // 5. КРИТИЧНО: Чекаємо поки React опрацює клік
                await new Promise(r => setTimeout(r, 600));

            } catch (e) {
                this.log(`Помилка пошуку ID в меню: ${e.message}. Пробую ще раз...`);
                // Якщо меню зависло, спробуємо закрити його кліком по кнопці, щоб почати з чистого листа
                const btn = document.querySelector(timerBtnSelector);
                if (btn) btn.click();
                await new Promise(r => setTimeout(r, 300));
            }
        }

        this.log("НЕ ВДАЛОСЯ вимкнути таймер після всіх спроб.");
        return false;
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
                const form = await this.UTILS.waitForElement(this.SELECTORS.createBannerForm, 3000);
                const textarea = form.querySelector('textarea');
                const addButton = form.querySelector('button[type="submit"]');
                
                // 3. Вставляємо текст
                textarea.focus();
                textarea.value = text;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                
                // ВАЖЛИВО: Робимо blur, щоб зафіксувати текст
                textarea.blur();
                
                // Пауза залежить від довжини тексту
                const waitTime = text.length > 50 ? 1000 : 500;
                await new Promise(r => setTimeout(r, waitTime));

                // 4. ЗАЛІЗНА ЛОГІКА ТАЙМЕРА
                await this.makeSureTimerIsOff();

                // 5. Додаємо
                if (addButton.disabled) await new Promise(r => setTimeout(r, 300));
                addButton.click();
                
                // 6. Чекаємо банер
                await this.UTILS.waitForNewBanner(text, 6000);
                
                // 7. Закриваємо
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