/**
 * StreamYard Helper — фасад загальних утиліт (`SYH_UTILS`).
 *
 * Раніше — монолітний об'єкт на 310 рядків (cyclomatic 84 / cognitive 51,
 * fan_in 22 — найвища зв'язність у проєкті за звітом Fallow). Реалізацію
 * розкладено по вузьких модулях:
 *
 *   - `./utils_text`         — normalizeText / transliterate / toFuzzy / розкладка / Telegram-заголовки
 *   - `./utils_search`       — smartSearch
 *   - `./utils_dom_wait`     — очікувачі станів DOM
 *   - `./utils_notify`       — копіювання в буфер + банер-підтвердження
 *   - `./utils_storage_ops`  — збереження категорії банера
 *
 * Тут лишилися ТІЛЬКИ контракт (`SyhUtils`), стан (`SELECTORS`, `_storage`)
 * та делегування. Публічний API не змінився: 22 споживачі, які імпортують
 * `SYH_UTILS` / `SyhUtils` саме звідси, продовжують працювати без правок.
 *
 * ⚠️ Пізнє зв'язування через `this` збережено навмисно: `smartSearch`,
 * `transliterate` та `switchKeyboardLayout` ходять у `this.normalizeText`
 * і решту методів об'єкта, тому підміна методу споживачем (як у тестах)
 * і далі впливає на результат.
 */

import { SYH_STORAGE } from './storage';
import type { CleaningLogEntry } from './types';
import { isExtensionContextValid } from './messaging_context';

import {
    normalizeText as normalizeTextImpl,
    transliterateRaw,
    switchKeyboardLayoutRaw,
    toFuzzy as toFuzzyImpl,
    cleanTelegramHeaders as cleanTelegramHeadersImpl
} from './utils_text';
import { smartSearch as smartSearchImpl } from './utils_search';
import {
    waitForElement as waitForElementImpl,
    waitForElementToDisappear as waitForElementToDisappearImpl,
    waitForNewBanner as waitForNewBannerImpl,
    clickElementByText as clickElementByTextImpl,
    DEFAULT_BANNER_TEXT_SELECTOR
} from './utils_dom_wait';
import { copyAndShowBanner as copyAndShowBannerImpl, showBanner as showBannerImpl, type BannerVariant } from './utils_notify';
import { saveBannerCategory as saveBannerCategoryImpl } from './utils_storage_ops';

export interface SyhUtils {
    SELECTORS: Record<string, string | string[]> | null;
    readonly storage: any;
    init(config: { SELECTORS: Record<string, string | string[]> }): void;
    getTodayDateString(): string;
    showBanner(bannerMessage: string, variantOrError?: BannerVariant | boolean): void;
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
    cleanTelegramHeaders(text: string | null | undefined, cleaningLog?: CleaningLogEntry[]): string;
    isExtensionValid(): boolean;
}

/** Дефолтні таймаути очікувачів (винесені з сигнатур, щоб не «губитись» у делегуванні). */
const DEFAULT_WAIT_TIMEOUT_MS = 3000;
const DEFAULT_BANNER_TIMEOUT_MS = 5000;
const DEFAULT_CLICK_TIMEOUT_MS = 2000;

export const SYH_UTILS: SyhUtils = {
    SELECTORS: null,

    init: function(config: { SELECTORS: Record<string, string | string[]> }): void {
        this.SELECTORS = config ? config.SELECTORS : null;
    },

    get storage(): any {
        return (this as any)._storage || SYH_STORAGE;
    },

    isExtensionValid: function(): boolean {
        return isExtensionContextValid();
    },

    getTodayDateString: function(): string {
        return new Date().toLocaleDateString('sv-SE');
    },

    showBanner: function(bannerMessage: string, variantOrError?: BannerVariant | boolean): void {
        showBannerImpl(bannerMessage, variantOrError);
    },

    copyAndShowBanner: function(textToCopy: string, bannerMessage?: string): void {
        copyAndShowBannerImpl(textToCopy, bannerMessage);
    },

    waitForElement: function(selector: string | string[], timeout = DEFAULT_WAIT_TIMEOUT_MS): Promise<Element> {
        return waitForElementImpl(selector, timeout);
    },

    waitForElementToDisappear: function(selector: string, timeout = DEFAULT_WAIT_TIMEOUT_MS): Promise<void> {
        return waitForElementToDisappearImpl(selector, timeout);
    },

    waitForNewBanner: function(bannerText: string, timeout = DEFAULT_BANNER_TIMEOUT_MS): Promise<Element> {
        // Селектор читається на кожному тіку — див. коментар у `utils_dom_wait`.
        const self = this;
        return waitForNewBannerImpl(
            bannerText,
            timeout,
            () => self.SELECTORS?.bannerText || DEFAULT_BANNER_TEXT_SELECTOR
        );
    },

    clickElementByText: function(text: string, timeout = DEFAULT_CLICK_TIMEOUT_MS): Promise<void> {
        return clickElementByTextImpl(text, timeout);
    },

    smartSearch: function(query: string | null | undefined, targetText: string | null | undefined): boolean {
        return smartSearchImpl(query, targetText, this);
    },

    normalizeText: function(str: string | null | undefined): string {
        return normalizeTextImpl(str);
    },

    transliterate: function(str: string | null | undefined): string {
        if (!str) return "";
        return this.normalizeText(transliterateRaw(str));
    },

    toFuzzy: function(str: string | null | undefined): string {
        return toFuzzyImpl(str);
    },

    switchKeyboardLayout: function(str: string | null | undefined): string {
        if (!str) return "";
        return this.normalizeText(switchKeyboardLayoutRaw(str));
    },

    saveBannerCategory: function(text: string, type: string): Promise<void> {
        return saveBannerCategoryImpl(text, type, SYH_UTILS.storage);
    },

    cleanTelegramHeaders: function(text: string | null | undefined, cleaningLog?: CleaningLogEntry[]): string {
        return cleanTelegramHeadersImpl(text, cleaningLog);
    }
};
