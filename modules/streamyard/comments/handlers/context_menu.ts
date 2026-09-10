import type { SyhStreamYardComments } from '../types';
import { closestBySelectorValue, queryBySelectorValue } from '../../../config';
import { CommentService } from '../../../comments/comment_service';
import { SYH_COMMENT_ASSISTANT } from '../../../comments/assistant/index';
import { getValidatedTarget } from './helpers';
import { getCommentAction } from '../../../comments/comment_actions';

/** Селектор кнопки молитви — з реєстру дій, а не зашитим рядком. */
const PRAYER_BUTTON_SELECTOR =
    `.syh-button[data-action="${getCommentAction('prayer')?.platforms.streamyard?.domAction ?? 'copy-prayer'}"]`;

const BUTTON_SELECTORS = [
    '[data-testid="show-comment-button"]',
    '[class*="PlatformComment__CoverButton"]',
    '[aria-label="Comment actions"]',
    '[class*="DesktopMoreButton"]'
].join(',');

export function handleContextMenuClick(e: MouseEvent, self: SyhStreamYardComments): void {
    const target = getValidatedTarget(e, self, 'commentBlock');
    if (!target) return;

    const targetBtn = target.closest(BUTTON_SELECTORS);
    if (!targetBtn) return;

    e.preventDefault();
    e.stopPropagation();

    const commentBlock = closestBySelectorValue(targetBtn, self.SELECTORS?.commentBlock);
    if (!commentBlock) return;

    const checkbox = commentBlock.querySelector<HTMLInputElement>('.syh-checkbox[data-type="comment"]');
    if (!checkbox) return;

    checkbox.checked = !checkbox.checked;
    const textKey = queryBySelectorValue(self.SELECTORS?.commentText, commentBlock)?.textContent;
    if (textKey) {
        CommentService.setStreamYardCheckboxState(textKey, checkbox.checked);
    }
    SYH_COMMENT_ASSISTANT.processComment(commentBlock);
}

export function handleCopyPrayerContext(e: MouseEvent): void {
    const target = e.target as Element | null;
    if (target?.closest(PRAYER_BUTTON_SELECTOR)) {
        e.preventDefault();
    }
}

export function bindContextMenuHandlers(self: SyhStreamYardComments): void {
    self._contextHandler = (e: MouseEvent) => handleContextMenuClick(e, self);
    document.addEventListener('contextmenu', self._contextHandler, true);

    self._copyPrayerContextHandler = (e: MouseEvent) => handleCopyPrayerContext(e);
    document.addEventListener('contextmenu', self._copyPrayerContextHandler);
}
