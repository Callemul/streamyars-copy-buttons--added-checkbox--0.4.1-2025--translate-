import { STORAGE_KEYS } from '../modules/storage';
import { detectChannelKey, matchCategory, type ChannelKey } from '../modules/channel_config';
import type { CommentPayload } from '../modules/comment_service';
import { extractCommentId, extractCommentData } from './yt_ui';
import type {
    CommentContext,
    CommentStateCaches,
    PlatformButtons,
    ButtonStateType,
    CommentPlatformAdapter
} from '../modules/comment_platform_adapter';

const YT_BUTTON_STATES_KEY = STORAGE_KEYS.YT_BUTTON_STATES;
const YT_CHECKBOX_STATE_KEY = STORAGE_KEYS.YT_CHECKBOX_STATE;

function getVideoId(): string {
    if (typeof window === 'undefined') return '';
    try {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v') || '';
    } catch {
        return '';
    }
}

export class YouTubeCommentAdapter implements CommentPlatformAdapter {
    private static readonly BOUND_ATTR = 'data-syh-yt-events-bound';
    private channelKeyCache: ChannelKey | null = null;
    private videoTitleCache: string | null = null;

    private detectChannelKey(): ChannelKey {
        if (this.channelKeyCache) return this.channelKeyCache;

        let channelName = '';
        let channelHandle = '';

        const ownerEl = document.querySelector('#owner #channel-name, ytd-video-owner-renderer #channel-name, ytd-channel-name');
        if (ownerEl) {
            channelName = ownerEl.textContent || '';
        }

        const handleEl = document.querySelector('#owner a[href*="/@"], ytd-video-owner-renderer a[href*="/@"], a.yt-simple-endpoint[href*="/@"]');
        if (handleEl) {
            const href = handleEl.getAttribute('href') || '';
            const match = href.match(/\/(@[^/?#]+)/);
            if (match) channelHandle = match[1];
        }

        if (!channelName && !channelHandle) {
            const headerTitleEl = document.querySelector('#channel-header #text, #header #channel-name');
            if (headerTitleEl) {
                channelName = headerTitleEl.textContent || '';
            }
        }

        if (!channelName && !channelHandle) {
            const metaOwner = document.querySelector('meta[name="title"], meta[property="og:title"]');
            if (metaOwner) {
                channelName = metaOwner.getAttribute('content') || '';
            }
        }

        this.channelKeyCache = detectChannelKey(channelName, channelHandle);
        return this.channelKeyCache;
    }

    private getVideoTitle(): string {
        if (this.videoTitleCache) return this.videoTitleCache;

        const titleEl = document.querySelector('h1#title, ytd-watch-metadata h1, h1[itemprop="name"], #info-contents h1') as HTMLElement | null;
        let title = titleEl?.textContent?.trim() || '';

        if (!title) {
            title = document.title.replace(/\s*-\s*YouTube$/, '').trim();
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
        if (channelKey === 'unknown') return 'vp_ss';

        const videoTitle = this.getVideoTitle();
        const matched = matchCategory(videoTitle, channelKey);
        return matched || 'vp_ss';
    }

    public getButtonStatesKey(): string {
        return YT_BUTTON_STATES_KEY;
    }

    public getCheckboxStatesKey(): string {
        return YT_CHECKBOX_STATE_KEY;
    }

    public applyButtonState(buttons: PlatformButtons, state: ButtonStateType, _sheetId: string | null): void {
        const { questionBtn, prayerBtn } = buttons;
        if (!questionBtn || !prayerBtn) return;

        if (state === 'question') {
            questionBtn.dataset.state = 'added';
            questionBtn.innerText = 'Додано до питань';
            prayerBtn.dataset.state = '';
            prayerBtn.innerText = 'Додати до молитов';
        } else if (state === 'prayer') {
            prayerBtn.dataset.state = 'added';
            prayerBtn.innerText = 'Додано до молитов';
            questionBtn.dataset.state = '';
            questionBtn.innerText = 'Додати до питань';
        } else {
            questionBtn.dataset.state = '';
            questionBtn.innerText = 'Додати до питань';
            prayerBtn.dataset.state = '';
            prayerBtn.innerText = 'Додати до молитов';
        }
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

    public async markChecked(element: Element, _commentKey: string, _caches: CommentStateCaches): Promise<void> {
        const checkbox = element.querySelector('.syh-yt-checkbox') as HTMLInputElement | null;
        if (!checkbox) return;

        checkbox.checked = true;
        element.classList.add('syh-yt-comment-checked');
    }

    public async unmarkChecked(element: Element, _commentKey: string, _caches: CommentStateCaches): Promise<void> {
        const checkbox = element.querySelector('.syh-yt-checkbox') as HTMLInputElement | null;
        if (!checkbox) return;

        checkbox.checked = false;
        element.classList.remove('syh-yt-comment-checked');
    }


    public isEventsBound(element: Element): boolean {
        return element.getAttribute(YouTubeCommentAdapter.BOUND_ATTR) === 'true';
    }

    public markEventsBound(element: Element): void {
        element.setAttribute(YouTubeCommentAdapter.BOUND_ATTR, 'true');
    }

    public buildCollectedItem(commentId: string, context: CommentContext, type: 'question' | 'prayer'): CommentPayload {
        return {
            id: commentId,
            author: context.author,
            text: context.text,
            type,
            timestamp: Date.now(),
            videoId: context.videoId,
            videoTitle: context.videoTitle
        };
    }

    public restoreButtonState(
        element: Element,
        commentId: string,
        buttonStates: Record<string, ButtonStateType>
    ): void {
        const buttons = this.getButtons(element);
        const state = buttonStates[commentId] || null;
        this.applyButtonState(buttons, state, null);
    }

    public restoreCheckboxState(
        element: Element,
        commentId: string,
        checkboxStates: Record<string, { checked: boolean; timestamp: number }>
    ): void {
        const checkbox = element.querySelector('.syh-yt-checkbox') as HTMLInputElement | null;
        if (!checkbox) return;

        const entry = checkboxStates[commentId];
        const isChecked = !!(entry && entry.checked);

        checkbox.checked = isChecked;
        if (isChecked) {
            element.classList.add('syh-yt-comment-checked');
        } else {
            element.classList.remove('syh-yt-comment-checked');
        }
    }
}
