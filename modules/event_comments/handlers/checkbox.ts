import type { SyhEventComments } from '../types';
import { closestBySelectorValue, queryBySelectorValue } from '../../config';
import { CommentService } from '../../comment_service';
import { SYH_COMMENT_ASSISTANT } from '../../comment_assistant/index';

export function handleCheckboxChange(e: Event, self: SyhEventComments): void {
    const target = e.target as Element | null;
    const checkbox = target?.closest<HTMLInputElement>('.syh-checkbox[data-type="comment"]');
    if (!checkbox) return;

    const commentBlock = closestBySelectorValue(checkbox, self.SELECTORS?.commentBlock);
    if (!commentBlock) return;

    const textKey = queryBySelectorValue(self.SELECTORS?.commentText, commentBlock)?.textContent || '';
    CommentService.setStreamYardCheckboxState(textKey, checkbox.checked);
    SYH_COMMENT_ASSISTANT.processComment(commentBlock);
}

export function bindCheckboxChangeHandler(self: SyhEventComments): void {
    self._changeHandler = (e: Event) => handleCheckboxChange(e, self);
    document.addEventListener('change', self._changeHandler);
}
