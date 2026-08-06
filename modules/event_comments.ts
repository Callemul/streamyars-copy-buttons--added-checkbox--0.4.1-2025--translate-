import { SYH_CONFIG, type SyhConfig, type SelectorValue } from './config';
import { SYH_STATE, type SyhState } from './state';
import { SYH_UTILS, type SyhUtils } from './utils';
import { SYH_UI, type SyhUi } from './ui_core';
import { SYH_BUS } from './event_bus';
import { SYH_COMMENT_ASSISTANT } from './comment_assistant';
import { SYH_DOM_OBSERVER } from './dom_observer';
import { CommentService } from './comment_service';
import type { ISyhPlugin } from './plugin_registry';

export interface PrayerRecord {
    author: string;
    text: string;
    type: string;
    icon: string;
    roomId: string;
    timestamp: number;
}

export interface SyhEventComments {
    SELECTORS: Record<string, SelectorValue> | null;
    STATE: SyhState | null;
    UTILS: SyhUtils | null;
    UI: SyhUi | null;
    TIMINGS: Record<string, number> | null;
    isBound: boolean;
    unregisterAutoHeal?: (() => void) | null;
    _clickHandler?: (e: MouseEvent) => void;
    _contextHandler?: (e: MouseEvent) => void;
    _changeHandler?: (e: Event) => void;

    init(config?: SyhConfig, state?: SyhState, utils?: SyhUtils, ui?: SyhUi): void;
    bindEvents(): void;
    bindAutoHealScanner(): void;
    bindStarButtonClickHandler(): void;
    bindMiddleClickHandler(): void;
    bindContextMenuHandlers(): void;
    bindSyhButtonMouseHandlers(): void;
    bindCheckboxChangeHandler(): void;
    destroy(): void;
    saveToDatabase(author: string, text: string, type: string, icon: string): void;
    removeFromDatabase(text: string): void;
}

export const SYH_EVENT_COMMENTS_PLUGIN: ISyhPlugin = {
    id: 'syh_event_comments',
    name: 'StreamYard Comments Handler',
    enabled: true,
    isSupported: (url = typeof window !== 'undefined' ? window.location.href : '') => url.includes('streamyard.com'),
    init: () => {
        SYH_EVENT_COMMENTS.init();
        SYH_EVENT_COMMENTS.bindEvents();
    }
};

