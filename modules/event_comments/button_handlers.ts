import type { SyhEventComments } from './types';
import { closestBySelectorValue, queryBySelectorValue } from '../config';
import { applyCommentActionState } from './actions';
import { formatCopyPayload, stripLeadingAt } from './formatters';

export function handleSyhButtonMouseUp(
    e: MouseEvent,
    self: SyhEventComments
): void {
    const target = e.target as Element | null;
    const button = target?.closest<HTMLElement>('.syh-button[data-type="comment"]');
    if (!button) return;

    e.preventDefault();
    e.stopPropagation();

    const action = button.dataset.action;
    const buttonNum = e.button;

    if (buttonNum !== 0 && action !== 'copy-prayer') return;

    const commentBlock = closestBySelectorValue(button, self.SELECTORS?.commentBlock);
    if (!commentBlock) return;

    const rawAuthor = queryBySelectorValue(self.SELECTORS?.commentAuthor, commentBlock)?.textContent;
    const author = stripLeadingAt(rawAuthor);
    const commentText = queryBySelectorValue(self.SELECTORS?.commentText, commentBlock)?.textContent || '';

    if (action === 'copy-author-comment' || action === 'copy-prayer') {
        commentBlock.setAttribute('data-syh-just-added', 'true');
        setTimeout(() => { commentBlock.removeAttribute('data-syh-just-added'); }, 2000);
    }

    const payload = formatCopyPayload(action, author, commentText, buttonNum);
    applyCommentActionState(self, payload, author, commentText, commentBlock);
}