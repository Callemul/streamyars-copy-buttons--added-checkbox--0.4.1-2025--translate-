// modules/event_comments/action_marking.ts
//
// ПРИЗНАЧЕННЯ: одна відповідальність — «відмітити коментар» за типом дії:
// запис у БД, перемальовування візуалу та сповіщення шини про молитву.
//
// Винесено з `applyCommentActionState` (`./actions.ts`), яка за звітом Fallow
// була найскладнішою за когнітивною складністю функцією продакшн-коду
// (cyclomatic 12 / cognitive 15, severity critical). Поведінка збережена 1-в-1:
// той самий порядок викликів і ті самі умови.

import type { SyhEventComments, CopyPayload } from './types';
import { SYH_BUS } from '../event_bus';

/** Іконка, якою позначається збережене питання. */
const QUESTION_ICON = '❓';

/**
 * Записує питання в БД і фарбує коментар як «питання».
 * Виділено окремо, щоб гілки question/prayer читались симетрично.
 */
function markAsQuestion(
    self: SyhEventComments,
    author: string,
    commentText: string,
    commentBlock: Element
): void {
    self.saveToDatabase(author, commentText, 'question', QUESTION_ICON);
    if (self.UI) self.UI.updateCommentVisuals(commentBlock, 'question');
}

/**
 * Записує молитву в БД, фарбує коментар як «молитву» і сповіщає шину.
 * Викликається лише коли `prayerIcon` реально є (див. `markCommentByActionType`).
 */
function markAsPrayer(
    self: SyhEventComments,
    prayerIcon: string,
    author: string,
    commentText: string,
    commentBlock: Element
): void {
    self.saveToDatabase(author, commentText, 'prayer', prayerIcon);
    if (self.UI) self.UI.updateCommentVisuals(commentBlock, 'prayer');
    SYH_BUS.emit('PRAYER_MARKED', { author, text: commentText, icon: prayerIcon });
}

/**
 * Диспетчер збереження за `payload.actionType`.
 *
 * Контракт 1-в-1 з оригіналом:
 * - `question` — зберігає завжди;
 * - `prayer` — зберігає ЛИШЕ за наявності `prayerIcon` (без іконки гілка мовчки пропускається);
 * - `copy` / `null` — не робить нічого.
 */
export function markCommentByActionType(
    self: SyhEventComments,
    payload: CopyPayload,
    author: string,
    commentText: string,
    commentBlock: Element
): void {
    if (payload.actionType === 'question') {
        markAsQuestion(self, author, commentText, commentBlock);
        return;
    }
    if (payload.actionType === 'prayer' && payload.prayerIcon) {
        markAsPrayer(self, payload.prayerIcon, author, commentText, commentBlock);
    }
}
