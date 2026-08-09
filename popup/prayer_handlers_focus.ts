import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage';
import { readStoredPrayers } from './prayer_toolbar_actions';
import {
    AUTHOR_OLD_VALUE_ATTR,
    BLUR_BORDER,
    EDITABLE_AUTHOR_SELECTOR,
    EDITABLE_PRAYER_SELECTOR,
    FOCUS_BORDER,
    applyAuthorRename,
    applyPrayerTextEdit,
    readTrimmedText,
    resolveEditableTarget,
    shouldRenameAuthor
} from './prayer_focus_rules';
import type { PrayerItem } from '../modules/types';

type EditableHandler = (el: HTMLElement) => void;

/** Читає збережений список, застосовує правку і зберігає лише за наявності змін. */
function updateStoredPrayers(edit: (list: PrayerItem[]) => boolean): void {
    SYH_STORAGE.get([STORAGE_KEYS.PRAYERS], function(result: Record<string, any>) {
        const list = readStoredPrayers(result, STORAGE_KEYS.PRAYERS);
        if (edit(list)) {
            SYH_STORAGE.set({ [STORAGE_KEYS.PRAYERS]: list });
        }
    });
}

/** Вішає обробник події фокуса, який спрацьовує лише на потрібному інлайн-полі. */
function onEditable(eventType: 'focusin' | 'focusout', selector: string, handler: EditableHandler): void {
    document.addEventListener(eventType, function(e) {
        const el = resolveEditableTarget(e.target as Element | null, selector);
        if (el) handler(el);
    });
}

/** Підсвічує поле, у яке став курсор. */
function highlightEditable(el: HTMLElement): void {
    el.style.borderBottom = FOCUS_BORDER;
}

/** Знімає підсвітку з поля, з якого пішов курсор. */
function unhighlightEditable(el: HTMLElement): void {
    el.style.borderBottom = BLUR_BORDER;
}

/** Запам'ятовує ім'я автора до правки, щоб потім знайти всі його прохання. */
function rememberAuthorBeforeEdit(el: HTMLElement): void {
    highlightEditable(el);
    el.setAttribute(AUTHOR_OLD_VALUE_ATTR, readTrimmedText(el));
}

/** Зберігає відредагований текст прохання. */
function savePrayerTextEdit(el: HTMLElement): void {
    unhighlightEditable(el);

    const id = el.getAttribute('data-id');
    const newText = readTrimmedText(el);

    updateStoredPrayers(list => applyPrayerTextEdit(list, id, newText));
}

/** Зберігає перейменування автора в усіх його проханнях. */
function saveAuthorRename(el: HTMLElement): void {
    unhighlightEditable(el);

    const oldAuthor = el.getAttribute(AUTHOR_OLD_VALUE_ATTR);
    const newAuthor = readTrimmedText(el);
    if (!shouldRenameAuthor(oldAuthor, newAuthor)) return;

    updateStoredPrayers(list => applyAuthorRename(list, oldAuthor as string, newAuthor));
}

export function bindPrayerFocusListeners(): void {
    onEditable('focusin', EDITABLE_PRAYER_SELECTOR, highlightEditable);
    onEditable('focusout', EDITABLE_PRAYER_SELECTOR, savePrayerTextEdit);
    onEditable('focusin', EDITABLE_AUTHOR_SELECTOR, rememberAuthorBeforeEdit);
    onEditable('focusout', EDITABLE_AUTHOR_SELECTOR, saveAuthorRename);
}
