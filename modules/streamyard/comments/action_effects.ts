import type { CommentEffectHost, CopyPayload, CopyablePayload } from './types';
import { SYH_BUS } from '../../core/event_bus';
import { markCommentByActionType } from './action_marking';
import { syncCommentCardState } from './action_dom_sync';

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

/**
 * Сповіщає шину про дію та показує банер копіювання.
 * `UTILS` може бути `null` до `init()`, тому банер — опційний ефект.
 */
function announceCopiedComment(
    self: CommentEffectHost,
    payload: CopyablePayload,
    author: string,
    commentText: string
): void {
    SYH_BUS.emit('COMMENT_ACTION', {
        type: payload.actionType,
        author: author,
        text: commentText
    });

    if (self.UTILS) {
        self.UTILS.copyAndShowBanner(payload.textToCopy, payload.header);
    }
}

/**
 * Оркестратор дії над коментарем: відмітка → сповіщення/копіювання → DOM-синхронізація.
 *
 * Раніше це була монолітна функція (cyclomatic 12 / cognitive 15, severity critical
 * за `fallow health`). Тіло розкладено на три однорідні кроки у сусідніх модулях;
 * порядок ефектів і всі умови збережено 1-в-1.
 */
export function applyCommentActionState(
    self: CommentEffectHost,
    payload: CopyPayload,
    author: string,
    commentText: string,
    commentBlock: Element
): void {
    markCommentByActionType(self, payload, author, commentText, commentBlock);

    if (!hasTextToCopy(payload)) return;

    announceCopiedComment(self, payload, author, commentText);
    syncCommentCardState(self, commentBlock, commentText);
}
