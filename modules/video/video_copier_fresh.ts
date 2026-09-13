import { SYH_CONFIG, resolveSelectorString } from '../registry/config';
// modules/video_copier_fresh.ts
/**
 * Визначення «свіжих» відео у бібліотеці StreamYard.
 * Модуль містить лише правила відбору (без ін'єкцій UI та без завантажень),
 * тому кожна функція перевіряється юніт-тестом.
 */

export const FRESH_WINDOW_DAYS = 5;
export const MS_PER_DAY = 1000 * 60 * 60 * 24;
export const SABBATH_SCHOOL_MARKER = 'СУББОТНЯЯ ШКОЛА';

export const VIDEO_CARD_SELECTOR = 'a.media-item-card';
export const CARD_DATE_SELECTOR = '[data-testid="library-media-subtitle"]';
export const CARD_TITLE_SELECTOR = resolveSelectorString(SYH_CONFIG.SELECTORS.videoCardTitle);

/** Стан одного проходу сканування: суботня школа береться лише один раз. */
export interface FreshScanState {
    foundSS: boolean;
}

export interface VideoCardInfo {
    title: string;
    date: Date;
}

export function createFreshScanState(): FreshScanState {
    return { foundSS: false };
}

/** Опівніч поточної доби — точка відліку для вікна свіжості. */
export function startOfToday(now: Date = new Date()): Date {
    const start = new Date(now.getTime());
    start.setHours(0, 0, 0, 0);
    return start;
}

/** StreamYard пише дату як «Jul 10, 2026, 20:44» — беремо перші дві частини. */
export function parseCardDate(dateText: string): Date | null {
    const normalized = dateText.split(',').slice(0, 2).join(',');
    const parsed = new Date(normalized);
    if (isNaN(parsed.getTime())) return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
}

export function isWithinFreshWindow(videoDate: Date, now: Date, maxDays: number = FRESH_WINDOW_DAYS): boolean {
    const diffDays = Math.round(Math.abs(now.getTime() - videoDate.getTime()) / MS_PER_DAY);
    return diffDays <= maxDays;
}

/** Друга й наступні «Суботні школи» в одному проході відкидаються. */
export function isDuplicateSabbathSchool(title: string, state: FreshScanState): boolean {
    if (!title.includes(SABBATH_SCHOOL_MARKER)) return false;
    if (state.foundSS) return true;
    state.foundSS = true;
    return false;
}

function readCardTitle(card: Element): string | null {
    const el = card.querySelector(CARD_TITLE_SELECTOR) as HTMLElement | null;
    return el ? el.innerText.toUpperCase() : null;
}

function readCardDate(card: Element): Date | null {
    const el = card.querySelector(CARD_DATE_SELECTOR) as HTMLElement | null;
    return el ? parseCardDate(el.innerText) : null;
}

export function readVideoCardInfo(card: Element): VideoCardInfo | null {
    const title = readCardTitle(card);
    const date = readCardDate(card);
    if (title === null || date === null) return null;
    return { title, date };
}

export function isFreshVideoCard(card: Element, now: Date, state: FreshScanState): boolean {
    const info = readVideoCardInfo(card);
    if (!info) return false;
    if (!isWithinFreshWindow(info.date, now)) return false;
    return !isDuplicateSabbathSchool(info.title, state);
}

/** Відбирає свіжі картки за один прохід зі спільним станом дедуплікації. */
export function collectFreshVideoCards(cards: ArrayLike<Element>, now: Date): Element[] {
    const state = createFreshScanState();
    return Array.from(cards).filter(card => isFreshVideoCard(card, now, state));
}

export function queryVideoCards(root: ParentNode = document): Element[] {
    return Array.from(root.querySelectorAll(VIDEO_CARD_SELECTOR));
}
