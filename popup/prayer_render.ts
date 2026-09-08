import { batchRenderItems } from '../modules/render_utils';
import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage';
import { $ } from './prayer_utils';
import { checkRoomWarning } from './prayer_render_helpers';
import { 
    ensurePrayerIds, 
    savePrayerIdsIfNeeded, 
    filterAndSaveFreshPrayers, 
    groupPrayersByAuthor, 
    buildCopyText, 
    updateTotalCount 
} from './prayer_data';
import { buildAuthorHeader, buildPrayerRow } from './prayer_render_helpers';

import type { PrayerItem } from '../modules/types';

let activePrayerBatchCancel: (() => void) | null = null;

export function renderPrayers(prayersList: PrayerItem[]): void {
    const outputDiv = $('prayersResultDiv');
    if (!outputDiv) return;

    if (activePrayerBatchCancel) {
        activePrayerBatchCancel();
        activePrayerBatchCancel = null;
    }

    outputDiv.innerHTML = '';

    const roomWarning = $('syh-room-warning');
    if (roomWarning) roomWarning.remove();
    outputDiv.removeAttribute('contenteditable');

    if (!prayersList || prayersList.length === 0) {
        updateTotalCount(0, 0);
        outputDiv.innerHTML = '<span style="color:#999; font-style:italic;">Список порожній. Натисніть кнопку 🔄 "Підтягнути", щоб завантажити зіркові коментарі з ефіру, або маркуйте їх вручну.</span>';
        outputDiv.setAttribute('data-raw-text', '');
        return;
    }

    const needsSaveId = ensurePrayerIds(prayersList);
    savePrayerIdsIfNeeded(prayersList, needsSaveId);

    const filteredList = filterAndSaveFreshPrayers(prayersList);

    checkRoomWarning(filteredList, outputDiv);

    const { grouped, totalRequests } = groupPrayersByAuthor(filteredList);
    const authorNames = Object.keys(grouped);
    const authorsCount = authorNames.length;
    updateTotalCount(authorsCount, totalRequests);

    const rawText = buildCopyText(grouped);
    outputDiv.setAttribute('data-raw-text', rawText);

    activePrayerBatchCancel = batchRenderItems(
        outputDiv,
        authorNames,
        (author) => {
            const items = grouped[author];
            const { header } = buildAuthorHeader(author, items);

            const block = document.createElement('div');
            block.className = 'q-block q-pray';
            block.style.position = 'relative';
            block.appendChild(header);

            if (items.length === 1) {
                const item = items[0];
                block.appendChild(buildPrayerRow(item));
            } else {
                items.forEach((item, idx) => {
                    block.appendChild(buildPrayerRow(item, idx));
                });
            }
            return block;
        },
        { batchSize: 20, clearContainer: true }
    );
}

/** Записує список у сховище і перемальовує його; опціональний `after` виконується після рендера. */
export function savePrayersAndRender(list: PrayerItem[], after?: () => void): void {
    SYH_STORAGE.set({ [STORAGE_KEYS.PRAYERS]: list }, function() {
        renderPrayers(list);
        if (after) after();
    });
}