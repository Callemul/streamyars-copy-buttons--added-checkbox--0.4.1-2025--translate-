import type { SyhEventComments } from './types';
import { CommentService } from '../comment_service';
import { SYH_COMMENT_ASSISTANT } from '../comment_assistant/index';

export function bindStarButtonClickHandler(self: SyhEventComments): void {
    self._clickHandler = function(e: MouseEvent) {
        const target = e.target as Element | null;
        if (!target || !self.SELECTORS?.starButton) return;
        const starBtn = target.closest(self.SELECTORS.starButton);
        if (starBtn) {
            if (starBtn.getAttribute('aria-selected') === 'true') {
                const commentBlock = starBtn.closest(self.SELECTORS.commentBlock);
                if (commentBlock) {
                    const text = commentBlock.querySelector(self.SELECTORS.commentText)?.textContent;
                    if (text) {
                        self.removeFromDatabase(text);
                    }
                    if (self.UI) {
                        self.UI.updateCommentVisuals(commentBlock, 'none');
                        const li = commentBlock.closest('li');
                        if (li) {
                            li.setAttribute('data-syh-deleted', 'true');
                            li.style.display = 'none';
                        }
                        
                        if (typeof self.UI.filterStarredComments === 'function') {
                            setTimeout(() => self.UI.filterStarredComments(), 50);
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
            const target = e.target as Element | null;
            if (!target || !self.SELECTORS?.commentBlock) return;
            if (target.closest('.syh-button')) return;

            const commentBlock = target.closest(self.SELECTORS.commentBlock);
            if (commentBlock) {
                e.preventDefault(); 
                e.stopPropagation();
                
                const starBtnNode = commentBlock.querySelector(self.SELECTORS.starButton || '') as HTMLElement | null;
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
        const target = e.target as Element | null;
        if (!target || !self.SELECTORS?.commentBlock) return;
        const targetBtn = target.closest([
            '[data-testid="show-comment-button"]',
            '[class*="PlatformComment__CoverButton"]',
            '[aria-label="Comment actions"]',
            '[class*="DesktopMoreButton"]'
        ].join(','));

        if (targetBtn) {
            e.preventDefault();
            e.stopPropagation();
            const commentBlock = targetBtn.closest(self.SELECTORS.commentBlock);
            if (commentBlock) {
                const checkbox = commentBlock.querySelector('.syh-checkbox[data-type="comment"]') as HTMLInputElement | null;
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    const textKey = commentBlock.querySelector(self.SELECTORS.commentText || '')?.textContent;
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
        if (e.target?.closest('.syh-button[data-action="copy-prayer"]')) {
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
        const checkbox = target?.closest('.syh-checkbox[data-type="comment"]') as HTMLInputElement | null;
        if (!checkbox) return;

        const commentBlock = checkbox.closest(self.SELECTORS?.commentBlock || '');
        if (!commentBlock) return;
        const textKey = commentBlock.querySelector(self.SELECTORS?.commentText || '')?.textContent || '';
        
        CommentService.setStreamYardCheckboxState(textKey, checkbox.checked);
        SYH_COMMENT_ASSISTANT.processComment(commentBlock);
    };
    document.addEventListener('change', self._changeHandler);
}