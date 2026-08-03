import { SYH_STORAGE, STORAGE_KEYS } from './storage';

export interface SyhUtils {
    SELECTORS: Record<string, string | string[]> | null;
    readonly storage: any;
    init(config: { SELECTORS: Record<string, string | string[]> }): void;
    getTodayDateString(): string;
    copyAndShowBanner(textToCopy: string, bannerMessage?: string): void;
    waitForElement(selector: string | string[], timeout?: number): Promise<Element>;
    waitForElementToDisappear(selector: string, timeout?: number): Promise<void>;
    waitForNewBanner(bannerText: string, timeout?: number): Promise<Element>;
    clickElementByText(text: string, timeout?: number): Promise<void>;
    smartSearch(query: string | null | undefined, targetText: string | null | undefined): boolean;
    normalizeText(str: string | null | undefined): string;
    transliterate(str: string | null | undefined): string;
    toFuzzy(str: string | null | undefined): string;
    switchKeyboardLayout(str: string | null | undefined): string;
    saveBannerCategory(text: string, type: string): Promise<void>;
    cleanTelegramHeaders(text: string | null | undefined): string;
    isExtensionValid(): boolean;
}

export const SYH_UTILS: SyhUtils = {
    SELECTORS: null,

    init: function(config: { SELECTORS: Record<string, string | string[]> }): void {
        this.SELECTORS = config ? config.SELECTORS : null;
    },

    get storage(): any {
        return (this as any)._storage || SYH_STORAGE;
    },

    isExtensionValid: function(): boolean {
        try {
            return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
        } catch {
            return false;
        }
    },

    getTodayDateString: function(): string {
        return new Date().toLocaleDateString('sv-SE');
    },

    copyAndShowBanner: function(textToCopy: string, bannerMessage?: string): void {
        if (!textToCopy) { console.error("No text provided to copy."); return; }
        navigator.clipboard.writeText(textToCopy).then(() => {
            document.querySelectorAll('.copy-success-banner').forEach(el => el.remove());
            const banner = document.createElement('div');
            banner.className = 'copy-success-banner';
            banner.textContent = bannerMessage || 'Скопійовано!';
            document.body.appendChild(banner);

            requestAnimationFrame(() => banner.classList.add('visible'));
            setTimeout(() => {
                banner.classList.remove('visible');
                setTimeout(() => banner.remove(), 300);
            }, 2500);
        }).catch(err => console.error('Copy failed: ', err));
    },

    waitForElement: function(selector: string | string[], timeout = 3000): Promise<Element> {
        return new Promise((resolve, reject) => {
            const interval = 100;
            let elapsedTime = 0;
            const timer = setInterval(() => {
                let element: Element | null = null;
                if (typeof selector === 'string') {
                    element = document.querySelector(selector);
                } else {
                    for (const sel of selector) {
                        element = document.querySelector(sel);
                        if (element) break;
                    }
                }
                if (element && (element as HTMLElement).offsetWidth > 0 && (element as HTMLElement).offsetHeight > 0) {
                    clearInterval(timer);
                    resolve(element);
                    return;
                }
                elapsedTime += interval;
                if (elapsedTime >= timeout) {
                    clearInterval(timer);
                    reject(new Error(`Element [${Array.isArray(selector) ? selector.join(', ') : selector}] not found or not visible within ${timeout}ms`));
                }
            }, interval);
        });
    },

    waitForElementToDisappear: function(selector: string, timeout = 3000): Promise<void> {
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

    waitForNewBanner: function(bannerText: string, timeout = 5000): Promise<Element> {
        return new Promise((resolve, reject) => {
            const interval = 100;
            let elapsedTime = 0;
            const timer = setInterval(() => {
                const selector = this.SELECTORS?.bannerText || '[class*="Banner__BannerText"]';
                const banners = document.querySelectorAll(selector);
                for (const banner of banners) {
                    if (banner.textContent?.trim() === bannerText.trim()) {
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

    clickElementByText: function(text: string, timeout = 2000): Promise<void> {
        return new Promise((resolve) => {
            const interval = 100;
            let elapsedTime = 0;
            const timer = setInterval(() => {
                const xpath = `//*[contains(text(), '${text}')]`;
                const matchingElement = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as HTMLElement | null;

                if (matchingElement && (matchingElement as HTMLElement).offsetWidth > 0 && (matchingElement as HTMLElement).offsetHeight > 0) {
                    matchingElement.click();
                    clearInterval(timer);
                    resolve();
                    return;
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

    smartSearch: function(query: string | null | undefined, targetText: string | null | undefined): boolean {
        if (!query) return true;
        if (!targetText) return false;

        const rawTarget = targetText.toLowerCase();
        const normTarget = this.normalizeText(rawTarget);
        const transTarget = this.transliterate(rawTarget);
        const layoutTarget = this.switchKeyboardLayout(rawTarget);
        const fuzzyTarget = this.toFuzzy(rawTarget);
        const fuzzyTransTarget = this.toFuzzy(transTarget);

        const fullTarget = `${normTarget} ${transTarget} ${layoutTarget} ${fuzzyTarget} ${fuzzyTransTarget}`;
        const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);

        return queryWords.every(word => {
            const normWord = this.normalizeText(word);
            if (fullTarget.includes(normWord)) return true;

            const transWord = this.transliterate(word);
            if (fullTarget.includes(transWord)) return true;

            const layoutWord = this.switchKeyboardLayout(word);
            if (fullTarget.includes(layoutWord)) return true;

            const fuzzyWord = this.toFuzzy(word);
            return !!fuzzyWord && fullTarget.includes(fuzzyWord);
        });
    },

    normalizeText: function(str: string | null | undefined): string {
        if (!str) return "";
        let normalized = str.toLowerCase().trim();
        const replacementMap: Record<string, string> = {
            'a': 'а', 'e': 'е', 'o': 'о', 'i': 'і', 'c': 'с', 'p': 'р', 'x': 'х', 'y': 'у', 't': 'т', 'h': 'н'
        };
        for (const char in replacementMap) {
            normalized = normalized.split(char).join(replacementMap[char]);
        }
        return normalized;
    },

    transliterate: function(str: string | null | undefined): string {
        if (!str) return "";
        const map: Record<string, string> = {
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
            if (i <= s.length - 4 && map[s.substring(i, i + 4)]) {
                res += map[s.substring(i, i + 4)];
                i += 4;
            } else if (i <= s.length - 2 && map[s.substring(i, i + 2)]) {
                res += map[s.substring(i, i + 2)];
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

    toFuzzy: function(str: string | null | undefined): string {
        if (!str) return "";
        let s = str.toLowerCase().trim();

        const multiMap: [string, string][] = [
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
            s = s.split(pattern).join(replacement);
        }

        const singleMap: Record<string, string> = {
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

    switchKeyboardLayout: function(str: string | null | undefined): string {
        if (!str) return "";
        const layoutMap: Record<string, string> = {
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

    saveBannerCategory: function(text: string, type: string): Promise<void> {
        return new Promise(resolve => {
            const storageAdapter = SYH_UTILS.storage;
            storageAdapter.get([STORAGE_KEYS.CATEGORIES], (result: Record<string, any>) => {
                const db = result[STORAGE_KEYS.CATEGORIES] || {};
                db[text] = type;
                storageAdapter.set({ [STORAGE_KEYS.CATEGORIES]: db }, resolve);
            });
        });
    },

    cleanTelegramHeaders: function(text: string | null | undefined, cleaningLog?: any[]): string {
        if (!text) return "";
        const tgHeaderRegex = /(?:^|\r?\n)\s*\[\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\](?:[^\r\n:]*:\s*|[^\r\n]*(?=\r?\n|$))/g;
        const removedMatches: string[] = [];
        const cleaned = text.replace(tgHeaderRegex, (match, offset) => {
            removedMatches.push(match.trim());
            return offset === 0 ? "" : "\n";
        }).trim();

        if (cleaningLog && removedMatches.length > 0) {
            cleaningLog.push({
                before: text.trim(),
                after: cleaned,
                removed: removedMatches.join(' | ')
            });
        }
        return cleaned;
    }
};
