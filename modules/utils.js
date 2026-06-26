window.SYH_UTILS = {
    SELECTORS: null,
    init: function(config) {
        this.SELECTORS = config.SELECTORS;
    },

    // Централізований адаптер для роботи зі сховищем із підтримкою localStorage як fallback
    // Централізований адаптер із ЗАХИСТОМ ВІД ЗОМБІ-КОНТЕКСТУ (Extension context invalidated)
    // Централізований адаптер із ЗАХИСТОМ ВІД ЗОМБІ-КОНТЕКСТУ (Безшумний)
    storage: {
        get: function(keys, cb) {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && chrome.runtime && chrome.runtime.id) {
                try {
                    chrome.storage.local.get(keys, cb);
                    return;
                } catch(e) {} // Без console.warn, щоб не дратувати панель розширень
            }
            const res = {};
            const arr = Array.isArray(keys) ? keys : [keys];
            arr.forEach(k => {
                try {
                    const val = localStorage.getItem(k);
                    res[k] = val ? JSON.parse(val) : null;
                } catch(e) { res[k] = null; }
            });
            if (cb) cb(res);
        },
        set: function(items, cb) {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && chrome.runtime && chrome.runtime.id) {
                try {
                    chrome.storage.local.set(items, cb);
                    return;
                } catch(e) {}
            }
            for (const k in items) {
                try { localStorage.setItem(k, JSON.stringify(items[k])); } catch(e) {}
            }
            if (cb) cb();
        },
        remove: function(keys, cb) {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && chrome.runtime && chrome.runtime.id) {
                try {
                    chrome.storage.local.remove(keys, cb);
                    return;
                } catch(e) {}
            }
            const arr = Array.isArray(keys) ? keys : [keys];
            arr.forEach(k => {
                try { localStorage.removeItem(k); } catch(e) {}
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
    },

    // Розумний крос-пошук: точний збіг, двостороння транслітерація та автоматична зміна розкладки
    smartSearch: function(query, targetText) {
        if (!query) return true;
        if (!targetText) return false;

        // 1. Створюємо "Супер-рядок" цільового тексту, який містить всі його варіації
        const normTarget = this.normalizeText(targetText);
        const transTarget = this.transliterate(normTarget);
        const layoutTarget = this.switchKeyboardLayout(normTarget);
        const fullTarget = normTarget + " " + transTarget + " " + layoutTarget;

        const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);

        return queryWords.every(word => {
            // 2. Створюємо всі варіації для кожного слова з пошукового запиту
            const normWord = this.normalizeText(word);
            const transWord = this.transliterate(normWord);
            const layoutWord = this.switchKeyboardLayout(normWord);

            // 3. Якщо хоча б одна варіація слова є в Супер-рядку — це збіг
            return fullTarget.includes(normWord) || 
                   fullTarget.includes(transWord) || 
                   fullTarget.includes(layoutWord);
        });
    },

    normalizeText: function(str) {
        if (!str) return "";
        let normalized = str.toLowerCase().trim();
        const replacementMap = {
            'a': 'а', 'e': 'е', 'o': 'о', 'i': 'і', 'c': 'с', 'p': 'р', 'x': 'х', 'y': 'у', 't': 'т', 'h': 'н'
        };
        for (const char in replacementMap) {
            normalized = normalized.replaceAll(char, replacementMap[char]);
        }
        return normalized;
    },

    transliterate: function(str) {
        if (!str) return "";
        // ФІКС 2 та 3: Додано всі англійські літери (w, q, x, j, c), щоб обробляти Artem-Waiting та Natalia
        const map = {
            'a':'а','b':'б','v':'в','g':'г','d':'д','e':'е','yo':'ё','zh':'ж','z':'з','i':'и','y':'й','k':'к','l':'л','m':'м','n':'н','o':'о','p':'п','r':'р','s':'с','t':'т','u':'у','f':'ф','h':'х','ts':'ц','ch':'ч','sh':'ш','shch':'щ','yu':'ю','ya':'я',
            'c':'ц','w':'в','x':'кс','q':'к','j':'дж'
        };
        let res = "";
        let i = 0;
        const s = str.toLowerCase();
        while (i < s.length) {
            if (i < s.length - 1 && map[s.substr(i, 2)]) {
                res += map[s.substr(i, 2)];
                i += 2;
            } else if (map[s[i]]) {
                res += map[s[i]];
                i++;
            } else {
                res += s[i];
                i++;
            }
        }
        return this.normalizeText(res);
    },

    switchKeyboardLayout: function(str) {
        if (!str) return "";
        const layoutMap = {
            'q':'й','w':'ц','e':'у','r':'к','t':'е','y':'н','u':'г','i':'ш','o':'щ','p':'з','[':'х',']':'ї',
            'a':'ф','s':'і','d':'в','f':'а','g':'п','h':'р','j':'о','k':'л','l':'д',';':'ж','\'':'є',
            'z':'я','x':'ч','c':'с','v':'м','b':'и','n':'т','m':'ь',',':'б','.':'ю'
        };
        let res = "";
        const s = str.toLowerCase();
        for (let i = 0; i < s.length; i++) {
            res += layoutMap[s[i]] || s[i];
        }
        return this.normalizeText(res);
    },

    saveBannerCategory: function(text, type) {
        return new Promise(resolve => {
            if (!this.storage) {
                console.error("SYH_UTILS: Не знайдено адаптер сховища!");
                resolve();
                return;
            }

            this.storage.get(['syh_banner_categories'], (result) => {
                let db = result.syh_banner_categories || {};
                db[text] = type;
                this.storage.set({ 'syh_banner_categories': db }, resolve);
            });
        });
    }
};