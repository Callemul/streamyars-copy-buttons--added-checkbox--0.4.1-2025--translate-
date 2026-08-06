import { SYH_CONFIG, resolveSelector } from './config';
import { SYH_UTILS } from './utils';
import { SYH_PARSERS, EMOJI_NUMBER_CONTAINS_REGEX, splitPrayerSection, QUESTION_START_REGEX, QUESTION_SPLIT_REGEX, STANDARD_NUMBER_START_REGEX, SECTION_HEADER_SPLIT_REGEX } from './parsers';
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

export function detectBlockCategory(firstLine: string, defaultCat: string): string {
    const isQuestionStart = QUESTION_START_REGEX.test(firstLine);
    if (!isQuestionStart && firstLine) {
        const headerMatch = firstLine.split(QUESTION_SPLIT_REGEX);
        const headerText = (headerMatch[0] || "").trim().toUpperCase();
        if (headerText.includes("МОЛИТВ") || headerText.includes("ПРОХАН") || headerText.includes("🙏")) {
            return "prayer";
        }
        if (headerText.includes("СУББОТ") || headerText.includes("СУБОТ") || headerText.includes("УРОК")) {
            return "stream";
        }
        if (headerText.includes("ВОПРОС") || headerText.includes("ПИТАН") || headerText.includes("???") || headerText.includes("❓")) {
            return "audience";
        }
    }
    return defaultCat;
}

export function parseBlock(
    text: string,
    defaultCat: string,
    parsers: SyhParsers,
    logger?: (msg: string) => void
): BannerItem[] {
    if (!text.trim()) return [];
    let blockQuestions: string[];
    let isStd = false;

    const firstLine = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0)[0] || "";
    let blockCategory = detectBlockCategory(firstLine, defaultCat);

    if (SABBATH_SCHOOL_KEYWORDS_REGEX.test(text) && !STANDARD_NUMBER_START_REGEX.test(text) && !EMOJI_NUMBER_CONTAINS_REGEX.test(text)) {
        if (logger) logger("Формат: Суботня Школа (без нумерації)");
        blockQuestions = parsers.parseSabbathSchoolUnnumberedQuestions(text);
        blockCategory = "stream"; 
    } else if (EMOJI_NUMBER_CONTAINS_REGEX.test(text)) {
        if (logger) logger("Формат: Емодзі 1️⃣");
        blockQuestions = parsers.parseEmojiNumberedQuestions(text);
    } else {
        if (logger) logger("Формат: Стандартний 1.");
        blockQuestions = parsers.parseStandardNumberedQuestions(text);
        isStd = true;
    }

    return blockQuestions.map((q: string) => ({ text: q, category: blockCategory, isStandard: isStd }));
}

export function parseRawTextToBanners(
    rawText: string,
    parsers: SyhParsers,
    utils: SyhUtils,
    logger?: (msg: string) => void
): { bannersToCreate: BannerItem[]; hasStandardFormat: boolean } {
    let bannersToCreate: BannerItem[] = [];
    let hasStandardFormat = false;

    const cleaner = utils.cleanTelegramHeaders ? utils.cleanTelegramHeaders.bind(utils) : ((t: string) => t);
    const cleanedText = cleaner(rawText);

    let messages = cleanedText.split(SECTION_HEADER_SPLIT_REGEX).map((m: string) => m.trim()).filter(Boolean);
    if (messages.length === 0) messages = [cleanedText];

    for (const msg of messages) {
        const { questionsText, prayersText } = splitPrayerSection(msg);

        if (questionsText.trim()) {
            const qItems = parseBlock(questionsText, "stream", parsers, logger);
            bannersToCreate = bannersToCreate.concat(qItems);
            if (qItems.some(item => item.isStandard)) {
                hasStandardFormat = true;
            }
        }
        if (prayersText.trim()) {
            const pItems = parseBlock(prayersText, "prayer", parsers, logger);
            bannersToCreate = bannersToCreate.concat(pItems);
        }
    }

    return { bannersToCreate, hasStandardFormat };
}

export async function executeBannerCreationLoop(
    creator: SyhBannerCreator,
    bannersToCreate: BannerItem[]
): Promise<number> {
    let createdCount = 0;
    for (const [index, item] of bannersToCreate.entries()) {
        creator.log(`>>> Обробка банера ${index + 1} з ${bannersToCreate.length}`);
        try {
            const pauseTime = index === 0 ? 600 : 250;
            await new Promise(r => setTimeout(r, pauseTime));
            
            const cleanQuestion = item.text.replace(SPEAKER_SUFFIX_CLEANUP_REGEX, "").trim();
            await creator.createSingleBanner(cleanQuestion);
            
            if (creator.UTILS && typeof creator.UTILS.saveBannerCategory === 'function') {
                await creator.UTILS.saveBannerCategory(cleanQuestion, item.category);
            }

            createdCount++;
        } catch (error: any) {
            console.error(error);
            creator.log(`Помилка: ${error.message}`);
            await creator.finalCleanup();
        }
    }
    return createdCount;
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
        let parsedResult: { bannersToCreate: BannerItem[]; hasStandardFormat: boolean };
        try {
            parsedResult = parseRawTextToBanners(rawText, this.PARSERS, this.UTILS, this.log.bind(this));
        } catch (error: any) {
            this.UTILS.copyAndShowBanner(error.message, "⚠️ Помилка створення банерів");
            return;
        }

        const { bannersToCreate, hasStandardFormat } = parsedResult;

        if (bannersToCreate.length === 0) {
            this.UTILS.copyAndShowBanner("Перевірте вхідний текст та спробуйте ще раз.", "⚠️ Питання не знайдені");
            return;
        }

        await this.ensureCleanStart(); 

        const createdCount = await executeBannerCreationLoop(this, bannersToCreate);
        
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

    createSingleBanner: async function(text: string): Promise<void> {
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
    }
};

// Pure ESM Module Export
