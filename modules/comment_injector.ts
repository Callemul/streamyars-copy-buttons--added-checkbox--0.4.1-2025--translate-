import { CommentService } from './comment_service';
import { runCommentAction } from './comment_action_runner';
import type {
    CommentStateCaches,
    PlatformButtons,
    CommentPlatformAdapter
} from './comment_platform_adapter';

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
        this.adapter.markEventsBound(element);

        const ctx = this.adapter.getCommentContext(element);
        if (!ctx) return;

        const buttons = this.adapter.getButtons(element);

        this.bindEventListener(buttons.questionBtn, 'click', (e) => this.handleQuestionClick(e, buttons, element));
        this.bindEventListener(buttons.prayerBtn, 'click', (e) => this.handlePrayerClick(e, buttons, element));
        this.bindEventListener(buttons.copyBtn, 'click', (e) => this.handleCopyClick(e, buttons.copyBtn!, element));
        this.bindEventListener(buttons.checkboxEl, 'change', (e) => this.handleCheckboxChange(e, buttons, element));
        if (buttons.bodyEl && buttons.checkboxEl) {
            buttons.bodyEl.addEventListener('contextmenu', (e) => this.handleContextMenu(e, buttons.bodyEl!, buttons.checkboxEl!));
        }
    }

    private bindEventListener(
        target: Element | null,
        event: string,
        handler: (e: Event) => void
    ): void {
        if (target) target.addEventListener(event, handler);
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

        const origHtml = btn.innerHTML;
        const origTitle = btn.title;
        btn.innerHTML = success ? '✓' : '❌';
        btn.classList.add('syh-copied-flash');
        setTimeout(() => {
            btn.innerHTML = origHtml;
            btn.title = origTitle;
            btn.classList.remove('syh-copied-flash');
        }, 1200);
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
