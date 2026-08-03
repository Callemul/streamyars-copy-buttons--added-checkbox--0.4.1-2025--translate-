import { SYH_CONFIG, resolveSelector } from './config';
import { SYH_UTILS } from './utils';
import { SYH_PARSERS, EMOJI_NUMBER_CONTAINS_REGEX } from './parsers';
import { SABBATH_SCHOOL_KEYWORDS_REGEX, SPEAKER_SUFFIX_CLEANUP_REGEX } from './channel_config';

export interface BannerItem {
    text: string;
    category: string;
    isStandard: boolean;
}

import type { SyhConfig } from './config';
import type { SyhUtils } from './utils';
import type { SyhParsers } from './parsers';

export interface SyhBannerCreator {
    SELECTORS: Record<string, any> | null;
    UTILS: SyhUtils;
    PARSERS: SyhParsers;
    UI?: any;

    init(config?: SyhConfig, utils?: SyhUtils, parsers?: SyhParsers): void;
    log(msg: string): void;
    processAndCreateBanners(rawText: string): Promise<void>;
    clickCancelButton(form: Element): void;
    ensureCleanStart(): Promise<void>;
    finalCleanup(): Promise<void>;
    createSingleBanner(text: string): Promise<void>;
}

export const SYH_BANNER_CREATOR: SyhBannerCreator = {
    SELECTORS: null,
    UTILS: SYH_UTILS,
    PARSERS: SYH_PARSERS,

    init: function(config?: SyhConfig, utils?: SyhUtils, parsers?: SyhParsers): void {
        this.SELECTORS = config ? config.SELECTORS : SYH_CONFIG.SELECTORS;
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
        const cleaner = this.UTILS.cleanTelegramHeaders ? this.UTILS.cleanTelegramHeaders.bind(this.UTILS) : ((t: string) => t);
        const cleanedText = cleaner(rawText);

        // 2. Розбиваємо очищений текст на логічні блоки/повідомлення за заголовками секцій
        let messages = cleanedText.split(/(?:^|\r?\n)(?=[❓🙏]|Вопросы к|Вопросы на|Предложения по|Саша, привет|Виталик, привет)/iu).map((m: string) => m.trim()).filter(Boolean);
        if (messages.length === 0) messages = [cleanedText];

        const parseBlock = (text: string, defaultCat: string): BannerItem[] => {
            if (!text.trim()) return [];
            let blockCategory = defaultCat;
            let blockQuestions: string[];
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

            if (SABBATH_SCHOOL_KEYWORDS_REGEX.test(text) && !/(?:^|\s)\d+[.)]+(?!\d)/.test(text) && !EMOJI_NUMBER_CONTAINS_REGEX.test(text)) {
                this.log("Формат: Суботня Школа (без нумерації)");
                blockQuestions = this.PARSERS.parseSabbathSchoolUnnumberedQuestions(text);
                blockCategory = "stream"; 
            } else if (EMOJI_NUMBER_CONTAINS_REGEX.test(text)) {
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
            this.UTILS.copyAndShowBanner(error.message, "⚠️ Помилка створення банерів");
            return;
        }

        if (bannersToCreate.length === 0) {
            this.UTILS.copyAndShowBanner("Перевірте вхідний текст та спробуйте ще раз.", "⚠️ Питання не знайдені");
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
                const cleanQuestion = item.text.replace(SPEAKER_SUFFIX_CLEANUP_REGEX, "").trim();

                await this.createSingleBanner(cleanQuestion);
                
                if (this.UTILS && typeof this.UTILS.saveBannerCategory === 'function') {
                    await this.UTILS.saveBannerCategory(cleanQuestion, item.category);
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

        if (this.UI && typeof this.UI.filterBanners === 'function') {
            this.UI.filterBanners();
        }

        this.UTILS.copyAndShowBanner(`Успішно створено банерів: ${createdCount}`, "🎉 Створення завершено!");
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
        const form = resolveSelector(this.SELECTORS?.createBannerForm as any);
        
        if (form) {
            this.log("Форма була відкрита. Закриваю...");
            this.clickCancelButton(form);
            await new Promise(r => setTimeout(r, 300));
        }
    },

    finalCleanup: async function(): Promise<void> {
        const form = resolveSelector(this.SELECTORS?.createBannerForm as any);
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

// Pure ESM Module Export
