// popup/popup_telegram_collected.ts
//
// Права колонка вкладки Telegram: список коментарів, зібраних з YouTube,
// їх рендер, точкове та повне видалення.
//
// Виділено з `popup/popup_telegram.ts` (hotspot №1 за Fallow).

import { SYH_STORAGE, getSheetCollectedStorageKey } from '../modules/storage';
import { CommentService } from '../modules/comment_service';
import { batchRenderItems } from '../modules/render_utils';
import type { YTCollectedItem } from '../modules/types';
import { $ } from './popup_dom_utils';
import {
    setCollectedItemsForSheet,
    cancelActiveBatch,
    registerActiveBatch
} from './popup_telegram_state';
import { updateCombinedCounters } from './popup_telegram_counters';
import { clearFinalResult } from './popup_telegram_renderers';

/** Картка одного зібраного коментаря. Текст вставляється лише через textContent. */
function createYTCollectedCard(item: YTCollectedItem, sheetId: string): HTMLElement {
    const card = document.createElement('div');
    card.className = 'yt-collected-item';
    if (item.type === 'question') card.classList.add('is-question');
    else card.classList.add('is-prayer');
    card.setAttribute('data-id', item.id);

    const typeLabel = item.type === 'question' ? '❓ Питання' : '🙏 Молитва';

    const header = document.createElement('div');
    header.className = 'yt-item-header';

    const author = document.createElement('span');
    author.className = 'yt-item-author';
    author.textContent = item.author || 'Анонім';

    const badge = document.createElement('span');
    badge.className = 'yt-item-type-badge';
    badge.textContent = typeLabel;

    const delBtn = document.createElement('button');
    delBtn.className = 'yt-item-del-btn';
    delBtn.textContent = '✕';
    delBtn.setAttribute('title', 'Видалити');
    delBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        deleteYTCollectedItem(item.id, sheetId, item.author, item.text);
    });

    header.appendChild(author);
    header.appendChild(badge);
    header.appendChild(delBtn);

    const text = document.createElement('div');
    text.className = 'yt-item-text';
    text.textContent = item.text;

    card.appendChild(header);
    card.appendChild(text);
    return card;
}

/** Плейсхолдер, коли з YouTube нічого не зібрано. */
function renderEmptyCollectedState(list: HTMLElement): void {
    list.innerHTML = '';
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'yt-empty-msg';
    emptyDiv.textContent = 'Зібраних коментарів з YouTube немає';
    list.appendChild(emptyDiv);
}

export function loadYTCollected(sheetId: string = 'vp_ss'): void {
    const sheetKey = getSheetCollectedStorageKey(sheetId);

    SYH_STORAGE.get([sheetKey], function (result: Record<string, any>) {
        const items: YTCollectedItem[] = result[sheetKey] || [];
        setCollectedItemsForSheet(sheetId, items);

        const list = $(`ytCollectedList__${sheetId}`);
        if (!list) return;

        const cancelKey = `ytCollected_${sheetId}`;
        cancelActiveBatch(cancelKey);

        if (items.length === 0) {
            renderEmptyCollectedState(list);
        } else {
            registerActiveBatch(cancelKey, batchRenderItems(
                list,
                items,
                (item: YTCollectedItem) => createYTCollectedCard(item, sheetId),
                { batchSize: 25, clearContainer: true }
            ));
        }
        updateCombinedCounters(sheetId);
    });
}

export function deleteYTCollectedItem(
    commentId: string,
    sheetId: string = 'vp_ss',
    author?: string,
    text?: string
): Promise<void> {
    return CommentService.removeCollectedComment(sheetId, commentId, author, text)
        .then(() => {
            loadYTCollected(sheetId);
            clearFinalResult(sheetId);
        })
        .catch(e => console.error('[SYH] Delete collected item failed:', e));
}

export function clearAllYTCollected(sheetId: string = 'vp_ss'): void {
    if (confirm("Очистити всі зібрані коментарі з YouTube для цього аркуша?")) {
        CommentService.clearAllCollectedForSheet(sheetId).then(() => {
            loadYTCollected(sheetId);
            clearFinalResult(sheetId);
        }).catch(e => console.error('[SYH] Clear failed:', e));
    }
}
