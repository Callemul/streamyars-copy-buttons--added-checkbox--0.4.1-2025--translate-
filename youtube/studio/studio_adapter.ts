// youtube/studio/studio_adapter.ts
import { SYH_STORAGE, STORAGE_KEYS } from '../../modules/storage';
import type { SheetId } from '../../modules/sheets';
import type { ChannelKey } from '../../modules/channel_config';
import type { CommentPayload } from '../../modules/comment_service';
import { getAuthorNameText, getCommentText, getVideoTitleText, getVideoLinkHref } from './studio_selectors';
import { injectStudioCommentUI, updateStudioButtonsUI, updateStudioBadgeUI, updateStudioCheckedClass } from './studio_ui';
import { generateVideoKey, setStudioVideoSheetOverride } from './studio_video_map';
import { generateCommentKey } from './studio_comment_key';
import { resolveCategoryForVideo, type VideoSheetMapEntry } from './studio_category_matcher';
import type {
    CommentContext,
    CommentStateCaches,
    PlatformButtons,
    ButtonStateType,
    CommentPlatformAdapter
} from '../../modules/comment_platform_adapter';

const STUDIO_BUTTON_STATES_KEY = STORAGE_KEYS.STUDIO_BUTTON_STATE;
const STUDIO_CHECKBOX_STATE_KEY = STORAGE_KEYS.STUDIO_CHECKBOX_STATE;

export interface StudioEventCaches extends CommentStateCaches {
    videoSheetMap: Record<string, VideoSheetMapEntry>;
}

interface ActiveDropdownInfo {
    dropdown: HTMLElement;
    metaContainer: HTMLElement;
}

let activeStudioDropdownInfo: ActiveDropdownInfo | null = null;

document.addEventListener('click', (e) => {
    if (activeStudioDropdownInfo && !activeStudioDropdownInfo.metaContainer.contains(e.target as Node)) {
        activeStudioDropdownInfo.dropdown.style.display = 'none';
        activeStudioDropdownInfo = null;
    }
});

interface StudioCommentUIElements {
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

export class StudioCommentAdapter implements CommentPlatformAdapter {
    private static readonly BOUND_ATTR = 'data-syh-studio-events-bound';
    private static readonly BUTTON_BOUND_ATTR = 'data-syh-bound';

    constructor(
        private channelKey: ChannelKey,
        private channelLabel: string,
        private caches: StudioEventCaches
    ) {}

    private getStudioUI(element: Element): StudioCommentUIElements | null {
        return injectStudioCommentUI(element as HTMLElement);
    }

    public getCommentContext(element: Element): CommentContext | null {
        const threadEl = element as HTMLElement;
        const author = getAuthorNameText(threadEl);
        const text = getCommentText(threadEl);
        let videoTitle = getVideoTitleText(threadEl);
        let videoHref = getVideoLinkHref(threadEl);

        const isReply = threadEl.hasAttribute('is-reply');
        if (isReply && !videoTitle) {
            const parentThread = threadEl.closest('ytcp-comment-thread');
            if (parentThread) {
                const parentComment = parentThread.querySelector<HTMLElement>('ytcp-comment:not([is-reply])');
                if (parentComment) {
                    if (!videoTitle) videoTitle = getVideoTitleText(parentComment);
                    if (!videoHref) videoHref = getVideoLinkHref(parentComment);
                    if (!videoTitle && !videoHref && parentComment.dataset.syhVideoKey) {
                        videoHref = parentComment.dataset.syhVideoKey;
                    }
                }
            }
        }

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
        if (!ui) return {
            questionBtn: null,
            prayerBtn: null,
            copyBtn: null,
            checkboxEl: null,
            bodyEl: element.querySelector('#content-text, ytcp-comment-text #content-text, .content-text') as HTMLElement | null
        };
        return {
            questionBtn: ui.questionBtn,
            prayerBtn: ui.prayerBtn,
            copyBtn: ui.copyBtn,
            checkboxEl: ui.checkboxEl,
            bodyEl: element.querySelector('#content-text, ytcp-comment-text #content-text, .content-text') as HTMLElement | null
        };
    }

    public getSheetId(_context: CommentContext, element: Element): string {
        const ctx = this.getCommentContext(element);
        if (!ctx || !ctx.videoId) return 'vp_ss';
        const result = resolveCategoryForVideo(ctx.videoTitle || '', ctx.videoId, this.channelKey, this.caches.videoSheetMap);
        return result.sheetId || 'vp_ss';
    }

    public getButtonStatesKey(): string {
        return STUDIO_BUTTON_STATES_KEY;
    }

    public getCheckboxStatesKey(): string {
        return STUDIO_CHECKBOX_STATE_KEY;
    }

