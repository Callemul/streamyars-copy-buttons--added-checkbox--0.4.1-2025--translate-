// youtube/studio/studio_selectors.ts
//
// ПРИЗНАЧЕННЯ: фасад доступу до DOM YouTube Studio.
//
// Файл свідомо тонкий: таблиця селекторів живе в `studio_selector_constants.ts`,
// примітиви запитів — у `studio_selector_queries.ts`, а розбір тексту коментаря —
// у `studio_comment_text.ts`. Тут лишаються тільки іменовані геттери, які
// становлять публічний контракт для 7 залежних модулів Studio.
//
// ФУНКЦІЇ:
//   getCommentThreads()    — всі ytcp-comment (і батьківські, і reply) — викор. з studio_content.ts
//   getVideoTitleText()    — fallback через батьківський тред для reply
//   getVideoLinkHref()     — аналогічно
//   getToolbarElement()    — повертає #toolbar для ін'єкції кнопок (studio_ui.ts)
//   getVideoThumbnailElement() — ytcp-comment-video-thumbnail для badge+checkbox

import { STUDIO_SELECTORS } from './studio_selector_constants';
import {
    queryOne,
    queryAll,
    readTrimmedText,
    readWithThreadFallback,
    type StudioQueryRoot
} from './studio_selector_queries';
import { extractCommentText } from './studio_comment_text';

// Історично споживачі (`studio_video_metadata.ts`) імпортують таблицю селекторів
// саме з цього фасаду — реекспорт зберігає той контракт.
export { STUDIO_SELECTORS } from './studio_selector_constants';

/* ------------------------------------------------------------------ *
 * Геттери рівня документа
 * ------------------------------------------------------------------ */

export function getCommentHeaderLabelElement(doc: StudioQueryRoot = document): HTMLElement | null {
    return queryOne(doc, STUDIO_SELECTORS.COMMENT_HEADER_SPAN);
}

export function getCommentHeaderElement(doc: StudioQueryRoot = document): HTMLElement | null {
    return queryOne(doc, STUDIO_SELECTORS.COMMENT_HEADER);
}

export function getChannelNameElement(doc: StudioQueryRoot = document): HTMLElement | null {
    return queryOne(doc, STUDIO_SELECTORS.CHANNEL_NAME);
}

export function getCommentThreads(doc: StudioQueryRoot = document): HTMLElement[] {
    return queryAll(doc, STUDIO_SELECTORS.COMMENT);
}

/* ------------------------------------------------------------------ *
 * Геттери рівня коментаря (thread-scoped)
 * ------------------------------------------------------------------ */

export function getToolbarElement(thread: HTMLElement): HTMLElement | null {
    return queryOne(thread, STUDIO_SELECTORS.ACTION_TOOLBAR);
}

export function getMetadataElement(thread: HTMLElement): HTMLElement | null {
    return queryOne(thread, STUDIO_SELECTORS.METADATA);
}

export function getVideoThumbnailElement(thread: HTMLElement): HTMLElement | null {
    return queryOne(thread, STUDIO_SELECTORS.VIDEO_THUMBNAIL);
}

export function getCommentTextAreaElement(thread: HTMLElement): HTMLElement | null {
    return queryOne(thread, STUDIO_SELECTORS.COMMENT_TEXT_AREA);
}

export function getAuthorNameText(thread: HTMLElement): string {
    return readTrimmedText(thread, STUDIO_SELECTORS.AUTHOR_NAME);
}

/* ------------------------------------------------------------------ *
 * Дані відео: з успадкуванням від батьківського треду (для reply)
 * ------------------------------------------------------------------ */

export function getVideoTitleText(thread: HTMLElement): string {
    return readWithThreadFallback(thread, (root) => readTrimmedText(root, STUDIO_SELECTORS.VIDEO_TITLE));
}

/**
 * `getAttribute('href')` віддає «сирий» відносний шлях; фолбек на `.href`
 * лишено 1-в-1 (він же спрацьовує для елементів-заглушок без `getAttribute`).
 */
function readVideoLinkHref(root: HTMLElement): string | null {
    const a = queryOne<HTMLAnchorElement>(root, STUDIO_SELECTORS.VIDEO_LINK);
    if (!a) return null;
    return (typeof a.getAttribute === 'function' ? a.getAttribute('href') : a.href) || a.href;
}

export function getVideoLinkHref(thread: HTMLElement): string | null {
    return readWithThreadFallback(thread, readVideoLinkHref);
}

/* ------------------------------------------------------------------ *
 * Текст коментаря
 * ------------------------------------------------------------------ */

export function getCommentText(thread: HTMLElement): string {
    const el = queryOne(thread, STUDIO_SELECTORS.CONTENT_TEXT);
    return el ? extractCommentText(el) : '';
}

// Exported as standard ESM module. Global window assignment removed.
