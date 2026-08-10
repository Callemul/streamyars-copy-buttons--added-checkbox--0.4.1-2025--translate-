import { SYH_CONFIG } from './config';
import { SYH_STORAGE, STORAGE_KEYS } from './storage';
import { SYH_BUS } from './event_bus';
import { SYH_UTILS } from './utils';
import { SYH_STATS_EXPORTER } from './stats_exporter';
import { getOrCreateTodaySession, searchBrandNameInObject } from './stats_session';
import { injectHeaderButtons, isHeaderControlsMounted } from './stats_header_controls';

// Реекспорт чистих хелперів для зворотної сумісності публічного API.
export { getOrCreateTodaySession, searchBrandNameInObject };

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
    currentBrand: "DefaultShow",
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
        const self = this;
        self.lastKnownBrand = "";

        const injectControls = (): void => injectHeaderButtons(self);

        setTimeout(injectControls, 1000);

        if (self.observer) {
            self.observer.disconnect();
        }

        self.observer = new MutationObserver(() => {
            if (self.pendingRAF !== null) return;
            self.pendingRAF = requestAnimationFrame(() => {
                self.pendingRAF = null;
                if (!isHeaderControlsMounted()) {
                    injectControls();
                }
            });
        });

        const targetNode = document.querySelector('[data-testid="header-center"]')?.parentElement
            || document.querySelector('header')
            || document.body;

        self.observer.observe(targetNode, { childList: true, subtree: true });
    },

    restoreButtonStates: function(btnQ: HTMLElement, btnP: HTMLElement): void {
        const today = SYH_UTILS.getTodayDateString();
        const self = this;
        
        this.loadStatsDb((db) => {
            if (db[self.currentBrand] && db[self.currentBrand][today]) {
                if (db[self.currentBrand][today].phase_questions_start) {
                    btnQ.innerText = '✅ Питання';
                    btnQ.style.opacity = '0.7';
                }
                if (db[self.currentBrand][today].phase_prayers_start) {
                    btnP.innerText = '✅ Молитви';
                    btnP.style.opacity = '0.7';
                }
            }
        });
    },

    loadStatsDb: function(callback: (db: Record<string, any>) => void): void {
        SYH_STORAGE.get([STORAGE_KEYS.STATS_CHARTS], (result: any) => {
            const db = (result && result[STORAGE_KEYS.STATS_CHARTS]) ? result[STORAGE_KEYS.STATS_CHARTS] : {};
            callback(db);
        });
    },

    markPhase: function(phase: 'questions' | 'prayers', btnElement: HTMLElement): void {
        const timerWrapper = document.querySelector('div[class*="Timer__TimerWrapper"]') as HTMLElement | null;
        if (!timerWrapper) {
            alert("Ефір ще не розпочався (немає таймера)!");
            return;
        }
        
        const timerText = timerWrapper.innerText.replace(/\n/g, '').trim();
        const today = SYH_UTILS.getTodayDateString();
        const self = this;

        this.loadStatsDb((db) => {
            const session = getOrCreateTodaySession(db, self.currentBrand, today);

            if (phase === 'questions') {
                session.phase_questions_start = timerText;
                btnElement.innerText = '✅ Питання';
            } else if (phase === 'prayers') {
                session.phase_prayers_start = timerText;
                btnElement.innerText = '✅ Молитви';
            }
            btnElement.style.opacity = '0.7';

            SYH_STORAGE.set({ [STORAGE_KEYS.STATS_CHARTS]: db });
        });
    },

    startTracking: function(): void {
        const self = this;
        if (this.intervalId !== null) return;
        
        this.intervalId = window.setInterval(() => {
            if (typeof chrome !== 'undefined' && chrome.runtime && !chrome.runtime.id) {
                if (self.intervalId !== null) {
                    clearInterval(self.intervalId);
                    self.intervalId = null;
                }
                return;
            }

            const liveTag = document.querySelector('span[class*="Tags__LiveTag"]');
            if (!liveTag) return; 

            const brandNode = document.querySelector('.BrandSelect__BrandNameText-sc-16g9tfx-1') as HTMLElement | null;
            if (brandNode) self.currentBrand = brandNode.innerText.trim();

            const timerWrapper = document.querySelector('div[class*="Timer__TimerWrapper"]') as HTMLElement | null;
            const timerText = timerWrapper ? timerWrapper.innerText.replace(/\n/g, '').trim() : "0:00";

            const viewerEl = document.querySelector('p[class*="ViewerCount__StatText"]') as HTMLElement | null;
            const viewerCount = viewerEl ? parseInt(viewerEl.innerText.trim(), 10) : 0;

            if (isNaN(viewerCount)) return;

            const today = SYH_UTILS.getTodayDateString();

            self.loadStatsDb((db) => {
                const session = getOrCreateTodaySession(db, self.currentBrand, today);
                
                if (session.initial_viewers === undefined && session.data.length === 0) {
                    session.initial_viewers = viewerCount;
                }

                const lastEntry = session.data[session.data.length - 1];
                if (lastEntry && lastEntry.time === timerText) return;

                session.data.push({
                    time: timerText,
                    viewers: viewerCount
                });

                SYH_STORAGE.set({ [STORAGE_KEYS.STATS_CHARTS]: db });
            });
        }, SYH_CONFIG.TIMINGS.STATS_TRACKING_INTERVAL || 60000); 
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

    // Рекурсивний сканер для автоматичного пошуку активного бренда в сховищі без кліку по вкладці
    getBrandFromLocalStorage: function(): string {
        try {
            const knownKeys = ['streamyard_brand', 'sy_active_brand', 'brand_state'];
            for (const key of knownKeys) {
                const val = localStorage.getItem(key);
                if (!val) continue;
                if (val.startsWith('{')) {
                    try {
                        const parsed = JSON.parse(val);
                        if (parsed?.name && typeof parsed.name === 'string') return parsed.name;
                    } catch {
                        console.warn("[SYH StatsTracker] Corrupted JSON in localStorage key:");
                    }
                } else if (typeof val === 'string' && val.trim().length > 0) {
                    return val.trim();
                }
            }
        } catch (e) {
            console.warn("[SYH] Помилка зчитування бренда з localStorage:", e);
        }
        return "";
    },

    searchBrandNameInObject: function(obj: any): string | null {
        return searchBrandNameInObject(obj);
    }
};

// Clean ESM export
