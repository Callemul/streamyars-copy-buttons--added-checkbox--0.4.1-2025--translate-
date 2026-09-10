// modules/right_tabs_rules.ts
/**
 * Чисті правила згортання правих вкладок StreamYard.
 * Тут немає ані DOM-мутацій, ані звернень до chrome.storage — лише детерміновані обчислення стану,
 * тому модуль повністю покривається юніт-тестами.
 */
import type { StoredOptions } from '../../storage/storage';

export const COLLAPSED_TAB_CLASS = 'syh-collapsed-tab';

/** Другорядні кнопки, які за замовчуванням мають бути згорнуті. */
export const SECONDARY_TAB_KEYS: ReadonlySet<string> = new Set([
    'broadcast-aside-tab-recording',
    'broadcast-aside-tab-widgets',
    'aria-broadcast-aside-content-recording',
    'aria-broadcast-aside-content-widgets',
    'text-Recording',
    'text-Widgets'
]);

/** Підрядки, за якими вкладка вважається другорядною навіть без точного збігу ключа. */
export const SECONDARY_TAB_HINTS: readonly string[] = ['recording', 'widgets'];

export interface RightTabsState {
    collapsedTabIds: Set<string>;
    expandedTabIds: Set<string>;
    autoCompactSecondary: boolean;
}

export interface TabKeySource {
    id?: string;
    getAttribute(name: string): string | null;
    textContent?: string | null;
}

export function createRightTabsState(): RightTabsState {
    return {
        collapsedTabIds: new Set<string>(),
        expandedTabIds: new Set<string>(),
        autoCompactSecondary: true
    };
}

/** Нормалізує будь-яке збережене значення у множину ідентифікаторів вкладок. */
export function parseStoredTabIds(value: unknown): Set<string> {
    return new Set(Array.isArray(value) ? (value as string[]) : []);
}

/** Дістає прапорець автозгортання з опцій; `null` — якщо його не задано. */
export function readCompactFlag(opts?: StoredOptions | null): boolean | null {
    const flag = opts?.compact_secondary_tabs_default;
    return typeof flag === 'boolean' ? flag : null;
}

/** За замовчуванням Recording та Widgets згортаються. */
export function resolveAutoCompactSecondary(opts?: StoredOptions | null): boolean {
    return readCompactFlag(opts) ?? true;
}

export function isSecondaryTab(tabKey: string): boolean {
    if (SECONDARY_TAB_KEYS.has(tabKey)) return true;
    return SECONDARY_TAB_HINTS.some(hint => tabKey.includes(hint));
}

/** Явний вибір користувача через ПКМ має найвищий пріоритет. `null` — вибору не було. */
export function readExplicitPreference(state: RightTabsState, tabKey: string): boolean | null {
    if (state.expandedTabIds.has(tabKey)) return false;
    return state.collapsedTabIds.has(tabKey) ? true : null;
}

export function isAutoCollapsed(state: RightTabsState, tabKey: string): boolean {
    return state.autoCompactSecondary && isSecondaryTab(tabKey);
}

export function shouldTabBeCollapsed(state: RightTabsState, tabKey: string): boolean {
    const explicit = readExplicitPreference(state, tabKey);
    if (explicit !== null) return explicit;
    return isAutoCollapsed(state, tabKey);
}

/** Запам'ятовує явний вибір користувача, знімаючи попередній протилежний. */
export function setTabPreference(state: RightTabsState, tabKey: string, collapsed: boolean): void {
    state.collapsedTabIds.delete(tabKey);
    state.expandedTabIds.delete(tabKey);
    const target = collapsed ? state.collapsedTabIds : state.expandedTabIds;
    target.add(tabKey);
}

function readIdKey(btn: TabKeySource): string | null {
    return btn.id || null;
}

function readAriaKey(btn: TabKeySource): string | null {
    const ariaControls = btn.getAttribute('aria-controls');
    return ariaControls ? `aria-${ariaControls}` : null;
}

function readTextKey(btn: TabKeySource): string | null {
    const text = btn.textContent?.trim();
    return text ? `text-${text}` : null;
}

const TAB_KEY_READERS: ReadonlyArray<(btn: TabKeySource) => string | null> = [
    readIdKey,
    readAriaKey,
    readTextKey
];

/** Стабільний ключ вкладки: id → aria-controls → текст. */
export function getTabKey(btn: TabKeySource): string | null {
    for (const read of TAB_KEY_READERS) {
        const key = read(btn);
        if (key) return key;
    }
    return null;
}
