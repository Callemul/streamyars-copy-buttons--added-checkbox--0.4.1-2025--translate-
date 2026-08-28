import { STORAGE_KEYS } from '../modules/storage';
import { SHEET_IDS } from '../modules/sheets';
import { detectChannelKey, matchCategory, type ChannelKey } from '../modules/channel_config';
import { extractCommentId, extractCommentData, applyButtonVisualState } from './yt_ui';
import { extractDomChannelInfo } from './yt_channel_gate';
import { getVideoId } from './yt_video_id';
import {
    BaseCommentPlatformAdapter,
    type CommentContext,
    type PlatformButtons,
    type ButtonStateType
} from '../modules/comment_platform_adapter';

const YT_BUTTON_STATES_KEY = STORAGE_KEYS.YT_BUTTON_STATES;
const YT_CHECKBOX_STATE_KEY = STORAGE_KEYS.YT_CHECKBOX_STATE;

export class YouTubeCommentAdapter extends BaseCommentPlatformAdapter {
    private static readonly BOUND_ATTR = 'data-syh-yt-events-bound';
    private channelKeyCache: ChannelKey | null = null;
    private videoTitleCache: string | null = null;

    private detectChannelKey(): ChannelKey {
        if (this.channelKeyCache) return this.channelKeyCache;

        const { channelName, channelHandle } = extractDomChannelInfo();
        this.channelKeyCache = detectChannelKey(channelName, channelHandle);
        return this.channelKeyCache;
    }

    private getVideoTitle(): string {
        if (this.videoTitleCache) return this.videoTitleCache;

        const doc = typeof document !== 'undefined' ? document : null;
        const titleEl = doc && typeof doc.querySelector === 'function'
            ? (doc.querySelector('h1#title, ytd-watch-metadata h1, h1[itemprop="name"], #info-contents h1') as HTMLElement | null)
            : null;
        let title = titleEl?.textContent?.trim() || '';

        if (!title && doc && typeof doc.title === 'string') {
            title = doc.title.replace(/\s*-\s*YouTube$/, '').trim();
        }

        this.videoTitleCache = title;
        return title;
    }

    public getCommentContext(element: Element): CommentContext | null {
        const commentId = extractCommentId(element);
        if (!commentId) return null;

        const { author, text } = extractCommentData(element);

        return {
            id: commentId,
            author,
            text,
            videoId: getVideoId()
        };
    }

    public getButtons(element: Element): PlatformButtons {
        return {
            questionBtn: element.querySelector('.syh-yt-btn-question') as HTMLElement | null,
            prayerBtn: element.querySelector('.syh-yt-btn-prayer') as HTMLElement | null,
            copyBtn: element.querySelector('.syh-yt-btn-copy') as HTMLElement | null,
            checkboxEl: element.querySelector('.syh-yt-checkbox') as HTMLInputElement | null,
            bodyEl: element as HTMLElement
        };
    }

    public getSheetId(_context: CommentContext, _element: Element): string {
        const channelKey = this.detectChannelKey();
        if (channelKey === 'unknown') return SHEET_IDS.VP_SS;

        const videoTitle = this.getVideoTitle();
        const matched = matchCategory(videoTitle, channelKey);
        return matched || SHEET_IDS.VP_SS;
    }

    public getButtonStatesKey(): string {
        return YT_BUTTON_STATES_KEY;
    }

    public getCheckboxStatesKey(): string {
        return YT_CHECKBOX_STATE_KEY;
    }

    public applyButtonState(buttons: PlatformButtons, state: ButtonStateType, _sheetId: string | null): void {
        applyButtonVisualState(buttons.questionBtn, buttons.prayerBtn, state);
    }

    public applyCheckboxState(buttons: PlatformButtons, isChecked: boolean): void {
        const checkbox = buttons.checkboxEl;
        if (!checkbox) return;
        checkbox.checked = isChecked;
        const threadEl = (checkbox.closest('ytd-comment-thread-renderer, ytd-comment-view-model, #comment') || buttons.bodyEl) as HTMLElement | null;
        if (threadEl) {
            if (isChecked) {
                threadEl.classList.add('syh-yt-comment-checked');
            } else {
                threadEl.classList.remove('syh-yt-comment-checked');
            }
        }
    }

    public isEventsBound(element: Element): boolean {
        return element.getAttribute(YouTubeCommentAdapter.BOUND_ATTR) === 'true';
    }

    public markEventsBound(element: Element): void {
        element.setAttribute(YouTubeCommentAdapter.BOUND_ATTR, 'true');
    }

    public unmarkEventsBound(element: Element): void {
        element.removeAttribute(YouTubeCommentAdapter.BOUND_ATTR);
    }
}
