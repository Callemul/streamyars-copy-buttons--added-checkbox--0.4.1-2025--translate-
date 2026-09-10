import type { SyhBannerCreator } from './banner_types';
import type { SyhParsers } from '../parsers/index';
import type { SyhUtils } from '../core/utils';
import { SYH_PARSERS } from '../parsers/index';
import { SYH_UTILS } from '../core/utils';
import { CommentService } from '../comments/comment_service';
import { parseTextToSections } from './banner_modal_parser';
export { parseTextToSections };
import type { ParseSectionsResult } from './banner_modal_parser';
import { saveDraft, restoreDraft, clearDraft } from './banner_modal_draft';

/**
 * Клас модального вікна для створення банерів.
 */
export class SyhBannerModal {
    private overlay: HTMLElement | null = null;
    private textarea: HTMLTextAreaElement | null = null;
    private previewScroll: HTMLElement | null = null;
    private previewCountBadge: HTMLElement | null = null;
    private diagnosticsEl: HTMLElement | null = null;
    private submitBtn: HTMLButtonElement | null = null;

    private bannerCreator: SyhBannerCreator;
    private parsers: SyhParsers;
    private utils: SyhUtils;

    private categoryOverrides: Record<number, string> = {};
    private currentParseResult: ParseSectionsResult | null = null;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;

    private escapeHandler: ((e: KeyboardEvent) => void) | null = null;

    constructor(bannerCreator: SyhBannerCreator) {
        this.bannerCreator = bannerCreator;
        this.parsers = bannerCreator.PARSERS || SYH_PARSERS;
        this.utils = bannerCreator.UTILS || SYH_UTILS;
    }

    public open(): void {
        this.close(); // Закрити попередній, якщо був

        const modalHtml = this.createModalHtml();
        const wrapper = document.createElement('div');
        wrapper.innerHTML = modalHtml;
        this.overlay = wrapper.firstElementChild as HTMLElement;

        const targetBody = (typeof document !== 'undefined') ? (document.body || document.documentElement) : null;
        if (targetBody && typeof targetBody.appendChild === 'function') {
            targetBody.appendChild(this.overlay);
        }

        this.initDomElements();
        this.bindEvents();
        this.restoreDraft();
        this.triggerParse();
    }

