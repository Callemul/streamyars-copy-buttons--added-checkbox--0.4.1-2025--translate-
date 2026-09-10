// modules/right_tabs_compact.ts
/**
 * Тонкий оркестратор компактних правих вкладок StreamYard.
 * Правила згортання живуть у `right_tabs_rules`, персистентність — у `right_tabs_storage`.
 */
import { SYH_CONFIG, resolveSelectorAll } from '../../config';
import {
    COLLAPSED_TAB_CLASS,
    createRightTabsState,
    getTabKey,
    setTabPreference,
    shouldTabBeCollapsed,
    type RightTabsState
} from './right_tabs_rules';
import {
    loadRightTabsState,
    observeCompactOption,
    saveRightTabsState
} from './right_tabs_storage';

export { COLLAPSED_TAB_CLASS } from './right_tabs_rules';

/** Duck-typing замість `instanceof HTMLElement`: працює і в браузері, і в тестовому середовищі. */
export function isTabButton(btn: unknown): btn is HTMLElement {
    const el = btn as HTMLElement | null;
    return !!el && !!el.classList && typeof el.getAttribute === 'function';
}

export function applyCollapsedClass(btn: HTMLElement, collapsed: boolean): void {
    const method = collapsed ? 'add' : 'remove';
    btn.classList[method](COLLAPSED_TAB_CLASS);
}

export class SyhRightTabsCompact {
    private state: RightTabsState = createRightTabsState();
    private isInitialized: boolean = false;

    public async init(): Promise<void> {
        if (this.isInitialized) return;
        this.isInitialized = true;

        await this.loadState();
        observeCompactOption(enabled => this.setAutoCompactSecondary(enabled));
        this.processAllTabs();
    }

    public async loadState(): Promise<void> {
        this.state = await loadRightTabsState();
    }

    public processAllTabs(): void {
        const buttons = resolveSelectorAll<HTMLElement>(SYH_CONFIG.SELECTORS.rightTabButtons);
        buttons.forEach(btn => this.processTabButton(btn));
    }

    public processTabButton(btn: HTMLElement): void {
        const tabKey = this.refreshTabState(btn);
        if (!tabKey) return;
        this.bindContextMenu(btn, tabKey);
    }

    public shouldTabBeCollapsed(tabKey: string): boolean {
        return shouldTabBeCollapsed(this.state, tabKey);
    }

    public setAutoCompactSecondary(enabled: boolean): void {
        this.state.autoCompactSecondary = enabled;
        this.processAllTabs();
    }

    public getState(): RightTabsState {
        return this.state;
    }

    private refreshTabState(btn: HTMLElement): string | null {
        if (!isTabButton(btn)) return null;

        const tabKey = getTabKey(btn);
        if (!tabKey) return null;

        applyCollapsedClass(btn, this.shouldTabBeCollapsed(tabKey));
        return tabKey;
    }

    private bindContextMenu(btn: HTMLElement, tabKey: string): void {
        if (btn.dataset.syhCompactBound === 'true') return;
        btn.dataset.syhCompactBound = 'true';
        btn.addEventListener('contextmenu', (e: MouseEvent) => this.toggleTab(e, btn, tabKey));
    }

    /** ПКМ по вкладці — явне згортання/розгортання за вибором користувача. */
    private toggleTab(e: MouseEvent, btn: HTMLElement, tabKey: string): void {
        e.preventDefault();
        e.stopPropagation();

        const collapsed = !btn.classList.contains(COLLAPSED_TAB_CLASS);
        setTabPreference(this.state, tabKey, collapsed);
        applyCollapsedClass(btn, collapsed);

        void saveRightTabsState(this.state);
    }
}

export const SYH_RIGHT_TABS_COMPACT = new SyhRightTabsCompact();
