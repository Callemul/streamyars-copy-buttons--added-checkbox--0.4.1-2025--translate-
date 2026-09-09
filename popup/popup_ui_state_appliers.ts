// popup/popup_ui_state_appliers.ts
//
// ПРИЗНАЧЕННЯ: точкові DOM-застосовувачі відновленого стану попапа.
//
// Винесено з `popup/popup_ui_state_restorer.ts`: саме вкладені цикли з
// подвійними `if` давали `restoreTextareaSizesUI` cognitive 16 у звіті Fallow.
// Поведінка збережена 1-в-1.

import { $ } from './popup_dom_utils';

/** Збережений розмір елемента (обидва виміри необовʼязкові). */
// Форма переїхала в `modules/types.ts` до решти збережених форм (T17, крок 3).
import type { StoredElementSize } from '../modules/types';
export type { StoredElementSize };

/** Порожні/відсутні виміри навмисно НЕ перезаписують поточний стиль. */
function applyElementSize(el: HTMLElement, size: StoredElementSize): void {
    if (size.width) el.style.width = size.width;
    if (size.height) el.style.height = size.height;
}

/**
 * Застосовує збережені розміри до елементів за їхніми id.
 *
 * Порядок перевірок збережено: спершу елемент, і лише потім читання розміру,
 * тому «висячі» записи для неіснуючих елементів пропускаються мовчки.
 */
export function applyStoredElementSizes(sizes: Record<string, StoredElementSize>): void {
    for (const id in sizes) {
        const el = document.getElementById(id);
        if (el && el instanceof HTMLElement) {
            applyElementSize(el, sizes[id]);
        }
    }
}

/** Ставить `scrollTop` елемента; відсутнє значення трактується як 0. */
export function applyScrollTop(id: string, value: number | undefined): void {
    const el = $(id) as HTMLElement | null;
    if (el) el.scrollTop = value || 0;
}

/** Записує значення в поле вводу, якщо воно є і в сховищі, і в DOM. */
export function applyInputValue(id: string, value: string | undefined): void {
    if (!value) return;
    const el = $(id) as HTMLInputElement | HTMLTextAreaElement | null;
    if (el) el.value = value;
}
