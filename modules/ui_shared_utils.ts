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
