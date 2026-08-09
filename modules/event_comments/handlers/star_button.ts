import type { SyhEventComments } from '../types';
import { closestBySelectorValue, queryBySelectorValue } from '../../config';
import { getValidatedTarget } from './helpers';

export function handleStarButtonClick(e: MouseEvent, self: SyhEventComments): void {
    const target = getValidatedTarget(e, self, 'starButton');
    if (!target) return;

    const starBtn = closestBySelectorValue(target, self.SELECTORS?.starButton);
    if (!starBtn) return;

    if (starBtn.getAttribute('aria-selected') !== 'true') return;

    const commentBlock = closestBySelectorValue(starBtn, self.SELECTORS?.commentBlock);
    if (!commentBlock) return;

    unstarComment(commentBlock, self);
}

function unstarComment(commentBlock: Element, self: SyhEventComments): void {
    const text = queryBySelectorValue(self.SELECTORS?.commentText, commentBlock)?.textContent;
    if (text) {
        self.removeFromDatabase(text);
    }

    const ui = self.UI;
    if (ui) {
        ui.updateCommentVisuals(commentBlock, 'none');
        hideCommentLi(commentBlock);
        scheduleFilterRefresh(ui);
    }
}

function hideCommentLi(commentBlock: Element): void {
    const li = commentBlock.closest('li');
    if (li) {
        li.setAttribute('data-syh-deleted', 'true');
        li.style.display = 'none';
    }
}

function scheduleFilterRefresh(ui: NonNullable<SyhEventComments['UI']>): void {
    if (typeof ui.filterStarredComments === 'function') {
        setTimeout(() => ui.filterStarredComments(), 50);
    }
}

export function bindStarButtonClickHandler(self: SyhEventComments): void {
    self._clickHandler = (e: MouseEvent) => handleStarButtonClick(e, self);
    document.addEventListener('click', self._clickHandler, true);
}
