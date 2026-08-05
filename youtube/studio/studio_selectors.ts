// youtube/studio/studio_selectors.ts
//
// ПРИЗНАЧЕННЯ: Селектори DOM та утиліти для зчитування даних з ytcp-comment.
//
// СТРУКТУРА DOM YouTube Studio (для розуміння селекторів):
//   ytcp-comment-thread                         ← один тред (батько з відповідями)
//     ├─ ytcp-comment[id="comment"]            ← БАТЬКІВСЬКИЙ коментар
//     │     ├─ #metadata #name .author-text     ← ім'я автора
//     │     ├─ #content-text                    ← текст коментаря
//     │     ├─ ytcp-comment-action-buttons
//     │     │     └─ #toolbar                    ← тут ін'єкціюємо 📋❓🙏
//     │     └─ ytcp-comment-video-thumbnail
//     │           ├─ #video-title               ← назва відео (getVideoTitleText)
//     │           ├─ a#body                     ← посилання на відео (getVideoLinkHref)
//     │           └─ .syh-studio-video-meta     ← наш ін'єкція (badge + checkbox)
//     └─ ytcp-comment-replies
//           └─ ytcp-comment[is-reply]             ← ВКЛАДЕНА відповідь
//                 └─ те ж саме, але #video-title = порожній!
//                   videoKey успадковується в studio_events.ts (REPLY INHERITANCE)
//
// ФУНКЦІЇ:
//   getCommentThreads()    — всі ytcp-comment (і батьківські, і reply) — викор.з studio_content.ts
//   getVideoTitleText()    — fallback через closest('.ytcp-comment-thread') для reply
//   getVideoLinkHref()     — аналогічно
//   getToolbarElement()    — повертає #toolbar для ін'єкції кнопок (studio_ui.ts)
//   getVideoThumbnailElement() — ytcp-comment-video-thumbnail для badge+checkbox

export const STUDIO_SELECTORS = {
    CHANNEL_NAME: ['#entity-label-container #entity-name', 'ytcp-navigation-drawer #entity-name', '#entity-name'],
    COMMENT_THREAD: ['.ytcp-comment-thread', 'ytcp-comment-thread'],
    COMMENT: ['ytcp-comment#comment', 'ytcp-comment'],
    COMMENT_TEXT_AREA: ['#expander-container', '#content-text', '#content', '#expander'],
    CONTENT_TEXT: ['#content-text', 'ytcp-comment-text #content-text', '.content-text'],
    AUTHOR_NAME: ['#metadata #name .author-text', '#metadata #name', '#name .author-text', '#name'],
    ACTION_TOOLBAR: ['ytcp-comment-action-buttons #toolbar', '#action-buttons #toolbar', '#toolbar'],
    METADATA: ['#metadata', '.metadata-container'],
    VIDEO_THUMBNAIL: ['ytcp-comment-video-thumbnail', '.video-thumbnail'],
    VIDEO_TITLE: ['#video-title', '.video-title-text'],
    VIDEO_LINK: ['ytcp-comment-video-thumbnail a#body', '#video-title a', 'a.ytcp-comment-video-thumbnail'],
    COMMENTS_ITEMS_CONTAINER: ['#comments-content #items', '#iron-list #items', '#comments-section #items', '#items'],
    COMMENT_HEADER_SPAN: ['#comment-header span.ytcp-comments-section', '#comment-header span', 'ytcp-comments-section #comment-header span'],
    COMMENT_HEADER: ['#comment-header', 'ytcp-comments-section #comment-header']
};

export function getCommentHeaderLabelElement(doc: Document | HTMLElement = document): HTMLElement | null {
    const selector = Array.isArray(STUDIO_SELECTORS.COMMENT_HEADER_SPAN) ? STUDIO_SELECTORS.COMMENT_HEADER_SPAN.join(',') : STUDIO_SELECTORS.COMMENT_HEADER_SPAN;
    return doc.querySelector<HTMLElement>(selector);
}

export function getCommentHeaderElement(doc: Document | HTMLElement = document): HTMLElement | null {
    const selector = Array.isArray(STUDIO_SELECTORS.COMMENT_HEADER) ? STUDIO_SELECTORS.COMMENT_HEADER.join(',') : STUDIO_SELECTORS.COMMENT_HEADER;
    return doc.querySelector<HTMLElement>(selector);
}

