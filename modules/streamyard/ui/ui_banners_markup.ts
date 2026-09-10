/**
 * StreamYard Helper — HTML-шаблони панелі керування банерами.
 *
 * Виділено з `ui_banners.ts`, щоб логіка фільтрації/візуалу та «сирий» розмітковий
 * код жили окремо. Функції повертають готові HTML-рядки, які вставляються через
 * `insertAdjacentHTML`; залежать лише від незмінного на момент вставки `SYH_UI_STATE`.
 */

import { escapeAttr } from '../../dom/escape_html';
import { SYH_UI_STATE } from './ui_state';

/** Керуючі кнопки в шапці списку банерів (створити/вибрати все/видалити). */
export function buildHeaderControlsHTML(): string {
    return `
        <div class="syh-banner-header-controls" style="display: flex; gap: 8px; align-items: center; margin-left: auto;">
            <button class="syh-button" data-action="create-from-text" title="Створити банери з тексту" aria-label="Створити банери з тексту" style="font-size: 13px; height: 26px;">📝</button>
            <label class="syh-master-checkbox-label" title="Вибрати все / Зняти все" style="display: inline-flex; align-items: center; cursor: pointer;">
                <input type="checkbox" class="syh-master-checkbox" aria-label="Вибрати все або зняти все">
            </label>
            <button class="syh-button syh-delete-selected-banners" data-action="delete-selected-banners" title="Видалити вибрані" aria-label="Видалити вибрані банери" style="font-size: 13px; height: 26px;">🗑️</button>
        </div>
    `;
}

/** Контейнер пошуку + вкладки фільтрів категорій банерів. */
export function buildSearchFilterContainerHTML(): string {
    const query = SYH_UI_STATE.bannerSearchQuery || '';
    const activeFilter = SYH_UI_STATE.bannerActiveFilter || 'all';

    return `
        <div id="syh-banner-search-container" style="padding: 10px 15px 5px 15px; display: flex; flex-direction: column; gap: 8px; border-bottom: 1px solid #eee; background: #fff; width: 100%; box-sizing: border-box;">
            <div class="syh-banner-search-wrapper">
                <input type="text" id="syh-banner-search" value="${escapeAttr(query)}" placeholder="🔍 Пошук банерів..." aria-label="Пошук банерів" style="flex: 1; padding: 6px 28px 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; outline: none; transition: 0.2s;">
                <button id="syh-clear-banner-search-btn" class="syh-clear-banner-search" style="display: ${query ? 'flex' : 'none'};" title="Очистити пошук" aria-label="Очистити пошук банерів">✕</button>
                <button id="syh-scroll-to-active-banner-btn" class="syh-button" style="padding: 0; height: 29px; width: 29px; display: flex; align-items: center; justify-content: center; background: #e3f2fd; border: 1px solid #90caf9; border-radius: 4px; cursor: pointer; font-size: 14px; flex-shrink: 0;" title="Повернутися до активного банера на екрані" aria-label="Повернутися до активного банера на екрані">🎯</button>
            </div>

            <div role="tablist" aria-label="Фільтри категорій банерів" style="display: flex; gap: 4px; background: #eee; padding: 3px; border-radius: 6px; width: 100%; box-sizing: border-box;">
                <button role="tab" aria-selected="${activeFilter === 'all' ? 'true' : 'false'}" aria-label="Показати всі банери" class="syh-banner-filter-btn ${activeFilter === 'all' ? 'active' : ''}" data-filter="all" id="syh-banner-filter-all">
                    <span>⭐</span><span class="tab-text">Всі</span><span class="tab-count"></span>
                </button>
                <button role="tab" aria-selected="${activeFilter === 'stream' ? 'true' : 'false'}" aria-label="Показати банери ефіру" class="syh-banner-filter-btn ${activeFilter === 'stream' ? 'active' : ''}" data-filter="stream" id="syh-banner-filter-stream">
                    <span>🎙️</span><span class="tab-text">Ефір</span><span class="tab-count"></span>
                </button>
                <button role="tab" aria-selected="${activeFilter === 'audience' ? 'true' : 'false'}" aria-label="Показати банери глядачів" class="syh-banner-filter-btn ${activeFilter === 'audience' ? 'active' : ''}" data-filter="audience" id="syh-banner-filter-audience">
                    <span>❓</span><span class="tab-text">Глядачі</span><span class="tab-count"></span>
                </button>
                <button role="tab" aria-selected="${activeFilter === 'prayer' ? 'true' : 'false'}" aria-label="Показати молитовні банери" class="syh-banner-filter-btn ${activeFilter === 'prayer' ? 'active' : ''}" data-filter="prayer" id="syh-banner-filter-prayer">
                    <span>🙏</span><span class="tab-text">Молитви</span><span class="tab-count"></span>
                </button>
            </div>
        </div>
    `;
}

/** Повідомлення про порожній результат фільтрації (вставляється після списку). */
export function buildEmptyStateHTML(): string {
    return `
        <div id="syh-banner-empty-state-msg" class="syh-banner-empty-state">
            <div id="syh-banner-empty-query"></div>
            <div id="syh-banner-empty-suggestion" style="margin-top: 10px; font-size: 12px; color: #f39c12; font-weight: bold; display:none;"></div>
        </div>
    `;
}
