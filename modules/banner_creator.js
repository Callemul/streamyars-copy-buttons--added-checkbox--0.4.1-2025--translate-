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
        console.log(`[SYH-DEBUG] ${msg}`);
    },

    processAndCreateBanners: async function(rawText) {
        this.log("Початок обробки тексту...");
        let questions = [];

        if (/[1-9🔟]️⃣/.test(rawText)) {
            questions = this.PARSERS.parseEmojiNumberedQuestions(rawText);
        } else {
            questions = this.PARSERS.parseStandardNumberedQuestions(rawText);
        }

        if (questions.length === 0) {
            alert("Не знайдено питань.");
            return;
        }

        let createdCount = 0;
        for (const [index, question] of questions.entries()) {
            this.log(`--- Початок банера №${index + 1} ---`);
            try {
                // Збільшена пауза між банерами
                await new Promise(r => setTimeout(r, 800));
                await this.createSingleBanner(question);
                createdCount++;
                this.log(`Банер №${index + 1} успішно створено.`);
            } catch (error) {
                console.error(error);
                this.log(`ПОМИЛКА на банері №${index + 1}: ${error.message}`);
                // alert(`Помилка: ${error.message}`); // Можна розкоментувати для налагодження
            }
        }
        
        await new Promise(r => setTimeout(r, 500));
        await this.createSingleBanner("----Питання глядачів----");
        alert(`Готово! Створено ${createdCount} з ${questions.length}. Перевірте консоль (F12) якщо були помилки.`);
    },

    // --- ФУНКЦІЯ, ЯКА НЕ ЗДАЄТЬСЯ ---
    setTimerToOff: async function() {
        const MAX_RETRIES = 3;
        
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            this.log(`Перевірка таймера (Спроба ${attempt}/${MAX_RETRIES})`);
            
            // 1. Знаходимо кнопку (завжди шукаємо наново)
            const timerBtn = document.querySelector(this.SELECTORS.timerDropdownButton);
            if (!timerBtn) {
                this.log("Кнопка таймера не знайдена в DOM!");
                return; // Нема кнопки - нема проблем (можливо)
            }

            // 2. Читаємо текст
            const currentText = timerBtn.textContent || "";
            this.log(`Поточний текст на кнопці: "${currentText.trim()}"`);

            // 3. Якщо вже "Timer off", то все супер
            if (currentText.toLowerCase().includes(this.SELECTORS.timerOffTextResult.toLowerCase())) {
                this.log("Таймер вже вимкнено. Успіх.");
                return;
            }

            // 4. Якщо ні - пробуємо змінити
            this.log("Таймер увімкнено. Клікаю кнопку меню...");
            timerBtn.click();

            // Чекаємо меню
            try {
                this.log("Чекаю на появу пункту 'Timer Off'...");
                const offOption = await this.UTILS.waitForElement(this.SELECTORS.timerOptionOffId, 2000);
                
                this.log("Пункт знайдено. Клікаю...");
                offOption.click();

                // 5. Чекаємо поки меню зникне і текст оновиться
                this.log("Чекаю оновлення тексту...");
                await new Promise(r => setTimeout(r, 500));
                
            } catch (e) {
                this.log(`Помилка при спробі клікнути опцію: ${e.message}`);
                // Якщо меню зависло відкритим, спробуємо закрити кліком по кнопці
                timerBtn.click();
            }
            
            // Якщо це не остання спроба, даємо трохи часу перед повтором
            if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 500));
        }
        
        this.log("УВАГА: Не вдалося вимкнути таймер після всіх спроб.");
    },

    createSingleBanner: function(text) {
        return new Promise(async (resolve, reject) => {
            try {
                // 1. Відкрити форму
                this.log("Відкриваю форму...");
                let createBtn = document.querySelector(this.SELECTORS.createBannerButton);
                if (!createBtn) {
                     createBtn = await this.UTILS.waitForElement(this.SELECTORS.createBannerButton, 2000);
                }
                createBtn.click();
                
                // 2. Знайти поля
                const form = await this.UTILS.waitForElement(this.SELECTORS.createBannerForm, 3000);
                const textarea = form.querySelector('textarea');
                const addButton = form.querySelector('button[type="submit"]');
                
                // 3. Заповнити текст
                this.log("Вставляю текст...");
                textarea.focus();
                textarea.value = text;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                
                // 4. ТАЙМЕР (з retry логікою)
                await this.setTimerToOff();

                // 5. Натиснути Add
                this.log("Натискаю Add Banner...");
                if (addButton.disabled) await new Promise(r => setTimeout(r, 200));
                addButton.click();
                
                // 6. Чекаємо появи
                this.log("Чекаю появи нового банера...");
                await this.UTILS.waitForNewBanner(text, 5000);
                
                // 7. Очистка
                if (document.querySelector(this.SELECTORS.createBannerForm)) {
                    this.log("Закриваю форму (Cancel)...");
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