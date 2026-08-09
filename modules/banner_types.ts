import type { SyhConfig } from './config';
import type { SyhUtils } from './utils';
import type { SyhParsers } from './parsers/index';

export interface BannerItem {
    text: string;
    category: string;
    isStandard: boolean;
}

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