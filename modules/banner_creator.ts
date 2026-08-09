import { SYH_CONFIG, resolveSelector } from './config';
import { SYH_UTILS } from './utils';
import { SYH_PARSERS } from './parsers/index';

import type { SyhConfig } from './config';
import type { SyhUtils } from './utils';
import type { SyhParsers } from './parsers/index';

import type { SyhBannerCreator } from './banner_types';
import { parseRawTextToBanners } from './banner_parser';
import { executeBannerCreationLoop } from './banner_executor';

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
        let parsedResult: { bannersToCreate: import('./banner_types').BannerItem[]; hasStandardFormat: boolean };
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
            createBtn = await this.UTILS.waitForElement(this.SELECTORS?.createBannerButton, 2000) as HTMLElement;
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

// Re-export types and functions for backward compatibility
export type { BannerItem, SyhBannerCreator } from './banner_types';
export { detectBlockCategory, parseBlock, parseRawTextToBanners } from './banner_parser';
export { executeBannerCreationLoop } from './banner_executor';