    public close(): void {
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
            this.escapeHandler = null;
        }
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        this.overlay = null;
        this.categoryOverrides = {};
        this.currentParseResult = null;
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }

    private createModalHtml(): string {
        return `
        <div class="syh-banner-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="syh-modal-title">
            <div class="syh-banner-modal-container">
                <div class="syh-banner-modal-header">
                    <h3 class="syh-banner-modal-title" id="syh-modal-title">
                        <span>📝</span>
                        <span>Створення банерів з тексту</span>
                    </h3>
                    <button class="syh-banner-modal-close" aria-label="Закрити" title="Закрити (Esc)">&times;</button>
                </div>

                <div class="syh-banner-modal-body">
                    <!-- Ліва колонка: ввід та шаблони -->
                    <div class="syh-modal-left-col">
                        <div class="syh-modal-chips-row">
                            <span class="syh-modal-chips-label">Зразки заголовків:</span>
                            <button type="button" class="syh-template-chip" data-template="❓❓❓ ВОПРОСЫ&#10;">+ ❓ Питання глядачів</button>
                            <button type="button" class="syh-template-chip" data-template="🙏🙏🙏 МОЛИТВЕННЫЕ&#10;">+ 🙏 Молитовні</button>
                            <button type="button" class="syh-template-chip" data-template="📺 ВОПРОСЫ ПО СУББОТНЕЙ ШКОЛЕ&#10;">+ 📺 Ефір / СШ</button>
                        </div>

                        <textarea
                            class="syh-modal-textarea"
                            placeholder="Вставте текст запитань або молитов тут..."
                            aria-label="Вхідний текст запитань"
                        ></textarea>

                        <div class="syh-modal-left-controls">
                            <button type="button" class="syh-modal-btn-clear" title="Очистити поле та чернетку">🗑️ Очистити все</button>
                            <button type="button" class="syh-modal-btn-log" title="Скопіювати лог розбору в буфер">📋 Скопіювати лог</button>
                        </div>

                        <div class="syh-modal-diagnostics" aria-live="polite">Очікування тексту...</div>
                    </div>

                    <!-- Права колонка: Live Preview -->
                    <div class="syh-modal-right-col">
                        <div class="syh-preview-header">
                            <span class="syh-preview-title">
                                <span>Попередній перегляд</span>
                                <span class="syh-preview-badge-count">0</span>
                            </span>
                            <span style="font-size: 11px; color: #94A3B8;">Категорія на блок:</span>
                        </div>

                        <div class="syh-preview-scroll">
                            <div class="syh-preview-empty">Вставте текст зліва для попереднього перегляду банерів.</div>
                        </div>
                    </div>
                </div>

                <div class="syh-banner-modal-footer">
                    <button type="button" class="syh-btn-cancel">Скасувати</button>
                    <button type="button" class="syh-btn-submit" disabled>🚀 Створити банери (0)</button>
                </div>
            </div>
        </div>
        `;
    }

    private initDomElements(): void {
        if (!this.overlay) return;
        this.textarea = this.overlay.querySelector('.syh-modal-textarea');
        this.previewScroll = this.overlay.querySelector('.syh-preview-scroll');
        this.previewCountBadge = this.overlay.querySelector('.syh-preview-badge-count');
        this.diagnosticsEl = this.overlay.querySelector('.syh-modal-diagnostics');
        this.submitBtn = this.overlay.querySelector('.syh-btn-submit');
    }

    private bindEvents(): void {
        if (!this.overlay) return;

        // Закриття по хрестику та кнопці "Скасувати"
        const closeBtn = this.overlay.querySelector('.syh-banner-modal-close');
        closeBtn?.addEventListener('click', () => this.close());

        const cancelBtn = this.overlay.querySelector('.syh-btn-cancel');
        cancelBtn?.addEventListener('click', () => this.close());

        // Закриття по кліку на бекдроп
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // Закриття по Escape
        this.escapeHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                this.close();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);

        // Ввід тексту у textarea
        this.textarea?.addEventListener('input', () => {
            this.saveDraft();
            this.scheduleParse();
        });

        // Кнопки швидких шаблонів
        const chips = this.overlay.querySelectorAll<HTMLButtonElement>('.syh-template-chip');
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                const template = chip.getAttribute('data-template') || '';
                this.insertTemplateAtCursor(template);
            });
        });

        // Кнопка "Очистити все"
        const clearBtn = this.overlay.querySelector('.syh-modal-btn-clear');
        clearBtn?.addEventListener('click', () => {
            if (this.textarea) {
                this.textarea.value = '';
            }
            this.categoryOverrides = {};
            this.clearDraft();
            this.triggerParse();
        });

        // Кнопка "Скопіювати лог"
        const logBtn = this.overlay.querySelector('.syh-modal-btn-log');
        logBtn?.addEventListener('click', () => {
            this.copyDiagnosticsLog();
        });

        // Кнопка підтвердження та запуску створення
        this.submitBtn?.addEventListener('click', () => {
            this.handleSubmit();
        });
    }

    private insertTemplateAtCursor(text: string): void {
        if (!this.textarea) return;
        const start = this.textarea.selectionStart || 0;
        const end = this.textarea.selectionEnd || 0;
        const currentVal = this.textarea.value;

        const prefix = (start > 0 && !currentVal.slice(0, start).endsWith('\n')) ? '\n' : '';
        const insertion = `${prefix}${text}`;

        this.textarea.value = currentVal.substring(0, start) + insertion + currentVal.substring(end);
        const newCursorPos = start + insertion.length;
        this.textarea.selectionStart = newCursorPos;
        this.textarea.selectionEnd = newCursorPos;
        this.textarea.focus();

        this.saveDraft();
        this.triggerParse();
    }

    private scheduleParse(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.triggerParse();
        }, 150);
    }

    public triggerParse(): void {
        const rawText = this.textarea?.value || '';
        this.currentParseResult = parseTextToSections(
            rawText,
            this.parsers,
            this.utils,
            this.categoryOverrides
        );

        this.renderPreview(this.currentParseResult);
        this.renderDiagnostics(this.currentParseResult);
    }

    private renderPreview(result: ParseSectionsResult): void {
        const previewScroll = this.previewScroll;
        if (!previewScroll || !this.previewCountBadge || !this.submitBtn) return;

        const totalBanners = result.allBanners.length;
        this.previewCountBadge.textContent = String(totalBanners);
        this.submitBtn.textContent = `🚀 Створити банери (${totalBanners})`;
        this.submitBtn.disabled = totalBanners === 0;

        if (result.sections.length === 0 || totalBanners === 0) {
            previewScroll.innerHTML = '<div class="syh-preview-empty">Вставте текст зліва для попереднього перегляду банерів.</div>';
            return;
        }

        previewScroll.innerHTML = '';

        result.sections.forEach(sec => {
            const secEl = document.createElement('div');
            secEl.className = 'syh-preview-section';

            const headerEl = document.createElement('div');
            headerEl.className = 'syh-section-header';

            const titleEl = document.createElement('span');
            titleEl.className = 'syh-section-title';
            titleEl.textContent = sec.title;
            headerEl.appendChild(titleEl);

            // Кнопки пакетного перемикання категорії блоку
            const btnGroup = document.createElement('div');
            btnGroup.className = 'syh-section-cat-group';

            const catButtons: Array<{ key: string; label: string; activeClass: string }> = [
                { key: 'stream', label: '🟣 Ефір', activeClass: 'active-stream' },
                { key: 'audience', label: '🟠 Глядачі', activeClass: 'active-audience' },
                { key: 'prayer', label: '🔵 Молитва', activeClass: 'active-prayer' }
            ];

            catButtons.forEach(btnInfo => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `syh-section-cat-btn ${sec.category === btnInfo.key ? btnInfo.activeClass : ''}`;
                btn.textContent = btnInfo.label;
                btn.addEventListener('click', () => {
                    this.categoryOverrides[sec.id] = btnInfo.key;
                    this.triggerParse();
                });
                btnGroup.appendChild(btn);
            });

            headerEl.appendChild(btnGroup);
            secEl.appendChild(headerEl);

            // Картки окремих банерів секції
            sec.banners.forEach((b, idx) => {
                const card = document.createElement('div');
                card.className = 'syh-preview-card';
                card.setAttribute('data-cat', b.category);

                const cleanText = b.text.trim();
                const displayNum = `${idx + 1}. `;
                card.textContent = cleanText.startsWith(displayNum) ? cleanText : `${displayNum}${cleanText}`;
                secEl.appendChild(card);
            });

            previewScroll.appendChild(secEl);
        });
    }

    private renderDiagnostics(result: ParseSectionsResult): void {
        if (!this.diagnosticsEl) return;
        if (result.logs.length === 0) {
            this.diagnosticsEl.textContent = 'Очікування тексту...';
            return;
        }
        this.diagnosticsEl.textContent = result.logs.join('\n');
    }

    private async copyDiagnosticsLog(): Promise<void> {
        const logs = this.currentParseResult?.logs || [];
        const textToCopy = [
            `--- SYH Banner Diagnostics Log [${new Date().toLocaleTimeString()}] ---`,
            ...logs,
            `Вхідний текст (перші 200 симв): ${(this.textarea?.value || '').substring(0, 200)}...`
        ].join('\n');

        const success = await CommentService.copyToClipboard(textToCopy);
        if (success) {
            const logBtn = this.overlay?.querySelector('.syh-modal-btn-log');
            if (logBtn) {
                const prev = logBtn.textContent;
                logBtn.textContent = '✅ Скопійовано!';
                setTimeout(() => {
                    logBtn.textContent = prev;
                }, 1500);
            }
        }
    }

    private saveDraft(): void {
        if (this.textarea) {
            saveDraft(this.textarea.value);
        }
    }

    private restoreDraft(): void {
        if (this.textarea) {
            const saved = restoreDraft();
            if (saved !== null) {
                this.textarea.value = saved;
            }
        }
    }

    private clearDraft(): void {
        clearDraft();
    }

    private handleSubmit(): void {
        if (!this.currentParseResult || this.currentParseResult.allBanners.length === 0) {
            return;
        }

        const bannersToCreate = [...this.currentParseResult.allBanners];
        const hasStandardFormat = this.currentParseResult.hasStandardFormat;

        // Закриваємо модалку перед початком виконання створення
        this.close();

        // Запускаємо процес створення у StreamYard
        if (typeof this.bannerCreator.executeCustomBanners === 'function') {
            this.bannerCreator.executeCustomBanners(bannersToCreate, hasStandardFormat).catch(err => {
                console.error('[SYH] executeCustomBanners failed', err);
            });
        } else if (typeof this.bannerCreator.processAndCreateBanners === 'function') {
            // Фолбек для зворотної сумісності
            const rawText = bannersToCreate.map(b => b.text).join('\n');
            this.bannerCreator.processAndCreateBanners(rawText).catch(err => {
                console.error('[SYH] processAndCreateBanners fallback failed', err);
            });
        }
    }
}

/**
 * Глобальна функція відкриття модального вікна створення банерів.
 */
export function openBannerCreationModal(bannerCreator: SyhBannerCreator): SyhBannerModal {
    const modal = new SyhBannerModal(bannerCreator);
    modal.open();
    return modal;
}
