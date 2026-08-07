import { SYH_UI_STATE } from './ui_state';
import { SYH_CONFIG } from './config';
import { SYH_UTILS } from './utils';
import { UiFactory } from './ui_factory';
import { CommentService } from './comment_service';
import {
    updateMasterCheckboxFromElements,
    scrollToActiveItem,
    updateTabCounts
} from './ui_shared_utils';
import { renderSharedEmptyState } from './ui_empty_state';

export function addButtonsToBanner(bannerNode: Element): void {
    const selectors = SYH_UI_STATE.SELECTORS || SYH_CONFIG.SELECTORS;
    const bannerWrap = bannerNode.querySelector(selectors.bannerWrap);
    if (bannerWrap && !bannerWrap.querySelector('.syh-banner-controls')) {
        const container = document.createElement('div');
        container.className = 'syh-banner-controls';

        container.appendChild(UiFactory.createButton({
            type: 'banner', action: 'copy-banner', icon: '📋', title: 'Копіювати текст банера'
        }));
        container.appendChild(UiFactory.createButton({
            type: 'banner', action: 'mark-stream', icon: '📺', title: 'Відмітити як Питання ефіру'
        }));
        container.appendChild(UiFactory.createButton({
            type: 'banner', action: 'mark-audience', icon: '❓', title: 'Відмітити як Питання глядачів'
        }));
        container.appendChild(UiFactory.createButton({
            type: 'banner', action: 'mark-prayer', icon: '🙏', title: 'Відмітити як Молитовне'
        }));

        const { wrapper: cbWrap } = UiFactory.createCheckbox(
            'banner',
            'Відмітити банер як опрацьований'
        );
        container.appendChild(cbWrap);

        bannerWrap.appendChild(container);
        const bannerText = bannerNode.querySelector(selectors.bannerText)?.textContent || '';

        if (CommentService.getStreamYardCheckboxState(bannerText)) {
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
    const type = SYH_UI_STATE.bannerCategoriesCache[text] || 'none';
    updateBannerVisuals(bannerNode, type);
}

export function injectHeaderButtons(headerNode: Element): void {
    if (!headerNode.querySelector('.syh-banner-header-controls')) {
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
}

export function injectSearchAndFilterContainer(bannerList: Element): void {
    if (document.getElementById('syh-banner-search-container')) return;

    const searchContainerHTML = `
        <div id="syh-banner-search-container" style="padding: 10px 15px 5px 15px; display: flex; flex-direction: column; gap: 8px; border-bottom: 1px solid #eee; background: #fff; width: 100%; box-sizing: border-box;">
            <div class="syh-banner-search-wrapper">
                <input type="text" id="syh-banner-search" value="${SYH_UI_STATE.bannerSearchQuery || ''}" placeholder="🔍 Пошук банерів..." aria-label="Пошук банерів" style="flex: 1; padding: 6px 28px 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; outline: none; transition: 0.2s;">
                <button id="syh-clear-banner-search-btn" class="syh-clear-banner-search" style="display: ${SYH_UI_STATE.bannerSearchQuery ? 'flex' : 'none'};" title="Очистити пошук" aria-label="Очистити пошук банерів">✕</button>
                <button id="syh-scroll-to-active-banner-btn" class="syh-button" style="padding: 0; height: 29px; width: 29px; display: flex; align-items: center; justify-content: center; background: #e3f2fd; border: 1px solid #90caf9; border-radius: 4px; cursor: pointer; font-size: 14px; flex-shrink: 0;" title="Повернутися до активного банера на екрані" aria-label="Повернутися до активного банера на екрані">🎯</button>
            </div>
            
            <div role="tablist" aria-label="Фільтри категорій банерів" style="display: flex; gap: 4px; background: #eee; padding: 3px; border-radius: 6px; width: 100%; box-sizing: border-box;">
                <button role="tab" aria-selected="${SYH_UI_STATE.bannerActiveFilter === 'all' ? 'true' : 'false'}" aria-label="Показати всі банери" class="syh-banner-filter-btn ${SYH_UI_STATE.bannerActiveFilter === 'all' ? 'active' : ''}" data-filter="all" id="syh-banner-filter-all">
                    <span>⭐</span><span class="tab-text">Всі</span><span class="tab-count"></span>
                </button>
                <button role="tab" aria-selected="${SYH_UI_STATE.bannerActiveFilter === 'stream' ? 'true' : 'false'}" aria-label="Показати банери ефіру" class="syh-banner-filter-btn ${SYH_UI_STATE.bannerActiveFilter === 'stream' ? 'active' : ''}" data-filter="stream" id="syh-banner-filter-stream">
                    <span>🎙️</span><span class="tab-text">Ефір</span><span class="tab-count"></span>
                </button>
                <button role="tab" aria-selected="${SYH_UI_STATE.bannerActiveFilter === 'audience' ? 'true' : 'false'}" aria-label="Показати банери глядачів" class="syh-banner-filter-btn ${SYH_UI_STATE.bannerActiveFilter === 'audience' ? 'active' : ''}" data-filter="audience" id="syh-banner-filter-audience">
                    <span>❓</span><span class="tab-text">Глядачі</span><span class="tab-count"></span>
                </button>
                <button role="tab" aria-selected="${SYH_UI_STATE.bannerActiveFilter === 'prayer' ? 'true' : 'false'}" aria-label="Показати молитовні банери" class="syh-banner-filter-btn ${SYH_UI_STATE.bannerActiveFilter === 'prayer' ? 'active' : ''}" data-filter="prayer" id="syh-banner-filter-prayer">
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

    bindBannersFilterControls();
    setTimeout(() => filterBanners(), 10);
}

export function addBannerHeaderControls(headerNode: Element): void {
    if (headerNode) {
        injectHeaderButtons(headerNode);
    }

    const bannerListSelector = '[class*="BannerList__ListWrap"], ul[class*="Banner"]';
    const bannerList = document.querySelector(bannerListSelector);
    if (bannerList) {
        injectSearchAndFilterContainer(bannerList);
    }
}

export function updateMasterCheckboxState(): void {
    const selectors = SYH_UI_STATE.SELECTORS || SYH_CONFIG.SELECTORS;
    const bannerBlocks = document.querySelectorAll(selectors.bannerBlock);
    const allBannerCheckboxes: HTMLInputElement[] = [];
    bannerBlocks.forEach(block => {
        const cb = block.querySelector<HTMLInputElement>('.syh-checkbox[data-type="banner"]');
        if (cb) allBannerCheckboxes.push(cb);
    });

    updateMasterCheckboxFromElements('.syh-master-checkbox', allBannerCheckboxes);
}

function incrementCategoryCounts(
    counts: Record<string, number>,
    commentType: string
): void {
    counts.all++;
    if (commentType === 'stream') counts.stream++;
    else if (commentType === 'audience') counts.audience++;
    else if (commentType === 'prayer') counts.prayer++;
}

function matchesActiveFilter(commentType: string, activeFilter: string): boolean {
    if (activeFilter === 'stream' && commentType !== 'stream') return false;
    if (activeFilter === 'audience' && commentType !== 'audience') return false;
    if (activeFilter === 'prayer' && commentType !== 'prayer') return false;
    return true;
}

export function filterBannerListItems(
    bannerList: HTMLElement,
    selectors: any,
    categoriesCache: Record<string, string>,
    activeFilter: string,
    searchQuery: string
): { visibleCount: number; countAbsolute: Record<string, number>; countSearch: Record<string, number> } {
    let visibleCount = 0;
    const countAbsolute = { all: 0, stream: 0, audience: 0, prayer: 0 };
    const countSearch = { all: 0, stream: 0, audience: 0, prayer: 0 };

    Array.from(bannerList.children).forEach(liChild => {
        const li = liChild as HTMLElement;
        const bannerWrap = li.querySelector(selectors.bannerWrap);
        if (!bannerWrap) return;

        const originalText = bannerWrap.querySelector(selectors.bannerText)?.textContent || '';
        const commentType = categoriesCache[originalText] || 'none';

        updateBannerVisuals(bannerWrap, commentType);
        incrementCategoryCounts(countAbsolute, commentType);

        const matchesSearch = !searchQuery || SYH_UTILS.smartSearch(searchQuery, originalText);
        if (matchesSearch) {
            incrementCategoryCounts(countSearch, commentType);
        }

        const isVisible = matchesSearch && matchesActiveFilter(commentType, activeFilter);

        if (isVisible) {
            if (li.style.display === 'none') li.style.display = '';
            visibleCount++;
        } else {
            if (li.style.display !== 'none') li.style.display = 'none';
        }
    });

    return { visibleCount, countAbsolute, countSearch: countSearch[activeFilter === 'all' ? 'all' : activeFilter] };
}

export function updateBannerTabCounts(countAbsolute: Record<string, number>): void {
    updateTabCounts({
        '#syh-banner-filter-all .tab-count': `(${countAbsolute.all || 0})`,
        '#syh-banner-filter-stream .tab-count': `(${countAbsolute.stream || 0})`,
        '#syh-banner-filter-audience .tab-count': `(${countAbsolute.audience || 0})`,
        '#syh-banner-filter-prayer .tab-count': `(${countAbsolute.prayer || 0})`,
    });
}

export function renderBannerEmptyState(
    visibleCount: number,
    searchQuery: string,
    activeFilter: string,
    countSearch: Record<string, number>
): void {
    renderSharedEmptyState({
        emptyStateId: 'syh-banner-empty-state-msg',
        emptyQueryId: 'syh-banner-empty-query',
        emptySuggestionId: 'syh-banner-empty-suggestion',
        clearLinkId: 'syh-banner-empty-clear-link',
        switchTabClass: 'syh-banner-switch-tab',
        filterBtnSelector: '.syh-banner-filter-btn',
        visibleCount,
        searchQuery,
        activeFilter,
        countSearch,
        suggestions: [
            { key: 'stream', label: 'Ефір', icon: '🎙️' },
            { key: 'audience', label: 'Глядачі', icon: '❓' },
            { key: 'prayer', label: 'Молитви', icon: '🙏' },
        ],
        filterNames: {
            'all': 'списку банерів',
            'stream': 'Ефір',
            'audience': 'Глядачі',
            'prayer': 'Молитви',
        },
        entityNamePlural: 'банерів',
        defaultFilterTargetName: activeFilter,
    });
}

export function filterBanners(): void {
    const selectors = SYH_UI_STATE.SELECTORS || SYH_CONFIG.SELECTORS;
    const bannerListSelector = '[class*="BannerList__ListWrap"], ul[class*="Banner"]';
    const bannerList = document.querySelector<HTMLElement>(bannerListSelector);
    if (!bannerList) return;

    const activeFilter = SYH_UI_STATE.bannerActiveFilter || 'all';
    const searchQuery = SYH_UI_STATE.bannerSearchQuery || '';

    const { visibleCount, countAbsolute, countSearch } = filterBannerListItems(
        bannerList,
        selectors,
        SYH_UI_STATE.bannerCategoriesCache,
        activeFilter,
        searchQuery
    );

    updateBannerTabCounts(countAbsolute);
    renderBannerEmptyState(visibleCount, searchQuery, activeFilter, countSearch);
}

export function scrollToActiveBanner(): void {
    scrollToActiveItem('[class*="BannerList__ListWrap"], ul[class*="Banner"]');
}

export function updateFilterTabSelection(selectedBtn: HTMLElement): void {
    const allTabs = document.querySelectorAll<HTMLElement>('.syh-banner-filter-btn');
    allTabs.forEach(btn => {
        const isSelected = btn === selectedBtn;
        btn.classList.toggle('active', isSelected);
        btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        btn.style.background = isSelected ? '#fff' : 'transparent';
        btn.style.fontWeight = isSelected ? 'bold' : 'normal';
        btn.style.boxShadow = isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none';
        btn.style.color = isSelected ? '#000' : '#666';
    });
}

let filterControlsBound = false;

export function bindBannersFilterControls(): void {
    const searchInput = document.querySelector<HTMLInputElement>('#syh-banner-search');
    const clearBtn = document.querySelector<HTMLElement>('#syh-clear-banner-search-btn');

    if (searchInput) {
        searchInput.oninput = function() {
            SYH_UI_STATE.bannerSearchQuery = searchInput.value ? searchInput.value.toLowerCase() : '';
            if (clearBtn) clearBtn.style.display = SYH_UI_STATE.bannerSearchQuery ? 'flex' : 'none';
            filterBanners();
        };
    }

    if (clearBtn) {
        clearBtn.onclick = function() {
            if (searchInput) searchInput.value = '';
            SYH_UI_STATE.bannerSearchQuery = '';
            clearBtn.style.display = 'none';
            filterBanners();
        };
    }

    const scrollBtn = document.querySelector('#syh-scroll-to-active-banner-btn');
    if (scrollBtn) {
        scrollBtn.onclick = function(e) {
            e.preventDefault();
            scrollToActiveBanner();
        };
    }

    if (filterControlsBound) return;
    filterControlsBound = true;

    document.addEventListener('click', function(e: MouseEvent) {
        const target = e.target as Element | null;
        if (target?.closest('#syh-banner-empty-clear-link')) {
            e.preventDefault();
            if (searchInput) searchInput.value = '';
            SYH_UI_STATE.bannerSearchQuery = '';
            if (clearBtn) clearBtn.style.display = 'none';
            filterBanners();
            return;
        }

        const filterBtn = target?.closest('.syh-banner-filter-btn') as HTMLElement | null;
        if (filterBtn) {
            updateFilterTabSelection(filterBtn);
            SYH_UI_STATE.bannerActiveFilter = filterBtn.dataset.filter || 'all';
            filterBanners();
        }
    });
}
