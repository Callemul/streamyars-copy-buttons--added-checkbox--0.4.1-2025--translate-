// youtube/studio/studio_adapter.ts
import { STORAGE_KEYS } from '../../modules/storage';
import { CommentService } from '../../modules/comment_service';
import { SHEET_IDS, type SheetId } from '../../modules/sheets';
import type { ChannelKey } from '../../modules/channel_config';
import { injectStudioCommentUI, updateStudioButtonsUI, updateStudioBadgeUI, updateStudioCheckedClass } from './studio_ui';
import type { StudioCommentUIElements } from './studio_ui';
import {
    BaseCommentPlatformAdapter,
    type CommentContext,
    type CommentStateCaches,
    type PlatformButtons,
    type ButtonStateType
} from '../../modules/comment_platform_adapter';
import {
    getEffectiveButtonState,
    restoreButtonState,
    restoreCheckboxState,
    isCheckboxOutOfSync,
    isButtonOutOfSync,
    type StudioEventCaches
} from './studio_state_helpers';
import { resolveStudioVideoCategory } from './studio_category_resolution';
import { getStudioCommentContext } from './studio_adapter_context';
import { bindStudioSpecificEvents as bindStudioSpecificEventsImpl } from './studio_binding_events';

/**
 * StreamYard Helper — адаптер платформи YouTube Studio.
 *
 * Раніше — клас на 344 рядки (cyclomatic 83 / cognitive 50), у якому поряд із
 * тонкими делегаціями до хелперів жили три шматки реальної inline-логіки:
 *   - `getCommentContext` (читання DOM-контексту нитки);
 *   - `retroactiveUpdateVideoComments` (оновлення категорії відео);
 *   - `bindStudioSpecificEvents` (біндінг бейджа/випадайки).
 *
 * Реалізацію винесено у вузькі модулі:
 *   - `./studio_adapter_context` — чистий `getStudioCommentContext`
 *   - `./studio_retroactive`     — `retroactiveUpdateVideoComments`
 *   - `./studio_binding_events`  — `bindStudioSpecificEvents`
 *
 * Тут лишилися лише стан, життєвий цикл і делегування. Публічний контракт
 * (у т.ч. експорт `retroactiveUpdateVideoComments` і `StudioCommentUIElements`)
 * не змінився.
 */

const STUDIO_BUTTON_STATES_KEY = STORAGE_KEYS.STUDIO_BUTTON_STATE;
const STUDIO_CHECKBOX_STATE_KEY = STORAGE_KEYS.STUDIO_CHECKBOX_STATE;

export type { StudioCommentUIElements };
export { retroactiveUpdateVideoComments } from './studio_retroactive';

export class StudioCommentAdapter extends BaseCommentPlatformAdapter {
    private static readonly BOUND_ATTR = 'data-syh-studio-events-bound';

    private channelKey: ChannelKey;
    private channelLabel: string;
    private caches: StudioEventCaches;

    constructor(
        channelKey: ChannelKey,
        channelLabel: string,
        caches: StudioEventCaches
    ) {
        super();
        this.channelKey = channelKey;
        this.channelLabel = channelLabel;
        this.caches = caches;
    }

    private getStudioUI(element: Element): StudioCommentUIElements | null {
        return injectStudioCommentUI(element as HTMLElement);
    }

    public getCommentContext(element: Element): CommentContext | null {
        return getStudioCommentContext(element as HTMLElement);
    }

    public getButtons(element: Element): PlatformButtons {
        const ui = this.getStudioUI(element);
        const container = element as HTMLElement;
        if (!ui) return {
            questionBtn: null,
            prayerBtn: null,
            copyBtn: null,
            checkboxEl: null,
            bodyEl: container
        };
        return {
            questionBtn: ui.questionBtn,
            prayerBtn: ui.prayerBtn,
            copyBtn: ui.copyBtn,
            checkboxEl: ui.checkboxEl,
            bodyEl: container
        };
    }

    public getSheetId(_context: CommentContext, element: Element): string {
        const ctx = this.getCommentContext(element);
        if (!ctx || !ctx.videoId) return SHEET_IDS.VP_SS;
        const result = resolveStudioVideoCategory(ctx.videoTitle, ctx.videoId, this.channelKey, this.caches);
        return result.sheetId || SHEET_IDS.VP_SS;
    }

    public getButtonStatesKey(): string {
        return STUDIO_BUTTON_STATES_KEY;
    }

    public getCheckboxStatesKey(): string {
        return STUDIO_CHECKBOX_STATE_KEY;
    }

    public applyButtonState(buttons: PlatformButtons, state: ButtonStateType, sheetId: string | null): void {
        const ui = this.getStudioUI(
            buttons.questionBtn?.closest('ytcp-comment') ||
            buttons.copyBtn?.closest('ytcp-comment') ||
            document.createElement('div')
        );
        if (!ui || !ui.questionBtn || !ui.prayerBtn) return;
        updateStudioButtonsUI(ui, sheetId as SheetId | null, state);
    }

    public applyCheckboxState(buttons: PlatformButtons, isChecked: boolean): void {
        const checkbox = buttons.checkboxEl;
        if (!checkbox) return;
        checkbox.checked = isChecked;
        const threadEl = (
            checkbox.closest('ytcp-comment, ytcp-comment-thread') ||
            buttons.questionBtn?.closest('ytcp-comment, ytcp-comment-thread') ||
            buttons.copyBtn?.closest('ytcp-comment, ytcp-comment-thread')
        ) as HTMLElement | null;
        if (threadEl) {
            updateStudioCheckedClass(threadEl, isChecked);
        }
    }

