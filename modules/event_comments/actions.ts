import type { SyhEventComments } from './types';
import type { CopyPayload } from './formatters';
import { SYH_BUS } from '../event_bus';
import { CommentService } from '../comment_service';

export function applyCommentActionState(
    self: SyhEventComments,
    payload: CopyPayload,
    author: string,
    commentText: string,
    commentBlock: Element
): void {
    if (payload.actionType === 'question') {
        self.saveToDatabase(author, commentText, "question", "❓");
        if (self.UI) self.UI.updateCommentVisuals(commentBlock, 'question');
    } else if (payload.actionType === 'prayer' && payload.prayerIcon) {
        self.saveToDatabase(author, commentText, "prayer", payload.prayerIcon);
        if (self.UI) self.UI.updateCommentVisuals(commentBlock, 'prayer');
        SYH_BUS.emit('PRAYER_MARKED', { author, text: commentText, icon: payload.prayerIcon });
    }

    if (payload.textToCopy) {
        SYH_BUS.emit('COMMENT_ACTION', {
            type: payload.actionType,
            author: author,
            text: commentText
        });

        if (self.UTILS) {
            self.UTILS.copyAndShowBanner(payload.textToCopy, payload.header);
        }

        const checkboxNode = commentBlock.querySelector('.syh-checkbox[data-type="comment"]') as HTMLInputElement | null;
        if (checkboxNode) {
            checkboxNode.checked = true;
            checkboxNode.dispatchEvent(new Event('change', { bubbles: true }));
            CommentService.setStreamYardCheckboxState(commentText, true);
        }

        commentBlock.querySelectorAll<HTMLInputElement>('.syh-checkbox').forEach(cb => cb.checked = true);

        const starBtnNode = commentBlock.querySelector(self.SELECTORS?.starButton || '') as HTMLElement | null;
        if (starBtnNode && starBtnNode.getAttribute('aria-selected') === 'false') {
            starBtnNode.click();
        }
    }
}