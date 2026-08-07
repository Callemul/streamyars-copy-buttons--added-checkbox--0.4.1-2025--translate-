// youtube/studio/studio_state_helpers.ts
import { generateCommentKey } from './studio_comment_key';
import { resolveCategoryForVideo, type VideoSheetMapEntry } from './studio_category_matcher';
import type { CommentContext, CommentStateCaches, SheetId } from '../../modules/comment_platform_adapter';
import { updateStudioButtonsUI, updateStudioBadgeUI, updateStudioCheckedClass } from './studio_ui';
import type { StudioCommentUIElements } from './studio_ui';

export interface StudioEventCaches extends CommentStateCaches {
    videoSheetMap: Record<string, VideoSheetMapEntry>;
    collectedItems?: CommentPayload[];
}

type CommentPayload = {
    id: string;
    author: string;
    text: string;
    type: 'question' | 'prayer';
    timestamp: number;
    videoId?: string;
    videoTitle?: string;
};

type ButtonStateType = 'question' | 'prayer' | null;

export function getEffectiveButtonState(
    commentKey: string,
    ctx: CommentContext | null,
    caches: StudioEventCaches
): ButtonStateType {
    let state = caches.buttonStates[commentKey] || null;
    if (!state && ctx) {
        const fallbackKey = generateCommentKey('', ctx.author, ctx.text);
        state = caches.buttonStates[fallbackKey] || null;
    }
    if (!state && ctx && caches.collectedItems) {
        const foundInPopup = caches.collectedItems.find(item =>
            item.id === commentKey ||
            (item.author === ctx.author && item.text === ctx.text)
        );
        if (foundInPopup) {
            state = foundInPopup.type;
        }
    }
    return state;
}

export function getEffectiveCheckboxState(
    commentKey: string,
    ctx: CommentContext | null,
    caches: StudioEventCaches
): boolean {
    let checked = caches.checkboxStates[commentKey]?.checked || false;
    if (!checked && ctx) {
        const fallbackKey = generateCommentKey('', ctx.author, ctx.text);
        checked = caches.checkboxStates[fallbackKey]?.checked || false;
    }
    if (!checked && ctx && caches.collectedItems) {
        checked = caches.collectedItems.some(item =>
            item.id === commentKey ||
            (item.author === ctx.author && item.text === ctx.text)
        );
    }
    return checked;
}

export function restoreButtonState(
    element: HTMLElement,
    commentKey: string,
    channelKey: string,
    caches: StudioEventCaches,
    getStudioUI: (element: Element) => StudioCommentUIElements | null
): void {
    const ctx = getCommentContextForRestore(element, commentKey, channelKey, caches, getStudioUI);
    const buttonState = getEffectiveButtonState(commentKey, ctx, caches);

    let resolvedSheetId: SheetId | null = null;
    let categorySource: 'auto' | 'manual' | 'unresolved' = 'unresolved';

    if (ctx && ctx.videoId) {
        const categoryResult = resolveCategoryForVideo(
            ctx.videoTitle || '',
            ctx.videoId,
            channelKey as any,
            caches.videoSheetMap
        );
        resolvedSheetId = categoryResult.sheetId;
        categorySource = categoryResult.source;
    }

    const ui = getStudioUI(element);
    if (ui && ui.questionBtn && ui.prayerBtn) {
        updateStudioButtonsUI(ui, resolvedSheetId, buttonState);
        if (ui.badgeEl) {
            updateStudioBadgeUI(ui.badgeEl, resolvedSheetId, categorySource);
        }
    }
}

export function restoreCheckboxState(
    element: HTMLElement,
    commentKey: string,
    caches: StudioEventCaches,
    getStudioUI: (element: Element) => StudioCommentUIElements | null
): void {
    const ctx = getCommentContextForRestore(element, commentKey, '', caches, getStudioUI);
    const checkboxState = getEffectiveCheckboxState(commentKey, ctx, caches);
    const threadEl = element.closest('ytcp-comment, ytcp-comment-thread') as HTMLElement | null;
    if (threadEl) {
        updateStudioCheckedClass(threadEl, checkboxState);
    }
    const ui = getStudioUI(element);
    if (ui && ui.checkboxEl) {
        ui.checkboxEl.checked = checkboxState;
    }
}

