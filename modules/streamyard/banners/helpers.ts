import type { SelectorValue } from '../../config';

export interface BannerContext {
    bannerBlock: Element | null;
    bannerText: string;
}

export function resolveBannerContext(
    element: Element,
    selectors: Record<string, SelectorValue> | null
): BannerContext {
    const bannerBlock = element.closest((selectors?.bannerBlock as string) || '');
    const bannerText = bannerBlock?.querySelector((selectors?.bannerText as string) || '')?.textContent || '';
    return { bannerBlock, bannerText };
}
