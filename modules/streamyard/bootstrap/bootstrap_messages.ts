// modules/bootstrap_messages.ts
/**
 * Обробка runtime-повідомлень від попапу в контент-скрипті StreamYard.
 * Раніше ця логіка жила всередині IIFE в `main.ts` і була недосяжною для тестів.
 */
import type { PrayerItem, SyhRuntimeMessage } from '../../core/types';
import { SYH_CONFIG, resolveSelectorAll, withSelectorSuffix, type SelectorValue } from '../../config';

export const PRAYER_SELECTORS = {
    // Блок коментаря, позначений як молитва (`data-syh-type="prayer"`) —
    // реєстровий `commentBlock` (з фолбеком) + атрибутний фільтр, суфікс
    // приклеєний до КОЖНОГО кандидата фолбеку через `withSelectorSuffix`.
    block: withSelectorSuffix(SYH_CONFIG.SELECTORS.commentBlock, '[data-syh-type="prayer"]'),
    star: '[class*="PlatformCommentShell__StarButton"]',
    author: '[class*="PlatformCommentShell__NameText"]',
    text: '[class*="PlatformCommentShell__ContentSpan"]'
} as const;

export const DEFAULT_PRAYER_AUTHOR = 'Глядач';
export const PRAYER_ICON = '🙏🙏🙏';

export interface CommentSelectors {
    commentBlock: SelectorValue;
    commentText: SelectorValue;
    starButton: SelectorValue;
    [key: string]: unknown;
}

export interface SyhMessageContext {
    selectors: CommentSelectors;
    sendResponse?: (response?: unknown) => void;
    root?: ParentNode;
}

export function trimText(value?: string | null): string {
    return String(value ?? '').trim();
}

export function isStarred(element: Element | null | undefined): boolean {
    return element?.getAttribute('aria-selected') === 'true';
}

/** Прибирає провідні `@` та підставляє дефолтне ім'я для анонімів. */
export function normalizeAuthorName(rawAuthor?: string | null): string {
    const cleaned = trimText(rawAuthor).replace(/^@+/, '');
    return cleaned || DEFAULT_PRAYER_AUTHOR;
}

export function createPrayerId(now: number, random: () => number = Math.random): string {
    return 'p_' + now + '_' + random().toString(36).substring(2, 9);
}

export function getRoomId(pathname: string): string {
    return pathname.replace(/\//g, '');
}

export function readPrayerText(block: Element): string {
    const node = block.querySelector(PRAYER_SELECTORS.text);
    return node?.textContent ?? '';
}

export function readPrayerAuthor(block: Element): string {
    const node = block.querySelector(PRAYER_SELECTORS.author);
    return normalizeAuthorName(node?.textContent);
}

/** Молитва береться лише із зіркованого коментаря з непорожнім текстом. */
export function extractPrayer(block: Element, roomId: string, now: number): PrayerItem | null {
    if (!isStarred(block.querySelector(PRAYER_SELECTORS.star))) return null;

    const text = readPrayerText(block);
    if (!text) return null;

    return {
        id: createPrayerId(now),
        author: readPrayerAuthor(block),
        text: text,
        type: 'prayer',
        icon: PRAYER_ICON,
        roomId: roomId,
        timestamp: now
    };
}

function isPrayerItem(item: PrayerItem | null): item is PrayerItem {
    return item !== null;
}

export function collectStarredPrayers(root: ParentNode, roomId: string, now: number = Date.now()): PrayerItem[] {
    const blocks = resolveSelectorAll(PRAYER_SELECTORS.block, root);
    return blocks.map(block => extractPrayer(block, roomId, now)).filter(isPrayerItem);
}

export function readCommentText(block: Element, textSelector: SelectorValue): string {
    const node = block.querySelector(String(textSelector));
    return trimText(node?.textContent);
}

export function findCommentBlockByText(
    root: ParentNode,
    selectors: CommentSelectors,
    targetText: string
): Element | null {
    const blocks = Array.from(root.querySelectorAll(String(selectors.commentBlock)));
    return blocks.find(block => readCommentText(block, selectors.commentText) === targetText) ?? null;
}

export function unstarCommentBlock(block: Element, starSelector: SelectorValue, targetText: string): void {
    const starBtn = block.querySelector(String(starSelector)) as HTMLElement | null;
    if (!isStarred(starBtn)) return;

    console.log('[SYH] Отримано сигнал від Попапу. Автоматично знімаю зірку з:', targetText);
    starBtn?.click();
}

export function handleUnstarCommentMessage(
    targetText: string,
    selectors: CommentSelectors,
    root: ParentNode = document
): void {
    if (!targetText) return;

    const block = findCommentBlockByText(root, selectors, targetText);
    if (!block) return;

    unstarCommentBlock(block, selectors.starButton, targetText);
}

export function handleFetchPrayersMessage(
    sendResponse?: (response?: unknown) => void,
    root: ParentNode = document
): boolean {
    const roomId = getRoomId(window.location.pathname);
    sendResponse?.(collectStarredPrayers(root, roomId));
    return true;
}

export type SyhMessageHandler = (message: SyhRuntimeMessage, ctx: SyhMessageContext) => boolean | void;

export const MESSAGE_HANDLERS: Readonly<Record<string, SyhMessageHandler>> = {
    unstar_comment: (message, ctx) => {
        handleUnstarCommentMessage(trimText(message.text), ctx.selectors, ctx.root ?? document);
    },
    FETCH_PRAYERS: (_message, ctx) => handleFetchPrayersMessage(ctx.sendResponse, ctx.root ?? document)
};

export function resolveMessageHandler(message?: SyhRuntimeMessage | null): SyhMessageHandler | undefined {
    const action = message?.action;
    return action ? MESSAGE_HANDLERS[action] : undefined;
}

/** Повертає `true` лише для асинхронних відповідей (контракт chrome.runtime.onMessage). */
export function routeSyhMessage(
    message: SyhRuntimeMessage | null | undefined,
    ctx: SyhMessageContext
): boolean | void {
    const handler = resolveMessageHandler(message);
    return handler ? handler(message as SyhRuntimeMessage, ctx) : undefined;
}
