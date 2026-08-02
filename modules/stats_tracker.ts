import { SYH_CONFIG } from './config';
import { SYH_STORAGE, STORAGE_KEYS } from './storage';
import { SYH_BUS } from './event_bus';
import { SYH_UTILS } from './utils';
import { SYH_STATS_EXPORTER } from './stats_exporter';
import { UiFactory } from './ui_factory';

export interface SyhStatsTracker {
    intervalId: number | null;
    pendingRAF: number | null;
    observer: MutationObserver | null;
    currentBrand: string;
    lastKnownBrand: string;

    init(): void;
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
        
        function injectHeaderButtons(): void {
            const headerCenter = document.querySelector('[data-testid="header-center"]') as HTMLElement | null;
            const statusWrap = document.querySelector('[data-testid="header-status-wrap"]');
            
            if (headerCenter && statusWrap) {
                const brandNode = document.querySelector('[class*="BrandSelect__BrandNameText"], .BrandSelect__BrandNameText-sc-16g9tfx-1, [aria-controls="brand-select-menu"]');
                let brandName = "";

                if (brandNode) {
                    const rawText = brandNode.textContent ? brandNode.textContent.replace(/chevron-down/gi, "").trim() : "";
                    if (rawText && rawText !== "Share ▾" && rawText !== "Return to dashboard") {
                        brandName = rawText;
                        self.lastKnownBrand = rawText;
                    }
                } else {
                    brandName = self.getBrandFromLocalStorage() || self.lastKnownBrand;
                    if (brandName) {
                        self.lastKnownBrand = brandName;
                    }
                }

                const titleNode = document.querySelector('[data-testid="header-title-wrap"] p') as HTMLElement | null;
                const titleText = titleNode ? titleNode.innerText.toLowerCase() : "";

                const isSabbathSchool = (titleText.includes("суббот") || titleText.includes("субот")) && 
                                        titleText.includes("молчанов") && 
                                        titleText.includes("опар");

                let btnContainer = document.getElementById('syh-header-controls');
                if (!btnContainer) {
                    headerCenter.style.display = 'flex';
                    headerCenter.style.alignItems = 'center';
                    headerCenter.style.flexDirection = 'row';

                    btnContainer = document.createElement('div');
                    btnContainer.id = 'syh-header-controls';
                    btnContainer.style.cssText = 'display: flex; gap: 8px; margin: 0 15px; flex-shrink: 0; z-index: 100; align-items: center;';

                    const btnQ = UiFactory.createButton({
                        action: 'phase-questions',
                        icon: '❓ Старт: Питання',
                        title: 'Натисни, коли починається блок питань',
                        onClick: () => self.markPhase('questions', btnQ)
                    });
                    btnQ.style.cssText = 'background: #f39c12; color: white; border: none; border-radius: 4px; padding: 0 10px; cursor: pointer; font-weight: bold; font-size: 12px; height: 28px; transition: 0.2s;';

                    const btnP = UiFactory.createButton({
                        action: 'phase-prayers',
                        icon: '🙏 Старт: Молитви',
                        title: 'Натисни, коли починається молитовний блок',
                        onClick: () => self.markPhase('prayers', btnP)
                    });
                    btnP.style.cssText = 'background: #005DF7; color: white; border: none; border-radius: 4px; padding: 0 10px; cursor: pointer; font-weight: bold; font-size: 12px; height: 28px; transition: 0.2s;';

                    const btnAnalytics = document.createElement('button');
                    btnAnalytics.id = 'syh-analytics-btn';
                    btnAnalytics.innerText = '📈 Аналітика';
                    btnAnalytics.setAttribute('aria-label', 'Відкрити аналітику');
                    btnAnalytics.style.cssText = 'background: #28a745; color: white; border: none; border-radius: 4px; padding: 0 12px; cursor: pointer; font-weight: bold; font-size: 13px; height: 28px; margin-left: 10px;';
                    btnAnalytics.onclick = () => self.showAnalyticsModal();

                    const btnInfo = document.createElement('button');
                    btnInfo.id = 'syh-info-btn';
                    btnInfo.innerHTML = 'ⓘ';
                    btnInfo.title = 'Оновлення та Інструкції';
                    btnInfo.setAttribute('aria-label', 'Відкрити довідку та оновлення');
                    btnInfo.style.cssText = 'background: #4F5461; color: white; border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-weight: bold; font-size: 15px; margin-left: 8px; display: flex; align-items: center; justify-content: center; transition: background 0.2s;';
                    btnInfo.onmouseover = () => btnInfo.style.background = '#636979';
                    btnInfo.onmouseout = () => btnInfo.style.background = '#4F5461';
                    btnInfo.onclick = () => {
                        if (SYH_INFO_MODAL && typeof SYH_INFO_MODAL.showModal === 'function') {
                            SYH_INFO_MODAL.showModal();
                        } else {
                            console.warn("[SYH] Модуль info_modal ще не завантажено.");
                        }
                    };

                    btnContainer.appendChild(btnQ);
                    btnContainer.appendChild(btnP);
                    btnContainer.appendChild(btnAnalytics);
                    btnContainer.appendChild(btnInfo);

                    headerCenter.insertBefore(btnContainer, statusWrap);
                    
                    self.restoreButtonStates(btnQ, btnP);
                }

                const mediaTabBtn = (document.getElementById('broadcast-aside-tab-assets') || document.querySelector('[id*="tab-assets"]')) as HTMLElement | null;
                if (mediaTabBtn) {
                    const currentBrand = brandName;
                    
                    if (currentBrand) {
                        const isBrandCorrect = currentBrand.toLowerCase().includes("суббот") || 
                                               currentBrand.toLowerCase().includes("субот");

                        if (isSabbathSchool && !isBrandCorrect) {
                            if (!mediaTabBtn.dataset.originalTitle) {
                                mediaTabBtn.dataset.originalTitle = mediaTabBtn.getAttribute('title') || mediaTabBtn.getAttribute('aria-label') || "Media assets";
                            }
                            mediaTabBtn.setAttribute('title', '⚠️ ПОМИЛКА: Папка медіа має бути "Субботняя школа"!');
                            mediaTabBtn.style.cssText = 'background: #e74c3c !important; color: white !important; border: 1px solid #ff4757 !important; animation: syhActivePulse 1.5s infinite alternate !important;';
                        } else {
                            mediaTabBtn.style.cssText = '';
                            if (mediaTabBtn.dataset.originalTitle) {
                                mediaTabBtn.setAttribute('title', mediaTabBtn.dataset.originalTitle);
                                delete mediaTabBtn.dataset.originalTitle;
                            }
                        }
                    } else {
                        mediaTabBtn.style.cssText = '';
                    }
                }
            }
        }

