// modules/ui_starred_markup.ts
//
// Чиста (без побічних ефектів і без доступу до DOM) розмітка контролів вкладки
// «Starred». Винесено з `ui_starred_controls.addStarredTabControls`, яка була
// найскладнішою функцією проєкту за когнітивною складністю (cyc=15, cog=26):
// один шаблонний рядок містив 8 тернарних операторів, по два на кожну з
// чотирьох вкладок фільтра.
//
// Розмітка збережена БАЙТ-У-БАЙТ. Зокрема свідомо відтворені «дивацтва»
// оригіналу, які зафіксовані golden-тестами
// (tests/ui_comments_starred_controls.test.js):
//   - неактивна вкладка має class="syh-filter-btn " із ХВОСТОВИМ пробілом;
//   - вкладка "other" завжди рендериться з style="display: none;";
//   - між блоком пошуку та tablist є рядок із 16 пробілів.

import { escapeAttr } from '../../dom/escape_html';

interface FilterTabSpec {
    /** Значення data-filter та суфікс id="syh-comment-filter-…". */
    key: string;
    ariaLabel: string;
    icon: string;
    label: string;
    /** Додаткові атрибути перед `>` (лише вкладка "other" має inline-style). */
    extraAttrs: string;
}

/** Порядок вкладок фіксований і перевіряється тестом №9. */
const FILTER_TABS: readonly FilterTabSpec[] = [
    { key: 'all', ariaLabel: 'Показати всі коментарі', icon: '⭐', label: 'Всі', extraAttrs: '' },
    { key: 'question', ariaLabel: 'Показати питання', icon: '❓', label: 'Питання', extraAttrs: '' },
    { key: 'prayer', ariaLabel: 'Показати молитви', icon: '🙏', label: 'Молитви', extraAttrs: '' },
    { key: 'other', ariaLabel: 'Показати інші коментарі', icon: '📝', label: 'Інші', extraAttrs: ' style="display: none;"' }
];

/**
 * Один таб фільтра. Повертає рядок із тим самим відступом (20 пробілів),
 * що й в оригінальному шаблоні.
 */
function buildFilterTab(tab: FilterTabSpec, activeFilter: string): string {
    const isActive = activeFilter === tab.key;
    // ВАЖЛИВО: `syh-filter-btn ` + порожній рядок дає хвостовий пробіл — це
    // зафіксована характеристика оригіналу, а не помилка форматування.
    const activeClass = isActive ? 'active' : '';
    return `                    <button role="tab" aria-selected="${isActive ? 'true' : 'false'}" aria-label="${tab.ariaLabel}" class="syh-filter-btn ${activeClass}" data-filter="${tab.key}" id="syh-comment-filter-${tab.key}"${tab.extraAttrs}>
                        <span>${tab.icon}</span><span class="tab-text">${tab.label}</span><span class="tab-count"></span>
                    </button>`;
}

/**
 * Повна розмітка контролів вкладки «Starred».
 *
 * @param activeFilter поточний фільтр ('all' | 'question' | 'prayer' | 'other')
 * @param searchQuery  поточний пошуковий запит (потрапляє у value інпута)
 */
export function buildStarredControlsMarkup(activeFilter: string, searchQuery: string): string {
    const tabsHtml = FILTER_TABS
        .map(tab => buildFilterTab(tab, activeFilter))
        .join('\n');

    return `
            <div class="syh-starred-controls" style="margin-top: 10px; width: 100%; display: flex; flex-direction: column; gap: 8px;">
                <div class="syh-search-wrapper">
                    <input type="text" id="syh-starred-search" value="${escapeAttr(searchQuery)}" placeholder="🔍 Пошук по імені або тексту..." aria-label="Пошук по імені або тексту" style="flex: 1; padding: 6px 28px 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; outline: none; transition: 0.2s;">
                    <button id="syh-clear-search-btn" class="syh-clear-search" style="display: ${searchQuery ? 'flex' : 'none'};" title="Очистити пошук" aria-label="Очистити пошук коментарів">✕</button>
                    <button id="syh-scroll-to-active-btn" class="syh-button" style="padding: 0; height: 29px; width: 29px; display: flex; align-items: center; justify-content: center; background: #e3f2fd; border: 1px solid #90caf9; border-radius: 4px; cursor: pointer; font-size: 14px; flex-shrink: 0;" title="Повернутися до коментаря на екрані" aria-label="Повернутися до коментаря на екрані">🎯</button>
                </div>
                ${''}
                <div role="tablist" aria-label="Фільтри коментарів" style="display: flex; gap: 4px; background: #eee; padding: 3px; border-radius: 6px; width: 100%; box-sizing: border-box;">
${tabsHtml}
                </div>
            </div>
        `;
}

/**
 * Блок порожнього стану, який вставляється одразу після списку Starred.
 * Константа, бо не залежить від стану.
 */
export const STARRED_EMPTY_STATE_MARKUP = `
                    <div id="syh-empty-state-msg" class="syh-empty-state">
                        <div id="syh-empty-query"></div>
                        <div id="syh-empty-suggestion" style="margin-top: 10px; font-size: 12px; color: #f39c12; font-weight: bold; display:none;"></div>
                    </div>
                `;
