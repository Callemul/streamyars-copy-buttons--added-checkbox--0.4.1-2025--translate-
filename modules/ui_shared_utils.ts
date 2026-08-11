/**
 * StreamYard Helper — Shared UI Utilities (фасад-бочка).
 *
 * Раніше — «шухляда» на 171 рядок (cyclomatic 51, fan-in 7), у якій поряд жили
 * чотири незв'язані відповідальності. Реалізацію розділено:
 *   - `./ui_dom_updates`     — ліниві оновлення тексту/розмітки та лічильників;
 *   - `./ui_scroll_utils`    — скрол до активного елемента списку;
 *   - `./ui_checkbox_utils`  — master-чекбокс і відновлення галочок із кешу;
 *   - `./ui_filter_controls` — вкладки фільтра, пошук і делегований клік.
 *
 * Цей модуль лишається єдиною точкою імпорту для `ui_banners_*`, `ui_comments_*`,
 * `ui_facade` та `ui_starred_controls`, тому публічний контракт збережено 1-в-1.
 */

export { safeTextUpdate, safeHtmlUpdate, updateTabCounts } from './ui_dom_updates';

export { scrollToActiveItem, scrollToActiveComment } from './ui_scroll_utils';

export { updateMasterCheckboxFromElements, restoreCheckboxFromCache } from './ui_checkbox_utils';

export {
    updateFilterTabSelection,
    bindFilterSearchControls,
    bindFilterDocClickHandler,
    type FilterSearchControlsConfig,
    type FilterDocClickConfig
} from './ui_filter_controls';
