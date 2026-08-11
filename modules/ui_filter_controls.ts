/**
 * StreamYard Helper — контроли фільтра списків (пошук, очищення, вкладки).
 *
 * Виокремлено з `ui_shared_utils.ts`. Модуль ділиться на дві частини:
 *   - `bindFilterSearchControls` вішає ПРЯМІ обробники (`oninput`/`onclick`)
 *     на конкретні елементи, тому повторний біндінг їх перезаписує, а не дублює;
 *   - `bindFilterDocClickHandler` вішає ДЕЛЕГОВАНИЙ слухач на `document`,
 *     бо кнопки фільтра перестворюються разом із перерендером шапки.
 */

/** Кольори та тіні активної/неактивної вкладки фільтра. */
const TAB_STYLES = {
    activeBackground: '#fff',
    inactiveBackground: 'transparent',
    activeShadow: '0 1px 3px rgba(0,0,0,0.1)',
    inactiveShadow: 'none',
    activeColor: '#000',
    inactiveColor: '#666'
} as const;

/** Підсвічує рівно одну вкладку фільтра, знімаючи стан з усіх інших. */
export function updateFilterTabSelection(
    selectedBtn: HTMLElement,
    filterBtnClass: string
): void {
    const allTabs = document.querySelectorAll<HTMLElement>(filterBtnClass);
    allTabs.forEach(btn => {
        const isSelected = btn === selectedBtn;
        btn.classList.toggle('active', isSelected);
        btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        btn.style.background = isSelected ? TAB_STYLES.activeBackground : TAB_STYLES.inactiveBackground;
        btn.style.fontWeight = isSelected ? 'bold' : 'normal';
        btn.style.boxShadow = isSelected ? TAB_STYLES.activeShadow : TAB_STYLES.inactiveShadow;
        btn.style.color = isSelected ? TAB_STYLES.activeColor : TAB_STYLES.inactiveColor;
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

/** Пошук: запит завжди нормалізується у нижній регістр перед передачею назовні. */
function bindSearchInput(
    searchInput: HTMLInputElement,
    clearBtn: HTMLElement | null,
    onSearch: (query: string) => void
): void {
    searchInput.oninput = function() {
        const query = searchInput.value ? searchInput.value.toLowerCase() : '';
        onSearch(query);
        if (clearBtn) clearBtn.style.display = query ? 'flex' : 'none';
    };
}

function bindClearButton(
    clearBtn: HTMLElement,
    searchInput: HTMLInputElement | null,
    onClear: () => void
): void {
    clearBtn.onclick = function() {
        if (searchInput) searchInput.value = '';
        onClear();
        clearBtn.style.display = 'none';
    };
}

export function bindFilterSearchControls(config: FilterSearchControlsConfig): void {
    const searchInput = document.querySelector<HTMLInputElement>(config.searchInputSelector);
    const clearBtn = document.querySelector<HTMLElement>(config.clearBtnSelector);

    if (searchInput) bindSearchInput(searchInput, clearBtn, config.onSearch);
    if (clearBtn) bindClearButton(clearBtn, searchInput, config.onClear);

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

/** Скидає поле пошуку і ховає кнопку очищення перед викликом `onClearAll`. */
function resetSearchField(config: FilterDocClickConfig): void {
    const searchInput = document.querySelector<HTMLInputElement>(config.searchInputSelector);
    const clearBtn = document.querySelector<HTMLElement>(config.clearBtnSelector);
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
}

/**
 * Делегований клік: гілки «скинути все» та «вибрати фільтр» взаємовиключні —
 * посилання очищення обробляється першим і одразу завершує обробку.
 */
export function bindFilterDocClickHandler(config: FilterDocClickConfig): void {
    document.addEventListener('click', function(e: MouseEvent) {
        const target = e.target as Element | null;
        if (target?.closest(config.clearLinkSelector)) {
            e.preventDefault();
            resetSearchField(config);
            config.onClearAll();
            return;
        }

        const filterBtn = target?.closest(config.filterBtnClass) as HTMLElement | null;
        if (filterBtn) {
            config.onFilterSelect(filterBtn);
        }
    });
}
