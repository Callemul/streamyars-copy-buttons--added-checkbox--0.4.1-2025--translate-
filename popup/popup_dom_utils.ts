// Shared DOM utilities for popup modules
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