// youtube/studio/studio_selectors.ts

export const STUDIO_SELECTORS = {
    CHANNEL_NAME: '#entity-label-container #entity-name, ytcp-navigation-drawer #entity-name, #entity-name',
    COMMENT_THREAD: '.ytcp-comment-thread',
    COMMENT: 'ytcp-comment#comment, ytcp-comment',
    COMMENT_TEXT_AREA: '#expander-container, #content-text, #content, #expander',
    CONTENT_TEXT: '#content-text',
    AUTHOR_NAME: '#metadata #name .author-text, #metadata #name, #name .author-text, #name',
    ACTION_TOOLBAR: 'ytcp-comment-action-buttons #toolbar, #action-buttons #toolbar',
    VIDEO_THUMBNAIL: 'ytcp-comment-video-thumbnail',
    VIDEO_TITLE: '#video-title',
    VIDEO_LINK: 'ytcp-comment-video-thumbnail a#body, #video-title a',
    COMMENTS_ITEMS_CONTAINER: '#comments-content #items, #iron-list #items, #comments-section #items'
};

export function getChannelNameElement(doc: Document | HTMLElement = document): HTMLElement | null {
    return doc.querySelector<HTMLElement>(STUDIO_SELECTORS.CHANNEL_NAME);
}

export function getCommentThreads(doc: Document | HTMLElement = document): HTMLElement[] {
    return Array.from(doc.querySelectorAll<HTMLElement>(STUDIO_SELECTORS.COMMENT_THREAD));
}

export function getToolbarElement(thread: HTMLElement): HTMLElement | null {
    return thread.querySelector<HTMLElement>(STUDIO_SELECTORS.ACTION_TOOLBAR);
}

export function getVideoThumbnailElement(thread: HTMLElement): HTMLElement | null {
    return thread.querySelector<HTMLElement>(STUDIO_SELECTORS.VIDEO_THUMBNAIL);
}

export function getVideoTitleText(thread: HTMLElement): string {
    const el = thread.querySelector<HTMLElement>(STUDIO_SELECTORS.VIDEO_TITLE);
    return el ? (el.textContent || '').trim() : '';
}

export function getVideoLinkHref(thread: HTMLElement): string | null {
    const a = thread.querySelector<HTMLAnchorElement>(STUDIO_SELECTORS.VIDEO_LINK);
    return a ? a.getAttribute('href') || a.href : null;
}

export function getAuthorNameText(thread: HTMLElement): string {
    const el = thread.querySelector<HTMLElement>(STUDIO_SELECTORS.AUTHOR_NAME);
    return el ? (el.textContent || '').trim() : '';
}

export function getCommentText(thread: HTMLElement): string {
    const el = thread.querySelector<HTMLElement>(STUDIO_SELECTORS.CONTENT_TEXT);
    return el ? (el.textContent || '').trim() : '';
}

export function getCommentTextAreaElement(thread: HTMLElement): HTMLElement | null {
    return thread.querySelector<HTMLElement>(STUDIO_SELECTORS.COMMENT_TEXT_AREA);
}

if (typeof window !== 'undefined') {
    (window as any).STUDIO_SELECTORS = STUDIO_SELECTORS;
}
