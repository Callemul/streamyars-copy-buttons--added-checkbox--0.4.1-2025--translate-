// youtube/studio/studio_header_badge_markup.ts
//
// Чиста генерація розмітки баджів лічильників у шапці YouTube Studio.
// Виділено з `studio_header_counters.ts`, де `renderStudioHeaderCounters`
// займала 103 рядки (найбільша production-функція за звітом Fallow health).
//
// Тут НЕМАЄ доступу до DOM-дерева сторінки та побічних ефектів: лише
// нормалізація статистики та побудова HTML-рядка. Це робить правила
// форматування тестованими окремо від вставки у сторінку.

import { SHEET_LABELS, SHEET_IDS, type SheetId } from '../../modules/registry/sheets';
import type { ChannelKey } from '../../modules/registry/channel_config';

export interface SheetHeaderStats {
    questions: number;
    prayers: number;
}

/** Нормалізована статистика одного аркуша, готова до відображення. */
interface NormalizedSheetStats {
    questions: number;
    prayers: number;
    total: number;
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
 * Приводить сире значення зі `sheetStatsMap` до канонічної форми.
 * Підтримує історичний числовий формат (число = кількість питань).
 */
function normalizeSheetStats(rawStat: SheetHeaderStats | number | undefined | null): NormalizedSheetStats {
    let questions = 0;
    let prayers = 0;

    if (typeof rawStat === 'object' && rawStat !== null) {
        questions = rawStat.questions || 0;
        prayers = rawStat.prayers || 0;
    } else if (typeof rawStat === 'number') {
        questions = rawStat;
    }

    return { questions, prayers, total: questions + prayers };
}

/** Проповідницькі аркуші отримують окремий модифікатор кольору. */
function isPreachSheet(sheetId: string): boolean {
    return sheetId.includes('preach') || sheetId.includes('oparin');
}

/**
 * Розмітка одного баджа.
 *
 * HTML BADGE STRUCTURE / СТРУКТУРА БАДЖА:
 * [Категорія] | 👥 [Всього люд.] │ ❓ [Питань] 🙏 [Молитов] 🗑️
 */
function buildSheetBadgeHtml(sheetId: SheetId, rawStat: SheetHeaderStats | number | undefined): string {
    const formattedLabel = formatCategoryLabel(SHEET_LABELS[sheetId] || sheetId);
    const { questions, prayers, total } = normalizeSheetStats(rawStat);
    const preachClass = isPreachSheet(sheetId) ? ' syh-header-badge-preach' : '';

    return `
            <span class="syh-header-counter-badge${preachClass}" data-sheet-id="${sheetId}">
                <span class="syh-header-sheet-label">${formattedLabel}</span>
                <span class="syh-header-stat-item syh-stat-total" title="Всього коментарів з YouTube (Людей)">👥 <b class="syh-counter-num-total">${total}</b></span>
                <span class="syh-header-stat-divider">│</span>
                <span class="syh-header-stat-item syh-stat-questions" title="Питання з YouTube">❓ <b class="syh-counter-num-q">${questions}</b></span>
                <span class="syh-header-stat-item syh-stat-prayers" title="Молитви з YouTube">🙏 <b class="syh-counter-num-p">${prayers}</b></span>
                <span class="syh-header-stat-item syh-stat-del" title="Видалити зібрані коментарі з YouTube для цієї категорії">🗑️</span>
            </span>
        `.trim();
}

/** Розмітка для нерозпізнаного каналу. */
export function buildUnknownChannelHtml(): string {
    return `<span class="syh-header-counter-badge syh-header-counter-unknown">Канал не розпізнано</span>`;
}

/** Повна внутрішня розмітка контейнера лічильників для каналу. */
export function buildCountersHtml(
    channelKey: ChannelKey,
    sheetStatsMap: Record<string, SheetHeaderStats | number>
): string {
    if (channelKey === 'unknown') {
        return buildUnknownChannelHtml();
    }

    return getSheetsForChannel(channelKey)
        .map((sheetId) => buildSheetBadgeHtml(sheetId, sheetStatsMap[sheetId]))
        .join('');
}
