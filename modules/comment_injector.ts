import { CommentService } from './comment_service';
import { SYH_BUS } from './event_bus';
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
        e: MouseEvent,
        buttons: PlatformButtons,
        element: Element
    ): Promise<void> {
        e.stopPropagation();
        await this.handleAction('question', buttons, element);
    }

    private async handlePrayerClick(
        e: MouseEvent,
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
        const ctx = this.adapter.getCommentContext(element);
        if (!ctx) return;
        const commentKey = ctx.id;

        let sheetId: string | null = null;
        if (this.adapter.beforeAction) {
            const preResult = await this.adapter.beforeAction(type, ctx, element);
            if (!preResult || !preResult.sheetId) {
                // beforeAction returned null (e.g., category unresolved) - cancel action
                return;
            }
            sheetId = preResult.sheetId;
        } else {
            sheetId = this.adapter.getSheetId(ctx, element);
        }
        if (!sheetId) return;

        const currentState = this.adapter.getButtonState
            ? this.adapter.getButtonState(ctx, commentKey, this.caches)
            : (this.caches.buttonStates[commentKey] || null);
        const isUntoggle = currentState === type;

        if (isUntoggle) {
            // UNTOGGLE (Second press on the SAME active button):
            await CommentService.saveButtonState(
                this.adapter.getButtonStatesKey(),
                this.caches.buttonStates,
                commentKey,
                null
            );
            this.adapter.applyButtonState(buttons, null, sheetId);

            await CommentService.removeCollectedComment(sheetId, commentKey, ctx.author, ctx.text);

            this.adapter.applyCheckboxState(buttons, false);
            if (this.adapter.unmarkChecked) {
                await this.adapter.unmarkChecked(element, commentKey, this.caches);
            } else {
                await CommentService.saveCheckboxState(
                    this.adapter.getCheckboxStatesKey(),
                    this.caches.checkboxStates,
                    commentKey,
                    false
                );
            }

            if (this.adapter.afterAction) {
                await this.adapter.afterAction({ type: null, context: ctx, sheetId, commentKey });
            }
            return;
        }

        const formatted = CommentService.formatForClipboard(ctx.author, ctx.text);
        await CommentService.copyToClipboard(formatted);

        this.adapter.applyButtonState(buttons, type, sheetId);

        await CommentService.saveButtonState(
            this.adapter.getButtonStatesKey(),
            this.caches.buttonStates,
            commentKey,
            type
        );

        const item = this.adapter.buildCollectedItem(commentKey, ctx, type);
        await CommentService.saveCollectedComment(sheetId, item);

        await this.adapter.markChecked(element, commentKey, this.caches);

        const actionResult = { type, context: ctx, sheetId, commentKey };
        if (this.adapter.afterAction) {
            await this.adapter.afterAction(actionResult);
        }

        SYH_BUS.emit('COMMENT_ACTION', {
            type: type === 'prayer' ? 'prayer' : 'question',
            author: ctx.author,
            text: ctx.text
        });
    }

    private async handleCopyClick(
        e: MouseEvent,
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
