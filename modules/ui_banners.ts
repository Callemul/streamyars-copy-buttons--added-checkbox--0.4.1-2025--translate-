import { SYH_UI } from './ui_core';
import { SYH_CONFIG } from './config';
import { SYH_UTILS } from './utils';
import { SYH_STATE } from './state';
import { SYH_EVENT_BANNERS } from './event_banners';

export function addButtonsToBanner(bannerNode: Element): void {
    const selectors = SYH_UI.SELECTORS || SYH_CONFIG.SELECTORS;
    const bannerWrap = bannerNode.querySelector(selectors.bannerWrap);
    if (bannerWrap && !bannerWrap.querySelector('.syh-banner-controls')) {
        const buttonsHTML = `
            <div class="syh-banner-controls">
                <button class="syh-button" data-type="banner" data-action="copy-banner" title="Копіювати текст банера" aria-label="Копіювати текст банера">📋</button>
                <button class="syh-button" data-type="banner" data-action="mark-stream" title="Відмітити як Питання ефіру" aria-label="Відмітити як Питання ефіру">📺</button>
                <button class="syh-button" data-type="banner" data-action="mark-audience" title="Відмітити як Питання глядачів" aria-label="Відмітити як Питання глядачів">❓</button>
                <button class="syh-button" data-type="banner" data-action="mark-prayer" title="Відмітити як Молитовне" aria-label="Відмітити як Молитовне">🙏</button>
                <div class="syh-checkbox-container">
                    <input type="checkbox" class="syh-checkbox" data-type="banner" title="Відмітити як опрацьоване" aria-label="Відмітити банер як опрацьований">
                </div>
            </div>`;
        bannerWrap.insertAdjacentHTML('beforeend', buttonsHTML);
        const bannerText = bannerNode.querySelector(selectors.bannerText)?.textContent || '';
        
        const state = SYH_UI.STATE || SYH_STATE;
        if (state && typeof state.getState === 'function' && state.getState(bannerText)) {
            const checkbox = bannerWrap.querySelector<HTMLInputElement>('.syh-checkbox');
            if (checkbox) checkbox.checked = true;
        }

        applySavedBannerLabels(bannerWrap, bannerText);
    }
}

export function updateBannerVisuals(bannerBlock: Element, type: string): void {
    if (type === 'stream' || type === 'audience' || type === 'prayer') {
        bannerBlock.setAttribute('data-syh-banner-type', type);
    } else {
        bannerBlock.removeAttribute('data-syh-banner-type');
    }
}

export function applySavedBannerLabels(bannerNode: Element, text: string): void {
    if (!text || !text.trim()) return;
    const type = SYH_UI.bannerCategoriesCache[text] || 'none';
    updateBannerVisuals(bannerNode, type);
}

