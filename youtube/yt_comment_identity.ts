// youtube/yt_comment_identity.ts
//
// Ідентифікація коментаря YouTube: стабільний ID та пара «автор + текст».
//
// Виділено з `youtube/yt_ui.ts` (207 LOC, cognitive 32) у рамках декомпозиції
// за звітом Fallow: `extractCommentId` мала CC 13 / cognitive 13 — найгірший
// показник у всьому піддереві `youtube/`. Ланцюжок фолбеків тепер описаний
// декларативно (`ID_STRATEGIES`), кожна стратегія — окрема чиста функція.
//
// Поведінка збережена 1-в-1 (див. tests/yt_ui_api.test.js).

import { YT_SELECTORS } from './yt_selectors';
import { resolveSelector } from '../modules/config';

/** Стратегія отримання ID: повертає рядок або `''`, якщо не спрацювала. */
type CommentIdStrategy = (commentNode: Element) => string;

/** 1. Найнадійніше: параметр `lc=` у посиланні на коментар. */
function idFromPermalink(commentNode: Element): string {
    const linkEl = resolveSelector(YT_SELECTORS.commentLink, commentNode) ||
                   commentNode.querySelector('a[href*="lc="]');
    if (!linkEl) return '';

    const href = linkEl.getAttribute('href') || '';
    const match = href.match(/lc=([^&]+)/);
    return (match && match[1]) ? match[1] : '';
}

/** 2. Фолбек на власний `id` DOM-вузла. */
function idFromNodeId(commentNode: Element): string {
    return commentNode.id || '';
}

/** 3. Фолбек за атрибутами `data-cid` / `id`. */
function idFromDataAttributes(commentNode: Element): string {
    return commentNode.getAttribute('data-cid') || commentNode.getAttribute('id') || '';
}

/** Простий рядковий хеш (djb2-подібний) для стабільності між перезавантаженнями. */
function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

/** 4. Останній фолбек: хеш «автор + перші 20 символів тексту». */
function idFromAuthorAndText(commentNode: Element): string {
    const authorEl = resolveSelector(YT_SELECTORS.commentAuthor, commentNode);
    const textEl = resolveSelector(YT_SELECTORS.commentText, commentNode);
    const author = authorEl?.textContent?.trim() || 'unknown';
    const textSnippet = textEl?.textContent?.trim().slice(0, 20) || 'empty';

    return `yt_${hashString(`${author}_${textSnippet}`)}`;
}

/** Порядок фолбеків збережено з оригінальної реалізації. */
const ID_STRATEGIES: ReadonlyArray<CommentIdStrategy> = [
    idFromPermalink,
    idFromNodeId,
    idFromDataAttributes,
    idFromAuthorAndText
];

/**
 * Витягує ID коментаря з URL посилання (параметр lc=) або з DOM
 */
export function extractCommentId(commentNode: Element): string {
    if (!commentNode) return '';

    for (const strategy of ID_STRATEGIES) {
        const id = strategy(commentNode);
        if (id) return id;
    }

    return '';
}

/**
 * Отримує автора та текст коментаря
 */
export function extractCommentData(commentNode: Element): { author: string; text: string } {
    const authorEl = resolveSelector(YT_SELECTORS.commentAuthor, commentNode) ||
                     commentNode.querySelector('#author-text');
    const textEl = resolveSelector(YT_SELECTORS.commentText, commentNode);

    const author = authorEl?.textContent?.trim().replace(/^@/, '') || 'Автор';
    const originalText = textEl?.getAttribute('data-syh-original-text');
    const text = (originalText !== null && originalText !== undefined)
        ? originalText.trim()
        : (textEl?.textContent?.trim() || '');

    return { author, text };
}
