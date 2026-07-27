import { SYH_UI } from './ui_core.ts';
import { SYH_CONFIG } from './config.ts';
import { SYH_UTILS } from './utils.ts';

export function addButtonsToBanner(bannerNode: Element | JQuery): void {
    const selectors = SYH_UI.SELECTORS || SYH_CONFIG.SELECTORS;
    const $bannerWrap = $(bannerNode).find(selectors.bannerWrap);
    if ($bannerWrap.length > 0 && !$bannerWrap.find('.syh-banner-controls').length) {
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
        $bannerWrap.append(buttonsHTML);
        const bannerText = $(bannerNode).find(selectors.bannerText).text();
        
        const state = SYH_UI.STATE || (window as any).SYH_STATE;
        if (state && typeof state.getState === 'function' && state.getState(bannerText)) {
            $bannerWrap.find('.syh-checkbox').prop('checked', true);
        }

        applySavedBannerLabels($bannerWrap[0], bannerText);
    }
}

export function updateBannerVisuals($bannerBlock: JQuery, type: string): void {
    if (type === 'stream' || type === 'audience' || type === 'prayer') {
        $bannerBlock.attr('data-syh-banner-type', type);
    } else {
        $bannerBlock.removeAttr('data-syh-banner-type');
    }
}

export function applySavedBannerLabels(bannerNode: Element | JQuery, text: string): void {
    if (!text || !text.trim()) return;
    const type = SYH_UI.bannerCategoriesCache[text] || 'none';
    updateBannerVisuals($(bannerNode), type);
}

export function addBannerHeaderControls(headerNode: Element | JQuery): void {
    const $header = $(headerNode);
    const bannerListSelector = '[class*="BannerList__ListWrap"], ul[class*="Banner"]';
    const $bannerList = $(bannerListSelector);

    if ($header.length > 0 && !$header.find('.syh-banner-header-controls').length) {
        const controlsHTML = `
            <div class="syh-banner-header-controls" style="display: flex; gap: 8px; align-items: center; margin-left: auto;">
                <button class="syh-button" data-action="create-from-text" title="Створити банери з тексту" aria-label="Створити банери з тексту" style="font-size: 13px; height: 26px;">📝</button>
                <label class="syh-master-checkbox-label" title="Вибрати все / Зняти все" style="display: inline-flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" class="syh-master-checkbox" aria-label="Вибрати все або зняти все">
                </label>
                <button class="syh-button syh-delete-selected-banners" data-action="delete-selected-banners" title="Видалити вибрані" aria-label="Видалити вибрані банери" style="font-size: 13px; height: 26px;">🗑️</button>
            </div>
        `;
        $header.append(controlsHTML);
        updateMasterCheckboxState();
    }

    if ($bannerList.length > 0 && !document.getElementById('syh-banner-search-container')) {
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
        
        $bannerList.before(searchContainerHTML);

        if (!$('#syh-banner-empty-state-msg').length) {
            $bannerList.after(`
                <div id="syh-banner-empty-state-msg" class="syh-banner-empty-state">
                    <div id="syh-banner-empty-query"></div>
                    <div id="syh-banner-empty-suggestion" style="margin-top: 10px; font-size: 12px; color: #f39c12; font-weight: bold; display:none;"></div>
                </div>
            `);
        }

        if (typeof (window as any).SYH_EVENT_BANNERS !== 'undefined' && typeof (window as any).SYH_EVENT_BANNERS.bindBannersFilterControls === 'function') {
            (window as any).SYH_EVENT_BANNERS.bindBannersFilterControls();
        }
        setTimeout(() => filterBanners(), 10);
    }
}

export function updateMasterCheckboxState(): void {
    const selectors = SYH_UI.SELECTORS || SYH_CONFIG.SELECTORS;
    const $masterCheckbox = $('.syh-master-checkbox');
    if (!$masterCheckbox.length) return;
    const $allBannerCheckboxes = $(selectors.bannerBlock).find('.syh-checkbox[data-type="banner"]');
    const total = $allBannerCheckboxes.length;
    if (total === 0) {
        $masterCheckbox.prop({ 'checked': false, 'indeterminate': false });
        return;
    }
    const checkedCount = $allBannerCheckboxes.filter(':checked').length;
    if (checkedCount === 0) {
        $masterCheckbox.prop({ 'checked': false, 'indeterminate': false });
    } else if (checkedCount === total) {
        $masterCheckbox.prop({ 'checked': true, 'indeterminate': false });
    } else {
        $masterCheckbox.prop({ 'checked': false, 'indeterminate': true });
    }
}

