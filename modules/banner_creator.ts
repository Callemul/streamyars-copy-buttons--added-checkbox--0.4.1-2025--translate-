import { SYH_CONFIG } from './config.ts';
import { SYH_UTILS } from './utils.ts';
import { SYH_PARSERS } from './parsers.ts';

export interface BannerItem {
    text: string;
    category: string;
    isStandard: boolean;
}

export interface SyhBannerCreator {
    SELECTORS: Record<string, string> | null;
    UTILS: any;
    PARSERS: any;

    init(config?: any, utils?: any, parsers?: any): void;
    log(msg: string): void;
    processAndCreateBanners(rawText: string): Promise<void>;
    clickCancelButton(form: Element): void;
    ensureCleanStart(): Promise<void>;
    finalCleanup(): Promise<void>;
    createSingleBanner(text: string): Promise<void>;
}

export const SYH_BANNER_CREATOR: SyhBannerCreator = {
    SELECTORS: null,
    UTILS: null,
    PARSERS: null,

    init: function(config?: any, utils?: any, parsers?: any): void {
        this.SELECTORS = config ? config.SELECTORS : (SYH_CONFIG ? SYH_CONFIG.SELECTORS : null);
        this.UTILS = utils || SYH_UTILS;
        this.PARSERS = parsers || SYH_PARSERS;
    },

    log: function(msg: string): void {
        console.log(`[SYH] ${msg}`);
    },

    processAndCreateBanners: async function(rawText: string): Promise<void> {
        let bannersToCreate: BannerItem[] = [];
        let hasStandardFormat = false;

        // 1. Очистка Telegram-заголовків (таймкод + нік відправника):
        const cleaner = (this.UTILS && this.UTILS.cleanTelegramHeaders) 
            ? this.UTILS.cleanTelegramHeaders 
            : ((window as any).cleanTelegramHeaders || ((t: string) => t));
        const cleanedText = cleaner(rawText);

        // 2. Розбиваємо очищений текст на логічні блоки/повідомлення за заголовками секцій
        let messages = cleanedText.split(/(?:^|\r?\n)(?=[❓🙏]|Вопросы к|Вопросы на|Предложения по|Саша, привет|Виталик, привет)/iu).map((m: string) => m.trim()).filter(Boolean);
        if (messages.length === 0) messages = [cleanedText];

        const parseBlock = (text: string, defaultCat: string): BannerItem[] => {
            if (!text.trim()) return [];
            let blockCategory = defaultCat;
            let blockQuestions: string[] = [];
            let isStd = false;

            const firstLine = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0)[0] || "";
            const isQuestionStart = /^(?:\d+[.)]|(?:\d+\uFE0F?\u20E3|🔟)|🔹)/.test(firstLine);

            if (!isQuestionStart && firstLine) {
                const headerMatch = firstLine.split(/(?:^|\s)(?=\d+[.)])|(?:^|\s)(?=(?:\d+\uFE0F?\u20E3|🔟))|(?=🔹)/);
                const headerText = (headerMatch[0] || "").trim().toUpperCase();
                if (headerText.includes("МОЛИТВ") || headerText.includes("ПРОХАН") || headerText.includes("🙏")) {
                    blockCategory = "prayer";
                } else if (headerText.includes("СУББОТ") || headerText.includes("СУБОТ") || headerText.includes("УРОК")) {
                    blockCategory = "stream";
                } else if (headerText.includes("ВОПРОС") || headerText.includes("ПИТАН") || headerText.includes("???") || headerText.includes("❓")) {
                    blockCategory = "audience";
                }
            }

            if (/памятн|пам'ятн|молчанов|опарин|опарін|молчанів/i.test(text) && !/(?:^|\s)\d+[.)]+(?!\d)/.test(text) && !/(?:\d+\uFE0F?\u20E3|🔟)/.test(text)) {
                this.log("Формат: Суботня Школа (без нумерації)");
                blockQuestions = this.PARSERS.parseSabbathSchoolUnnumberedQuestions(text);
                blockCategory = "stream"; 
            } else if (/(?:\d+\uFE0F?\u20E3|🔟)/.test(text)) {
                this.log("Формат: Емодзі 1️⃣");
                blockQuestions = this.PARSERS.parseEmojiNumberedQuestions(text);
            } else {
                this.log("Формат: Стандартний 1.");
                blockQuestions = this.PARSERS.parseStandardNumberedQuestions(text);
                isStd = true;
            }

            return blockQuestions.map((q: string) => ({ text: q, category: blockCategory, isStandard: isStd }));
        };

        try {
            for (const msg of messages) {
                const parts = msg.split(/(?:^|\r?\n)\s*🙏+[^\r\n]*(?:МОЛИТ|ПРОХАН)[^\r\n]*/iu);
                const questionsText = parts[0] || "";
                const prayersText = parts[1] || "";

                if (questionsText.trim()) {
                    const qItems = parseBlock(questionsText, "stream");
                    bannersToCreate = bannersToCreate.concat(qItems);
                    if (qItems.some(item => item.isStandard)) {
                        hasStandardFormat = true;
                    }
                }
                if (prayersText.trim()) {
                    const pItems = parseBlock(prayersText, "prayer");
                    bannersToCreate = bannersToCreate.concat(pItems);
                }
            }
        } catch (error: any) {
            alert(error.message);
            return;
        }

        if (bannersToCreate.length === 0) {
            alert("Питання не знайдені.");
            return;
        }

        await this.ensureCleanStart(); 

        let createdCount = 0;
        
        for (const [index, item] of bannersToCreate.entries()) {
            this.log(`>>> Обробка банера ${index + 1} з ${bannersToCreate.length}`);
            try {
                const pauseTime = index === 0 ? 600 : 250;
                await new Promise(r => setTimeout(r, pauseTime));
                
                // Очищення дужок з авторами, навіть якщо дужка не закрита (наприклад, " ( Опарин , Молчанов")
                const cleanQuestion = item.text.replace(/\s*\(\s*(?:Опарин|Молчанов|Василенко|Жаловага|Молчанів|Опарін).*?$/gi, "").trim();

                await this.createSingleBanner(cleanQuestion);
                
                const utils = this.UTILS || (window as any).SYH_UTILS;
                if (utils && typeof utils.saveBannerCategory === 'function') {
                    await utils.saveBannerCategory(cleanQuestion, item.category);
                }

                createdCount++;
            } catch (error: any) {
                console.error(error);
                this.log(`Помилка: ${error.message}`);
                await this.finalCleanup();
            }
        }
        
        if (hasStandardFormat) {
            this.log("Додаю розділювач...");
            await new Promise(r => setTimeout(r, 300));
            await this.createSingleBanner("----Питання глядачів----");
        }

        await this.finalCleanup();

        const ui = this.UI || (window as any).SYH_UI;
        if (ui && typeof ui.filterBanners === 'function') {
            ui.filterBanners();
        }

        alert(`Готово! Створено: ${createdCount}.`);
    },

    clickCancelButton: function(form: Element): void {
        const buttons = Array.from(form.querySelectorAll('button'));
        const cancelButton = buttons.find(b => 
            b.type !== 'submit' && 
            b.id !== 'banner-timer-dropdown-button' && 
            !b.closest('#banner-timer-dropdown-button')
        );
        if (cancelButton) {
            cancelButton.click();
        }
    },

    ensureCleanStart: async function(): Promise<void> {
        this.log("Перевірка на чистоту старту...");
        const form = this.SELECTORS?.createBannerForm ? document.querySelector(this.SELECTORS.createBannerForm) : null;
        
        if (form) {
            this.log("Форма була відкрита. Закриваю...");
            this.clickCancelButton(form);
            await new Promise(r => setTimeout(r, 300));
        }
    },

    finalCleanup: async function(): Promise<void> {
        const form = this.SELECTORS?.createBannerForm ? document.querySelector(this.SELECTORS.createBannerForm) : null;
        if (form) {
            this.log("Прибирання: Закриваю форму...");
            this.clickCancelButton(form);
        }
    },

    createSingleBanner: function(text: string): Promise<void> {
        return new Promise((resolve, reject) => {
            (async () => {
                try {
                    let createBtn: HTMLElement | null = this.SELECTORS?.createBannerButton ? document.querySelector(this.SELECTORS.createBannerButton) : null;
                    if (!createBtn) {
                        createBtn = await this.UTILS.waitForElement(this.SELECTORS?.createBannerButton, 2000);
                    }
                    if (!createBtn) {
                        throw new Error("Create banner button not found");
                    }
                    createBtn.click();
                    
                    const form: Element | null = await this.UTILS.waitForElement(this.SELECTORS?.createBannerForm, 2000);
                    if (!form) {
                        throw new Error("Create banner form not found");
                    }
                    const textarea = form.querySelector('textarea') as HTMLTextAreaElement | null;
                    const addButton = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
                    
                    if (!textarea || !addButton) {
                        throw new Error("Textarea or submit button not found in form");
                    }

                    textarea.focus();
                    textarea.value = text;
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                    textarea.blur(); 
                    
                    const waitTime = text.length > 50 ? 300 : 150;
                    await new Promise(r => setTimeout(r, waitTime));

                    if (addButton.disabled) await new Promise(r => setTimeout(r, 200));
                    addButton.click();
                    
                    await this.UTILS.waitForNewBanner(text, 5000);
                    
                    if (this.SELECTORS?.createBannerForm && document.querySelector(this.SELECTORS.createBannerForm)) {
                        this.clickCancelButton(form);
                    }

                    resolve();
                } catch (error) {
                    reject(error);
                }
            })();
        });
    }
};

if (typeof window !== 'undefined') {
    (window as any).SYH_BANNER_CREATOR = SYH_BANNER_CREATOR;
}
