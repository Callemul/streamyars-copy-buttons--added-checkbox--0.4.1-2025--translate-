/**
 * StreamYard Helper — позначення фаз ефіру (питання / молитви).
 *
 * Винесено з `modules/stats_tracker.ts`: `markPhase()` і `restoreButtonStates()`
 * разом тримали логіку «підпис кнопки ↔ запис у сховище» упереміш із читанням
 * таймера з DOM.
 *
 * Поведінка збережена 1-в-1 (див. `tests/stats_tracker.test.js` кейси 3–4
 * та `tests/stats_tracker_api.test.js` кейси 10–14):
 *   - без таймера показується `alert` і НІЧОГО не пишеться у сховище;
 *   - підпис кнопки змінюється лише для тієї фази, що збережена;
 *   - `opacity: 0.7` виставляється навіть для невідомої фази.
 */

import { SYH_STORAGE, STORAGE_KEYS } from './storage';
import { SYH_UTILS } from './utils';
import { getOrCreateTodaySession } from './stats_session';

const TIMER_WRAPPER_SELECTOR = 'div[class*="Timer__TimerWrapper"]';
const NO_TIMER_ALERT = 'Ефір ще не розпочався (немає таймера)!';

/** Підписи кнопок після позначення фази. */
const PHASE_DONE_LABEL = {
    questions: '✅ Питання',
    prayers: '✅ Молитви'
} as const;

/** Непрозорість кнопки, яка вже «відпрацювала». */
const MARKED_BUTTON_OPACITY = '0.7';

/** Мінімальний контракт трекера, потрібний для роботи з фазами. */
export interface StatsPhaseHost {
    currentBrand: string;
    loadStatsDb(callback: (db: Record<string, any>) => void): void;
}

/** Підпис таймера ефіру або `null`, якщо ефір ще не стартував. */
function readTimerText(): string | null {
    const timerWrapper = document.querySelector(TIMER_WRAPPER_SELECTOR) as HTMLElement | null;
    if (!timerWrapper) return null;
    return timerWrapper.innerText.replace(/\n/g, '').trim();
}

/**
 * Фіксує момент старту фази: пише мітку таймера в сесію дня
 * і переводить кнопку у стан «позначено».
 */
export function markPhase(
    host: StatsPhaseHost,
    phase: 'questions' | 'prayers',
    btnElement: HTMLElement
): void {
    const timerText = readTimerText();
    if (timerText === null) {
        alert(NO_TIMER_ALERT);
        return;
    }

    const today = SYH_UTILS.getTodayDateString();

    host.loadStatsDb((db) => {
        const session = getOrCreateTodaySession(db, host.currentBrand, today);

        if (phase === 'questions') {
            session.phase_questions_start = timerText;
            btnElement.innerText = PHASE_DONE_LABEL.questions;
        } else if (phase === 'prayers') {
            session.phase_prayers_start = timerText;
            btnElement.innerText = PHASE_DONE_LABEL.prayers;
        }
        btnElement.style.opacity = MARKED_BUTTON_OPACITY;

        SYH_STORAGE.set({ [STORAGE_KEYS.STATS_CHARTS]: db });
    });
}

/** Переводить одну кнопку у стан «позначено». */
function applyMarkedState(btn: HTMLElement, label: string): void {
    btn.innerText = label;
    btn.style.opacity = MARKED_BUTTON_OPACITY;
}

/**
 * Відновлює підписи кнопок фаз зі сховища при монтуванні header-контролів.
 * Кнопки, для яких фаза не збережена, лишаються без змін.
 */
export function restoreButtonStates(
    host: StatsPhaseHost,
    btnQ: HTMLElement,
    btnP: HTMLElement
): void {
    const today = SYH_UTILS.getTodayDateString();

    host.loadStatsDb((db) => {
        const session = db[host.currentBrand]?.[today];
        if (!session) return;

        if (session.phase_questions_start) applyMarkedState(btnQ, PHASE_DONE_LABEL.questions);
        if (session.phase_prayers_start) applyMarkedState(btnP, PHASE_DONE_LABEL.prayers);
    });
}