export const SYH_EVENT_COMMENTS: SyhEventComments = {
    SELECTORS: null,
    STATE: null,
    UTILS: null,
    UI: null,

    TIMINGS: null,
    isBound: false,

    init: function(config?: SyhConfig, state?: SyhState, utils?: SyhUtils, ui?: SyhUi): void {
        this.SELECTORS = config ? config.SELECTORS : (SYH_CONFIG ? SYH_CONFIG.SELECTORS : null);
        this.TIMINGS = config ? config.TIMINGS : (SYH_CONFIG ? SYH_CONFIG.TIMINGS : null);
        this.STATE = state || SYH_STATE;
        this.UTILS = utils || SYH_UTILS;
        this.UI = ui || SYH_UI;
    },

    destroy: function(): void {
        if (this.unregisterAutoHeal) {
            this.unregisterAutoHeal();
            this.unregisterAutoHeal = null;
        }
        if (this._clickHandler) {
            document.removeEventListener('click', this._clickHandler, true);
            this._clickHandler = undefined;
        }
        if (this._middleClickHandler) {
            document.removeEventListener('mousedown', this._middleClickHandler, true);
            this._middleClickHandler = undefined;
        }
        if (this._contextHandler) {
            document.removeEventListener('contextmenu', this._contextHandler, true);
            this._contextHandler = undefined;
        }
        if (this._copyPrayerContextHandler) {
            document.removeEventListener('contextmenu', this._copyPrayerContextHandler);
            this._copyPrayerContextHandler = undefined;
        }
        if (this._syhButtonMouseDownHandler) {
            document.removeEventListener('mousedown', this._syhButtonMouseDownHandler);
            this._syhButtonMouseDownHandler = undefined;
        }
        if (this._mouseupHandler) {
            document.removeEventListener('mouseup', this._mouseupHandler);
            this._mouseupHandler = undefined;
        }
        if (this._changeHandler) {
            document.removeEventListener('change', this._changeHandler);
            this._changeHandler = undefined;
        }
        this.isBound = false;
    },

    bindEvents: function(): void {
        if (this.isBound) {
            return;
        }
        this.isBound = true;

        this.bindAutoHealScanner();
        this.bindStarButtonClickHandler();
        this.bindMiddleClickHandler();
        this.bindContextMenuHandlers();
        this.bindSyhButtonMouseHandlers();
        this.bindCheckboxChangeHandler();
    },

    bindAutoHealScanner: function(): void {
        const self = this;
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
                            if (textKey) {
                                CommentService.setStreamYardCheckboxState(textKey, true);
                            }
                            SYH_COMMENT_ASSISTANT.processComment(commentBlock);
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

        if (self.unregisterAutoHeal) {
            self.unregisterAutoHeal();
            self.unregisterAutoHeal = null;
        }

        const commentSelector = Array.isArray(self.SELECTORS?.commentBlock)
            ? (self.SELECTORS.commentBlock as string[]).join(',')
            : ((self.SELECTORS?.commentBlock as string) || '[class*="PlatformComment__Wrap"]');

        let rafScheduled = false;
        const triggerAutoHeal = () => {
            if (document.hidden) return;
            if (!rafScheduled) {
                rafScheduled = true;
                requestAnimationFrame(() => {
                    rafScheduled = false;
                    runAutoHeal();
                });
            }
        };

        self.unregisterAutoHeal = SYH_DOM_OBSERVER.register(
            commentSelector,
            () => triggerAutoHeal(),
            () => triggerAutoHeal()
        );

        // Первинна перевірка при ініціалізації
        runAutoHeal();
    },

    bindStarButtonClickHandler: function(): void {
        const self = this;
        self._clickHandler = function(e: MouseEvent) {
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
        };
        document.addEventListener('click', self._clickHandler, true);
    },

    bindMiddleClickHandler: function(): void {
        const self = this;
        self._middleClickHandler = function(e: MouseEvent) {
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
        };
        document.addEventListener('mousedown', self._middleClickHandler, true);
    },

    bindContextMenuHandlers: function(): void {
        const self = this;
        self._contextHandler = function(e: MouseEvent) {
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
                        if (textKey) {
                            CommentService.setStreamYardCheckboxState(textKey, checkbox.checked);
                        }
                        SYH_COMMENT_ASSISTANT.processComment(commentBlock);
                    }
                }
            }
        };
        document.addEventListener('contextmenu', self._contextHandler, true);

        self._copyPrayerContextHandler = function(e: MouseEvent) {
            const target = e.target as Element | null;
            if (target?.closest('.syh-button[data-action="copy-prayer"]')) {
                e.preventDefault();
            }
        };
        document.addEventListener('contextmenu', self._copyPrayerContextHandler);
    },

    bindSyhButtonMouseHandlers: function(): void {
        const self = this;
        self._syhButtonMouseDownHandler = function(e: MouseEvent) {
            const target = e.target as Element | null;
            if (target?.closest('.syh-button[data-type="comment"]') && e.button === 1) {
                e.preventDefault();
            }
        };
        document.addEventListener('mousedown', self._syhButtonMouseDownHandler);

        self._mouseupHandler = function(e: MouseEvent) {
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

                SYH_BUS.emit('PRAYER_MARKED', { author, text: commentText, icon: prayerIcon });
            }
            
            if (textToCopy) {
                SYH_BUS.emit('COMMENT_ACTION', {
                    type: action === 'copy-prayer' ? 'prayer' : (action === 'copy-author-comment' ? 'question' : 'copy'),
                    author: author,
                    text: commentText
                });

                if (self.UTILS) {
                    self.UTILS.copyAndShowBanner(textToCopy, header);
                }

                const checkboxNode = commentBlock.querySelector('.syh-checkbox[data-type="comment"]') as HTMLInputElement | null;
                if (checkboxNode) {
                    checkboxNode.checked = true;
                    checkboxNode.dispatchEvent(new Event('change', { bubbles: true }));
                    CommentService.setStreamYardCheckboxState(commentText, true);
                }

                commentBlock.querySelectorAll<HTMLInputElement>('.syh-checkbox').forEach(cb => cb.checked = true);
                
                const starBtnNode = commentBlock.querySelector(self.SELECTORS?.starButton || '') as HTMLElement | null;
                if (starBtnNode && starBtnNode.getAttribute('aria-selected') === 'false') {
                    starBtnNode.click();
                }
            }
        };
        document.addEventListener('mouseup', self._mouseupHandler);
    },

    bindCheckboxChangeHandler: function(): void {
        const self = this;
        self._changeHandler = function(e: Event) {
            const target = e.target as Element | null;
            const checkbox = target?.closest('.syh-checkbox[data-type="comment"]') as HTMLInputElement | null;
            if (!checkbox) return;

            const commentBlock = checkbox.closest(self.SELECTORS?.commentBlock || '');
            if (!commentBlock) return;
            const textKey = commentBlock.querySelector(self.SELECTORS?.commentText || '')?.textContent || '';
            
            CommentService.setStreamYardCheckboxState(textKey, checkbox.checked);
            SYH_COMMENT_ASSISTANT.processComment(commentBlock);
        };
        document.addEventListener('change', self._changeHandler);
    },

    saveToDatabase: async function(author: string, text: string, type: string, icon: string): Promise<void> {
        const currentRoomId = window.location.pathname.replace(/\//g, '');
        const now = Date.now();

        await CommentService.savePrayerRecord({
            author,
            text,
            type,
            icon,
            roomId: currentRoomId,
            timestamp: now
        });
    },

    removeFromDatabase: async function(text: string): Promise<void> {
        if (this.UI && this.UI.prayersCache) {
            this.UI.prayersCache = this.UI.prayersCache.filter((item: any) => item.text !== text);
        }
        await CommentService.removePrayerRecord(text);
    }
};

// Pure ESM Module Export
