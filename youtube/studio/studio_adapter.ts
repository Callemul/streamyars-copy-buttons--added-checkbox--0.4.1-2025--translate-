// youtube/studio/studio_adapter.ts
import { STORAGE_KEYS } from '../../modules/storage';
import { CommentService } from '../../modules/comment_service';
import { SHEET_IDS, type SheetId } from '../../modules/sheets';
import type { ChannelKey } from '../../modules/channel_config';
import { getAuthorNameText, getCommentText } from './studio_selectors';
import { injectStudioCommentUI, updateStudioButtonsUI, updateStudioBadgeUI, updateStudioCheckedClass } from './studio_ui';
import { generateVideoKey, setStudioVideoSheetOverride } from './studio_video_map';
import { generateCommentKey } from './studio_comment_key';
import { resolveCategoryForVideo } from './studio_category_matcher';
import {
    BaseCommentPlatformAdapter,
    type CommentContext,
    type CommentStateCaches,
    type PlatformButtons,
    type ButtonStateType
} from '../../modules/comment_platform_adapter';
import { resolveReplyVideoMetadata, toggleDropdown } from './studio_dom_helpers';
import {
    getEffectiveButtonState,
    restoreButtonState,
    restoreCheckboxState,
    isCheckboxOutOfSync,
    isButtonOutOfSync,
    type StudioEventCaches
} from './studio_state_helpers';

const STUDIO_BUTTON_STATES_KEY = STORAGE_KEYS.STUDIO_BUTTON_STATE;
const STUDIO_CHECKBOX_STATE_KEY = STORAGE_KEYS.STUDIO_CHECKBOX_STATE;

export interface StudioCommentUIElements {
    copyBtn: HTMLButtonElement;
    questionBtn: HTMLButtonElement;
    prayerBtn: HTMLButtonElement;
    badgeEl: HTMLElement | null;
    dropdownEl: HTMLElement | null;
    checkboxEl: HTMLInputElement | null;
    metaContainer: HTMLElement | null;
}

export function retroactiveUpdateVideoComments(
    targetVideoKey: string,
    channelKey: ChannelKey,
    caches: StudioEventCaches
) {
    const threads = document.querySelectorAll<HTMLElement>('ytcp-comment');
    threads.forEach((threadEl) => {
        const adapter = new StudioCommentAdapter(channelKey, '', caches);
        const ctx = adapter.getCommentContext(threadEl);
        if (!ctx || ctx.videoId !== targetVideoKey) return;

        const ui = injectStudioCommentUI(threadEl);
        if (!ui) return;

        const categoryResult = resolveCategoryForVideo(
            ctx.videoTitle || '',
            ctx.videoId,
            channelKey,
            caches.videoSheetMap
        );
        const commentKey = threadEl.dataset.syhCommentKey || generateCommentKey(ctx.videoTitle || '', ctx.author, ctx.text);

        if (ui.badgeEl) {
            updateStudioBadgeUI(ui.badgeEl, categoryResult.sheetId, categoryResult.source);
        }
        if (ui.questionBtn && ui.prayerBtn) {
            updateStudioButtonsUI(ui, categoryResult.sheetId, caches.buttonStates[commentKey] || null);
        }
    });
}

export class StudioCommentAdapter extends BaseCommentPlatformAdapter {
    private static readonly BOUND_ATTR = 'data-syh-studio-events-bound';
    private static readonly BUTTON_BOUND_ATTR = 'data-syh-bound';

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
        const threadEl = element as HTMLElement;
        const author = getAuthorNameText(threadEl);
        let text = getCommentText(threadEl);
        if (!author) return null;
        if (!text) text = '[comment]';

        const { videoTitle, videoHref } = resolveReplyVideoMetadata(threadEl);
        const videoKey = generateVideoKey(videoHref, videoTitle);
        const commentKey = generateCommentKey(videoTitle, author, text);

