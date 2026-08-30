// youtube/yt_comment_identity.ts
//
// Ідентифікація коментаря YouTube: стабільний ID та пара «автор + текст» (Comment Identity v2).
//
// Принцип пріоритетів:
// 1. Найнадійніше: permalink з параметром lc= у посиланні на коментар.
// 2. Власний id DOM-вузла.
// 3. Атрибути data-cid / id.
// 4. Fallback v2: детермінований хеш «videoId + автор + повний текст» (yt_v2_...).
//    Запобігає колізіям однакових перших 20 символів та колізіям між різними відео.
//
// Також експортує generateLegacyCommentId та extractLegacyCommentId для зворотної сумісності (YT-E1).

import { YT_SELECTORS } from './yt_selectors';
import { resolveSelector } from '../modules/config';

/** Стратегія отримання ID: повертає рядок або `''`, якщо не спрацювала. */
type CommentIdStrategy = (commentNode: Element, videoId?: string) => string;

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
export function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

/** 4. Останній фолбек v2: хеш «videoId + автор + повний текст». */
function idFromAuthorAndTextV2(commentNode: Element, videoId?: string): string {
    const authorEl = resolveSelector(YT_SELECTORS.commentAuthor, commentNode);
    const textEl = resolveSelector(YT_SELECTORS.commentText, commentNode);
    const author = authorEl?.textContent?.trim() || 'unknown';
    const originalText = textEl?.getAttribute('data-syh-original-text');
    const text = (originalText !== null && originalText !== undefined)
        ? originalText.trim()
        : (textEl?.textContent?.trim() || 'empty');

    const vId = (videoId || (typeof window !== 'undefined' ? new URLSearchParams(window.location?.search || '').get('v') : '')) || '';
    return `yt_v2_${hashString(`${vId}_${author}_${text}`)}`;
}

/** Legacy v1 генерація ID: хеш «автор + перші 20 символів тексту». */
export function generateLegacyCommentId(author: string, text: string): string {
    const textSnippet = (text || '').trim().slice(0, 20) || 'empty';
    return `yt_${hashString(`${(author || 'unknown').trim()}_${textSnippet}`)}`;
}

/** Отримує legacy v1 ID для елемента коментаря (для зворотної міграції). */
export function extractLegacyCommentId(commentNode: Element): string {
    if (!commentNode) return '';
    const authorEl = resolveSelector(YT_SELECTORS.commentAuthor, commentNode);
    const textEl = resolveSelector(YT_SELECTORS.commentText, commentNode);
    const author = authorEl?.textContent?.trim() || 'unknown';
    const originalText = textEl?.getAttribute('data-syh-original-text');
    const text = (originalText !== null && originalText !== undefined)
        ? originalText.trim()
        : (textEl?.textContent?.trim() || 'empty');

    return generateLegacyCommentId(author, text);
}

/** Порядок фолбеків: permalink -> nodeId -> dataAttributes -> author+text v2 */
const ID_STRATEGIES: ReadonlyArray<CommentIdStrategy> = [
    idFromPermalink,
    idFromNodeId,
    idFromDataAttributes,
    idFromAuthorAndTextV2
];

/**
 * Витягує ID коментаря з URL посилання (параметр lc=), з DOM або через v2 fallback
 */
export function extractCommentId(commentNode: Element, videoId?: string): string {
    if (!commentNode) return '';

    for (const strategy of ID_STRATEGIES) {
        const id = strategy(commentNode, videoId);
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
