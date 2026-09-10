import type { SyhStreamYardComments } from '../types';

export function getValidatedTarget(
    e: Event,
    self: SyhStreamYardComments,
    selectorKey: string
): Element | null {
    const target = e.target as Element | null;
    if (!target || !self.SELECTORS?.[selectorKey]) return null;
    return target;
}
