/**
 * StreamYard Helper — оркестратор статистики ефіру (`SYH_STATS_TRACKER`).
 *
 * Раніше — модуль на 239 рядків (cyclomatic 66 / cognitive 51 за звітом Fallow),
 * де в одному об'єкті співіснували: спостерігач шапки, семплер ефіру, робота з
 * фазами, читання бренда з localStorage і робота зі сховищем.
 *
 * Реалізацію розкладено по вузьких модулях:
 *   - `./stats_header_observer` — MutationObserver шапки + перша ін'єкція кнопок
 *   - `./stats_live_sampler`    — один тік трекінгу (LiveTag, таймер, глядачі)
 *   - `./stats_phase_marker`    — markPhase / restoreButtonStates
 *   - `./stats_brand_storage`   — читання бренда з localStorage
 *   - `./stats_session`         — чисті хелпери сесії дня
 *
 * Тут лишилися лише стан (`intervalId`, `pendingRAF`, `observer`, бренди),
 * життєвий цикл і делегування. Публічний контракт `SyhStatsTracker` не змінився.
 */

import { SYH_CONFIG } from './config';
import { SYH_STORAGE, STORAGE_KEYS } from './storage';
import { SYH_BUS } from './event_bus';
import { SYH_STATS_EXPORTER } from './stats_exporter';
import { getOrCreateTodaySession, searchBrandNameInObject } from './stats_session';
import { setupHeaderObserver } from './stats_header_observer';
import { sampleLiveStats } from './stats_live_sampler';
import { markPhase as markPhaseImpl, restoreButtonStates as restoreButtonStatesImpl } from './stats_phase_marker';
import { readBrandFromLocalStorage } from './stats_brand_storage';

// Реекспорт чистих хелперів для зворотної сумісності публічного API.
export { getOrCreateTodaySession, searchBrandNameInObject };

/** Запасний період семплювання, якщо конфіг не задав свій. */
const FALLBACK_TRACKING_INTERVAL_MS = 60000;

/** Бренд за замовчуванням, доки шапка не повідомила справжній. */
const DEFAULT_BRAND = "DefaultShow";

export interface SyhStatsTracker {
    intervalId: number | null;
    pendingRAF: number | null;
    observer: MutationObserver | null;
    currentBrand: string;
    lastKnownBrand: string;

    init(): void;
    bindEvents(): void;
    registerPrayerMarker(): void;
    loadStatsDb(callback: (db: Record<string, any>) => void): void;
    setupObservers(): void;
    restoreButtonStates(btnQ: HTMLElement, btnP: HTMLElement): void;
    markPhase(phase: 'questions' | 'prayers', btnElement: HTMLElement): void;
    startTracking(): void;
    destroy(): void;
    showAnalyticsModal(): void;
    getBrandFromLocalStorage(): string;
    searchBrandNameInObject(obj: any): string | null;
}

export const SYH_STATS_TRACKER: SyhStatsTracker = {
    intervalId: null,
    pendingRAF: null,
    observer: null,
    currentBrand: DEFAULT_BRAND,
    lastKnownBrand: "",

    init: function(): void {
        this.setupObservers();
        this.startTracking();
        this.bindEvents();
    },

    bindEvents: function(): void {
        SYH_BUS.on('PRAYER_MARKED', () => {
            this.registerPrayerMarker();
        });
    },

    registerPrayerMarker: function(): void {
        console.log('[SYH StatsTracker] Prayer marker registered via EventBus');
    },

    setupObservers: function(): void {
        setupHeaderObserver(this);
    },

    restoreButtonStates: function(btnQ: HTMLElement, btnP: HTMLElement): void {
        restoreButtonStatesImpl(this, btnQ, btnP);
    },

    loadStatsDb: function(callback: (db: Record<string, any>) => void): void {
        SYH_STORAGE.get([STORAGE_KEYS.STATS_CHARTS], (result: any) => {
            const db = (result && result[STORAGE_KEYS.STATS_CHARTS]) ? result[STORAGE_KEYS.STATS_CHARTS] : {};
            callback(db);
        });
    },

    markPhase: function(phase: 'questions' | 'prayers', btnElement: HTMLElement): void {
        markPhaseImpl(this, phase, btnElement);
    },

    startTracking: function(): void {
        const self = this;
        if (this.intervalId !== null) return;

        this.intervalId = window.setInterval(
            () => sampleLiveStats(self),
            SYH_CONFIG.TIMINGS.STATS_TRACKING_INTERVAL || FALLBACK_TRACKING_INTERVAL_MS
        );
    },

    destroy: function(): void {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.pendingRAF !== null) {
            cancelAnimationFrame(this.pendingRAF);
            this.pendingRAF = null;
        }
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    },

    showAnalyticsModal: function(): void {
        if (SYH_STATS_EXPORTER && typeof SYH_STATS_EXPORTER.showModal === 'function') {
            SYH_STATS_EXPORTER.showModal(this.currentBrand);
        } else {
            console.warn("[SYH] Модуль експорту stats_exporter ще не завантажено.");
        }
    },

    getBrandFromLocalStorage: function(): string {
        return readBrandFromLocalStorage();
    },

    searchBrandNameInObject: function(obj: any): string | null {
        return searchBrandNameInObject(obj);
    }
};
