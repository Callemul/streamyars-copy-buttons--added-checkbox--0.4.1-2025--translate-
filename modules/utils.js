// modules/utils.js
window.SYH_UTILS = {
    SELECTORS: null,
    init: function(config) {
        this.SELECTORS = config.SELECTORS;
    },

    copyAndShowBanner: function(textToCopy, bannerMessage) {
        if (!textToCopy) { console.error("No text provided to copy."); return; }
        navigator.clipboard.writeText(textToCopy).then(() => {
            $('.copy-success-banner').remove();
            const banner = $('<div></div>').addClass('copy-success-banner').text(bannerMessage || `Скопійовано!`).appendTo('body');
            setTimeout(() => banner.addClass('visible'), 10);
            setTimeout(() => {
                banner.removeClass('visible');
                setTimeout(() => banner.remove(), 300);
            }, 2500);
        }).catch(err => console.error('Copy failed: ', err));
    },

    waitForElement: function(selector, timeout = 3000) {
        return new Promise((resolve, reject) => {
            const interval = 100;
            let elapsedTime = 0;
            const timer = setInterval(() => {
                const element = document.querySelector(selector);
                if (element && $(element).is(':visible')) {
                    clearInterval(timer);
                    resolve(element);
                }
                elapsedTime += interval;
                if (elapsedTime >= timeout) {
                    clearInterval(timer);
                    reject(new Error(`Element [${selector}] not found or not visible within ${timeout}ms`));
                }
            }, interval);
        });
    },

    waitForElementToDisappear: function(selector, timeout = 3000) {
        return new Promise((resolve, reject) => {
            const interval = 100;
            let elapsedTime = 0;
            const timer = setInterval(() => {
                if (!document.querySelector(selector)) {
                    clearInterval(timer);
                    resolve();
                }
                elapsedTime += interval;
                if (elapsedTime >= timeout) {
                    clearInterval(timer);
                    reject(new Error(`Element ${selector} did not disappear within ${timeout}ms`));
                }
            }, interval);
        });
    },

    // НОВА ФУНКЦІЯ
    waitForNewBanner: function(bannerText, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const interval = 100;
            let elapsedTime = 0;
            const timer = setInterval(() => {
                const banners = document.querySelectorAll(this.SELECTORS.bannerText);
                for (const banner of banners) {
                    if (banner.textContent.trim() === bannerText.trim()) {
                        clearInterval(timer);
                        resolve(banner);
                        return;
                    }
                }
                
                elapsedTime += interval;
                if (elapsedTime >= timeout) {
                    clearInterval(timer);
                    reject(new Error(`New banner with text "${bannerText}" did not appear within ${timeout}ms`));
                }
            }, interval);
        });
    }
    ,

    // --- НОВА ФУНКЦІЯ ---
    // Шукає елемент за текстом (через XPath) і клікає по ньому
    clickElementByText: function(text, timeout = 2000) {
        return new Promise((resolve, reject) => {
            const interval = 100;
            let elapsedTime = 0;
            const timer = setInterval(() => {
                // XPath шукає будь-який елемент (*), що містить заданий текст
                const xpath = `//*[contains(text(), '${text}')]`;
                const matchingElement = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

                if (matchingElement && $(matchingElement).is(':visible')) {
                    // Перевіряємо, чи це клікабельний елемент або його батько
                    matchingElement.click();
                    clearInterval(timer);
                    resolve();
                }
                
                elapsedTime += interval;
                if (elapsedTime >= timeout) {
                    clearInterval(timer);
                    // Не реджектимо жорстко, щоб не ламати весь процес, якщо меню не знайдено, але виводимо в консоль
                    console.warn(`SYH: Element with text "${text}" not found.`);
                    resolve(); // Продовжуємо навіть якщо не знайшли (таймер залишиться як був)
                }
            }, interval);
        });
    }
};


