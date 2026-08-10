// youtube/studio/comment_context_fields.ts
//
// ПРИЗНАЧЕННЯ: точкові читачі полів картки коментаря YouTube Studio —
// автор, текст, посилання/назва відео. Кожен читач інкапсулює свій ланцюжок
// селекторів-фолбеків, які Studio міняє від релізу до релізу.
//
// Винесено з `getCommentContextForRestore` (`./comment_context.ts`): за звітом
// Fallow це була функція severity=critical (cyclomatic 13, 50 рядків) у файлі
// з одним із найнижчих MI у проєкті (81.3). Поведінка збережена 1-в-1.

import { readCommentNodesText } from './studio_comment_text';

/** Базовий origin для розбору відносних посилань Studio. */
const STUDIO_ORIGIN = 'https://studio.youtube.com';

/** Ланцюжок фолбеків для імені автора — від найточнішого до найзагальнішого. */
const AUTHOR_SELECTOR = '#metadata #name .author-text, #metadata #name, #name .author-text, #name';
/** Ланцюжок фолбеків для контейнера тексту коментаря. */
const CONTENT_SELECTOR = '#content-text, ytcp-comment-text #content-text, .content-text';
/** Ланцюжок фолбеків для назви відео. */
const VIDEO_TITLE_SELECTOR = '#video-title, .video-title-text';
/** Ланцюжок фолбеків для посилання на відео. */
const VIDEO_LINK_SELECTOR = 'ytcp-comment-video-thumbnail a#body, #video-title a, a.ytcp-comment-video-thumbnail';

/** Імʼя автора без зайвих пробілів; порожній рядок, якщо елемента немає. */
export function readCommentAuthor(element: HTMLElement): string {
    const authorEl = element.querySelector<HTMLElement>(AUTHOR_SELECTOR);
    return authorEl ? authorEl.textContent?.trim() || '' : '';
}

/**
 * Сирий текст коментаря (емодзі-картинки розгортаються в їхні `alt`).
 *
 * Свідомо БЕЗ `trim` і без фолбеку на `textContent` контейнера — саме так
 * поводився оригінал; порожній результат далі замінюється на `'[comment]'`.
 */
export function readCommentBodyText(element: HTMLElement): string {
    const contentEl = element.querySelector<HTMLElement>(CONTENT_SELECTOR);
    return contentEl ? readCommentNodesText(contentEl) : '';
}

/** Ідентифікатор відео з посилання: `pathname + search` відносно домену Studio. */
function readVideoKeyFromHref(element: HTMLElement): string | null {
    const videoHref = element.querySelector<HTMLAnchorElement>(VIDEO_LINK_SELECTOR)?.href || null;
    if (!videoHref) return null;

    const url = new URL(videoHref, STUDIO_ORIGIN);
    return url.pathname + url.search;
}

/**
 * Пара «назва відео + ключ відео».
 * Якщо посилання немає, ключем стає сама назва — так само, як в оригіналі.
 */
export function readVideoRef(element: HTMLElement): { videoTitle: string; videoKey: string } {
    const videoTitle = element.querySelector<HTMLElement>(VIDEO_TITLE_SELECTOR)?.textContent?.trim() || '';
    return {
        videoTitle,
        videoKey: readVideoKeyFromHref(element) ?? videoTitle
    };
}
