// youtube/studio/studio_header_counters.ts
import { SHEET_LABELS, SHEET_IDS, type SheetId } from '../../modules/sheets';
import type { ChannelKey } from '../../modules/channel_config';
import { SYH_STORAGE, STORAGE_KEYS } from '../../modules/storage';
import { CommentService } from '../../modules/comment_service';

export interface SheetHeaderStats {
    questions: number;
    prayers: number;
}

/**
 * Returns the two relevant sheet IDs for a given channel key
 */
export function getSheetsForChannel(channelKey: ChannelKey): SheetId[] {
    if (channelKey === 'vp') {
        return [SHEET_IDS.VP_SS, SHEET_IDS.OPARIN];
    }
    if (channelKey === 'slovo') {
        return [SHEET_IDS.MOLCHANOV_SS, SHEET_IDS.MOLCHANOV_PREACH];
    }
    return [];
}

/**
 * Formats specific words inside the category labels to make them bold.
 * Accents "СШ" for Sabbath school sheets and "проповеди" / "проповіді" for sermon sheets.
 */
export function formatCategoryLabel(label: string): string {
    if (label === 'Время перемен СШ') return 'Время перемен <b>СШ</b>';
    if (label === 'Молчанов СШ') return 'Молчанов <b>СШ</b>';
    if (label === 'Опарин проповеди' || label === 'Опарин проповіді') return 'Опарин <b>проповеди</b>';
    if (label === 'Молчанов проповеди' || label === 'Молчанов проповіді') return 'Молчанов <b>проповеди</b>';
    if (label.includes('проповеди')) return label.replace('проповеди', '<b>проповеди</b>');
    if (label.includes('проповіді')) return label.replace('проповіді', '<b>проповіді</b>');
    if (label.includes('СШ')) return label.replace('СШ', '<b>СШ</b>');
    return label;
}

/**
 * Renders or updates the sticky counter badges directly next to "Коментар" span inside #comment-header in YouTube Studio.
 * 
 * AI SEARCH KEYWORDS / КЛЮЧОВІ СЛОВА ДЛЯ ШІ:
 * - "бадж", "баджі", "бадже", "лічильник", "коментар", "Молчанов СШ", "Молчанов проповеди", "Время перемен СШ", "Опарин"
 * - "syh-header-counter-badge", "syh-stat-total", "syh-counter-num-total", "syh-header-stat-divider", "renderStudioHeaderCounters"
 * 
 * HTML BADGE STRUCTURE / СТРУКТУРА БАДЖА:
 * [Категорія] | 👥 [Всього люд.] │ ❓ [Питань] 🙏 [Молитов] 🗑️
 * - .syh-header-sheet-label (Назва: Молчанов СШ / проповеди / Время перемен СШ)
 * - .syh-stat-total (👥 total = questions + prayers) -> відповідає кількості людей у Попапі
 * - .syh-header-stat-divider (│ роздільник)
 * - .syh-stat-questions (❓ questions) -> сума питань з типом question
 * - .syh-stat-prayers (🙏 prayers) -> сума молитов з типом prayer
 * - .syh-stat-del (🗑️ кнопка очищення коментарів цієї категорії)
 */
export function renderStudioHeaderCounters(
    parentContainer: HTMLElement,
    channelKey: ChannelKey,
    sheetStatsMap: Record<string, SheetHeaderStats | number>
): HTMLElement {
    let targetParent = parentContainer;
    let commentSpan: HTMLElement | null = null;

    if (parentContainer.id === 'comment-header') {
        commentSpan = parentContainer.querySelector<HTMLElement>('span.ytcp-comments-section, span');
    } else if (parentContainer.tagName === 'SPAN') {
        commentSpan = parentContainer;
        if (parentContainer.parentElement) {
            targetParent = parentContainer.parentElement;
        }
    } else {
        commentSpan = parentContainer.querySelector<HTMLElement>('#comment-header span.ytcp-comments-section, span.ytcp-comments-section');
        if (commentSpan && commentSpan.parentElement) {
            targetParent = commentSpan.parentElement;
        }
    }

    let wrapper = targetParent.querySelector<HTMLElement>('.syh-header-counters-wrapper');

    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'syh-header-counters-wrapper';

        if (commentSpan && commentSpan.nextSibling) {
            commentSpan.parentNode?.insertBefore(wrapper, commentSpan.nextSibling);
        } else if (commentSpan) {
            commentSpan.parentNode?.appendChild(wrapper);
        } else {
            targetParent.appendChild(wrapper);
        }
    }

    if (channelKey === 'unknown') {
        wrapper.innerHTML = `<span class="syh-header-counter-badge syh-header-counter-unknown">Канал не розпізнано</span>`;
        return wrapper;
    }

    const targetSheets = getSheetsForChannel(channelKey);
    let html = '';

    targetSheets.forEach((sheetId) => {
        const rawLabel = SHEET_LABELS[sheetId] || sheetId;
        const formattedLabel = formatCategoryLabel(rawLabel);
        const rawStat = sheetStatsMap[sheetId];

        let questions = 0;
        let prayers = 0;

        if (typeof rawStat === 'object' && rawStat !== null) {
            questions = rawStat.questions || 0;
            prayers = rawStat.prayers || 0;
        } else if (typeof rawStat === 'number') {
            questions = rawStat;
        }

        const total = questions + prayers;
        const isPreach = sheetId.includes('preach') || sheetId.includes('oparin');
        const preachClass = isPreach ? ' syh-header-badge-preach' : '';

        html += `
            <span class="syh-header-counter-badge${preachClass}" data-sheet-id="${sheetId}">
                <span class="syh-header-sheet-label">${formattedLabel}</span>
                <span class="syh-header-stat-item syh-stat-total" title="Всього коментарів з YouTube (Людей)">👥 <b class="syh-counter-num-total">${total}</b></span>
                <span class="syh-header-stat-divider">│</span>
                <span class="syh-header-stat-item syh-stat-questions" title="Питання з YouTube">❓ <b class="syh-counter-num-q">${questions}</b></span>
                <span class="syh-header-stat-item syh-stat-prayers" title="Молитви з YouTube">🙏 <b class="syh-counter-num-p">${prayers}</b></span>
                <span class="syh-header-stat-item syh-stat-del" title="Видалити зібрані коментарі з YouTube для цієї категорії">🗑️</span>
            </span>
        `.trim();
    });

    wrapper.innerHTML = html;

    // Attach click handlers on each badge & delete button
    wrapper.querySelectorAll<HTMLElement>('.syh-header-counter-badge').forEach((badgeEl) => {
        const delBtn = badgeEl.querySelector<HTMLElement>('.syh-stat-del');
        if (delBtn) {
            delBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const sId = badgeEl.dataset.sheetId;
                if (sId) {
                    if (confirm("Очистити всі зібрані коментарі з YouTube для цієї категорії?")) {
                        CommentService.clearAllCollectedForSheet(sId);
                    }
                }
            });
        }

        badgeEl.style.cursor = 'pointer';
        badgeEl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const sId = badgeEl.dataset.sheetId;
            if (sId) {
                SYH_STORAGE.set({
                    [STORAGE_KEYS.POPUP_ACTIVE_TAB]: 'tab-telegram',
                    [STORAGE_KEYS.POPUP_ACTIVE_SUBTAB]: sId
                }, () => {
                    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                        try {
                            chrome.runtime.sendMessage({ action: 'OPEN_SHEET_POPUP', sheetId: sId });
                        } catch {
                            // Context or API error safely ignored
                        }
                    }
                });
            }
        });
    });

    return wrapper;
}
