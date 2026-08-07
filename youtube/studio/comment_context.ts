// youtube/studio/comment_context.ts
import type { CommentContext, CommentStateCaches } from '../../modules/comment_platform_adapter';
import type { StudioCommentUIElements } from './studio_ui';
import type { StudioEventCaches } from './state_resolvers';

export function getCommentContextForRestore(
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