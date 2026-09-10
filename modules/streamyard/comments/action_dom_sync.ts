// modules/streamyard_comments/action_dom_sync.ts
//
// ПРИЗНАЧЕННЯ: одна відповідальність — синхронізація DOM-стану картки коментаря
// після успішного копіювання: чекбокси та кнопка «зірка» платформи.
//
// Винесено з `applyCommentActionState` (`./actions.ts`): це був хвіст із трьох
// незалежних DOM-ефектів усередині функції з cognitive 15 (severity critical).
// Поведінка збережена 1-в-1, включно з порядком ефектів.

import type { CommentEffectHost } from './types';
import { SYH_CONFIG, queryBySelectorValue } from '../../config';
import { CommentService } from '../../comments/comment_service';
import { getCheckboxTextKey } from '../ui/ui_checkbox_restorer';

/** Чекбокс SYH, привʼязаний саме до коментаря (а не до банера). */
const COMMENT_CHECKBOX_SELECTOR = '.syh-checkbox[data-type="comment"]';
/** Усі чекбокси SYH усередині картки коментаря. */
const ANY_CHECKBOX_SELECTOR = '.syh-checkbox';

/**
 * Відмічає «головний» чекбокс коментаря та проштовхує стан у SSOT
 * (`CommentService` → `SYH_STATE`), як це робив оригінал.
 *
 * Подія `change` емітиться з `bubbles: true`, бо на неї підписаний делегований
 * обробник картки; прибирати її не можна без зміни поведінки.
 */
function checkPrimaryCommentCheckbox(commentBlock: Element, commentText: string): void {
    const checkboxNode = commentBlock.querySelector<HTMLInputElement>(COMMENT_CHECKBOX_SELECTOR);
    if (!checkboxNode) return;

    checkboxNode.checked = true;
    checkboxNode.dispatchEvent(new Event('change', { bubbles: true }));
    CommentService.setStreamYardCheckboxState(commentText, true);
}

/** Догортає решту чекбоксів картки у стан «відмічено» та оновлює стан через CommentService. */
function checkRemainingCheckboxes(self: CommentEffectHost, commentBlock: Element): void {
    const selectors = self.SELECTORS || SYH_CONFIG.SELECTORS;
    commentBlock
        .querySelectorAll<HTMLInputElement>(ANY_CHECKBOX_SELECTOR)
        .forEach(cb => {
            cb.checked = true;
            const textKey = selectors && typeof cb.closest === 'function'
                ? getCheckboxTextKey(cb, selectors)
                : '';
            if (textKey) {
                CommentService.setStreamYardCheckboxState(textKey, true);
            }
        });
}

/**
 * Ставить «зірку» платформи, якщо вона ще не стоїть.
 *
 * `aria-selected === 'false'` — саме той строгий предикат, що був в оригіналі:
 * відсутній атрибут (null) кліку НЕ викликає.
 */
function activateStarButton(self: CommentEffectHost, commentBlock: Element): void {
    const starBtnNode = queryBySelectorValue<HTMLElement>(self.SELECTORS?.starButton, commentBlock);
    if (starBtnNode && starBtnNode.getAttribute('aria-selected') === 'false') {
        starBtnNode.click();
    }
}

/**
 * Повний набір DOM-ефектів «коментар опрацьовано».
 * Порядок фіксований і збігається з оригіналом: головний чекбокс → решта чекбоксів → зірка.
 */
export function syncCommentCardState(
    self: CommentEffectHost,
    commentBlock: Element,
    commentText: string
): void {
    checkPrimaryCommentCheckbox(commentBlock, commentText);
    checkRemainingCheckboxes(self, commentBlock);
    activateStarButton(self, commentBlock);
}
