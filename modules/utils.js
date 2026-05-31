window.SYH_UTILS = {
    SELECTORS: null,
    init: function(config) {
        this.SELECTORS = config.SELECTORS;
    },

    // Централізований адаптер для роботи зі сховищем із підтримкою localStorage як fallback
    storage: (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) 
        ? chrome.storage.local 
        : {
            get: function(keys, cb) {
                const res = {};
                const arr = Array.isArray(keys) ? keys : [keys];
                arr.forEach(k => {
                    try {
                        const val = localStorage.getItem(k);
                        res[k] = val ? JSON.parse(val) : null;
                    } catch(e) { res[k] = null; }
                });
                cb(res);
            },
            set: function(items, cb) {
                for (const k in items) {
                    try {
                        localStorage.setItem(k, JSON.stringify(items[k]));
                    } catch(e) {}
                }
                if (cb) cb();
            },
            remove: function(keys, cb) {
                const arr = Array.isArray(keys) ? keys : [keys];
                arr.forEach(k => {
                    try {
                        localStorage.removeItem(k);
                    } catch(e) {}
                });
                if (cb) cb();
            }
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
    },

    clickElementByText: function(text, timeout = 2000) {
        return new Promise((resolve, reject) => {
            const interval = 100;
            let elapsedTime = 0;
            const timer = setInterval(() => {
                const xpath = `//*[contains(text(), '${text}')]`;
                const matchingElement = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

                if (matchingElement && $(matchingElement).is(':visible')) {
                    matchingElement.click();
                    clearInterval(timer);
                    resolve();
                }
                
                elapsedTime += interval;
                if (elapsedTime >= timeout) {
                    clearInterval(timer);
                    console.warn(`SYH: Element with text "${text}" not found.`);
                    resolve();
                }
            }, interval);
        });
    }
};