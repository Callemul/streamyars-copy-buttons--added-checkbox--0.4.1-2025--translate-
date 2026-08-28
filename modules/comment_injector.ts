import { CommentService } from './comment_service';
import { runCommentAction } from './comment_action_runner';
import type {
    CommentStateCaches,
    PlatformButtons,
    CommentPlatformAdapter
} from './comment_platform_adapter';

/** Таймери «спалаху» кнопки копіювання, щоб скасовувати попередній перед новим. */
const copyFlashTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

/** Контролери скасування слухачів подій для запобігання витокам пам'яті та дублюванню. */
const elementAbortControllers = new WeakMap<Element, AbortController>();

export class CommentInjector {
    private adapter: CommentPlatformAdapter;
    private caches: CommentStateCaches;

    constructor(
        adapter: CommentPlatformAdapter,
        caches: CommentStateCaches
    ) {
        this.adapter = adapter;
        this.caches = caches;
    }

    public bindCommentEvents(element: Element, _commentKey: string): void {
        if (this.adapter.isEventsBound(element)) return;

        const prev = elementAbortControllers.get(element);
        if (prev) {
            prev.abort();
            elementAbortControllers.delete(element);
        }

        this.adapter.markEventsBound(element);

        const ctx = this.adapter.getCommentContext(element);
        if (!ctx) return;

        const controller = new AbortController();
        elementAbortControllers.set(element, controller);
        const { signal } = controller;

        const buttons = this.adapter.getButtons(element);

        this.bindEventListener(buttons.questionBtn, 'click', (e) => this.handleQuestionClick(e, buttons, element), signal);
        this.bindEventListener(buttons.prayerBtn, 'click', (e) => this.handlePrayerClick(e, buttons, element), signal);
        this.bindEventListener(buttons.copyBtn, 'click', (e) => this.handleCopyClick(e, buttons.copyBtn!, element), signal);
        this.bindEventListener(buttons.checkboxEl, 'change', (e) => this.handleCheckboxChange(e, buttons, element), signal);
        if (buttons.bodyEl && buttons.checkboxEl) {
            this.bindEventListener(buttons.bodyEl, 'contextmenu', (e) => this.handleContextMenu(e as MouseEvent, buttons.bodyEl!, buttons.checkboxEl!), signal);
        }
    }

    public unbindCommentEvents(element: Element): void {
        const controller = elementAbortControllers.get(element);
        if (controller) {
            controller.abort();
            elementAbortControllers.delete(element);
        }
        if (typeof this.adapter.unmarkEventsBound === 'function') {
            this.adapter.unmarkEventsBound(element);
        } else if (typeof (element as HTMLElement).removeAttribute === 'function') {
            element.removeAttribute('data-syh-events-bound');
        }
    }

    private bindEventListener(
        target: Element | null,
        event: string,
        handler: (e: Event) => void,
        signal?: AbortSignal
    ): void {
        if (target) {
            target.addEventListener(event, handler, signal ? { signal } : undefined);
        }
    }

    private async handleQuestionClick(
        e: Event,
        buttons: PlatformButtons,
        element: Element
    ): Promise<void> {
        e.stopPropagation();
        await this.handleAction('question', buttons, element);
    }

    private async handlePrayerClick(
        e: Event,
        buttons: PlatformButtons,
        element: Element
    ): Promise<void> {
        e.stopPropagation();
        await this.handleAction('prayer', buttons, element);
    }

    private async handleAction(
        type: 'question' | 'prayer',
        buttons: PlatformButtons,
        element: Element
    ): Promise<void> {
        await runCommentAction(this.adapter, this.caches, type, buttons, element);
    }

    private async handleCopyClick(
        e: Event,
        btn: HTMLElement,
        element: Element
    ): Promise<void> {
        e.stopPropagation();
        const ctx = this.adapter.getCommentContext(element);
        if (!ctx) return;
        const formatted = CommentService.formatForClipboard(ctx.author, ctx.text);
        const success = await CommentService.copyToClipboard(formatted);

        // Оригінальний вміст/заголовок захоплюємо ЛИШЕ один раз на цикл «спокою»,
        // щоб повторний швидкий клік не зберіг стан спалаху (✓/❌) замість оригіналу
        // (див. audit copy-button-stuck-flash-state).
        if (btn.dataset.syhCopyOrigHtml === undefined) {
            btn.dataset.syhCopyOrigHtml = btn.innerHTML;
            btn.dataset.syhCopyOrigTitle = btn.title;
        }

        btn.innerHTML = success ? '✓' : '❌';
        btn.classList.add('syh-copied-flash');

        // Скасовуємо попередній таймер відновлення, щоб не лишати осиротілих таймерів.
        const prev = copyFlashTimers.get(btn);
        if (prev) clearTimeout(prev);
        copyFlashTimers.set(btn, setTimeout(() => {
            btn.innerHTML = btn.dataset.syhCopyOrigHtml ?? '📋';
            btn.title = btn.dataset.syhCopyOrigTitle ?? '';
            btn.classList.remove('syh-copied-flash');
            delete btn.dataset.syhCopyOrigHtml;
            delete btn.dataset.syhCopyOrigTitle;
            copyFlashTimers.delete(btn);
        }, 1200));
    }

    private async handleCheckboxChange(
        e: Event,
        buttons: PlatformButtons,
        element: Element
    ): Promise<void> {
        e.stopPropagation();
        const checkbox = buttons.checkboxEl;
        if (!checkbox) return;

        const ctx = this.adapter.getCommentContext(element);
        if (!ctx) return;

        const isChecked = checkbox.checked;
        this.adapter.applyCheckboxState(buttons, isChecked);

        await CommentService.saveCheckboxState(
            this.adapter.getCheckboxStatesKey(),
            this.caches.checkboxStates,
            ctx.id,
            isChecked
        );
    }

    private handleContextMenu(
        e: MouseEvent,
        _bodyEl: HTMLElement,
        checkbox: HTMLInputElement
    ): void {
        const target = e.target as HTMLElement | null;
        if (target && target.closest('button, a, input, select, textarea, .syh-studio-dropdown, .syh-studio-btn, .syh-yt-btn')) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    }
}
