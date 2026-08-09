/**
 * StreamYard Helper — чисті правила інлайн-редагування молитовних прохань.
 *
 * Винесено з `popup/prayer_handlers_focus.ts` (CRAP 42 за звітом Fallow).
 * Тут немає сховища та DOM-подій — лише селектори, стилі підкреслення
 * та детерміновані правки списку, які легко покрити тестами.
 *
 * Поведінка збережена 1-в-1 з оригінальними обробниками.
 */

import type { PrayerItem } from '../modules/types';

/** Інлайн-редаговані вузли списку молитов. */
export const EDITABLE_PRAYER_SELECTOR = '.editable-prayer';
export const EDITABLE_AUTHOR_SELECTOR = '.editable-author';

/** У цьому атрибуті шапка автора запам'ятовує ім'я на момент фокуса. */
export const AUTHOR_OLD_VALUE_ATTR = 'data-old-val';

/** Підкреслення поля у фокусі та поза ним. */
export const FOCUS_BORDER = '1px dashed #2b7de9';
export const BLUR_BORDER = '1px dashed transparent';

/** Мінімальний контракт елемента, потрібний для маршрутизації фокуса. */
export interface FocusTarget {
    closest(selector: string): Element | null;
}

/** Елемент під подією фокуса, якщо він належить потрібному інлайн-полю. */
export function resolveEditableTarget(
    target: FocusTarget | null | undefined,
    selector: string
): HTMLElement | null {
    if (!target) return null;
    return target.closest(selector) as HTMLElement | null;
}

/** Видимий текст інлайн-поля без крайніх пробілів. */
export function readTrimmedText(el: { textContent?: string | null } | null): string {
    return el?.textContent?.trim() || '';
}

/**
 * Записує новий текст прохання за його `id`.
 * Повертає `true`, лише якщо запис справді знайдено і текст змінився.
 *
 * УВАГА: список мутується на місці — саме цей масив далі йде у сховище.
 */
export function applyPrayerTextEdit(list: PrayerItem[], id: string | null, newText: string): boolean {
    const targetItem = list.find(item => item.id === id);
    if (!targetItem || targetItem.text === newText) return false;

    targetItem.text = newText;
    return true;
}

/** Перейменування має сенс лише між двома непорожніми різними іменами. */
export function shouldRenameAuthor(oldAuthor: string | null, newAuthor: string): boolean {
    return Boolean(oldAuthor) && Boolean(newAuthor) && oldAuthor !== newAuthor;
}

/**
 * Перейменовує автора в усіх його проханнях.
 * Повертає `true`, якщо було що перейменовувати.
 *
 * УВАГА: список мутується на місці — саме цей масив далі йде у сховище.
 */
export function applyAuthorRename(list: PrayerItem[], oldAuthor: string, newAuthor: string): boolean {
    let updated = false;

    list.forEach(item => {
        if (item.author === oldAuthor) {
            item.author = newAuthor;
            updated = true;
        }
    });

    return updated;
}
