import type { SyhEventComments } from './types';
import { closestBySelectorValue, queryBySelectorValue } from '../config';
import { CommentService } from '../comment_service';
import { SYH_COMMENT_ASSISTANT } from '../comment_assistant/index';
import { handleSyhButtonMouseUp } from './button_handlers';

function getValidatedTarget(
    e: Event,
    self: SyhEventComments,
    selectorKey: string
): Element | null {
    const target = e.target as Element | null;
    if (!target || !self.SELECTORS?.[selectorKey]) return null;
    return target;
}

export function bindStarButtonClickHandler(self: SyhEventComments): void {
    self._clickHandler = function(e: MouseEvent) {
        const target = getValidatedTarget(e, self, 'starButton');
        if (!target) return;
        const starBtn = closestBySelectorValue(target, self.SELECTORS?.starButton);
        if (starBtn) {
            if (starBtn.getAttribute('aria-selected') === 'true') {
                const commentBlock = closestBySelectorValue(starBtn, self.SELECTORS?.commentBlock);
                if (commentBlock) {
                    const text = queryBySelectorValue(self.SELECTORS?.commentText, commentBlock)?.textContent;
                    if (text) {
                        self.removeFromDatabase(text);
                    }
                    const ui = self.UI;
                    if (ui) {
                        ui.updateCommentVisuals(commentBlock, 'none');
                        const li = commentBlock.closest('li');
                        if (li) {
                            li.setAttribute('data-syh-deleted', 'true');
                            li.style.display = 'none';
                        }
                        
                        if (typeof ui.filterStarredComments === 'function') {
                            setTimeout(() => ui.filterStarredComments(), 50);
                        }
                    }
                }
            }
        }
    };
    document.addEventListener('click', self._clickHandler, true);
}

export function bindMiddleClickHandler(self: SyhEventComments): void {
    self._middleClickHandler = function(e: MouseEvent) {
        if (e.button === 1) { 
            const target = getValidatedTarget(e, self, 'commentBlock');
            if (!target) return;
            if (target.closest('.syh-button')) return;

            const commentBlock = closestBySelectorValue(target, self.SELECTORS?.commentBlock);
            if (commentBlock) {
                e.preventDefault(); 
                e.stopPropagation();
                
                const starBtnNode = queryBySelectorValue<HTMLElement>(self.SELECTORS?.starButton, commentBlock);
                if (starBtnNode && starBtnNode.getAttribute('aria-selected') === 'true') {
                    starBtnNode.click(); 
                }
            }
        }
    };
    document.addEventListener('mousedown', self._middleClickHandler, true);
}

export function bindContextMenuHandlers(self: SyhEventComments): void {
    self._contextHandler = function(e: MouseEvent) {
        const target = getValidatedTarget(e, self, 'commentBlock');
        if (!target) return;
        const targetBtn = target.closest([
            '[data-testid="show-comment-button"]',
            '[class*="PlatformComment__CoverButton"]',
            '[aria-label="Comment actions"]',
            '[class*="DesktopMoreButton"]'
        ].join(','));

        if (targetBtn) {
            e.preventDefault();
            e.stopPropagation();
            const commentBlock = closestBySelectorValue(targetBtn, self.SELECTORS?.commentBlock);
            if (commentBlock) {
                const checkbox = commentBlock.querySelector<HTMLInputElement>('.syh-checkbox[data-type="comment"]');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    const textKey = queryBySelectorValue(self.SELECTORS?.commentText, commentBlock)?.textContent;
                    if (textKey) {
                        CommentService.setStreamYardCheckboxState(textKey, checkbox.checked);
                    }
                    SYH_COMMENT_ASSISTANT.processComment(commentBlock);
                }
            }
        }
    };
    document.addEventListener('contextmenu', self._contextHandler, true);

    self._copyPrayerContextHandler = function(e: MouseEvent) {
        const target = e.target as Element | null;
        if (target?.closest('.syh-button[data-action="copy-prayer"]')) {
            e.preventDefault();
        }
    };
    document.addEventListener('contextmenu', self._copyPrayerContextHandler);
}

export function bindSyhButtonMouseHandlers(self: SyhEventComments): void {
    self._syhButtonMouseDownHandler = function(e: MouseEvent) {
        const target = e.target as Element | null;
        if (target?.closest('.syh-button[data-type="comment"]') && e.button === 1) {
            e.preventDefault();
        }
    };
    document.addEventListener('mousedown', self._syhButtonMouseDownHandler);

    self._mouseupHandler = function(e: MouseEvent) {
        handleSyhButtonMouseUp(e, self);
    };
    document.addEventListener('mouseup', self._mouseupHandler);
}

export function bindCheckboxChangeHandler(self: SyhEventComments): void {
    self._changeHandler = function(e: Event) {
        const target = e.target as Element | null;
        const checkbox = target?.closest<HTMLInputElement>('.syh-checkbox[data-type="comment"]');
        if (!checkbox) return;

        const commentBlock = closestBySelectorValue(checkbox, self.SELECTORS?.commentBlock);
        if (!commentBlock) return;
        const textKey = queryBySelectorValue(self.SELECTORS?.commentText, commentBlock)?.textContent || '';
        
        CommentService.setStreamYardCheckboxState(textKey, checkbox.checked);
        SYH_COMMENT_ASSISTANT.processComment(commentBlock);
    };
    document.addEventListener('change', self._changeHandler);
}