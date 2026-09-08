// modules/event_comments/handlers/syh_buttons.ts
//
// Єдине, що лишилось тут після T7, — гасіння браузерної дії середньої кнопки
// (автоскрол) над нашими кнопками коментаря. Це поведінка сторінки, а не дія
// над коментарем: сама дія тепер приходить у `StreamYardCommentAdapter.runAction`
// через `CommentInjector`, який слухає `mouseup` на самій кнопці.

import type { SyhEventComments } from '../types';

export function handleSyhButtonDown(e: MouseEvent): void {
    const target = e.target as Element | null;
    if (target?.closest('.syh-button[data-type="comment"]') && e.button === 1) {
        e.preventDefault();
    }
}

export function bindSyhButtonMouseHandlers(self: SyhEventComments): void {
    self._syhButtonMouseDownHandler = (e: MouseEvent) => handleSyhButtonDown(e);
    document.addEventListener('mousedown', self._syhButtonMouseDownHandler);
}