export function isCheckboxOutOfSync(
    element: HTMLElement,
    commentKey: string,
    caches: StudioEventCaches,
    getStudioUI: (element: Element) => StudioCommentUIElements | null
): boolean {
    const ctx = getCommentContextForRestore(element, commentKey, '', caches, getStudioUI);
    const ui = getStudioUI(element);
    if (!ui || !ui.checkboxEl) return false;

    const expectedChecked = getEffectiveCheckboxState(commentKey, ctx, caches);
    const threadEl = element.closest('ytcp-comment, ytcp-comment-thread') as HTMLElement | null;
    const currentClassChecked = threadEl ? threadEl.classList.contains('syh-studio-comment-checked') : false;

    return ui.checkboxEl.checked !== expectedChecked || currentClassChecked !== expectedChecked;
}

export function isButtonOutOfSync(
    element: HTMLElement,
    commentKey: string,
    caches: StudioEventCaches,
    getStudioUI: (element: Element) => StudioCommentUIElements | null
): boolean {
    const ctx = getCommentContextForRestore(element, commentKey, '', caches, getStudioUI);
    const ui = getStudioUI(element);
    if (!ui || !ui.questionBtn || !ui.prayerBtn) return false;

    const expectedState = getEffectiveButtonState(commentKey, ctx, caches);
    const hasQuestionActive = ui.questionBtn.classList.contains('syh-btn-active');
    const hasPrayerActive = ui.prayerBtn.classList.contains('syh-btn-active');

    const currentActiveState = hasQuestionActive ? 'question' : (hasPrayerActive ? 'prayer' : null);
    return currentActiveState !== expectedState;
}

function getCommentContextForRestore(
    element: HTMLElement,
    commentKey: string,
    channelKey: string,
    caches: StudioEventCaches,
    getStudioUI: (element: Element) => StudioCommentUIElements | null
): CommentContext | null {
    const ui = getStudioUI(element);
    if (!ui) return null;

    const authorEl = element.querySelector<HTMLElement>('#metadata #name .author-text, #metadata #name, #name .author-text, #name');
    const author = authorEl ? authorEl.textContent?.trim() || '' : '';

    const contentEl = element.querySelector<HTMLElement>('#content-text, ytcp-comment-text #content-text, .content-text');
    let text = '';
    if (contentEl) {
        const children = contentEl.childNodes ? Array.from(contentEl.childNodes) : [];
        children.forEach((node) => {
            if (node.nodeType === 3) {
                text += node.textContent || '';
            } else if (node.nodeType === 1) {
                const elem = node as HTMLElement;
                if (elem.tagName === 'IMG' && (elem as HTMLImageElement).alt) {
                    text += (elem as HTMLImageElement).alt;
                } else if (typeof elem.querySelector === 'function') {
                    const img = elem.querySelector<HTMLImageElement>('img[alt]');
                    if (img && img.alt) {
                        text += img.alt;
                    } else {
                        text += elem.textContent || '';
                    }
                } else {
                    text += elem.textContent || '';
                }
            }
        });
    }

    const videoTitle = element.querySelector<HTMLElement>('#video-title, .video-title-text')?.textContent?.trim() || '';
    const videoHref = element.querySelector<HTMLAnchorElement>('ytcp-comment-video-thumbnail a#body, #video-title a, a.ytcp-comment-video-thumbnail')?.href || null;
    const videoKey = videoHref ? new URL(videoHref, 'https://studio.youtube.com').pathname + new URL(videoHref, 'https://studio.youtube.com').search : videoTitle;

    return {
        id: commentKey,
        author,
        text: text || '[comment]',
        videoId: videoKey || '',
        videoTitle: videoTitle || ''
    };
}