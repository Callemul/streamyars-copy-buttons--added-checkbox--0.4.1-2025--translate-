// modules/event_comments/auto_heal_cover_buttons.ts
//
// Прохід «cover buttons»: StreamYard ховає коментар власною кнопкою
// `[data-testid="show-comment-button"]`. Якщо коментар прихований платформою,
// наш чекбокс має бути позначеним — інакше стан розходиться між UI та базою.
//
// Виділено з `auto_heal.ts` (Fallow 3.14: `complexity_density 0.40` — найвища
// щільність у проєкті). Поведінка збережена 1-в-1: стан пишеться ТІЛЬКИ через
// `CommentService`, як того вимагає правило Single Source of Truth.

import type { SyhEventComments } from './types';
import { closestBySelectorValue, queryBySelectorValue } from '../config';
import { CommentService } from '../comment_service';
import { SYH_COMMENT_ASSISTANT } from '../comment_assistant/index';

const COVER_BUTTON_SELECTOR = '[data-testid="show-comment-button"]';
const COMMENT_CHECKBOX_SELECTOR = '.syh-checkbox[data-type="comment"]';
const HIDE_ICON_SELECTOR = '.lucide-circle-minus';

/** Кнопка означає «приховати» або текстом `Hide`, або іконкою мінуса. */
function isHideButton(btn: Element): boolean {
    return btn.textContent?.includes('Hide') || !!btn.querySelector(HIDE_ICON_SELECTOR);
}

/**
 * Позначає чекбокс коментаря як вибраний і синхронізує стан.
 *
 * КВІРК 1-в-1: якщо текст коментаря не знайдено, чекбокс усе одно лишається
 * позначеним, але у сховище нічого не пишеться.
 */
function markCommentAsCovered(self: SyhEventComments, commentBlock: Element): void {
    const checkbox = commentBlock.querySelector<HTMLInputElement>(COMMENT_CHECKBOX_SELECTOR);
    if (!checkbox || checkbox.checked) return;

    checkbox.checked = true;

    const textKey = queryBySelectorValue(self.SELECTORS?.commentText, commentBlock)?.textContent;
    if (textKey) {
        CommentService.setStreamYardCheckboxState(textKey, true);
    }

    SYH_COMMENT_ASSISTANT.processComment(commentBlock);
}

export function processCoverButtons(self: SyhEventComments): void {
    document.querySelectorAll(COVER_BUTTON_SELECTOR).forEach((btn: Element) => {
        if (!isHideButton(btn)) return;

        const commentBlock = closestBySelectorValue(btn, self.SELECTORS?.commentBlock);
        if (!commentBlock) return;

        markCommentAsCovered(self, commentBlock);
    });
}
