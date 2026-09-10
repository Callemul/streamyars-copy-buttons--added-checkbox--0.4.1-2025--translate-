/**
 * StreamYard Helper — DOM-мітки типу коментаря.
 *
 * Винесено з `modules/ui_comments.ts` як найнижчий рівень «коментарного» UI:
 * і побудова кнопок (`ui_comments`), і фільтрація списку (`ui_comments_filter`)
 * потребують цих двох функцій. Окремий модуль розриває потенційний цикл
 * `ui_comments` ⇄ `ui_comments_filter`.
 *
 * Поведінка збережена 1-в-1 (див. `tests/ui_comments_copy_filter.test.js`
 * і `tests/ui_comments_starred_controls.test.js`).
 */

import { SYH_UI_STATE } from './ui_state';
import type { PrayerItem } from '../../types';

/** Тип, який відповідає «немає мітки» і знімає атрибут із вузла. */
export const NO_COMMENT_TYPE = 'none';

/**
 * Виставляє (або знімає) `data-syh-type` — єдине джерело правди для CSS-підсвітки
 * коментаря. Будь-який тип, окрім `prayer`/`question`, знімає атрибут.
 */
export function updateCommentVisuals(commentWrap: Element, type: string): void {
    if (type === 'prayer') {
        commentWrap.setAttribute('data-syh-type', 'prayer');
    } else if (type === 'question') {
        commentWrap.setAttribute('data-syh-type', 'question');
    } else {
        commentWrap.removeAttribute('data-syh-type');
    }
}

/**
 * Знаходить збережений тип коментаря за його текстом.
 *
 * `PrayerItem.type` — необов'язкове поле; для DOM-мітки відсутній тип
 * еквівалентний `'none'` (та сама гілка `else` в `updateCommentVisuals`).
 */
export function resolveCommentType(prayersCache: PrayerItem[], text: string): string {
    return prayersCache.find((item: PrayerItem) => item.text === text)?.type ?? NO_COMMENT_TYPE;
}

/** Відновлює мітку типу з кешу молитв/питань для конкретного вузла коментаря. */
export function applySavedLabels(commentNode: Element, text: string): void {
    if (!text || !text.trim()) return;

    updateCommentVisuals(commentNode, resolveCommentType(SYH_UI_STATE.prayersCache, text));
}
