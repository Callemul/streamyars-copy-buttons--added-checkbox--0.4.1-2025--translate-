// Shared DOM utilities for popup modules
import { SYH_STORAGE } from '../modules/storage';

export function $(id: string): HTMLElement | null {
    return document.getElementById(id);
}

export function setTextContent(id: string, text: string): void {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

export function setElementText(id: string, html: string): void {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

export function hideElement(id: string): void {
    const el = document.getElementById(id);
    if (el && el instanceof HTMLElement) el.style.display = 'none';
}

export function showElement(id: string): void {
    const el = document.getElementById(id);
    if (el && el instanceof HTMLElement) el.style.display = '';
}

export function bindTabSwitcher(config: {
    tabSelector: string;
    contentSelector: string;
    dataAttr: string;
    storageKey: string;
    tgStorageKey: string;
    buildContentId: (id: string) => string;
}): void {
    document.querySelectorAll(config.tabSelector).forEach(btn => {
        btn.addEventListener('click', function (this: HTMLElement) {
            const id = this.getAttribute(config.dataAttr);
            if (!id) return;
            document.querySelectorAll(config.tabSelector).forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            document.querySelectorAll(config.contentSelector).forEach(content => content.classList.remove('active'));
            this.classList.add('active');
            this.setAttribute('aria-selected', 'true');
            const contentEl = document.getElementById(config.buildContentId(id));
            if (contentEl) contentEl.classList.add('active');
            SYH_STORAGE.set({ [config.storageKey]: id, [config.tgStorageKey]: id });
        });
    });
}

export function bindDebouncedInput(
    element: HTMLElement | null,
    timerKey: string,
    timers: Map<string, ReturnType<typeof setTimeout>>,
    debounceMs: number,
    onDebounce: (val: string) => void
): void {
    if (!element) return;
    element.addEventListener('input', function () {
        const val = (this as HTMLInputElement | HTMLTextAreaElement).value;
        const existing = timers.get(timerKey);
        if (existing) clearTimeout(existing);
        timers.set(timerKey, setTimeout(() => onDebounce(val), debounceMs));
    });
}

export function renderLogEmptyState(
    container: HTMLElement | null,
    className: string,
    message: string,
    countElementId: string,
    detailsElementId: string
): void {
    if (!container) return;
    container.innerHTML = '';
    const div = document.createElement('div');
    div.className = className;
    div.style.color = '#9ca3af';
    div.style.padding = '6px';
    div.style.fontStyle = 'italic';
    div.textContent = message;
    container.appendChild(div);
    setTextContent(countElementId, '(0)');
    showElement(detailsElementId);
}

export function restoreActiveTabState(config: {
    tabSelector: string;
    contentSelector: string;
    dataAttr: string;
    activeId: string;
    buildContentId?: (id: string) => string;
}): void {
    if (!config.activeId) return;

    document.querySelectorAll(config.tabSelector).forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll(config.contentSelector).forEach(content => {
        content.classList.remove('active');
    });

    const activeBtn = document.querySelector<HTMLButtonElement>(
        `${config.tabSelector}[${config.dataAttr}="${config.activeId}"]`
    );
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.setAttribute('aria-selected', 'true');
    }

    const contentId = config.buildContentId
        ? config.buildContentId(config.activeId)
        : config.activeId;
    const activeContent = document.getElementById(contentId);
    if (activeContent) activeContent.classList.add('active');
}

export function cancelBatchRender(
    cancelKey: string,
    activeBatchCancel: Record<string, (() => void) | undefined>
): void {
    if (activeBatchCancel[cancelKey]) {
        activeBatchCancel[cancelKey]!();
        delete activeBatchCancel[cancelKey];
    }
}