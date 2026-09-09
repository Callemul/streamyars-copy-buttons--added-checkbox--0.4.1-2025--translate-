/**
 * StreamYard Helper - Empty State Renderer
 * Відображення стану "порожньо" для списків коментарів та банерів
 */

import { escapeHtml } from './escape_html';

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

function safeHtmlUpdate(el: Element | null, newHtml: string): void {
    if (el && el.innerHTML !== newHtml) el.innerHTML = newHtml;
}

function buildSuggestionLinks(config: SharedEmptyStateConfig): string[] {
    const suggestionLinks: string[] = [];
    if (config.activeFilter !== 'all' && (config.countSearch.all ?? 0) > 0) {
        config.suggestions.forEach(item => {
            const count = config.countSearch[item.key] || 0;
            if (count > 0 && config.activeFilter !== item.key) {
                suggestionLinks.push(
                    `<a href="#" class="${config.switchTabClass}" data-filter="${item.key}" style="color: #f39c12; text-decoration: underline;">${item.icon} ${item.label} (${count})</a>`
                );
            }
        });
    }
    return suggestionLinks;
}

function setupSuggestionClickHandlers(config: SharedEmptyStateConfig): void {
    document.querySelectorAll(`.${config.switchTabClass}`).forEach(el => {
        (el as HTMLElement).onclick = function(e) {
            e.preventDefault();
            const filter = (this as HTMLElement).dataset.filter;
            const btn = document.querySelector<HTMLElement>(`${config.filterBtnSelector}[data-filter="${filter}"]`);
            if (btn) btn.click();
        };
    });
}

function renderEmptyStateWithSearch(config: SharedEmptyStateConfig, emptyState: HTMLElement, emptyQuery: Element, emptySuggestion: HTMLElement | null): void {
    const suggestionLinks = buildSuggestionLinks(config);
    
    const messageHTML = `Нічого не знайдено за запитом: <b style="color: #e74c3c;">"${escapeHtml(config.searchQuery)}"</b><br><br>
    <a href="#" id="${config.clearLinkId}" style="color: #005DF7; text-decoration: none; font-weight: bold; background: #e3f2fd; padding: 5px 10px; border-radius: 4px;">Скинути пошук ✕</a>`;

    if (suggestionLinks.length > 0) {
        safeHtmlUpdate(emptySuggestion, `Знайдено в інших категоріях: ` + suggestionLinks.join(', '));
        if (emptySuggestion && emptySuggestion.style.display === 'none') emptySuggestion.style.display = 'block';
        setupSuggestionClickHandlers(config);
    } else {
        if (emptySuggestion && emptySuggestion.style.display !== 'none') emptySuggestion.style.display = 'none';
    }

    safeHtmlUpdate(emptyQuery, messageHTML);
    if (emptyState && emptyState.style.display === 'none') emptyState.style.display = 'block';
}

function renderEmptyStateWithoutSearch(config: SharedEmptyStateConfig, emptyState: HTMLElement, emptyQuery: Element, emptySuggestion: HTMLElement | null): void {
    if (emptySuggestion && emptySuggestion.style.display !== 'none') emptySuggestion.style.display = 'none';
    const targetName = config.filterNames[config.activeFilter] || config.defaultFilterTargetName;
    const messageHTML = `<span style="color: #777;">Тут ще немає ${config.entityNamePlural} для ${targetName}</span>`;
    
    safeHtmlUpdate(emptyQuery, messageHTML);
    if (emptyState && emptyState.style.display === 'none') emptyState.style.display = 'block';
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
        if (config.searchQuery) {
            renderEmptyStateWithSearch(config, emptyState!, emptyQuery!, emptySuggestion);
        } else {
            renderEmptyStateWithoutSearch(config, emptyState!, emptyQuery!, emptySuggestion);
        }
    } else {
        if (emptyState && emptyState.style.display !== 'none') emptyState.style.display = 'none';
        if (emptySuggestion && emptySuggestion.style.display !== 'none') emptySuggestion.style.display = 'none';
    }
}