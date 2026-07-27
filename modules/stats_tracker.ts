import { SYH_CONFIG } from './config.ts';
import { SYH_STORAGE } from './storage.ts';

export interface SyhStatsTracker {
    intervalId: ReturnType<typeof setInterval> | null;
    currentBrand: string;
    lastKnownBrand: string;

    init(): void;
    setupObservers(): void;
    restoreButtonStates(btnQ: HTMLElement, btnP: HTMLElement): void;
    markPhase(phase: 'questions' | 'prayers', btnElement: HTMLElement): void;
    startTracking(): void;
    showAnalyticsModal(): void;
    getBrandFromLocalStorage(): string;
    searchBrandNameInObject(obj: any): string | null;
}

export const SYH_STATS_TRACKER: SyhStatsTracker = {
    intervalId: null,
    currentBrand: "DefaultShow",
    lastKnownBrand: "",

    init: function(): void {
        this.setupObservers();
        this.startTracking();
    },

    setupObservers: function(): void {
        const self = this;
        self.lastKnownBrand = ""; // Локальний кеш останнього зчитаного бренда для відображення на всіх вкладках
        
        // Вставляємо кнопки в шапку: Фази + Аналітика
        function injectHeaderButtons(): void {
            const headerCenter = document.querySelector('[data-testid="header-center"]') as HTMLElement | null;
            const statusWrap = document.querySelector('[data-testid="header-status-wrap"]');
            
            if (headerCenter && statusWrap) {
                // Намагаємось зчитати назву папки медіа (стійкий селектор наскрізного зчитування)
                const brandNode = document.querySelector('[class*="BrandSelect__BrandNameText"], .BrandSelect__BrandNameText-sc-16g9tfx-1, [aria-controls="brand-select-menu"]');
                let brandName = "";

                // ФІКС (НАСКРІЗНЕ ЗЧИТУВАННЯ): Використовуємо textContent замість innerText для зчитування бренду з прихованих вкладок
                if (brandNode) {
                    const rawText = brandNode.textContent ? brandNode.textContent.replace(/chevron-down/gi, "").trim() : "";
                    // Захист від зчитування системних кнопок інтерфейсу
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

                // Зчитуємо заголовок стріму в шапці сайту
                const titleNode = document.querySelector('[data-testid="header-title-wrap"] p') as HTMLElement | null;
                const titleText = titleNode ? titleNode.innerText.toLowerCase() : "";

                // Критерії Суботньої школи з двома авторами (Молчанов і Опарін)
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

                    // Кнопка фіксації блоку питань
                    const btnQ = document.createElement('button');
                    btnQ.innerText = '❓ Старт: Питання';
                    btnQ.title = 'Натисни, коли починається блок питань';
                    btnQ.setAttribute('aria-label', 'Фіксувати старт блоку питань');
                    btnQ.style.cssText = 'background: #f39c12; color: white; border: none; border-radius: 4px; padding: 0 10px; cursor: pointer; font-weight: bold; font-size: 12px; height: 28px; transition: 0.2s;';
                    btnQ.onclick = () => self.markPhase('questions', btnQ);

                    // Кнопка фіксації блоку молитов
                    const btnP = document.createElement('button');
                    btnP.innerText = '🙏 Старт: Молитви';
                    btnP.title = 'Натисни, коли починається молитовний блок';
                    btnP.setAttribute('aria-label', 'Фіксувати старт молитовного блоку');
                    btnP.style.cssText = 'background: #005DF7; color: white; border: none; border-radius: 4px; padding: 0 10px; cursor: pointer; font-weight: bold; font-size: 12px; height: 28px; transition: 0.2s;';
                    btnP.onclick = () => self.markPhase('prayers', btnP);

                    // Кнопка Аналітики
                    const btnAnalytics = document.createElement('button');
                    btnAnalytics.id = 'syh-analytics-btn';
                    btnAnalytics.innerText = '📈 Аналітика';
                    btnAnalytics.setAttribute('aria-label', 'Відкрити аналітику');
                    btnAnalytics.style.cssText = 'background: #28a745; color: white; border: none; border-radius: 4px; padding: 0 12px; cursor: pointer; font-weight: bold; font-size: 13px; height: 28px; margin-left: 10px;';
                    btnAnalytics.onclick = () => self.showAnalyticsModal();

                    // Кнопка Інформації (Release Notes / Daily Tips)
                    const btnInfo = document.createElement('button');
                    btnInfo.id = 'syh-info-btn';
                    btnInfo.innerHTML = 'ⓘ';
                    btnInfo.title = 'Оновлення та Інструкції';
                    btnInfo.setAttribute('aria-label', 'Відкрити довідку та оновлення');
                    btnInfo.style.cssText = 'background: #4F5461; color: white; border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-weight: bold; font-size: 15px; margin-left: 8px; display: flex; align-items: center; justify-content: center; transition: background 0.2s;';
                    btnInfo.onmouseover = () => btnInfo.style.background = '#636979';
                    btnInfo.onmouseout = () => btnInfo.style.background = '#4F5461';
                    btnInfo.onclick = () => {
                        if ((window as any).SYH_INFO_MODAL && typeof (window as any).SYH_INFO_MODAL.showModal === 'function') {
                            (window as any).SYH_INFO_MODAL.showModal();
                        } else {
                            console.warn("[SYH] Модуль info_modal.js ще не завантажено.");
                        }
                    };

                    btnContainer.appendChild(btnQ);
                    btnContainer.appendChild(btnP);
                    btnContainer.appendChild(btnAnalytics);
                    btnContainer.appendChild(btnInfo);

                    headerCenter.insertBefore(btnContainer, statusWrap);
                    
                    self.restoreButtonStates(btnQ, btnP);
                }

                // 4. ФІКС СИГНАЛУ НА ВКЛАДЦІ «МЕДІА»: Націлюємося на бічну кнопку "Media assets"
                const mediaTabBtn = (document.getElementById('broadcast-aside-tab-assets') || document.querySelector('[id*="tab-assets"]')) as HTMLElement | null;
                if (mediaTabBtn) {
                    const currentBrand = brandName;
                    
                    if (currentBrand) {
                        const isBrandCorrect = currentBrand.toLowerCase().includes("суббот") || 
                                               currentBrand.toLowerCase().includes("субот");

                        // Якщо заголовок стріму — "Суботня школа Молчанов-Опарін", але вибраний бренд НЕ Субботня школа (наприклад, Опарін чи Тест)
                        if (isSabbathSchool && !isBrandCorrect) {
                            if (!mediaTabBtn.dataset.originalTitle) {
                                mediaTabBtn.dataset.originalTitle = mediaTabBtn.getAttribute('title') || mediaTabBtn.getAttribute('aria-label') || "Media assets";
                            }
                            
                            // Робимо бічну вкладку червоною, додаємо тултіп-попередження та анімацію пульсації
                            mediaTabBtn.setAttribute('title', '⚠️ ПОМИЛКА: Папка медіа має бути "Субботняя школа"!');
                            mediaTabBtn.style.cssText = 'background: #e74c3c !important; color: white !important; border: 1px solid #ff4757 !important; animation: syhActivePulse 1.5s infinite alternate !important;';
                        } else {
                            // Якщо все налаштовано правильно: знімаємо червоні стилі та повертаємо оригінальний тултіп
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
        const uiObserver = new MutationObserver(() => injectHeaderButtons());
        uiObserver.observe(document.body, { childList: true, subtree: true });
    },

    restoreButtonStates: function(btnQ: HTMLElement, btnP: HTMLElement): void {
        const today = (window as any).SYH_UTILS && typeof (window as any).SYH_UTILS.getTodayDateString === 'function'
            ? (window as any).SYH_UTILS.getTodayDateString()
            : new Date().toLocaleDateString('sv-SE');
        const self = this;
        
        const storage = SYH_STORAGE || ((window as any).SYH_UTILS && (window as any).SYH_UTILS.storage ? (window as any).SYH_UTILS.storage : null);
        if (storage) {
            storage.get(['syh_stream_charts'], function(result: any) {
                const db = (result && result.syh_stream_charts) ? result.syh_stream_charts : {};
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
        }
    },

    markPhase: function(phase: 'questions' | 'prayers', btnElement: HTMLElement): void {
        const timerWrapper = document.querySelector('div[class*="Timer__TimerWrapper"]') as HTMLElement | null;
        if (!timerWrapper) {
            alert("Ефір ще не розпочався (немає таймера)!");
            return;
        }
        
        const timerText = timerWrapper.innerText.replace(/\n/g, '').trim();
        const today = (window as any).SYH_UTILS && typeof (window as any).SYH_UTILS.getTodayDateString === 'function'
            ? (window as any).SYH_UTILS.getTodayDateString()
            : new Date().toLocaleDateString('sv-SE');
        const self = this;

        const storage = SYH_STORAGE || ((window as any).SYH_UTILS && (window as any).SYH_UTILS.storage ? (window as any).SYH_UTILS.storage : null);
        if (storage) {
            storage.get(['syh_stream_charts'], function(result: any) {
                let db = (result && result.syh_stream_charts) ? result.syh_stream_charts : {};
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

                storage.set({ 'syh_stream_charts': db });
            });
        }
    },

    startTracking: function(): void {
        const self = this;
        
        this.intervalId = setInterval(() => {
            // KILL SWITCH: Тихе самознищення таймера без виведення помилок у панель
            if (typeof chrome !== 'undefined' && chrome.runtime && !chrome.runtime.id) {
                if (self.intervalId) clearInterval(self.intervalId);
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

            const today = (window as any).SYH_UTILS && typeof (window as any).SYH_UTILS.getTodayDateString === 'function'
                ? (window as any).SYH_UTILS.getTodayDateString()
                : new Date().toLocaleDateString('sv-SE');

            const storage = SYH_STORAGE || ((window as any).SYH_UTILS && (window as any).SYH_UTILS.storage ? (window as any).SYH_UTILS.storage : null);
            if (storage) {
                storage.get(['syh_stream_charts'], function(result: any) {
                    let db = (result && result.syh_stream_charts) ? result.syh_stream_charts : {};
                    
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

                    storage.set({ 'syh_stream_charts': db });
                });
            }
        }, ((SYH_CONFIG as any)?.TIMINGS?.STATS_TRACKING_INTERVAL) || 60000); 
    },

    // ДЕЛЕГУВАННЯ: Виклик великої модалки аналітики та експорту делегується в stats_exporter.js
    showAnalyticsModal: function(): void {
        if ((window as any).SYH_STATS_EXPORTER && typeof (window as any).SYH_STATS_EXPORTER.showModal === 'function') {
            (window as any).SYH_STATS_EXPORTER.showModal(this.currentBrand);
        } else {
            console.warn("[SYH] Модуль експорту stats_exporter.js ще не завантажено у вікно.");
        }
    },

    // Рекурсивний сканер для автоматичного пошуку активного бренда в сховищі без кліку по вкладці
    getBrandFromLocalStorage: function(): string {
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key) continue;
                
                // Перевіряємо ключі, пов'язані зі станом студії чи збереженими брендами
                if (key.includes('brand') || key.includes('studio') || key.includes('store') || key.includes('state')) {
                    const val = localStorage.getItem(key);
                    if (!val) continue;
                    
                    if (val.startsWith('{') || val.startsWith('[')) {
                        const data = JSON.parse(val);
                        const foundName = this.searchBrandNameInObject(data);
                        if (foundName) return foundName;
                    }
                }
            }
        } catch (e) {
            console.warn("[SYH] Помилка автозчитування бренда з localStorage:", e);
        }
        return "";
    },

    // Допоміжний рекурсивний обхідник JSON-дерева для знаходження імені бренда
    searchBrandNameInObject: function(obj: any): string | null {
        if (!obj || typeof obj !== 'object') return null;
        
        if (obj.activeBrand && obj.activeBrand.name) return obj.activeBrand.name;
        if (obj.currentBrand && obj.currentBrand.name) return obj.currentBrand.name;
        if (obj.brand && obj.brand.name) return obj.brand.name;
        
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const val = obj[key];
                if (key === 'activeBrandName' || key === 'brandName' || key === 'currentBrandName') {
                    if (typeof val === 'string') return val;
                }
                if (typeof val === 'object') {
                    const res = this.searchBrandNameInObject(val);
                    if (res) return res;
                }
            }
        }
        return null;
    }
};

if (typeof window !== 'undefined') {
    (window as any).SYH_STATS_TRACKER = SYH_STATS_TRACKER;
}
