export const SESSION_DRAFT_KEY = 'syh_banner_modal_draft';

export function saveDraft(text: string): void {
    try {
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(SESSION_DRAFT_KEY, text);
        }
    } catch {
        // Ignore sessionStorage errors
    }
}

export function restoreDraft(): string | null {
    try {
        if (typeof sessionStorage !== 'undefined') {
            return sessionStorage.getItem(SESSION_DRAFT_KEY);
        }
    } catch {
        // Ignore
    }
    return null;
}

export function clearDraft(): void {
    try {
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem(SESSION_DRAFT_KEY);
        }
    } catch {
        // Ignore
    }
}
