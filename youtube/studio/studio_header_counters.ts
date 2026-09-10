// youtube/studio/studio_header_counters.ts
//
// Оркестратор баджів лічильників у шапці YouTube Studio.
//
// Рефакторинг (Fallow health): раніше `renderStudioHeaderCounters` була
// монолітом на 103 рядки — найбільшою production-функцією проєкту. Тепер вона
// лише склеює три кроки, а деталі живуть у сусідніх модулях:
//   - `studio_header_badge_markup.ts` — чиста побудова HTML і нормалізація статистики;
//   - `studio_header_dom.ts`          — точка вставки, контейнер, обробники подій.
// Поведінка збережена 1-в-1 (див. tests/studio_header_counters.test.js).
//
// AI SEARCH KEYWORDS / КЛЮЧОВІ СЛОВА ДЛЯ ШІ:
// - "бадж", "баджі", "бадже", "лічильник", "коментар", "Молчанов СШ",
//   "Молчанов проповеди", "Время перемен СШ", "Опарин"
// - "syh-header-counter-badge", "syh-stat-total", "syh-counter-num-total",
//   "syh-header-stat-divider", "renderStudioHeaderCounters"
//
// HTML BADGE STRUCTURE / СТРУКТУРА БАДЖА:
// [Категорія] | 👥 [Всього люд.] │ ❓ [Питань] 🙏 [Молитов] 🗑️
// - .syh-header-sheet-label (Назва: Молчанов СШ / проповеди / Время перемен СШ)
// - .syh-stat-total (👥 total = questions + prayers) -> відповідає кількості людей у Попапі
// - .syh-header-stat-divider (│ роздільник)
// - .syh-stat-questions (❓ questions) -> сума питань з типом question
// - .syh-stat-prayers (🙏 prayers) -> сума молитов з типом prayer
// - .syh-stat-del (🗑️ кнопка очищення коментарів цієї категорії)

import type { ChannelKey } from '../../modules/registry/channel_config';
import {
    buildCountersHtml,
    buildUnknownChannelHtml,
    type SheetHeaderStats
} from './studio_header_badge_markup';
import { resolveHeaderTargets, ensureCountersWrapper, attachBadgeHandlers } from './studio_header_dom';

export { getSheetsForChannel, formatCategoryLabel } from './studio_header_badge_markup';
export type { SheetHeaderStats } from './studio_header_badge_markup';

/**
 * Renders or updates the sticky counter badges directly next to "Коментар" span
 * inside #comment-header in YouTube Studio.
 */
export function renderStudioHeaderCounters(
    parentContainer: HTMLElement,
    channelKey: ChannelKey,
    sheetStatsMap: Record<string, SheetHeaderStats | number>
): HTMLElement {
    const wrapper = ensureCountersWrapper(resolveHeaderTargets(parentContainer));

    // Нерозпізнаний канал: показуємо плейсхолдер і НЕ навішуємо обробники —
    // цей бадж не клікабельний і не отримує cursor:pointer.
    if (channelKey === 'unknown') {
        wrapper.innerHTML = buildUnknownChannelHtml();
        return wrapper;
    }

    wrapper.innerHTML = buildCountersHtml(channelKey, sheetStatsMap);
    attachBadgeHandlers(wrapper);

    return wrapper;
}
