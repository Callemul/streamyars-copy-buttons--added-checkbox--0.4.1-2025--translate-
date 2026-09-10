/**
 * StreamYard Helper — автоматичне перемикання фаз аналітики ефіру.
 *
 * Відповідає за:
 *   1. Авто-старт фази «Питання/Коментарі» (`phase_questions_start`), коли
 *      проставлені всі галочки на банерах етеру (категорія `stream` або всі банери списку).
 *   2. Авто-старт фази «Молитви» (`phase_prayers_start`), коли на екрані
 *      показується банер з текстом «молитвенные просьбы» (не точний/fuzzy пошук).
 *
 * Жодної мутації стану без активного ефіру (таймера) та захист від повторних перезаписів.
 */

import { SYH_STORAGE, STORAGE_KEYS } from '../storage/storage';
import { SYH_UTILS } from '../core/utils';
import { fuzzyIncludes } from '../core/fuzzy_match';
import { getOrCreateTodaySession } from './stats_session';
import type { StatsPhaseHost } from './stats_phase_marker';
import { SYH_CONFIG, queryBySelectorValue } from '../registry/config';

const TIMER_WRAPPER_SELECTOR = 'div[class*="Timer__TimerWrapper"]';

/** Читає поточний підпис таймера або null, якщо ефір ще не йде. */
export function readLiveTimerText(): string | null {
    const timerWrapper = document.querySelector(TIMER_WRAPPER_SELECTOR) as HTMLElement | null;
    if (!timerWrapper) return null;
    const text = timerWrapper.innerText.replace(/\n/g, '').trim();
    return text || null;
}

/**
 * Не точний (fuzzy) пошук слів «молитвенн...» та «просьб...».
 * Підтримує різні закінчення (-ы, -и, -а, -у), опечатки та українські аналоги.
 */
export function isPrayerBannerText(text?: string | null): boolean {
    if (!text || typeof text !== 'string') return false;
    const clean = text.toLowerCase().replace(/ё/g, 'е').trim();
    if (!clean) return false;

    const hasPrayer = fuzzyIncludes(clean, 'молитвен') || fuzzyIncludes(clean, 'молитв');
    const hasRequest = fuzzyIncludes(clean, 'просьб') || fuzzyIncludes(clean, 'прохан');
    return hasPrayer && hasRequest;
}

/**
 * Перевіряє, чи всі банери етеру (категорія `stream`) мають проставлені галочки.
 * Якщо банери не категоризовані — перевіряє всі банери у списку.
 */
export function areAllStreamBannersChecked(
    bannerBlocks: Element[],
    categoriesCache?: Record<string, string>
): boolean {
    if (!bannerBlocks || bannerBlocks.length === 0) return false;

    // Якщо є банери з типом 'stream', перевіряємо тільки їх.
    const streamBlocks = bannerBlocks.filter(block => {
        const typeAttr = block.getAttribute('data-syh-banner-type') ||
            block.querySelector('[data-syh-banner-type]')?.getAttribute('data-syh-banner-type');
        if (typeAttr === 'stream') return true;

        if (categoriesCache) {
            const text = block.querySelector('[class*="Banner__BannerText"]')?.textContent?.trim() || '';
            if (categoriesCache[text] === 'stream') return true;
        }
        return false;
    });

    const targetBlocks = streamBlocks.length > 0 ? streamBlocks : bannerBlocks;
    let checkedCount = 0;

    for (const block of targetBlocks) {
        const cb = block.querySelector<HTMLInputElement>('.syh-checkbox[data-type="banner"]');
        if (!cb || !cb.checked) {
            return false;
        }
        checkedCount++;
    }

    return checkedCount > 0;
}

/** Знаходить текст банера, який зараз показується на екрані (активний банер з lucide-eye-off). */
export function detectActiveBannerText(container: Document | Element = document): string | null {
    const activeWrap = queryBySelectorValue(SYH_CONFIG.SELECTORS.hiddenBannerBlock, container);
    if (!activeWrap) return null;
    const textEl = activeWrap.querySelector('[class*="Banner__BannerText"]');
    return textEl?.textContent?.trim() || null;
}

/** Оновлює кнопку фази в шапці, якщо вона є у DOM. */
function updateHeaderPhaseButton(phase: 'questions' | 'prayers'): void {
    const selector = phase === 'questions' ? '[data-action="phase-questions"]' : '[data-action="phase-prayers"]';
    const label = phase === 'questions' ? '✅ Питання' : '✅ Молитви';
    const btn = document.querySelector<HTMLElement>(selector);
    if (btn) {
        btn.innerText = label;
        btn.style.opacity = '0.7';
    }
}

/**
 * Перевіряє і за необхідності автоматично запускає фазу «Питання/Коментарі».
 * Повертає `true`, якщо фазу було успішно активовано цим викликом.
 */
export function checkAutoStartQuestionsPhase(
    host: StatsPhaseHost,
    bannerBlocks: Element[],
    categoriesCache?: Record<string, string>
): boolean {
    const timerText = readLiveTimerText();
    if (!timerText) return false;

    if (!areAllStreamBannersChecked(bannerBlocks, categoriesCache)) return false;

    const today = SYH_UTILS.getTodayDateString();
    let triggered = false;

    host.loadStatsDb((db) => {
        const session = getOrCreateTodaySession(db, host.currentBrand, today);
        if (session.phase_questions_start) {
            return;
        }

        session.phase_questions_start = timerText;
        SYH_STORAGE.set({ [STORAGE_KEYS.STATS_CHARTS]: db });
        updateHeaderPhaseButton('questions');

        triggered = true;
        SYH_UTILS.showBanner?.('🎉 Всі банери етеру пройдено! Запущено фазу коментарів (питання)');
    });

    return triggered;
}

/**
 * Перевіряє і за необхідності автоматично запускає фазу «Молитви».
 * Повертає `true`, якщо фазу було успішно активовано цим викликом.
 */
export function checkAutoStartPrayersPhase(
    host: StatsPhaseHost,
    activeText: string | null
): boolean {
    if (!activeText || !isPrayerBannerText(activeText)) return false;

    const timerText = readLiveTimerText();
    if (!timerText) return false;

    const today = SYH_UTILS.getTodayDateString();
    let triggered = false;

    host.loadStatsDb((db) => {
        const session = getOrCreateTodaySession(db, host.currentBrand, today);
        if (session.phase_prayers_start) {
            return;
        }

        session.phase_prayers_start = timerText;
        SYH_STORAGE.set({ [STORAGE_KEYS.STATS_CHARTS]: db });
        updateHeaderPhaseButton('prayers');

        triggered = true;
        SYH_UTILS.showBanner?.('🙏 Початок молитов! Запущено фазу молитви');
    });

    return triggered;
}