export function addBannerHeaderControls(headerNode: Element): void {
    const bannerListSelector = '[class*="BannerList__ListWrap"], ul[class*="Banner"]';
    const bannerList = document.querySelector(bannerListSelector);

    if (headerNode && !headerNode.querySelector('.syh-banner-header-controls')) {
        const controlsHTML = `
            <div class="syh-banner-header-controls" style="display: flex; gap: 8px; align-items: center; margin-left: auto;">
                <button class="syh-button" data-action="create-from-text" title="Створити банери з тексту" aria-label="Створити банери з тексту" style="font-size: 13px; height: 26px;">📝</button>
                <label class="syh-master-checkbox-label" title="Вибрати все / Зняти все" style="display: inline-flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" class="syh-master-checkbox" aria-label="Вибрати все або зняти все">
                </label>
                <button class="syh-button syh-delete-selected-banners" data-action="delete-selected-banners" title="Видалити вибрані" aria-label="Видалити вибрані банери" style="font-size: 13px; height: 26px;">🗑️</button>
            </div>
        `;
        headerNode.insertAdjacentHTML('beforeend', controlsHTML);
        updateMasterCheckboxState();
    }

    if (bannerList && !document.getElementById('syh-banner-search-container')) {
        const searchContainerHTML = `
            <div id="syh-banner-search-container" style="padding: 10px 15px 5px 15px; display: flex; flex-direction: column; gap: 8px; border-bottom: 1px solid #eee; background: #fff; width: 100%; box-sizing: border-box;">
                <div class="syh-banner-search-wrapper">
                    <input type="text" id="syh-banner-search" value="${SYH_UI.bannerSearchQuery || ''}" placeholder="🔍 Пошук банерів..." aria-label="Пошук банерів" style="flex: 1; padding: 6px 28px 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; outline: none; transition: 0.2s;">
                    <button id="syh-clear-banner-search-btn" class="syh-clear-banner-search" style="display: ${SYH_UI.bannerSearchQuery ? 'flex' : 'none'};" title="Очистити пошук" aria-label="Очистити пошук банерів">✕</button>
                    <button id="syh-scroll-to-active-banner-btn" class="syh-button" style="padding: 0; height: 29px; width: 29px; display: flex; align-items: center; justify-content: center; background: #e3f2fd; border: 1px solid #90caf9; border-radius: 4px; cursor: pointer; font-size: 14px; flex-shrink: 0;" title="Повернутися до активного банера на екрані" aria-label="Повернутися до активного банера на екрані">🎯</button>
                </div>
                
                <div role="tablist" aria-label="Фільтри категорій банерів" style="display: flex; gap: 4px; background: #eee; padding: 3px; border-radius: 6px; width: 100%; box-sizing: border-box;">
                    <button role="tab" aria-selected="${SYH_UI.bannerActiveFilter === 'all' ? 'true' : 'false'}" aria-label="Показати всі банери" class="syh-banner-filter-btn ${SYH_UI.bannerActiveFilter === 'all' ? 'active' : ''}" data-filter="all" id="syh-banner-filter-all">
                        <span>⭐</span><span class="tab-text">Всі</span><span class="tab-count"></span>
                    </button>
                    <button role="tab" aria-selected="${SYH_UI.bannerActiveFilter === 'stream' ? 'true' : 'false'}" aria-label="Показати банери ефіру" class="syh-banner-filter-btn ${SYH_UI.bannerActiveFilter === 'stream' ? 'active' : ''}" data-filter="stream" id="syh-banner-filter-stream">
                        <span>🎙️</span><span class="tab-text">Ефір</span><span class="tab-count"></span>
                    </button>
                    <button role="tab" aria-selected="${SYH_UI.bannerActiveFilter === 'audience' ? 'true' : 'false'}" aria-label="Показати банери глядачів" class="syh-banner-filter-btn ${SYH_UI.bannerActiveFilter === 'audience' ? 'active' : ''}" data-filter="audience" id="syh-banner-filter-audience">
                        <span>❓</span><span class="tab-text">Глядачі</span><span class="tab-count"></span>
                    </button>
                    <button role="tab" aria-selected="${SYH_UI.bannerActiveFilter === 'prayer' ? 'true' : 'false'}" aria-label="Показати молитовні банери" class="syh-banner-filter-btn ${SYH_UI.bannerActiveFilter === 'prayer' ? 'active' : ''}" data-filter="prayer" id="syh-banner-filter-prayer">
                        <span>🙏</span><span class="tab-text">Молитви</span><span class="tab-count"></span>
                    </button>
                </div>
            </div>
        `;
        
        bannerList.insertAdjacentHTML('beforebegin', searchContainerHTML);

        if (!document.getElementById('syh-banner-empty-state-msg')) {
            bannerList.insertAdjacentHTML('afterend', `
                <div id="syh-banner-empty-state-msg" class="syh-banner-empty-state">
                    <div id="syh-banner-empty-query"></div>
                    <div id="syh-banner-empty-suggestion" style="margin-top: 10px; font-size: 12px; color: #f39c12; font-weight: bold; display:none;"></div>
                </div>
            `);
        }

        if (SYH_EVENT_BANNERS && typeof SYH_EVENT_BANNERS.bindBannersFilterControls === 'function') {
            SYH_EVENT_BANNERS.bindBannersFilterControls();
        }
        setTimeout(() => filterBanners(), 10);
    }
}

