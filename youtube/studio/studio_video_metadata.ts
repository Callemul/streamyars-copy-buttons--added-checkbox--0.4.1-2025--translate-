// youtube/studio/studio_video_metadata.ts
//
// ПРИЗНАЧЕННЯ: Читання метаданих відео (заголовок / посилання) з DOM YouTube Studio
// та спостереження за їх «дозавантаженням» Polymer-ом.
//
// Виділено з youtube/studio/studio_events.ts, де hasVideoMetadata() мала
// cyclomatic 9 (CRAP 90) через ланцюжки `||` та optional chaining.

import { STUDIO_SELECTORS } from './studio_selectors';

export interface SyhObservedElement extends HTMLElement {
    _syhVideoObserver?: MutationObserver;
    _syhBound?: boolean;
}

export const VIDEO_METADATA_OBSERVER_OPTIONS: MutationObserverInit = {
    childList: true,
    characterData: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['href']
};

export const VIDEO_THREAD_CONTAINER_SELECTOR = '.ytcp-comment-thread';

/** Шукає елемент спершу всередині коментаря, потім у батьківському треді. */
export function findMetadataElement(
    threadEl: HTMLElement,
    parentContainer: Element,
    selector: string
): Element | null {
    return threadEl.querySelector(selector) || parentContainer.querySelector(selector);
}

export function readVideoTitleText(
    threadEl: HTMLElement,
    parentContainer: Element,
    selector: string
): string {
    const el = findMetadataElement(threadEl, parentContainer, selector);
    if (!el) return '';
    return (el.textContent || '').trim();
}

export function readVideoLinkHref(
    threadEl: HTMLElement,
    parentContainer: Element,
    selector: string
): string {
    const el = findMetadataElement(threadEl, parentContainer, selector) as HTMLAnchorElement | null;
    if (!el) return '';
    return el.getAttribute('href') || el.href || '';
}

/** Метадані вважаються завантаженими, якщо є хоч заголовок, хоч посилання. */
export function hasVideoMetadata(
    threadEl: HTMLElement,
    parentContainer: Element,
    titleSelector: string,
    linkSelector: string
): boolean {
    const title = readVideoTitleText(threadEl, parentContainer, titleSelector);
    const href = readVideoLinkHref(threadEl, parentContainer, linkSelector);
    return Boolean(title || href);
}

export function disconnectVideoMetadataObserver(threadEl: HTMLElement): void {
    const observedEl = threadEl as SyhObservedElement;
    if (!observedEl._syhVideoObserver) return;
    observedEl._syhVideoObserver.disconnect();
    delete observedEl._syhVideoObserver;
}

export function resolveVideoThreadContainer(threadEl: HTMLElement): Element {
    return threadEl.closest(VIDEO_THREAD_CONTAINER_SELECTOR) || threadEl;
}

/** Метадані вже відомі — спостерігач не потрібен. */
export function isVideoMetadataComplete(videoTitle: string, videoId: string): boolean {
    return Boolean(videoTitle && videoId);
}

/**
 * Вішає MutationObserver, який дочекається появи метаданих відео і викличе onLoaded().
 * Попередній спостерігач на цьому ж елементі завжди від'єднується (Polymer recycling).
 */
export function setupVideoMetadataObserver(
    threadEl: HTMLElement,
    videoTitle: string,
    videoId: string,
    onLoaded: () => void
): void {
    disconnectVideoMetadataObserver(threadEl);
    if (isVideoMetadataComplete(videoTitle, videoId)) return;

    const titleSelector = STUDIO_SELECTORS.VIDEO_TITLE.join(',');
    const linkSelector = STUDIO_SELECTORS.VIDEO_LINK.join(',');
    const parentContainer = resolveVideoThreadContainer(threadEl);

    const observer = new MutationObserver(() => {
        if (!hasVideoMetadata(threadEl, parentContainer, titleSelector, linkSelector)) return;
        observer.disconnect();
        delete (threadEl as SyhObservedElement)._syhVideoObserver;
        onLoaded();
    });

    observer.observe(parentContainer, VIDEO_METADATA_OBSERVER_OPTIONS);
    (threadEl as SyhObservedElement)._syhVideoObserver = observer;
}
