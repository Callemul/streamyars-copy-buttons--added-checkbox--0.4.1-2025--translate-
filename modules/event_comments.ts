import { SYH_CONFIG } from './config';
import { SYH_STATE } from './state';
import { SYH_UTILS } from './utils';
import { SYH_UI } from './ui_core';
import { SYH_STORAGE, STORAGE_KEYS } from './storage';
import { SYH_BUS } from './event_bus';

export interface PrayerRecord {
    author: string;
    text: string;
    type: string;
    icon: string;
    roomId: string;
    timestamp: number;
}

export interface SyhEventComments {
    SELECTORS: Record<string, string> | null;
    STATE: any;
    UTILS: any;
    UI: any;
    TIMINGS: Record<string, number> | null;
    isBound: boolean;
    autoHealObserver?: MutationObserver;
    autoHealContainer?: Element;

    init(config?: any, state?: any, utils?: any, ui?: any): void;
    bindEvents(): void;
    saveToDatabase(author: string, text: string, type: string, icon: string): void;
    removeFromDatabase(text: string): void;
}

export const SYH_EVENT_COMMENTS: SyhEventComments = {
    SELECTORS: null,
    STATE: null,
    UTILS: null,
    UI: null,

    TIMINGS: null,
    isBound: false,

    init: function(config?: any, state?: any, utils?: any, ui?: any): void {
        this.SELECTORS = config ? config.SELECTORS : (SYH_CONFIG ? SYH_CONFIG.SELECTORS : null);
        this.TIMINGS = config ? config.TIMINGS : (SYH_CONFIG ? SYH_CONFIG.TIMINGS : null);
        this.STATE = state || SYH_STATE;
        this.UTILS = utils || SYH_UTILS;
        this.UI = ui || SYH_UI;
    },

    bindEvents: function(): void {
        if (this.isBound) {
            return;
        }
        this.isBound = true;
        const self = this;

        // --- БРОНЕБІЙНИЙ СКАНЕР ЛКМ ТА САМОВІДНОВЛЕННЯ БАЗИ (Event-Driven MutationObserver) ---
        const runAutoHeal = (): void => {
            if (typeof chrome !== 'undefined' && chrome.runtime && !chrome.runtime.id) {
                if (self.autoHealObserver) {
                    self.autoHealObserver.disconnect();
                }
                return;
            }

            // 1. Відмітка "Опрацьовано" для коментарів на екрані
            const coverButtons = document.querySelectorAll('[data-testid="show-comment-button"]');
            coverButtons.forEach((btn: Element) => {
                if (btn.textContent?.includes('Hide') || btn.querySelector('.lucide-circle-minus')) {
                    const commentBlock = btn.closest(self.SELECTORS?.commentBlock || '');
                    if (commentBlock) {
                        const checkbox = commentBlock.querySelector('.syh-checkbox[data-type="comment"]') as HTMLInputElement | null;
                        if (checkbox && !checkbox.checked) {
                            checkbox.checked = true;
                            const textKey = commentBlock.querySelector(self.SELECTORS?.commentText || '')?.textContent;
                            if (self.STATE && textKey) {
                                self.STATE.updateState(textKey, true);
                            }
                            if ((window as any).SYH_COMMENT_ASSISTANT) {
                                (window as any).SYH_COMMENT_ASSISTANT.processComment(commentBlock);
                            }
                        }
                    }
                }
            });

            // 2. ФІКС "ПРИВИДІВ" (Auto-Heal): Синхронізація локальної бази зі StreamYard
            const syhComments = document.querySelectorAll('[data-syh-type="prayer"], [data-syh-type="question"]');
            syhComments.forEach((commentBlock: Element) => {
                const starBtn = commentBlock.querySelector(self.SELECTORS?.starButton || '');
                // Якщо коментар є в базі (підсвічений), але на сервері втратив зірочку
                if (starBtn && starBtn.getAttribute('aria-selected') === 'false') {
                    // Перевіряємо, чи це не новий коментар, який ще не встиг отримати зірочку від React
                    if (commentBlock.getAttribute('data-syh-just-added') !== 'true') {
                        const text = commentBlock.querySelector(self.SELECTORS?.commentText || '')?.textContent;
                        if (text) {
                            console.log("[SYH] Auto-Heal: Виявлено коментар без зірки. Очищую з бази.");
                            self.removeFromDatabase(text);
                            if (self.UI) {
                                self.UI.updateCommentVisuals(commentBlock, 'none');
                                if (typeof self.UI.filterStarredComments === 'function') {
                                    setTimeout(() => self.UI.filterStarredComments(), 100);
                                }
                            }
                        }
                    }
                }
            });
        };

        const checkAndReattachAutoHeal = (): void => {
            if (!self.autoHealContainer || self.autoHealContainer === document.body || !self.autoHealContainer.isConnected) {
                const specificContainer = document.querySelector('[data-testid="chat-container"]')
                    || document.querySelector('.chat-container');

                if (specificContainer && specificContainer !== self.autoHealContainer) {
                    console.log("[SYH] Чат-контейнер знайдено. Перепідключаю autoHeal MutationObserver з body до конкретного контейнера.");
                    if (self.autoHealObserver) self.autoHealObserver.disconnect();
                    self.autoHealContainer = specificContainer;
                    self.autoHealObserver?.observe(self.autoHealContainer, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        attributeFilter: ['aria-selected', 'class']
                    });
                }
            }
        };

        if (self.autoHealObserver) {
            self.autoHealObserver.disconnect();
        }

        let rafScheduled = false;
        self.autoHealObserver = new MutationObserver(() => {
            checkAndReattachAutoHeal();
            if (!rafScheduled) {
                rafScheduled = true;
                requestAnimationFrame(() => {
                    rafScheduled = false;
                    runAutoHeal();
                });
            }
        });

        self.autoHealContainer = document.querySelector('[data-testid="chat-container"]')
            || document.querySelector('.chat-container')
            || document.body;

        self.autoHealObserver?.observe(self.autoHealContainer, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['aria-selected', 'class']
        });

        // Первинна перевірка при ініціалізації
        runAutoHeal();

        // --- НАТИВНИЙ ПЕРЕХОПЛЮВАЧ КЛІКІВ (ОБХІД REACT ТА ФІКС ЛІЧИЛЬНИКІВ) ---
        document.addEventListener('click', function(e: MouseEvent) {
            const target = e.target as Element | null;
            if (!target || !self.SELECTORS?.starButton) return;
            const starBtn = target.closest(self.SELECTORS.starButton);
            if (starBtn) {
                if (starBtn.getAttribute('aria-selected') === 'true') {
                    const commentBlock = starBtn.closest(self.SELECTORS.commentBlock);
                    if (commentBlock) {
                        const text = commentBlock.querySelector(self.SELECTORS.commentText)?.textContent;
                        if (text) {
                            self.removeFromDatabase(text);
                        }
                        if (self.UI) {
                            self.UI.updateCommentVisuals(commentBlock, 'none');
                            const li = commentBlock.closest('li');
                            if (li) {
                                li.setAttribute('data-syh-deleted', 'true');
                                li.style.display = 'none';
                            }
                            
                            if (typeof self.UI.filterStarredComments === 'function') {
                                setTimeout(() => self.UI.filterStarredComments(), 50);
                            }
                        }
                    }
                }
            }
        }, true);

        // --- ПЕРЕХОПЛЮВАЧ СЕРЕДНЬОГО КЛІКУ (КОЛІЩАТКА) ДЛЯ ЗНЯТТЯ ЗІРКИ ---
        document.addEventListener('mousedown', function(e: MouseEvent) {
            if (e.button === 1) { 
                const target = e.target as Element | null;
                if (!target || !self.SELECTORS?.commentBlock) return;
                if (target.closest('.syh-button')) return;

                const commentBlock = target.closest(self.SELECTORS.commentBlock);
                if (commentBlock) {
                    e.preventDefault(); 
                    e.stopPropagation();
                    
                    const starBtnNode = commentBlock.querySelector(self.SELECTORS.starButton || '') as HTMLElement | null;
                    if (starBtnNode && starBtnNode.getAttribute('aria-selected') === 'true') {
                        starBtnNode.click(); 
                    }
                }
            }
        }, true);

        // --- НАТИВНИЙ ПЕРЕХОПЛЮВАЧ ПКМ ДЛЯ КОМЕНТАРІВ (У ТОМУ ЧИСЛІ НА ТРИ КРАПКИ) ---
        document.addEventListener('contextmenu', function(e: MouseEvent) {
            const target = e.target as Element | null;
            if (!target || !self.SELECTORS?.commentBlock) return;
            const targetBtn = target.closest([
                '[data-testid="show-comment-button"]',
                '[class*="PlatformComment__CoverButton"]',
                '[aria-label="Comment actions"]',
                '[class*="DesktopMoreButton"]'
            ].join(','));

            if (targetBtn) {
                e.preventDefault();
                e.stopPropagation();
                const commentBlock = targetBtn.closest(self.SELECTORS.commentBlock);
                if (commentBlock) {
                    const checkbox = commentBlock.querySelector('.syh-checkbox[data-type="comment"]') as HTMLInputElement | null;
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        const textKey = commentBlock.querySelector(self.SELECTORS.commentText || '')?.textContent;
                        if (self.STATE && textKey) {
                            self.STATE.updateState(textKey, checkbox.checked);
                        }
                        if ((window as any).SYH_COMMENT_ASSISTANT) {
                            (window as any).SYH_COMMENT_ASSISTANT.processComment(commentBlock);
                        }
                    }
                }
            }
        }, true);

        document.addEventListener('contextmenu', function(e: MouseEvent) {
            const target = e.target as Element | null;
            if (target?.closest('.syh-button[data-action="copy-prayer"]')) {
                e.preventDefault();
            }
        });

        document.addEventListener('mousedown', function(e: MouseEvent) {
            const target = e.target as Element | null;
            if (target?.closest('.syh-button[data-type="comment"]') && e.button === 1) {
                e.preventDefault();
            }
        });

        document.addEventListener('mouseup', function(e: MouseEvent) {
            const target = e.target as Element | null;
            const button = target?.closest('.syh-button[data-type="comment"]') as HTMLElement | null;
            if (!button) return;

            e.preventDefault();
            e.stopPropagation();

            const action = button.dataset.action;
            const buttonNum = e.button;

            if (buttonNum !== 0 && action !== 'copy-prayer') return;

            const commentBlock = button.closest(self.SELECTORS?.commentBlock || '');
            if (!commentBlock) return;

            let author = commentBlock.querySelector(self.SELECTORS?.commentAuthor || '')?.textContent?.trim() || '';
            while (author.startsWith('@')) author = author.substring(1);

            const commentText = commentBlock.querySelector(self.SELECTORS?.commentText || '')?.textContent || '';
            let textToCopy = '', header = '';
            
            // Встановлюємо таймер-запобіжник для Auto-Heal сканера
            if (action === 'copy-author-comment' || action === 'copy-prayer') {
                commentBlock.setAttribute('data-syh-just-added', 'true');
                setTimeout(() => { commentBlock.removeAttribute('data-syh-just-added'); }, 2000);
            }

            if (action === 'copy-comment') { 
                header = "📄 Комент (без автора)"; 
                textToCopy = commentText; 
            }
            else if (action === 'copy-author-comment') { 
                header = "📑 Автор і його ❓ питання"; 
                textToCopy = `@${author}\n\n${commentText}`; 
                
                self.saveToDatabase(author, commentText, "question", "❓");
                if (self.UI) self.UI.updateCommentVisuals(commentBlock, 'question');
            }
            else if (action === 'copy-prayer') { 
                let prayerIcon = "🙏🙏🙏";
                if (buttonNum === 1) prayerIcon = "🙏❤️🙏"; 
                if (buttonNum === 2) prayerIcon = "❤️❤️❤️"; 
                
                header = `📑 Автор і його ${prayerIcon}`; 
                textToCopy = `\n\n\n${prayerIcon} @${author}\n\n${commentText}`; 
                
                self.saveToDatabase(author, commentText, "prayer", prayerIcon);
                if (self.UI) self.UI.updateCommentVisuals(commentBlock, 'prayer');

                if ((window as any).SYH_STATS_TRACKER && typeof (window as any).SYH_STATS_TRACKER.registerPrayerMarker === 'function') {
                    (window as any).SYH_STATS_TRACKER.registerPrayerMarker();
                }
            }
            
            if (textToCopy) {
                SYH_BUS.emit('COMMENT_ACTION', {
                    type: action === 'copy-prayer' ? 'prayer' : (action === 'copy-author-comment' ? 'question' : 'copy'),
                    author: author,
                    text: commentText
                });

                if (self.UTILS) {
                    self.UTILS.copyAndShowBanner(textToCopy, header);
                } else if ((window as any).SYH_UTILS) {
                    (window as any).SYH_UTILS.copyAndShowBanner(textToCopy, header);
                }

                const checkboxNode = commentBlock.querySelector('.syh-checkbox[data-type="comment"]') as HTMLInputElement | null;
                if (checkboxNode) {
                    checkboxNode.checked = true;
                    checkboxNode.dispatchEvent(new Event('change', { bubbles: true }));
                    if (self.STATE) {
                        self.STATE.updateState(commentText, true);
                    }
                }

                commentBlock.querySelectorAll<HTMLInputElement>('.syh-checkbox').forEach(cb => cb.checked = true);
                
                const starBtnNode = commentBlock.querySelector(self.SELECTORS?.starButton || '') as HTMLElement | null;
                if (starBtnNode && starBtnNode.getAttribute('aria-selected') === 'false') {
                    starBtnNode.click();
                }
            }
        });

        document.addEventListener('change', function(e: Event) {
            const target = e.target as Element | null;
            const checkbox = target?.closest('.syh-checkbox[data-type="comment"]') as HTMLInputElement | null;
            if (!checkbox) return;

            const commentBlock = checkbox.closest(self.SELECTORS?.commentBlock || '');
            if (!commentBlock) return;
            const textKey = commentBlock.querySelector(self.SELECTORS?.commentText || '')?.textContent || '';
            
            if (self.STATE) {
                self.STATE.updateState(textKey, checkbox.checked);
            }
            if ((window as any).SYH_COMMENT_ASSISTANT) {
                (window as any).SYH_COMMENT_ASSISTANT.processComment(commentBlock);
            }
        });
    },

    saveToDatabase: function(author: string, text: string, type: string, icon: string): void {
        const storage = SYH_STORAGE;

        if (!storage) {
            console.error("SYH_EVENT_COMMENTS: Не знайдено адаптер сховища!");
            return;
        }

        const currentRoomId = window.location.pathname.replace(/\//g, '');
        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

        storage.get([STORAGE_KEYS.PRAYERS], function(result: Record<string, any>) {
            let list: PrayerRecord[] = result[STORAGE_KEYS.PRAYERS] || [];
            
            list = list.filter(item => {
                if (!item.timestamp) return true;
                return (now - item.timestamp) < thirtyDaysMs;
            });

            list = list.filter(item => item.text !== text);
            
            list.push({ 
                author: author, 
                text: text, 
                type: type, 
                icon: icon,
                roomId: currentRoomId,
                timestamp: now
            });
            
            storage.set({ [STORAGE_KEYS.PRAYERS]: list });
        });
    },

    removeFromDatabase: function(text: string): void {
        if (this.UI && this.UI.prayersCache) {
            this.UI.prayersCache = this.UI.prayersCache.filter((item: any) => item.text !== text);
        }

        const storage = SYH_STORAGE;

        if (!storage) {
            console.error("SYH_EVENT_COMMENTS: Не знайдено адаптер сховища!");
            return;
        }

        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

        storage.get([STORAGE_KEYS.PRAYERS], function(result: Record<string, any>) {
            let list: PrayerRecord[] = result[STORAGE_KEYS.PRAYERS] || [];
            
            list = list.filter(item => {
                if (item.text === text) return false;
                if (item.timestamp && (now - item.timestamp) > thirtyDaysMs) return false;
                return true;
            });
            
            storage.set({ [STORAGE_KEYS.PRAYERS]: list });
        });
    }
};

if (typeof window !== 'undefined') {
    (window as any).SYH_EVENT_COMMENTS = SYH_EVENT_COMMENTS;
}
