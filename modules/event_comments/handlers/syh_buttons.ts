import type { SyhEventComments } from '../types';
import { handleSyhButtonMouseUp } from '../button_handlers';

export function handleSyhButtonDown(e: MouseEvent): void {
    const target = e.target as Element | null;
    if (target?.closest('.syh-button[data-type="comment"]') && e.button === 1) {
        e.preventDefault();
    }
}

export function bindSyhButtonMouseHandlers(self: SyhEventComments): void {
    self._syhButtonMouseDownHandler = (e: MouseEvent) => handleSyhButtonDown(e);
    document.addEventListener('mousedown', self._syhButtonMouseDownHandler);

    self._mouseupHandler = (e: MouseEvent) => handleSyhButtonMouseUp(e, self);
    document.addEventListener('mouseup', self._mouseupHandler);
}
