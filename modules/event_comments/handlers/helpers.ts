import type { SyhEventComments } from '../types';

export function getValidatedTarget(
    e: Event,
    self: SyhEventComments,
    selectorKey: string
): Element | null {
    const target = e.target as Element | null;
    if (!target || !self.SELECTORS?.[selectorKey]) return null;
    return target;
}
