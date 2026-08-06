/**
 * StreamYard Helper - Shared UI Utilities
 * Спільні допоміжні функції для UI модулів (ui_banners, ui_comments)
 */

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

export interface EmptyStateCategorySuggestion {
    key: string;
    label: string;
    icon: string;
}

export interface SharedEmptyStateConfig {
    emptyStateId: string;
    emptyQueryId: string;
    emptySuggestionId: string;
    clearLinkId: string;
    switchTabClass: string;
    filterBtnSelector: string;
    visibleCount: number;
    searchQuery: string;
    activeFilter: string;
    countSearch: Record<string, number>;
    suggestions: EmptyStateCategorySuggestion[];
    filterNames: Record<string, string>;
    entityNamePlural: string;
    defaultFilterTargetName: string;
}

export function renderSharedEmptyState(config: SharedEmptyStateConfig): void {
    const emptyState = document.querySelector<HTMLElement>(`#${config.emptyStateId}`);
    const emptyQuery = document.querySelector(`#${config.emptyQueryId}`);
    
    let emptySuggestion = document.querySelector<HTMLElement>(`#${config.emptySuggestionId}`);
    if (!emptySuggestion && emptyState) {
        emptyState.insertAdjacentHTML(
            'beforeend',
            `<div id="${config.emptySuggestionId}" style="margin-top: 10px; font-size: 12px; color: #f39c12; font-weight: bold; display:none;"></div>`
        );
        emptySuggestion = document.querySelector<HTMLElement>(`#${config.emptySuggestionId}`);
    }

    if (config.visibleCount === 0) {
        let messageHTML: string;
        if (config.searchQuery) {
            messageHTML = `Нічого не знайдено за запитом: <b style="color: #e74c3c;">"${config.searchQuery}"</b><br><br>
            <a href="#" id="${config.clearLinkId}" style="color: #005DF7; text-decoration: none; font-weight: bold; background: #e3f2fd; padding: 5px 10px; border-radius: 4px;">Скинути пошук ✕</a>`;
            
            const suggestionLinks: string[] = [];
            if (config.activeFilter !== 'all' && config.countSearch.all > 0) {
                config.suggestions.forEach(item => {
                    const count = config.countSearch[item.key] || 0;
                    if (count > 0 && config.activeFilter !== item.key) {
                        suggestionLinks.push(
                            `<a href="#" class="${config.switchTabClass}" data-filter="${item.key}" style="color: #f39c12; text-decoration: underline;">${item.icon} ${item.label} (${count})</a>`
                        );
                    }
                });
            }

            if (suggestionLinks.length > 0) {
                safeHtmlUpdate(emptySuggestion, `Знайдено в інших категоріях: ` + suggestionLinks.join(', '));
                if (emptySuggestion && emptySuggestion.style.display === 'none') emptySuggestion.style.display = 'block';
                
                document.querySelectorAll(`.${config.switchTabClass}`).forEach(el => {
                    (el as HTMLElement).onclick = function(e) {
                        e.preventDefault();
                        const filter = (this as HTMLElement).dataset.filter;
                        const btn = document.querySelector<HTMLElement>(`${config.filterBtnSelector}[data-filter="${filter}"]`);
                        if (btn) btn.click();
                    };
                });
            } else {
                if (emptySuggestion && emptySuggestion.style.display !== 'none') emptySuggestion.style.display = 'none';
            }
        } else {
            if (emptySuggestion && emptySuggestion.style.display !== 'none') emptySuggestion.style.display = 'none';
            const targetName = config.filterNames[config.activeFilter] || config.defaultFilterTargetName;
            messageHTML = `<span style="color: #777;">Тут ще немає ${config.entityNamePlural} для ${targetName}</span>`;
        }

        safeHtmlUpdate(emptyQuery, messageHTML);
        if (emptyState && emptyState.style.display === 'none') emptyState.style.display = 'block';
    } else {
        if (emptyState && emptyState.style.display !== 'none') emptyState.style.display = 'none';
        if (emptySuggestion && emptySuggestion.style.display !== 'none') emptySuggestion.style.display = 'none';
    }
}
