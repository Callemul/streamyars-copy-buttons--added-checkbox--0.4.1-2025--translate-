/**
 * StreamYard Helper — побічні ефекти кліків у списку молитовних прохань.
 *
 * Винесено з `popup/prayer_handlers_click.ts` (CRAP 42 за звітом Fallow):
 * тут лишилися ТІЛЬКИ звернення до сховища, messaging та рендера,
 * а всі рішення живуть у `./prayer_click_rules`.
 *
 * Поведінка збережена 1-в-1 з оригінальними обробниками.
 */

import type { StorageReadResult } from '../modules/storage';
import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage';
import { CommentService } from '../modules/comments/comment_service';
import { sendUnstarMessagesForList } from './prayer_messaging';
import { savePrayersAndRender } from './prayer_render';
import {
    WIPE_PRAYERS_CONFIRM_MESSAGE,
    buildDeleteAuthorConfirm,
    extractRoomIdFromUrl,
    readActiveTabUrl,
    readAuthorAttribute,
    readPrayerIdAttribute,
    readStoredPrayers,
    splitPrayersByAuthor,
    splitPrayersById,
    stampPrayersWithRoom
} from './prayer_click_rules';
import type { PrayerItem } from '../modules/core/types';

/** Читає збережений список молитов і передає його далі. */
function withStoredPrayers(use: (list: PrayerItem[]) => void): void {
    SYH_STORAGE.get([STORAGE_KEYS.PRAYERS], function(result: StorageReadResult) {
        use(readStoredPrayers(result, STORAGE_KEYS.PRAYERS));
    });
}

/** Ставить курсор у кінець імені автора, щоб його можна було одразу правити. */
export function handleEditPrayerAuthor(editBtn: Element): void {
    const block = editBtn.closest('.q-block');
    const authorSpan = block?.querySelector('.editable-author') as HTMLElement | null;
    if (!authorSpan) return;

    authorSpan.focus();

    const sel = window.getSelection();
    if (!sel) return;

    const range = document.createRange();
    range.selectNodeContents(authorSpan);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
}

/** Видаляє всі прохання автора та знімає з них зірочку у StreamYard. */
export function handleDeleteAuthorPrayers(delAuthorBtn: Element): void {
    const authorToDelete = readAuthorAttribute(delAuthorBtn);
    if (!confirm(buildDeleteAuthorConfirm(authorToDelete))) return;

    withStoredPrayers(list => {
        const { removed, kept } = splitPrayersByAuthor(list, authorToDelete);
        sendUnstarMessagesForList(removed);
        removed.forEach(item => {
            void CommentService.removePrayerRecord(item.text);
        });
        savePrayersAndRender(kept);
    });
}

/** Повністю очищає локальний список молитов (StreamYard не чіпаємо). */
export function handleWipeAllPrayers(): void {
    if (!confirm(WIPE_PRAYERS_CONFIRM_MESSAGE)) return;
    savePrayersAndRender([]);
}

/** Перепризначає збережені молитви кімнаті активної вкладки. */
export function handleKeepCurrentRoomPrayers(): void {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const roomId = extractRoomIdFromUrl(readActiveTabUrl(tabs));
        if (roomId === null) return;

        withStoredPrayers(list => {
            savePrayersAndRender(stampPrayersWithRoom(list, roomId, Date.now()));
        });
    });
}

/** Видаляє одне прохання та знімає з нього зірочку у StreamYard. */
export function handleDeleteSinglePrayer(delPrayerBtn: Element): void {
    const id = readPrayerIdAttribute(delPrayerBtn);

    withStoredPrayers(list => {
        const { removed, kept } = splitPrayersById(list, id);
        sendUnstarMessagesForList(removed);
        removed.forEach(item => {
            void CommentService.removePrayerRecord(item.text);
        });
        savePrayersAndRender(kept);
    });
}