export function filterBanners(): void {
    const selectors = SYH_UI.SELECTORS || SYH_CONFIG.SELECTORS;
    const bannerListSelector = '[class*="BannerList__ListWrap"], ul[class*="Banner"]';
    const $bannerList = $(bannerListSelector);
    if (!$bannerList.length) return;

    const activeFilter = SYH_UI.bannerActiveFilter || 'all';
    const searchQuery = SYH_UI.bannerSearchQuery || '';

    const safeTextUpdate = (selector: string, newText: string) => {
        const el = $(selector);
        if (el.length && el.text() !== newText) el.text(newText);
    };
    const safeHtmlUpdate = (jqEl: JQuery, newHtml: string) => {
        if (jqEl.length && jqEl.html() !== newHtml) jqEl.html(newHtml);
    };

    let visibleCount = 0;
    let countAbsolute = { all: 0, stream: 0, audience: 0, prayer: 0 };
    let countSearch = { all: 0, stream: 0, audience: 0, prayer: 0 };

    $bannerList.find('> li, > div[class*="Banner__LiWrap"]').each(function() {
        const $li = $(this);
        const $bannerWrap = $li.find(selectors.bannerWrap);
        if (!$bannerWrap.length) return;

        const originalText = $bannerWrap.find(selectors.bannerText).text();
        const commentType = SYH_UI.bannerCategoriesCache[originalText] || 'none';
        
        updateBannerVisuals($bannerWrap, commentType);
        
        countAbsolute.all++;
        if (commentType === 'stream') countAbsolute.stream++;
        else if (commentType === 'audience') countAbsolute.audience++;
        else if (commentType === 'prayer') countAbsolute.prayer++;

        let matchesSearch = true;
        if (searchQuery) {
            matchesSearch = SYH_UTILS && typeof SYH_UTILS.smartSearch === 'function' 
                ? SYH_UTILS.smartSearch(searchQuery, originalText)
                : ((window as any).SYH_UTILS && typeof (window as any).SYH_UTILS.smartSearch === 'function'
                    ? (window as any).SYH_UTILS.smartSearch(searchQuery, originalText)
                    : originalText.toLowerCase().includes(searchQuery.toLowerCase()));
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
            if ($li.css('display') === 'none') $li.show();
            visibleCount++;
        } else {
            if ($li.css('display') !== 'none') $li.hide();
        }
    });

    safeTextUpdate('#syh-banner-filter-all .tab-count', ` (${countAbsolute.all})`);
    safeTextUpdate('#syh-banner-filter-stream .tab-count', ` (${countAbsolute.stream})`);
    safeTextUpdate('#syh-banner-filter-audience .tab-count', ` (${countAbsolute.audience})`);
    safeTextUpdate('#syh-banner-filter-prayer .tab-count', ` (${countAbsolute.prayer})`);

    const $emptyState = $('#syh-banner-empty-state-msg');
    const $emptyQuery = $('#syh-banner-empty-query');
    
    let $emptySuggestion = $('#syh-banner-empty-suggestion');
    if (!$emptySuggestion.length) {
        $emptyState.append(`<div id="syh-banner-empty-suggestion" style="margin-top: 10px; font-size: 12px; color: #f39c12; font-weight: bold; display:none;"></div>`);
        $emptySuggestion = $('#syh-banner-empty-suggestion');
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
                safeHtmlUpdate($emptySuggestion, `Знайдено в інших категоріях: ` + suggestions.join(', '));
                if ($emptySuggestion.css('display') === 'none') $emptySuggestion.show();
                
                $('.syh-switch-banner-tab').off('click').on('click', function(e) {
                    e.preventDefault();
                    const filter = $(this).data('filter');
                    $(`.syh-banner-filter-btn[data-filter="${filter}"]`).click();
                });
            } else {
                if ($emptySuggestion.css('display') !== 'none') $emptySuggestion.hide();
            }
        } else {
            if ($emptySuggestion.css('display') !== 'none') $emptySuggestion.hide();
            const filterNames: Record<string, string> = { 
                'all': 'списку банерів', 
                'stream': 'категорії "🎙️ Питання ефіру"', 
                'audience': 'категорії "❓ Питання глядачів"', 
                'prayer': 'категорії "🙏 Молитовні"' 
            };
            messageHTML = `<span style="color: #777;">Тут ще немає банерів для ${filterNames[activeFilter] || 'списку'}</span>`;
        }

        safeHtmlUpdate($emptyQuery, messageHTML);
        if ($emptyState.css('display') === 'none') $emptyState.show();
    } else {
        if ($emptyState.css('display') !== 'none') $emptyState.hide();
        if ($emptySuggestion.css('display') !== 'none') $emptySuggestion.hide();
    }
}

export function scrollToActiveBanner(): void {
    const bannerListSelector = '[class*="BannerList__ListWrap"], ul[class*="Banner"]';
    const $bannerList = $(bannerListSelector);
    if ($bannerList.length) {
        const $activeLi = $bannerList.find('> li:has(.lucide-circle-minus), > div[class*="Banner__LiWrap"]:has(.lucide-circle-minus)');
        if ($activeLi.length) {
            const el = $activeLi[0];
            const rect = el.getBoundingClientRect();
            const scrollParent = el.closest('div[class*="Scroll"]');
            if (scrollParent) {
                const parentRect = scrollParent.getBoundingClientRect();
                const isVisible = (rect.top >= parentRect.top && rect.bottom <= parentRect.bottom);
                if (!isVisible) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
}
