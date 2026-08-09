import type { SyhEventComments } from '../types';
import { closestBySelectorValue, queryBySelectorValue } from '../../config';
import { getValidatedTarget } from './helpers';

export function handleMiddleClick(e: MouseEvent, self: SyhEventComments): void {
    if (e.button !== 1) return;

    const target = getValidatedTarget(e, self, 'commentBlock');
    if (!target) return;

    if (target.closest('.syh-button')) return;

    const commentBlock = closestBySelectorValue(target, self.SELECTORS?.commentBlock);
    if (!commentBlock) return;

    e.preventDefault();
    e.stopPropagation();

    const starBtnNode = queryBySelectorValue<HTMLElement>(self.SELECTORS?.starButton, commentBlock);
    if (starBtnNode && starBtnNode.getAttribute('aria-selected') === 'true') {
        starBtnNode.click();
    }
}

export function bindMiddleClickHandler(self: SyhEventComments): void {
    self._middleClickHandler = (e: MouseEvent) => handleMiddleClick(e, self);
    document.addEventListener('mousedown', self._middleClickHandler, true);
}
