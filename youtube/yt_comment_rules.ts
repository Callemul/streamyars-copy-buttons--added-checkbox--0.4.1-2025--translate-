/**
 * StreamYard Helper — чисті правила обробки коментарів YouTube.
 *
 * Винесено з `youtube/yt_comment_processor.ts` (CRAP 42 за звітом Fallow).
 * Тут немає DOM-мутацій, сховища та chrome-API — лише нормалізація
 * селекторів і передумови обробки, які легко покрити тестами.
 *
 * Поведінка збережена 1-в-1 з оригінальним процесором.
 */

import type { SelectorList } from './yt_selectors';

/** Префікс логів помилок підсвітки тригерних слів. */
export const HIGHLIGHT_ERROR_PREFIX = '[SYH YT] Highlight error:';

/**
 * Список селекторів у вигляді CSS-групи.
 *
 * `YT_SELECTORS` тримає альтернативні селектори масивом, бо розмітка YouTube
 * відрізняється між A/B-версіями плеєра. DOM-API очікує рядок `a, b`.
 */
export function toSelectorString(selector: SelectorList): string {
    return Array.isArray(selector) ? selector.join(',') : selector;
}

/**
 * Коментар обробляється, лише коли модуль увімкнено і вузол справді має шапку
 * автора (у рециклінгу YouTube трапляються порожні заготовки).
 *
 * `hasHeaderAuthor` — саме функція, а не булеве значення: оригінал не робив
 * DOM-запит, доки не переконався, що модуль увімкнено.
 */
export function canProcessComment(
    commentNode: Element | null | undefined,
    youtubeEnabled: boolean,
    hasHeaderAuthor: () => boolean
): boolean {
    if (!commentNode || !youtubeEnabled) return false;
    return hasHeaderAuthor();
}