    public applyButtonState(buttons: PlatformButtons, state: ButtonStateType, sheetId: string | null): void {
        const ui = this.getStudioUI(buttons.questionBtn?.closest('ytcp-comment') || buttons.copyBtn?.closest('ytcp-comment') || document.createElement('div'));
        if (!ui || !ui.questionBtn || !ui.prayerBtn) return;
        updateStudioButtonsUI(ui, sheetId as SheetId | null, state);
    }

    public applyCheckboxState(buttons: PlatformButtons, isChecked: boolean): void {
        const checkbox = buttons.checkboxEl;
        if (!checkbox) return;
        checkbox.checked = isChecked;
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
        this.caches.checkboxStates[commentKey] = {
            checked: true,
            timestamp: Date.now()
        };
        await SYH_STORAGE.setAsync({ [STUDIO_CHECKBOX_STATE_KEY]: this.caches.checkboxStates });
    }

    public isEventsBound(element: Element): boolean {
        return element.getAttribute(StudioCommentAdapter.BOUND_ATTR) === 'true';
    }

    public markEventsBound(element: Element): void {
        element.setAttribute(StudioCommentAdapter.BOUND_ATTR, 'true');
    }

    public buildCollectedItem(commentKey: string, context: CommentContext, type: 'question' | 'prayer'): CommentPayload {
        return {
            id: commentKey,
            author: context.author,
            text: context.text,
            type,
            timestamp: Date.now(),
            videoId: context.videoId,
            videoTitle: context.videoTitle
        };
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
        const threads = document.querySelectorAll('ytcp-comment, ytcp-comment-thread');
        let targetEl: HTMLElement | null = null;
        for (const t of Array.from(threads)) {
            if ((t as HTMLElement).dataset.syhCommentKey === action.commentKey) {
                targetEl = t as HTMLElement;
                break;
            }
        }
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

    public restoreButtonState(element: HTMLElement, commentKey: string): void {
        const ctx = this.getCommentContext(element);
        const buttonState = this.caches.buttonStates[commentKey] || null;

        let resolvedSheetId: SheetId | null = null;
        let categorySource: 'auto' | 'manual' | 'unresolved' = 'unresolved';

        if (ctx && ctx.videoId) {
            const categoryResult = resolveCategoryForVideo(
                ctx.videoTitle || '',
                ctx.videoId,
                this.channelKey,
                this.caches.videoSheetMap
            );
            resolvedSheetId = categoryResult.sheetId;
            categorySource = categoryResult.source;
        }

        const ui = this.getStudioUI(element);
        if (ui && ui.questionBtn && ui.prayerBtn) {
            updateStudioButtonsUI(ui, resolvedSheetId, buttonState);
            if (ui.badgeEl) {
                updateStudioBadgeUI(ui.badgeEl, resolvedSheetId, categorySource);
            }
        }
    }

    public restoreCheckboxState(element: HTMLElement, commentKey: string): void {
        const checkboxState = this.caches.checkboxStates[commentKey]?.checked || false;
        const threadEl = element.closest('ytcp-comment, ytcp-comment-thread') as HTMLElement | null;
        if (threadEl) {
            updateStudioCheckedClass(threadEl, checkboxState);
        }
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
                this.toggleDropdown(ui.dropdownEl!, !isVisible, ui.metaContainer!);
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

                this.toggleDropdown(ui.dropdownEl!, false, ui.metaContainer!);

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

    private toggleDropdown(dropdownEl: HTMLElement, visible: boolean, metaContainer: HTMLElement): void {
        if (visible) {
            document.querySelectorAll('.syh-studio-dropdown').forEach(d => {
                (d as HTMLElement).style.display = 'none';
                this.toggleZIndexStack(d as HTMLElement, false);
            });
            dropdownEl.style.display = 'block';
            this.toggleZIndexStack(dropdownEl, true);
            activeStudioDropdownInfo = { dropdown: dropdownEl, metaContainer };
        } else {
            dropdownEl.style.display = 'none';
            this.toggleZIndexStack(dropdownEl, false);
            if (activeStudioDropdownInfo) {
                activeStudioDropdownInfo = null;
            }
        }
    }

    private toggleZIndexStack(startEl: HTMLElement, active: boolean): void {
        let curr: HTMLElement | null = startEl;
        while (curr && curr.id !== 'items' && curr.tagName !== 'BODY') {
            if (curr.classList && (curr.classList.contains('ytcp-comment-thread') || curr.tagName.toLowerCase() === 'ytcp-comment')) {
                if (active) {
                    curr.classList.add('syh-dropdown-active');
                } else {
                    curr.classList.remove('syh-dropdown-active');
                }
            }
            curr = (curr.parentElement || (curr.getRootNode && (curr.getRootNode() as any).host) || null) as HTMLElement | null;
        }
    }
}
