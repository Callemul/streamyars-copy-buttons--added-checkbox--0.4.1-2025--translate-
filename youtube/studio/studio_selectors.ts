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
    CHANNEL_NAME: '#entity-label-container #entity-name, ytcp-navigation-drawer #entity-name, #entity-name',
    COMMENT_THREAD: '.ytcp-comment-thread',
    COMMENT: 'ytcp-comment#comment, ytcp-comment',
    COMMENT_TEXT_AREA: '#expander-container, #content-text, #content, #expander',
    CONTENT_TEXT: '#content-text',
    AUTHOR_NAME: '#metadata #name .author-text, #metadata #name, #name .author-text, #name',
    ACTION_TOOLBAR: 'ytcp-comment-action-buttons #toolbar, #action-buttons #toolbar',
    METADATA: '#metadata',
    VIDEO_THUMBNAIL: 'ytcp-comment-video-thumbnail',
    VIDEO_TITLE: '#video-title',
    VIDEO_LINK: 'ytcp-comment-video-thumbnail a#body, #video-title a',
    COMMENTS_ITEMS_CONTAINER: '#comments-content #items, #iron-list #items, #comments-section #items'
};

export function getChannelNameElement(doc: Document | HTMLElement = document): HTMLElement | null {
    return doc.querySelector<HTMLElement>(STUDIO_SELECTORS.CHANNEL_NAME);
}

export function getCommentThreads(doc: Document | HTMLElement = document): HTMLElement[] {
    return Array.from(doc.querySelectorAll<HTMLElement>(STUDIO_SELECTORS.COMMENT));
}

export function getToolbarElement(thread: HTMLElement): HTMLElement | null {
    return thread.querySelector<HTMLElement>(STUDIO_SELECTORS.ACTION_TOOLBAR);
}

export function getMetadataElement(thread: HTMLElement): HTMLElement | null {
    return thread.querySelector<HTMLElement>(STUDIO_SELECTORS.METADATA);
}

export function getVideoThumbnailElement(thread: HTMLElement): HTMLElement | null {
    return thread.querySelector<HTMLElement>(STUDIO_SELECTORS.VIDEO_THUMBNAIL);
}

export function getVideoTitleText(thread: HTMLElement): string {
    let el = thread.querySelector<HTMLElement>(STUDIO_SELECTORS.VIDEO_TITLE);
    let text = el ? (el.textContent || '').trim() : '';
    if (!text && thread.closest) {
        const parentThread = thread.closest('.ytcp-comment-thread');
        if (parentThread) {
            el = parentThread.querySelector<HTMLElement>(STUDIO_SELECTORS.VIDEO_TITLE);
            text = el ? (el.textContent || '').trim() : '';
        }
    }
    return text;
}

export function getVideoLinkHref(thread: HTMLElement): string | null {
    let a = thread.querySelector<HTMLAnchorElement>(STUDIO_SELECTORS.VIDEO_LINK);
    let href = a ? (a.getAttribute('href') || a.href) : null;
    if (!href && thread.closest) {
        const parentThread = thread.closest('.ytcp-comment-thread');
        if (parentThread) {
            a = parentThread.querySelector<HTMLAnchorElement>(STUDIO_SELECTORS.VIDEO_LINK);
            href = a ? (a.getAttribute('href') || a.href) : null;
        }
    }
    return href;
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

// Exported as standard ESM module. Global window assignment removed.