export function getChannelNameElement(doc: Document | HTMLElement = document): HTMLElement | null {
    const selector = Array.isArray(STUDIO_SELECTORS.CHANNEL_NAME) ? STUDIO_SELECTORS.CHANNEL_NAME.join(',') : STUDIO_SELECTORS.CHANNEL_NAME;
    return doc.querySelector<HTMLElement>(selector);
}

export function getCommentThreads(doc: Document | HTMLElement = document): HTMLElement[] {
    const selector = Array.isArray(STUDIO_SELECTORS.COMMENT) ? STUDIO_SELECTORS.COMMENT.join(',') : STUDIO_SELECTORS.COMMENT;
    return Array.from(doc.querySelectorAll<HTMLElement>(selector));
}

export function getToolbarElement(thread: HTMLElement): HTMLElement | null {
    const selector = Array.isArray(STUDIO_SELECTORS.ACTION_TOOLBAR) ? STUDIO_SELECTORS.ACTION_TOOLBAR.join(',') : STUDIO_SELECTORS.ACTION_TOOLBAR;
    return thread.querySelector<HTMLElement>(selector);
}

export function getMetadataElement(thread: HTMLElement): HTMLElement | null {
    const selector = Array.isArray(STUDIO_SELECTORS.METADATA) ? STUDIO_SELECTORS.METADATA.join(',') : STUDIO_SELECTORS.METADATA;
    return thread.querySelector<HTMLElement>(selector);
}

export function getVideoThumbnailElement(thread: HTMLElement): HTMLElement | null {
    const selector = Array.isArray(STUDIO_SELECTORS.VIDEO_THUMBNAIL) ? STUDIO_SELECTORS.VIDEO_THUMBNAIL.join(',') : STUDIO_SELECTORS.VIDEO_THUMBNAIL;
    return thread.querySelector<HTMLElement>(selector);
}

export function getVideoTitleText(thread: HTMLElement): string {
    const selector = Array.isArray(STUDIO_SELECTORS.VIDEO_TITLE)
        ? STUDIO_SELECTORS.VIDEO_TITLE.join(',')
        : STUDIO_SELECTORS.VIDEO_TITLE;
    let el = thread.querySelector<HTMLElement>(selector);
    let text = el ? (el.textContent || '').trim() : '';
    if (!text && thread.closest) {
        const parentThread = thread.closest('.ytcp-comment-thread');
        if (parentThread) {
            el = parentThread.querySelector<HTMLElement>(selector);
            text = el ? (el.textContent || '').trim() : '';
        }
    }
    return text;
}

export function getVideoLinkHref(thread: HTMLElement): string | null {
    const selector = Array.isArray(STUDIO_SELECTORS.VIDEO_LINK)
        ? STUDIO_SELECTORS.VIDEO_LINK.join(',')
        : STUDIO_SELECTORS.VIDEO_LINK;
    let a = thread.querySelector<HTMLAnchorElement>(selector);
    let href = a ? (typeof a.getAttribute === 'function' ? a.getAttribute('href') : a.href) || a.href : null;
    if (!href && thread.closest) {
        const parentThread = thread.closest('.ytcp-comment-thread');
        if (parentThread) {
            a = parentThread.querySelector<HTMLAnchorElement>(selector);
            href = a ? (typeof a.getAttribute === 'function' ? a.getAttribute('href') : a.href) || a.href : null;
        }
    }
    return href;
}

export function getAuthorNameText(thread: HTMLElement): string {
    const selector = Array.isArray(STUDIO_SELECTORS.AUTHOR_NAME)
        ? STUDIO_SELECTORS.AUTHOR_NAME.join(',')
        : STUDIO_SELECTORS.AUTHOR_NAME;
    const el = thread.querySelector<HTMLElement>(selector);
    return el ? (el.textContent || '').trim() : '';
}

export function getCommentText(thread: HTMLElement): string {
    const selector = Array.isArray(STUDIO_SELECTORS.CONTENT_TEXT)
        ? STUDIO_SELECTORS.CONTENT_TEXT.join(',')
        : STUDIO_SELECTORS.CONTENT_TEXT;
    const el = thread.querySelector<HTMLElement>(selector);
    if (!el) return '';

    let text = '';
    const children = el.childNodes ? Array.from(el.childNodes) : [];
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

    const trimmed = text.trim();
    return trimmed || (el.textContent || '').trim();
}

export function getCommentTextAreaElement(thread: HTMLElement): HTMLElement | null {
    return thread.querySelector<HTMLElement>(STUDIO_SELECTORS.COMMENT_TEXT_AREA);
}

// Exported as standard ESM module. Global window assignment removed.
