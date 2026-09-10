// modules/streamyard_comment_binding.ts
//
// Прив'язка обробників до картки коментаря StreamYard — через той самий
// `CommentInjector`, що обслуговує YouTube і Studio (T7).
//
// Раніше StreamYard слухав `mouseup` і `change` на `document` і сам шукав
// картку через `closest`. Делегування було стійким до перемальовувань, але
// коштувало другої архітектури: кнопки описував реєстр, а реагував на них
// окремий конвеєр, який про реєстр майже нічого не знав.
//
// Тепер слухачі навішуються на самі кнопки, а стійкість до перемальовувань
// дає маркер на контейнері кнопок (`StreamYardCommentAdapter.isEventsBound`):
// зникає панель — зникає й маркер, тож наступний прохід прив'яже все заново.
//
// Прив'язка викликається там само, де вставляються кнопки
// (`bootstrap_dom.onCommentAdded`), тож покриття збігається з покриттям панелі.

import { CommentInjector } from '../../comments/comment_injector';
import { StreamYardCommentAdapter } from './streamyard_adapter';
import type { CommentStateCaches } from '../../comments/comment_platform_adapter';

/**
 * Кеші контракту `CommentInjector`. На StreamYard вони лишаються порожніми:
 * стан кнопок поверхня не зберігає, а стан чекбокса живе в `SYH_STATE`
 * (див. `StreamYardCommentAdapter.onCheckboxToggled`).
 */
const caches: CommentStateCaches = { buttonStates: {}, checkboxStates: {} };

export const STREAMYARD_COMMENT_ADAPTER = new StreamYardCommentAdapter();

const injector = new CommentInjector(STREAMYARD_COMMENT_ADAPTER, caches, 'streamyard');

/** Навішує слухачі дій і чекбокса на картку коментаря. Ідемпотентна. */
export function bindStreamYardComment(element: Element): void {
    injector.bindCommentEvents(element, '');
}

/** Знімає слухачі з картки, яку StreamYard прибрав із DOM. */
export function unbindStreamYardComment(element: Element): void {
    injector.unbindCommentEvents(element);
}