        setTimeout(injectHeaderButtons, 1000); 

        if (self.observer) {
            self.observer.disconnect();
        }

        self.observer = new MutationObserver(() => {
            if (self.pendingRAF !== null) return;
            self.pendingRAF = requestAnimationFrame(() => {
                self.pendingRAF = null;
                if (!document.getElementById('syh-header-controls')) {
                    injectHeaderButtons();
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
        
        SYH_STORAGE.get([STORAGE_KEYS.STATS_CHARTS], (result: any) => {
            const db = (result && result[STORAGE_KEYS.STATS_CHARTS]) ? result[STORAGE_KEYS.STATS_CHARTS] : {};
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

    markPhase: function(phase: 'questions' | 'prayers', btnElement: HTMLElement): void {
        const timerWrapper = document.querySelector('div[class*="Timer__TimerWrapper"]') as HTMLElement | null;
        if (!timerWrapper) {
            alert("Ефір ще не розпочався (немає таймера)!");
            return;
        }
        
        const timerText = timerWrapper.innerText.replace(/\n/g, '').trim();
        const today = SYH_UTILS.getTodayDateString();
        const self = this;

        SYH_STORAGE.get([STORAGE_KEYS.STATS_CHARTS], (result: any) => {
            const db = (result && result[STORAGE_KEYS.STATS_CHARTS]) ? result[STORAGE_KEYS.STATS_CHARTS] : {};
            if (!db[self.currentBrand]) db[self.currentBrand] = {};
            if (!db[self.currentBrand][today]) db[self.currentBrand][today] = { data: [] };

            if (phase === 'questions') {
                db[self.currentBrand][today].phase_questions_start = timerText;
                btnElement.innerText = '✅ Питання';
            } else if (phase === 'prayers') {
                db[self.currentBrand][today].phase_prayers_start = timerText;
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

            SYH_STORAGE.get([STORAGE_KEYS.STATS_CHARTS], (result: any) => {
                const db = (result && result[STORAGE_KEYS.STATS_CHARTS]) ? result[STORAGE_KEYS.STATS_CHARTS] : {};
                
                if (!db[self.currentBrand]) db[self.currentBrand] = {};
                if (!db[self.currentBrand][today]) db[self.currentBrand][today] = { data: [] };

                const session = db[self.currentBrand][today];
                
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
                    } catch (_err) {
                        console.warn("[SYH StatsTracker] Corrupted JSON in localStorage key:", key);
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
        if (!obj || typeof obj !== 'object') return null;
        return obj?.activeBrand?.name || obj?.brand?.name || null;
    }
};

// Clean ESM export
