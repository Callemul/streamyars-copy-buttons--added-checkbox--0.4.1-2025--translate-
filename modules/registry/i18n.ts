/**
 * Module for handling internationalization (i18n) via chrome.i18n
 */

export interface I18nAdapter {
    getMessage(key: string, fallback?: string): string;
}

export const SYH_I18N: I18nAdapter = {
    getMessage(key: string, fallback: string = ''): string {
        if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getMessage === 'function') {
            try {
                const msg = chrome.i18n.getMessage(key);
                if (msg) return msg;
            } catch {
                // Extension context invalidated
            }
        }
        return fallback;
    }
};

if (typeof window !== 'undefined') {
    (window as any).SYH_I18N = SYH_I18N;
}
