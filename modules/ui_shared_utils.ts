/**
 * StreamYard Helper - Shared UI Utilities
 * Спільні допоміжні функції для UI модулів (ui_banners, ui_comments)
 */
import { CommentService } from './comment_service';
import { SYH_UI_STATE } from './ui_state';
import { SYH_CONFIG, queryBySelectorValue, resolveSelectorString } from './config';

export function safeTextUpdate(selector: string, newText: string): void {
    const el = document.querySelector(selector);
    if (el && el.textContent !== newText) el.textContent = newText;
}

export function safeHtmlUpdate(el: Element | null, newHtml: string): void {
    if (el && el.innerHTML !== newHtml) el.innerHTML = newHtml;
}

export function updateTabCounts(tabSelectorMap: Record<string, string>): void {
    for (const [selector, text] of Object.entries(tabSelectorMap)) {
        safeTextUpdate(selector, text);
    }
}

export function scrollToActiveItem(listSelector: string): void {
    const list = document.querySelector(listSelector);
    if (list) {
        const activeLi = Array.from(list.children).find(child => child.querySelector('.lucide-circle-minus')) as HTMLElement | undefined;
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

export function scrollToActiveComment(): void {
    const selectors = SYH_UI_STATE.SELECTORS || SYH_CONFIG.SELECTORS;
    // Порожній селектор -> скролити нікуди (раніше сюди летіло `undefined`,
    // і `querySelector` усередині так само не знаходив нічого).
    const listSelector = resolveSelectorString(selectors.starredList);
    if (!listSelector) return;
    scrollToActiveItem(listSelector);
}

export function updateMasterCheckboxFromElements(
    masterCheckboxSelector: string,
    checkboxes: HTMLInputElement[]
): void {
    const masterCheckbox = document.querySelector<HTMLInputElement>(masterCheckboxSelector);
    if (!masterCheckbox) return;

    const total = checkboxes.length;
    if (total === 0) {
        masterCheckbox.checked = false;
        masterCheckbox.indeterminate = false;
        return;
    }

    const checkedCount = checkboxes.filter(cb => cb.checked).length;
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

export function restoreCheckboxFromCache(
    container: Element,
    textKey: string
): void {
    if (CommentService.getStreamYardCheckboxState(textKey)) {
        const checkbox = container.querySelector<HTMLInputElement>('.syh-checkbox');
        if (checkbox) checkbox.checked = true;
    }
}

export function updateFilterTabSelection(
    selectedBtn: HTMLElement,
    filterBtnClass: string
): void {
    const allTabs = document.querySelectorAll<HTMLElement>(filterBtnClass);
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

export interface FilterSearchControlsConfig {
    searchInputSelector: string;
    clearBtnSelector: string;
    scrollBtnSelector: string;
    onSearch: (query: string) => void;
    onClear: () => void;
    onScroll: () => void;
}

export function bindFilterSearchControls(config: FilterSearchControlsConfig): void {
    const searchInput = document.querySelector<HTMLInputElement>(config.searchInputSelector);
    const clearBtn = document.querySelector<HTMLElement>(config.clearBtnSelector);

    if (searchInput) {
        searchInput.oninput = function() {
            const query = searchInput.value ? searchInput.value.toLowerCase() : '';
            config.onSearch(query);
            if (clearBtn) clearBtn.style.display = query ? 'flex' : 'none';
        };
    }

    if (clearBtn) {
        clearBtn.onclick = function() {
            if (searchInput) searchInput.value = '';
            config.onClear();
            clearBtn.style.display = 'none';
        };
    }

    const scrollBtn = document.querySelector<HTMLElement>(config.scrollBtnSelector);
    if (scrollBtn) {
        scrollBtn.onclick = function(e: MouseEvent) {
            e.preventDefault();
            config.onScroll();
        };
    }
}

export interface FilterDocClickConfig {
    searchInputSelector: string;
    clearBtnSelector: string;
    clearLinkSelector: string;
    filterBtnClass: string;
    onClearAll: () => void;
    onFilterSelect: (filterBtn: HTMLElement) => void;
}

export function bindFilterDocClickHandler(config: FilterDocClickConfig): void {
    document.addEventListener('click', function(e: MouseEvent) {
        const target = e.target as Element | null;
        if (target?.closest(config.clearLinkSelector)) {
            e.preventDefault();
            const searchInput = document.querySelector<HTMLInputElement>(config.searchInputSelector);
            const clearBtn = document.querySelector<HTMLElement>(config.clearBtnSelector);
            if (searchInput) searchInput.value = '';
            if (clearBtn) clearBtn.style.display = 'none';
            config.onClearAll();
            return;
        }

        const filterBtn = target?.closest(config.filterBtnClass) as HTMLElement | null;
        if (filterBtn) {
            config.onFilterSelect(filterBtn);
        }
    });
}
