/**
 * StreamYard Helper — семплер живої статистики ефіру.
 *
 * Винесено з `modules/stats_tracker.ts`: тіло `setInterval` у `startTracking()`
 * було анонімною функцією на 43 рядки (cyclomatic 10) з чотирма DOM-читаннями,
 * перевіркою живучості контексту і записом у сховище — усе в одному замиканні.
 *
 * Поведінка збережена 1-в-1 (див. `tests/stats_tracker_api.test.js`, кейси 15–20):
 *   - інвалідований `chrome.runtime` самознищує інтервал;
 *   - поза ефіром (немає LiveTag) тік — no-op;
 *   - `NaN` у лічильнику глядачів перериває тік ДО запису;
 *   - повтор тієї самої мітки часу не дублює точку.
 */

import { SYH_STORAGE, STORAGE_KEYS } from './storage';
import { SYH_UTILS } from './utils';
import { getOrCreateTodaySession } from './stats_session';
import { isExtensionContextValid } from './messaging_context';

const LIVE_TAG_SELECTOR = 'span[class*="Tags__LiveTag"]';
const BRAND_NODE_SELECTOR = '.BrandSelect__BrandNameText-sc-16g9tfx-1';
const TIMER_WRAPPER_SELECTOR = 'div[class*="Timer__TimerWrapper"]';
const VIEWER_COUNT_SELECTOR = 'p[class*="ViewerCount__StatText"]';

/** Мітка часу, коли таймер ефіру ще не відрендерено. */
const FALLBACK_TIMER_TEXT = '0:00';

/** Мінімальний контракт трекера, потрібний семплеру (пізнє зв'язування). */
export interface StatsSamplerHost {
    intervalId: number | null;
    currentBrand: string;
    loadStatsDb(callback: (db: Record<string, any>) => void): void;
}

/** Знімок ефіру з DOM: підпис таймера і кількість глядачів. */
function readTimerText(): string {
    const timerWrapper = document.querySelector(TIMER_WRAPPER_SELECTOR) as HTMLElement | null;
    return timerWrapper ? timerWrapper.innerText.replace(/\n/g, '').trim() : FALLBACK_TIMER_TEXT;
}

function readViewerCount(): number {
    const viewerEl = document.querySelector(VIEWER_COUNT_SELECTOR) as HTMLElement | null;
    return viewerEl ? parseInt(viewerEl.innerText.trim(), 10) : 0;
}

/** Оновлює назву бренда з шапки, якщо вузол присутній. */
function syncCurrentBrand(host: StatsSamplerHost): void {
    const brandNode = document.querySelector(BRAND_NODE_SELECTOR) as HTMLElement | null;
    if (brandNode) host.currentBrand = brandNode.innerText.trim();
}

/** Дописує точку виміру в сесію дня, уникаючи дублів за міткою часу. */
function appendSamplePoint(
    db: Record<string, any>,
    brand: string,
    today: string,
    timerText: string,
    viewerCount: number
): void {
    const session = getOrCreateTodaySession(db, brand, today);

    if (session.initial_viewers === undefined && session.data.length === 0) {
        session.initial_viewers = viewerCount;
    }

    const lastEntry = session.data[session.data.length - 1];
    if (lastEntry && lastEntry.time === timerText) return;

    session.data.push({ time: timerText, viewers: viewerCount });

    SYH_STORAGE.set({ [STORAGE_KEYS.STATS_CHARTS]: db });
}

/**
 * Один тік трекінгу: перевіряє контекст і ефір, знімає показники
 * і додає точку в статистику дня.
 */
export function sampleLiveStats(host: StatsSamplerHost): void {
    if (!isExtensionContextValid()) {
        if (host.intervalId !== null) {
            clearInterval(host.intervalId);
            host.intervalId = null;
        }
        return;
    }

    if (!document.querySelector(LIVE_TAG_SELECTOR)) return;

    syncCurrentBrand(host);

    const timerText = readTimerText();
    const viewerCount = readViewerCount();
    if (isNaN(viewerCount)) return;

    const today = SYH_UTILS.getTodayDateString();

    host.loadStatsDb((db) => {
        appendSamplePoint(db, host.currentBrand, today, timerText, viewerCount);
    });
}
