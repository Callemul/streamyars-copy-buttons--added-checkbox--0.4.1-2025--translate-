import { SYH_CONFIG, resolveSelector } from './config';
import { SYH_UTILS } from './utils';
import { SYH_PARSERS } from './parsers/index';

import type { SyhConfig } from './config';
import type { SyhUtils } from './utils';
import type { SyhParsers } from './parsers/index';

import type { SyhBannerCreator } from './banner_types';
import { parseRawTextToBanners } from './banner_parser';
import { executeBannerCreationLoop } from './banner_executor';
import {
    CLEAN_START_SETTLE_MS,
    NEW_BANNER_TIMEOUT_MS,
    clickCancelButton,
    delay,
    fillBannerTextarea,
    isBannerFormStillOpen,
    readBannerFormControls,
    resolveCreateBannerButton,
    resolveCreateBannerForm,
    submitBannerForm
} from './banner_form';

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
        await this.executeCustomBanners(bannersToCreate, hasStandardFormat);
    },

    executeCustomBanners: async function(
        bannersToCreate: import('./banner_types').BannerItem[],
        hasStandardFormat?: boolean
    ): Promise<void> {
        if (bannersToCreate.length === 0) {
            this.UTILS.copyAndShowBanner("Перевірте вхідний текст та спробуйте ще раз.", "⚠️ Питання не знайдені");
            return;
        }

        await this.ensureCleanStart();

        const createdCount = await executeBannerCreationLoop(this, bannersToCreate);

        const shouldAddSeparator = hasStandardFormat ?? bannersToCreate.some(b => b.isStandard);
        if (shouldAddSeparator) {
            this.log("Додаю розділювач...");
            await delay(300);
            try {
                await this.createSingleBanner("----Питання глядачів----");
            } catch (error: any) {
                console.error(error);
                this.log(`Помилка створення розділювача: ${error.message}`);
            }
        }

        await this.finalCleanup();

        if (this.UI && typeof this.UI.filterBanners === 'function') {
            this.UI.filterBanners();
        }

        this.UTILS.copyAndShowBanner(`Успішно створено банерів: ${createdCount}`, "🎉 Створення завершено!");
    },

    clickCancelButton: function(form: Element): void {
        clickCancelButton(form);
    },

    ensureCleanStart: async function(): Promise<void> {
        this.log("Перевірка на чистоту старту...");
        const form = resolveSelector(this.SELECTORS?.createBannerForm as any);

        if (form) {
            this.log("Форма була відкрита. Закриваю...");
            this.clickCancelButton(form);
            await delay(CLEAN_START_SETTLE_MS);
        }
    },

    finalCleanup: async function(): Promise<void> {
        const form = resolveSelector(this.SELECTORS?.createBannerForm as any);
        if (form) {
            this.log("Прибирання: Закриваю форму...");
            this.clickCancelButton(form);
        }
    },

    /**
     * Лінійний оркестратор: кожен крок делеговано в `banner_form.ts`, тому тут
     * лишається тільки послідовність без розгалужень.
     */
    createSingleBanner: async function(text: string): Promise<void> {
        const createBtn = await resolveCreateBannerButton(this.SELECTORS?.createBannerButton, this.UTILS);
        createBtn.click();

        const form = await resolveCreateBannerForm(this.SELECTORS?.createBannerForm, this.UTILS);
        const { textarea, addButton } = readBannerFormControls(form);

        fillBannerTextarea(textarea, text);
        await submitBannerForm(addButton, text);

        await this.UTILS.waitForNewBanner(text, NEW_BANNER_TIMEOUT_MS);

        if (isBannerFormStillOpen(this.SELECTORS?.createBannerForm)) {
            this.clickCancelButton(form);
        }
    }
};

// Re-export types and functions for backward compatibility
export type { BannerItem, SyhBannerCreator } from './banner_types';
export { detectBlockCategory, parseBlock, parseRawTextToBanners } from './banner_parser';
export { executeBannerCreationLoop } from './banner_executor';