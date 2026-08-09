/**
 * StreamYard Helper — Event Banners: розв'язання залежностей та підтримка URL.
 *
 * Винесено з `modules/event_banners/index.ts` (CRAP 56 за звітом Fallow).
 * Тут живуть ЛИШЕ чисті рішення «яку залежність узяти», без побічних ефектів,
 * щоб `SYH_EVENT_BANNERS.init` залишався тонким присвоєнням.
 *
 * Поведінка збережена 1-в-1 з оригінальними виразами:
 *   SELECTORS = config ? config.SELECTORS : (SYH_CONFIG ? SYH_CONFIG.SELECTORS : null)
 *   STATE     = state || SYH_STATE            (і так само для UTILS / UI / BANNER_CREATOR)
 */

import type { SyhConfig, SelectorValue } from '../config';
import type { SyhState } from '../state';
import type { SyhUtils } from '../utils';
import type { SyhUi } from '../ui_state';
import type { SyhBannerCreator } from '../banner_creator';

/** Домен, на якому вмикається плагін банерів. */
export const STREAMYARD_URL_MARKER = 'streamyard.com';

/** Явно передані виклику `init` залежності (усі опційні). */
export interface EventBannerDepOverrides {
    config?: SyhConfig | null;
    state?: SyhState | null;
    utils?: SyhUtils | null;
    ui?: SyhUi | null;
    bannerCreator?: SyhBannerCreator | null;
}

/** Синглтони застосунку, які використовуються як запасний варіант. */
export interface EventBannerDepDefaults {
    config: SyhConfig | null;
    state: SyhState | null;
    utils: SyhUtils | null;
    ui: SyhUi | null;
    bannerCreator: SyhBannerCreator | null;
}

/** Готовий до присвоєння набір залежностей у формі полів `SYH_EVENT_BANNERS`. */
export interface ResolvedEventBannerDeps {
    SELECTORS: Record<string, SelectorValue> | null;
    STATE: SyhState | null;
    UTILS: SyhUtils | null;
    UI: SyhUi | null;
    BANNER_CREATOR: SyhBannerCreator | null;
}

/**
 * Селектори беремо з переданого конфігу; якщо його немає — із глобального;
 * якщо немає й глобального — `null`.
 *
 * Важливо: перевіряється саме сам об'єкт конфігу, а не наявність у ньому
 * `SELECTORS`. Тобто конфіг без селекторів дає `undefined`, а не фолбек.
 */
export function resolveBannerSelectors(
    config: SyhConfig | null | undefined,
    fallbackConfig: SyhConfig | null | undefined
): Record<string, SelectorValue> | null {
    if (config) return config.SELECTORS;
    if (fallbackConfig) return fallbackConfig.SELECTORS;
    return null;
}

/** Еквівалент виразу `override || fallback`: будь-яке falsy-значення віддає фолбек. */
export function preferOverride<T>(override: T | null | undefined, fallback: T | null): T | null {
    return override || fallback;
}

/** Збирає повний набір залежностей модуля банерів. */
export function resolveEventBannerDeps(
    overrides: EventBannerDepOverrides,
    defaults: EventBannerDepDefaults
): ResolvedEventBannerDeps {
    return {
        SELECTORS: resolveBannerSelectors(overrides.config, defaults.config),
        STATE: preferOverride(overrides.state, defaults.state),
        UTILS: preferOverride(overrides.utils, defaults.utils),
        UI: preferOverride(overrides.ui, defaults.ui),
        BANNER_CREATOR: preferOverride(overrides.bannerCreator, defaults.bannerCreator)
    };
}

/** Поточний URL сторінки; поза браузером (SSR / тести) — порожній рядок. */
export function currentBrowserUrl(): string {
    return typeof window !== 'undefined' ? window.location.href : '';
}

/** Чи належить URL до StreamYard. */
export function isStreamYardUrl(url: string): boolean {
    return url.includes(STREAMYARD_URL_MARKER);
}