        return {
            id: commentKey,
            author,
            text,
            videoId: videoKey,
            videoTitle: videoTitle
        };
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
        const result = resolveCategoryForVideo(ctx.videoTitle || '', ctx.videoId, this.channelKey, this.caches.videoSheetMap);
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

    public async markChecked(element: Element, commentKey: string, _caches: CommentStateCaches): Promise<void> {
        const checkbox = element.querySelector('.syh-studio-checkbox') as HTMLInputElement | null;
        if (checkbox) {
            checkbox.checked = true;
        }
        const threadEl = element.closest('ytcp-comment, ytcp-comment-thread') as HTMLElement | null;
        if (threadEl) {
            updateStudioCheckedClass(threadEl, true);
        }
        await CommentService.saveCheckboxState(
            STUDIO_CHECKBOX_STATE_KEY,
            this.caches.checkboxStates,
            commentKey,
            true
        );
    }

    public async unmarkChecked(element: Element, commentKey: string, _caches: CommentStateCaches): Promise<void> {
        const checkbox = element.querySelector('.syh-studio-checkbox') as HTMLInputElement | null;
        if (checkbox) {
            checkbox.checked = false;
        }
        const threadEl = element.closest('ytcp-comment, ytcp-comment-thread') as HTMLElement | null;
        if (threadEl) {
            updateStudioCheckedClass(threadEl, false);
        }
        await CommentService.saveCheckboxState(
            STUDIO_CHECKBOX_STATE_KEY,
            this.caches.checkboxStates,
            commentKey,
            false
        );
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

        const currentRes = resolveCategoryForVideo(
            ctx.videoTitle || '',
            ctx.videoId,
            this.channelKey,
            this.caches.videoSheetMap
        );

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
        const categoryResult = resolveCategoryForVideo(
            ctx.videoTitle || '',
            ctx.videoId,
            this.channelKey,
            this.caches.videoSheetMap
        );

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
        const ui = this.getStudioUI(element);
        if (!ui || !ui.badgeEl || !ui.dropdownEl || !ui.metaContainer) return;

        if (ui.badgeEl.getAttribute(StudioCommentAdapter.BUTTON_BOUND_ATTR) !== 'true') {
            ui.badgeEl.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const isVisible = ui.dropdownEl!.style.display === 'block';
                toggleDropdown(ui.dropdownEl!, !isVisible, ui.metaContainer!);
            });
            ui.badgeEl.setAttribute(StudioCommentAdapter.BUTTON_BOUND_ATTR, 'true');
        }

        if (ui.dropdownEl.getAttribute(StudioCommentAdapter.BUTTON_BOUND_ATTR) !== 'true') {
            ui.dropdownEl.addEventListener('click', async (e) => {
                e.stopPropagation();
                const itemEl = (e.target as HTMLElement).closest<HTMLElement>('.syh-studio-dropdown-item');
                if (!itemEl) return;

                const selectedVal = itemEl.dataset.sheetId;
                const newSheetId: SheetId | null = selectedVal === 'auto_reset' ? null : (selectedVal as SheetId);

                const ctx = this.getCommentContext(element);
                if (!ctx || !ctx.videoId) return;

                const autoCat = resolveCategoryForVideo(
                    ctx.videoTitle || '',
                    ctx.videoId,
                    this.channelKey,
                    {}
                ).sheetId;

                toggleDropdown(ui.dropdownEl!, false, ui.metaContainer!);

                caches.videoSheetMap = await setStudioVideoSheetOverride(
                    ctx.videoId,
                    newSheetId,
                    this.channelKey,
                    this.channelLabel,
                    ctx.videoTitle || '',
                    autoCat
                );

                retroactiveUpdateVideoComments(ctx.videoId, this.channelKey, caches);
            });
            ui.dropdownEl.setAttribute(StudioCommentAdapter.BUTTON_BOUND_ATTR, 'true');
        }
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