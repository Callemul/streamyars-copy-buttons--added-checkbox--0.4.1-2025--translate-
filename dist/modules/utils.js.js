import { SYH_STORAGE } from "/modules/storage.ts.js";

export const SYH_UTILS = {
    SELECTORS: null,
    init: function(config) {
        this.SELECTORS = config.SELECTORS;
    },

    // Посилання на централізований адаптер сховища
    get storage() {
        return SYH_STORAGE || window.SYH_STORAGE;
    },

    getTodayDateString: function() {
        return new Date().toLocaleDateString('sv-SE');
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

    // Розумний крос-пошук: точний збіг, двостороння транслітерація, нечіткий фаззі-пошук та автоматична зміна розкладки
    smartSearch: function(query, targetText) {
        if (!query) return true;
        if (!targetText) return false;

        // 1. Створюємо "Супер-рядок" цільового тексту, який містить всі його варіації
        const rawTarget = targetText.toLowerCase();
        const normTarget = this.normalizeText(rawTarget);
        const transTarget = this.transliterate(rawTarget);
        const layoutTarget = this.switchKeyboardLayout(rawTarget);
        const fuzzyTarget = this.toFuzzy(rawTarget);
        const fuzzyTransTarget = this.toFuzzy(transTarget);

        const fullTarget = normTarget + " " + transTarget + " " + layoutTarget + " " + fuzzyTarget + " " + fuzzyTransTarget;

        const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);

        return queryWords.every(word => {
            // 2. Створюємо всі варіації для кожного слова з пошукового запиту
            const normWord = this.normalizeText(word);
            const transWord = this.transliterate(word);
            const layoutWord = this.switchKeyboardLayout(word);
            const fuzzyWord = this.toFuzzy(word);

            // 3. Якщо хоча б одна варіація слова є в Супер-рядку — це збіг
            return fullTarget.includes(normWord) || 
                   fullTarget.includes(transWord) || 
                   fullTarget.includes(layoutWord) ||
                   (fuzzyWord && fullTarget.includes(fuzzyWord));
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
        // Картування з підтримкою дифтонгів та гнучкої транслітерації
        const map = {
            'shch':'шч','ch':'ч','sh':'ш','zh':'ж','ts':'ц','tz':'ц','cz':'ц','kh':'х','ph':'ф','th':'т',
            'ya':'я','ia':'я','ja':'я','yu':'ю','iu':'ю','ju':'ю','ye':'є','ie':'є','je':'є','yo':'ё','jo':'йо',
            'ai':'ай','ay':'ай','aj':'ай','ei':'ей','ey':'ей','ej':'ей','oi':'ой','oy':'ой','oj':'ой','ui':'уй','uy':'уй','uj':'уй',
            'a':'а','b':'б','v':'в','g':'г','d':'д','e':'е','z':'з','i':'и','y':'й','k':'к','l':'л','m':'м','n':'н','o':'о','p':'п','r':'р','s':'с','t':'т','u':'у','f':'ф','h':'х',
            'c':'ц','w':'в','x':'кс','q':'к','j':'дж'
        };
        let res = "";
        let i = 0;
        const s = str.toLowerCase();
        while (i < s.length) {
            if (i <= s.length - 4 && map[s.substr(i, 4)]) {
                res += map[s.substr(i, 4)];
                i += 4;
            } else if (i <= s.length - 2 && map[s.substr(i, 2)]) {
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

    // Фонологічна уніфікація голосних та голосних/приголосних варіацій для нечіткого пошуку
    toFuzzy: function(str) {
        if (!str) return "";
        let s = str.toLowerCase().trim();

        const multiMap = [
            ['shch', 'щ'], ['ch', 'ч'], ['sh', 'ш'], ['zh', 'ж'],
            ['ts', 'ц'], ['tz', 'ц'], ['cz', 'ц'],
            ['kh', 'х'], ['ph', 'ф'], ['th', 'т'],
            ['ya', 'я'], ['ia', 'я'], ['ja', 'я'],
            ['yu', 'ю'], ['iu', 'ю'], ['ju', 'ю'],
            ['ye', 'е'], ['ie', 'е'], ['je', 'е'],
            ['yo', 'е'], ['jo', 'е'],
            ['ai', 'аи'], ['ay', 'аи'], ['aj', 'аи'],
            ['ei', 'еи'], ['ey', 'еи'], ['ej', 'еи'],
            ['oi', 'ои'], ['oy', 'ои'], ['oj', 'ои'],
            ['ui', 'уи'], ['uy', 'уи'], ['uj', 'уи'],
            ['yi', 'и'], ['yy', 'и'], ['yj', 'и']
        ];

        for (const [pattern, replacement] of multiMap) {
            s = s.replaceAll(pattern, replacement);
        }

        const singleMap = {
            'a': 'а', 'b': 'б', 'v': 'в', 'w': 'в', 'g': 'г', 'd': 'д', 'e': 'е',
            'z': 'з', 'i': 'и', 'y': 'и', 'j': 'и', 'k': 'к', 'l': 'л', 'm': 'м',
            'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р', 's': 'с', 't': 'т', 'u': 'у',
            'f': 'ф', 'h': 'х', 'c': 'с', 'q': 'к', 'x': 'кс',
            'й': 'и', 'і': 'и', 'ї': 'и', 'ы': 'и',
            'є': 'е', 'ё': 'е', 'э': 'е',
            'ь': '', 'ъ': '', '\'': ''
        };

        let res = "";
        for (let i = 0; i < s.length; i++) {
            const char = s[i];
            res += singleMap[char] !== undefined ? singleMap[char] : char;
        }

        return res;
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
    },

    /**
     * Очищає вхідний текст від службових заголовків Telegram (таймкод + ім'я відправника).
     * 
     * Формат Telegram заголовків: `[DD.MM.YYYY HH:MM] Ім'я / Назва каналу:`
     * Наприклад: `[10.07.2026 20:44] Віталій . Время перемен:`
     * 
     * ВАЖЛИВО ДЛЯ ШІ / РОЗРОБНИКІВ:
     * При копіюванні довгих повідомлень або декількох повідомлень поспіль з Telegram,
     * таймкоди та ніки можуть вставлятися як на початку тексту, так і всередині одного питання
     * (наприклад, якщо Telegram розбив питання на 2 повідомлення при надсиланні).
     * 
     * Ця функція ОБОВ'ЯЗКОВО повинна викликатися на самому початку обробки списку банерів/питань
     * до розділення за секціями, щоб запобігти розриву суцільного питання на окремі блоки.
     * 
     * @param {string} text - Сирий текст, скопійований з Telegram.
     * @returns {string} Очищений текст без службових таймкодів Telegram.
     */
    cleanTelegramHeaders: function(text) {
        if (!text) return "";
        const tgHeaderRegex = /(?:^|\r?\n)\s*\[\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\](?:[^\r\n:]*:\s*|[^\r\n]*(?=\r?\n|$))/g;
        return text.replace(tgHeaderRegex, (match, offset) => {
            return offset === 0 ? "" : "\n";
        }).trim();
    }
};

if (typeof window !== 'undefined') {
    window.cleanTelegramHeaders = SYH_UTILS.cleanTelegramHeaders;
    window.SYH_UTILS = SYH_UTILS;
}