export function updateMasterCheckboxState(): void {
    const selectors = SYH_UI.SELECTORS || SYH_CONFIG.SELECTORS;
    const masterCheckbox = document.querySelector<HTMLInputElement>('.syh-master-checkbox');
    if (!masterCheckbox) return;

    const bannerBlocks = document.querySelectorAll(selectors.bannerBlock);
    const allBannerCheckboxes: HTMLInputElement[] = [];
    bannerBlocks.forEach(block => {
        const cb = block.querySelector<HTMLInputElement>('.syh-checkbox[data-type="banner"]');
        if (cb) allBannerCheckboxes.push(cb);
    });

    const total = allBannerCheckboxes.length;
    if (total === 0) {
        masterCheckbox.checked = false;
        masterCheckbox.indeterminate = false;
        return;
    }

    const checkedCount = allBannerCheckboxes.filter(cb => cb.checked).length;
    if (checkedCount === 0) {
        masterCheckbox.checked = false;
        masterCheckbox.indeterminate = false;
    } else if (checkedCount === total) {
        masterCheckbox.checked = true;
        masterCheckbox.indeterminate = false;
    } else {
        masterCheckbox.checked = false;
        masterCheckbox.indeterminate = true;
    }
}

export function filterBanners(): void {
    const selectors = SYH_UI.SELECTORS || SYH_CONFIG.SELECTORS;
    const bannerListSelector = '[class*="BannerList__ListWrap"], ul[class*="Banner"]';
    const bannerList = document.querySelector<HTMLElement>(bannerListSelector);
    if (!bannerList) return;

    const activeFilter = SYH_UI.bannerActiveFilter || 'all';
    const searchQuery = SYH_UI.bannerSearchQuery || '';

    const safeTextUpdate = (selector: string, newText: string) => {
        const el = document.querySelector(selector);
        if (el && el.textContent !== newText) el.textContent = newText;
    };
    const safeHtmlUpdate = (el: Element | null, newHtml: string) => {
        if (el && el.innerHTML !== newHtml) el.innerHTML = newHtml;
    };

    let visibleCount = 0;
    let countAbsolute = { all: 0, stream: 0, audience: 0, prayer: 0 };
    let countSearch = { all: 0, stream: 0, audience: 0, prayer: 0 };

    Array.from(bannerList.children).forEach(liChild => {
        const li = liChild as HTMLElement;
        const bannerWrap = li.querySelector(selectors.bannerWrap);
        if (!bannerWrap) return;

        const originalText = bannerWrap.querySelector(selectors.bannerText)?.textContent || '';
        const commentType = SYH_UI.bannerCategoriesCache[originalText] || 'none';
        
        updateBannerVisuals(bannerWrap, commentType);
        
        countAbsolute.all++;
        if (commentType === 'stream') countAbsolute.stream++;
        else if (commentType === 'audience') countAbsolute.audience++;
        else if (commentType === 'prayer') countAbsolute.prayer++;

        let matchesSearch = true;
        if (searchQuery) {
            matchesSearch = SYH_UTILS.smartSearch(searchQuery, originalText);
        }

        if (matchesSearch) {
            countSearch.all++;
            if (commentType === 'stream') countSearch.stream++;
            else if (commentType === 'audience') countSearch.audience++;
            else if (commentType === 'prayer') countSearch.prayer++;
        }

        let isVisible = matchesSearch;

        if (activeFilter === 'stream' && commentType !== 'stream') isVisible = false;
        if (activeFilter === 'audience' && commentType !== 'audience') isVisible = false;
        if (activeFilter === 'prayer' && commentType !== 'prayer') isVisible = false;

        if (isVisible) {
            if (li.style.display === 'none') li.style.display = '';
            visibleCount++;
        } else {
            if (li.style.display !== 'none') li.style.display = 'none';
        }
    });

    safeTextUpdate('#syh-banner-filter-all .tab-count', ` (${countAbsolute.all})`);
    safeTextUpdate('#syh-banner-filter-stream .tab-count', ` (${countAbsolute.stream})`);
    safeTextUpdate('#syh-banner-filter-audience .tab-count', ` (${countAbsolute.audience})`);
    safeTextUpdate('#syh-banner-filter-prayer .tab-count', ` (${countAbsolute.prayer})`);

    const emptyState = document.querySelector<HTMLElement>('#syh-banner-empty-state-msg');
    const emptyQuery = document.querySelector('#syh-banner-empty-query');
    
    let emptySuggestion = document.querySelector<HTMLElement>('#syh-banner-empty-suggestion');
    if (!emptySuggestion && emptyState) {
        emptyState.insertAdjacentHTML('beforeend', `<div id="syh-banner-empty-suggestion" style="margin-top: 10px; font-size: 12px; color: #f39c12; font-weight: bold; display:none;"></div>`);
        emptySuggestion = document.querySelector<HTMLElement>('#syh-banner-empty-suggestion');
    }

    if (visibleCount === 0) {
        let messageHTML: string;
        if (searchQuery) {
            messageHTML = `Нічого не знайдено за запитом: <b style="color: #e74c3c;">"${searchQuery}"</b><br><br>
            <a href="#" id="syh-banner-empty-clear-link" style="color: #005DF7; text-decoration: none; font-weight: bold; background: #e3f2fd; padding: 5px 10px; border-radius: 4px;">Скинути пошук ✕</a>`;
            
            let suggestions: string[] = [];
            if (activeFilter !== 'all' && countSearch.all > 0) {
                if (countSearch.stream > 0 && activeFilter !== 'stream') suggestions.push(`<a href="#" class="syh-switch-banner-tab" data-filter="stream" style="color: #f39c12; text-decoration: underline;">🎙️ Ефір (${countSearch.stream})</a>`);
                if (countSearch.audience > 0 && activeFilter !== 'audience') suggestions.push(`<a href="#" class="syh-switch-banner-tab" data-filter="audience" style="color: #f39c12; text-decoration: underline;">❓ Глядачі (${countSearch.audience})</a>`);
                if (countSearch.prayer > 0 && activeFilter !== 'prayer') suggestions.push(`<a href="#" class="syh-switch-banner-tab" data-filter="prayer" style="color: #f39c12; text-decoration: underline;">🙏 Молитви (${countSearch.prayer})</a>`);
            }

            if (suggestions.length > 0) {
                safeHtmlUpdate(emptySuggestion, `Знайдено в інших категоріях: ` + suggestions.join(', '));
                if (emptySuggestion && emptySuggestion.style.display === 'none') emptySuggestion.style.display = 'block';
                
                document.querySelectorAll('.syh-switch-banner-tab').forEach(el => {
                    (el as HTMLElement).onclick = function(e) {
                        e.preventDefault();
                        const filter = (this as HTMLElement).dataset.filter;
                        const btn = document.querySelector<HTMLElement>(`.syh-banner-filter-btn[data-filter="${filter}"]`);
                        if (btn) btn.click();
                    };
                });
            } else {
                if (emptySuggestion && emptySuggestion.style.display !== 'none') emptySuggestion.style.display = 'none';
            }
        } else {
            if (emptySuggestion && emptySuggestion.style.display !== 'none') emptySuggestion.style.display = 'none';
            const filterNames: Record<string, string> = { 
                'all': 'списку банерів', 
                'stream': 'категорії "🎙️ Питання ефіру"', 
                'audience': 'категорії "❓ Питання глядачів"', 
                'prayer': 'категорії "🙏 Молитовні"' 
            };
            messageHTML = `<span style="color: #777;">Тут ще немає банерів для ${filterNames[activeFilter] || 'списку'}</span>`;
        }

        safeHtmlUpdate(emptyQuery, messageHTML);
        if (emptyState && emptyState.style.display === 'none') emptyState.style.display = 'block';
    } else {
        if (emptyState && emptyState.style.display !== 'none') emptyState.style.display = 'none';
        if (emptySuggestion && emptySuggestion.style.display !== 'none') emptySuggestion.style.display = 'none';
    }
}

export function scrollToActiveBanner(): void {
    const bannerListSelector = '[class*="BannerList__ListWrap"], ul[class*="Banner"]';
    const bannerList = document.querySelector(bannerListSelector);
    if (bannerList) {
        const activeLi = Array.from(bannerList.children).find(child => child.querySelector('.lucide-circle-minus')) as HTMLElement | undefined;
        if (activeLi) {
            const rect = activeLi.getBoundingClientRect();
            const scrollParent = activeLi.closest('div[class*="Scroll"]');
            if (scrollParent) {
                const parentRect = scrollParent.getBoundingClientRect();
                const isVisible = (rect.top >= parentRect.top && rect.bottom <= parentRect.bottom);
                if (!isVisible) {
                    activeLi.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else {
                activeLi.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
}
