// modules/utils.js
window.SYH_UTILS = {
    // Залежність, яка буде передана з main.js
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

    // =========================================================================
    // ПОВЕРТАЄМО ВИДАЛЕНУ ФУНКЦІЮ НАЗАД!
    // =========================================================================
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

    waitForNewBanner: function(bannerText, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const interval = 100;
            let elapsedTime = 0;
            const timer = setInterval(() => {
                const banners = document.querySelectorAll(this.SELECTORS.bannerText);
                for (const banner of banners) {
                    if (banner.textContent.trim() === bannerText.trim()) {
                        console.log(`[SYH DEBUG] SUCCESS: Found new banner with text: "${bannerText}"`);
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
};