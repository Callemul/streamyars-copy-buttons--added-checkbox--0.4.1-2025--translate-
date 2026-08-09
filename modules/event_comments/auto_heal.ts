import type { SyhEventComments } from './types';
import { closestBySelectorValue, queryBySelectorValue, resolveSelectorString } from '../config';
import { SYH_DOM_OBSERVER } from '../dom_observer';
import { CommentService } from '../comment_service';
import { SYH_COMMENT_ASSISTANT } from '../comment_assistant/index';

function isExtensionRuntime(): boolean {
    return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
}

function processCoverButtons(self: SyhEventComments): void {
    const coverButtons = document.querySelectorAll('[data-testid="show-comment-button"]');
    coverButtons.forEach((btn: Element) => {
        if (!isHideButton(btn)) return;

        const commentBlock = closestBySelectorValue(btn, self.SELECTORS?.commentBlock);
        if (!commentBlock) return;

        const checkbox = commentBlock.querySelector<HTMLInputElement>('.syh-checkbox[data-type="comment"]');
        if (!checkbox || checkbox.checked) return;

        checkbox.checked = true;
        const textKey = queryBySelectorValue(self.SELECTORS?.commentText, commentBlock)?.textContent;
        if (textKey) {
            CommentService.setStreamYardCheckboxState(textKey, true);
        }
        SYH_COMMENT_ASSISTANT.processComment(commentBlock);
    });
}

function isHideButton(btn: Element): boolean {
    return btn.textContent?.includes('Hide') || !!btn.querySelector('.lucide-circle-minus');
}

function processSyhComments(self: SyhEventComments): void {
    const syhComments = document.querySelectorAll('[data-syh-type="prayer"], [data-syh-type="question"]');
    syhComments.forEach((commentBlock: Element) => {
        const starBtn = queryBySelectorValue(self.SELECTORS?.starButton, commentBlock);
        if (!starBtn || starBtn.getAttribute('aria-selected') !== 'false') return;
        if (commentBlock.getAttribute('data-syh-just-added') === 'true') return;

        const text = queryBySelectorValue(self.SELECTORS?.commentText, commentBlock)?.textContent;
        if (!text) return;

        console.log("[SYH] Auto-Heal: Виявлено коментар без зірки. Очищую з бази.");
        self.removeFromDatabase(text);

        const ui = self.UI;
        if (ui) {
            ui.updateCommentVisuals(commentBlock, 'none');
            if (typeof ui.filterStarredComments === 'function') {
                setTimeout(() => ui.filterStarredComments(), 100);
            }
        }
    });
}

export function runAutoHeal(self: SyhEventComments): void {
    if (!isExtensionRuntime()) {
        if (self.autoHealObserver) {
            self.autoHealObserver.disconnect();
        }
        return;
    }

    processCoverButtons(self);
    processSyhComments(self);
}

export function bindAutoHealScanner(self: SyhEventComments): void {
    if (self.unregisterAutoHeal) {
        self.unregisterAutoHeal();
        self.unregisterAutoHeal = null;
    }

    const commentSelector = resolveSelectorString(self.SELECTORS?.commentBlock)
        || '[class*="PlatformComment__Wrap"]';

    let rafScheduled = false;
    const triggerAutoHeal = () => {
        if (document.hidden) return;
        if (!rafScheduled) {
            rafScheduled = true;
            requestAnimationFrame(() => {
                rafScheduled = false;
                runAutoHeal(self);
            });
        }
    };

    self.unregisterAutoHeal = SYH_DOM_OBSERVER.register(
        commentSelector,
        () => triggerAutoHeal(),
        () => triggerAutoHeal()
    );

    runAutoHeal(self);
}
