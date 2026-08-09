import type { SyhEventComments, CopyPayload, CopyablePayload } from './types';
import { queryBySelectorValue } from '../config';
import { SYH_BUS } from '../event_bus';
import { CommentService } from '../comment_service';

/**
 * Рантайм-еквівалент попередньої перевірки `if (payload.textToCopy)`.
 *
 * Оформлено як type guard, бо «порожній» варіант `CopyPayload` за побудовою має
 * `textToCopy: ''` — отже, непорожній текст доводить, що `actionType` не `null`.
 * Це дозволяє віддати в `SYH_BUS.emit('COMMENT_ACTION')` строго типізований
 * `type` без приведень і без послаблення контракту шини.
 */
function hasTextToCopy(payload: CopyPayload): payload is CopyablePayload {
    return Boolean(payload.textToCopy);
}

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

    if (hasTextToCopy(payload)) {
        SYH_BUS.emit('COMMENT_ACTION', {
            type: payload.actionType,
            author: author,
            text: commentText
        });

        if (self.UTILS) {
            self.UTILS.copyAndShowBanner(payload.textToCopy, payload.header);
        }

        const checkboxNode = commentBlock.querySelector<HTMLInputElement>('.syh-checkbox[data-type="comment"]');
        if (checkboxNode) {
            checkboxNode.checked = true;
            checkboxNode.dispatchEvent(new Event('change', { bubbles: true }));
            CommentService.setStreamYardCheckboxState(commentText, true);
        }

        commentBlock.querySelectorAll<HTMLInputElement>('.syh-checkbox').forEach(cb => cb.checked = true);

        const starBtnNode = queryBySelectorValue<HTMLElement>(self.SELECTORS?.starButton, commentBlock);
        if (starBtnNode && starBtnNode.getAttribute('aria-selected') === 'false') {
            starBtnNode.click();
        }
    }
}