    /**
     * Позначає/знімає галочку Studio-коментаря в DOM і зберігає стан у сховище
     * через Single Source of Truth (`CommentService.saveCheckboxState`).
     *
     * Зберігає саме у `caches.checkboxStates`, що його передав викликач
     * (`CommentInjector` → `comment_action_runner`). У Studio це той самий об'єкт,
     * що й `this.caches` (див. `studio_events.ts`, де адаптер і інжектор
     * створюються з одним `caches`), тож поведінка 1-в-1. Використання
     * переданого кешу, а не `this.caches`, усуває латентний баг ігнорування
     * аргументу контракту (`audit_2026-08-11_KILO_studio-markchecked-shadows-instance-cache`).
     *
     * @param isChecked  `true` — позначити (`markChecked`), `false` — зняти (`unmarkChecked`)
     */
    private async persistChecked(
        element: Element,
        commentKey: string,
        isChecked: boolean,
        caches: CommentStateCaches
    ): Promise<void> {
        const checkbox = element.querySelector('.syh-studio-checkbox') as HTMLInputElement | null;
        if (checkbox) {
            checkbox.checked = isChecked;
        }
        const threadEl = element.closest('ytcp-comment, ytcp-comment-thread') as HTMLElement | null;
        if (threadEl) {
            updateStudioCheckedClass(threadEl, isChecked);
        }
        await CommentService.saveCheckboxState(
            STUDIO_CHECKBOX_STATE_KEY,
            caches.checkboxStates,
            commentKey,
            isChecked
        );
    }

    public async markChecked(element: Element, commentKey: string, caches: CommentStateCaches): Promise<void> {
        await this.persistChecked(element, commentKey, true, caches);
    }

    public async unmarkChecked(element: Element, commentKey: string, caches: CommentStateCaches): Promise<void> {
        await this.persistChecked(element, commentKey, false, caches);
    }

    public isEventsBound(element: Element): boolean {
        return element.getAttribute(StudioCommentAdapter.BOUND_ATTR) === 'true';
    }

    public markEventsBound(element: Element): void {
        element.setAttribute(StudioCommentAdapter.BOUND_ATTR, 'true');
    }

    public async beforeAction(
        type: 'question' | 'prayer',
        _context: CommentContext,
        element: Element
    ): Promise<{ sheetId: string } | null> {
        const ctx = this.getCommentContext(element);
        if (!ctx || !ctx.videoId) return null;

        const currentRes = resolveStudioVideoCategory(ctx.videoTitle, ctx.videoId, this.channelKey, this.caches);

        const targetSheetId = currentRes.sheetId;
        if (!targetSheetId) {
            const ui = this.getStudioUI(element);
            if (ui?.badgeEl) {
                ui.badgeEl.classList.add('syh-badge-highlight');
                setTimeout(() => ui.badgeEl!.classList.remove('syh-badge-highlight'), 2000);
            }
            return null;
        }

        return { sheetId: targetSheetId };
    }

    public async afterAction(action: {
        type: 'question' | 'prayer';
        context: CommentContext;
        sheetId: string;
        commentKey: string;
    }): Promise<void> {
        const targetEl = document.querySelector<HTMLElement>(`[data-syh-comment-key="${action.commentKey}"]`);
        if (!targetEl) return;

        const ctx = this.getCommentContext(targetEl);
        if (!ctx || !ctx.videoId) return;

        const ui = this.getStudioUI(targetEl);
        const categoryResult = resolveStudioVideoCategory(ctx.videoTitle, ctx.videoId, this.channelKey, this.caches);

        if (ui && ui.badgeEl) {
            updateStudioBadgeUI(ui.badgeEl, action.sheetId as SheetId | null, categoryResult.source);
        }
        if (ui && ui.questionBtn && ui.prayerBtn) {
            updateStudioButtonsUI(ui, action.sheetId as SheetId | null, action.type);
        }
    }

    public getButtonState(context: CommentContext, commentKey: string): ButtonStateType {
        return getEffectiveButtonState(commentKey, context, this.caches);
    }

    public bindStudioSpecificEvents(
        element: HTMLElement,
        _commentKey: string,
        caches: StudioEventCaches
    ): void {
        bindStudioSpecificEventsImpl(
            {
                getCommentContext: (el: Element) => this.getCommentContext(el),
                channelKey: this.channelKey,
                channelLabel: this.channelLabel
            },
            element,
            _commentKey,
            caches
        );
    }

    public isCheckboxOutOfSync(element: HTMLElement, commentKey: string): boolean {
        return isCheckboxOutOfSync(element, commentKey, this.caches, this.getStudioUI.bind(this));
    }

    public isButtonOutOfSync(element: HTMLElement, commentKey: string): boolean {
        return isButtonOutOfSync(element, commentKey, this.caches, this.getStudioUI.bind(this));
    }

    public restoreButtonState(element: HTMLElement, commentKey: string): void {
        restoreButtonState(element, commentKey, this.channelKey, this.caches, this.getStudioUI.bind(this));
    }

    public restoreCheckboxState(element: HTMLElement, commentKey: string): void {
        restoreCheckboxState(element, commentKey, this.caches, this.getStudioUI.bind(this));
    }
}
