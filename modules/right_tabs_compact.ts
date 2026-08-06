// modules/right_tabs_compact.ts
import { SYH_STORAGE, STORAGE_KEYS, type StoredOptions } from './storage';
import { SYH_CONFIG, resolveSelectorAll } from './config';

export class SyhRightTabsCompact {
    private collapsedTabIds: Set<string> = new Set();
    private expandedTabIds: Set<string> = new Set();
    private autoCompactSecondary: boolean = true;
    private isInitialized: boolean = false;

    // Другорядні кнопки, які за замовчуванням мають бути згорнуті
    private secondaryTabKeys: Set<string> = new Set([
        'broadcast-aside-tab-recording',
        'broadcast-aside-tab-widgets',
        'aria-broadcast-aside-content-recording',
        'aria-broadcast-aside-content-widgets',
        'text-Recording',
        'text-Widgets'
    ]);

    public async init(): Promise<void> {
        if (this.isInitialized) return;
        this.isInitialized = true;

        await this.loadState();
        this.setupStorageListener();
        this.processAllTabs();
    }

    public async loadState(): Promise<void> {
        try {
            const savedCollapsed = await SYH_STORAGE.get<string[]>(STORAGE_KEYS.COLLAPSED_TABS);
            if (Array.isArray(savedCollapsed)) {
                this.collapsedTabIds = new Set(savedCollapsed);
            }

            const savedExpanded = await SYH_STORAGE.get<string[]>('syh:streamyard:expanded_tabs');
            if (Array.isArray(savedExpanded)) {
                this.expandedTabIds = new Set(savedExpanded);
            }

            const opts = await SYH_STORAGE.get<StoredOptions>(STORAGE_KEYS.OPTIONS);
            if (opts && typeof opts.compact_secondary_tabs_default === 'boolean') {
                this.autoCompactSecondary = opts.compact_secondary_tabs_default;
            } else {
                this.autoCompactSecondary = true; // За замовчуванням Recording та Widgets згортаються
            }
        } catch (err) {
            console.warn('[SYH RightTabs] Failed to load saved state:', err);
        }
    }

    public processAllTabs(): void {
        const buttons = resolveSelectorAll<HTMLElement>(SYH_CONFIG.SELECTORS.rightTabButtons);
        buttons.forEach(btn => this.processTabButton(btn));
    }

    public processTabButton(btn: HTMLElement): void {
        if (!btn || !(btn instanceof HTMLElement)) return;

        const tabKey = this.getTabKey(btn);
        if (!tabKey) return;

        const shouldBeCollapsed = this.shouldTabBeCollapsed(tabKey);

        if (shouldBeCollapsed) {
            btn.classList.add('syh-collapsed-tab');
        } else {
            btn.classList.remove('syh-collapsed-tab');
        }

        if (btn.dataset.syhCompactBound === 'true') return;
        btn.dataset.syhCompactBound = 'true';

        btn.addEventListener('contextmenu', (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const currentlyCollapsed = btn.classList.contains('syh-collapsed-tab');

            if (currentlyCollapsed) {
                // Розгортаємо за вибором користувача через ПКМ
                btn.classList.remove('syh-collapsed-tab');
                this.collapsedTabIds.delete(tabKey);
                this.expandedTabIds.add(tabKey);
            } else {
                // Згортаємо за вибором користувача через ПКМ
                btn.classList.add('syh-collapsed-tab');
                this.collapsedTabIds.add(tabKey);
                this.expandedTabIds.delete(tabKey);
            }

            this.saveState();
        });
    }

    public shouldTabBeCollapsed(tabKey: string): boolean {
        // Якщо користувач явно розгорнув цю кнопку через ПКМ — вона залишається розгорнутою
        if (this.expandedTabIds.has(tabKey)) return false;

        // Якщо користувач явно згорнув цю кнопку через ПКМ — вона згорнута
        if (this.collapsedTabIds.has(tabKey)) return true;

        // Якщо увімкнено автозгортання другорядних вкладок (Recording, Widgets) — вони згортаються за замовчуванням
        if (this.autoCompactSecondary && this.isSecondaryTab(tabKey)) {
            return true;
        }

        return false;
    }

    private isSecondaryTab(tabKey: string): boolean {
        if (this.secondaryTabKeys.has(tabKey)) return true;
        return tabKey.includes('recording') || tabKey.includes('widgets');
    }

    public setAutoCompactSecondary(enabled: boolean): void {
        this.autoCompactSecondary = enabled;
        this.processAllTabs();
    }

    private getTabKey(btn: HTMLElement): string | null {
        if (btn.id) return btn.id;
        const ariaControls = btn.getAttribute('aria-controls');
        if (ariaControls) return `aria-${ariaControls}`;
        const textContent = btn.textContent?.trim();
        if (textContent) return `text-${textContent}`;
        return null;
    }

    private async saveState(): Promise<void> {
        try {
            await SYH_STORAGE.set(STORAGE_KEYS.COLLAPSED_TABS, Array.from(this.collapsedTabIds));
            await SYH_STORAGE.set('syh:streamyard:expanded_tabs', Array.from(this.expandedTabIds));
        } catch (err) {
            console.warn('[SYH RightTabs] Failed to save collapsed tabs state:', err);
        }
    }

    private setupStorageListener(): void {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, areaName) => {
                if (areaName !== 'local') return;
                if (changes[STORAGE_KEYS.OPTIONS]) {
                    const newOpts = changes[STORAGE_KEYS.OPTIONS].newValue as StoredOptions | undefined;
                    if (newOpts && typeof newOpts.compact_secondary_tabs_default === 'boolean') {
                        this.setAutoCompactSecondary(newOpts.compact_secondary_tabs_default);
                    }
                }
            });
        }
    }
}

export const SYH_RIGHT_TABS_COMPACT = new SyhRightTabsCompact();
