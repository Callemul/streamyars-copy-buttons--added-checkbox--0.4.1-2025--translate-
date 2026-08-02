// youtube/studio/studio_comment_key.ts
import { SYH_STORAGE, STORAGE_KEYS } from '../../modules/storage.ts';

export const STUDIO_BUTTON_STATE_KEY = STORAGE_KEYS.STUDIO_BUTTON_STATE;
export const STUDIO_CHECKBOX_STATE_KEY = STORAGE_KEYS.STUDIO_CHECKBOX_STATE;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Generate a deterministic hash string key from (videoTitle + authorName + commentText)
 */
export function generateCommentKey(videoTitle: string, authorName: string, commentText: string): string {
    const raw = `${(videoTitle || '').trim()}|${(authorName || '').trim()}|${(commentText || '').trim()}`;
    let hash1 = 5381;
    let hash2 = 0;
    for (let i = 0; i < raw.length; i++) {
        const char = raw.charCodeAt(i);
        hash1 = ((hash1 << 5) + hash1) ^ char;
        hash2 = ((hash2 << 7) - hash2) + char;
    }
    const h1 = (hash1 >>> 0).toString(16);
    const h2 = (hash2 >>> 0).toString(16);
    return `studio_c_${raw.length}_${h1}_${h2}`;
}

export interface StudioCheckboxStateEntry {
    checked: boolean;
    timestamp: number;
}

export interface StudioButtonStateEntry {
    state: 'question' | 'prayer';
    timestamp?: number;
}

/**
 * 30-day cleanup helper for syh_studio_checkbox_state and syh_studio_button_state
 */
export function cleanupStudioState(): Promise<void> {
    return new Promise((resolve) => {
        SYH_STORAGE.get([STUDIO_CHECKBOX_STATE_KEY, STUDIO_BUTTON_STATE_KEY], (res) => {
            const checkboxState: Record<string, StudioCheckboxStateEntry> = res[STUDIO_CHECKBOX_STATE_KEY] || {};
            const buttonState: Record<string, any> = res[STUDIO_BUTTON_STATE_KEY] || {};
            const now = Date.now();
            let changed = false;

            // Cleanup checkbox state older than 30 days
            Object.keys(checkboxState).forEach((key) => {
                const entry = checkboxState[key];
                if (entry && typeof entry === 'object' && entry.timestamp) {
                    if (now - entry.timestamp > THIRTY_DAYS_MS) {
                        delete checkboxState[key];
                        changed = true;
                    }
                }
            });

            // Cleanup button state older than 30 days if timestamp exists
            Object.keys(buttonState).forEach((key) => {
                const entry = buttonState[key];
                if (entry && typeof entry === 'object' && entry.timestamp) {
                    if (now - entry.timestamp > THIRTY_DAYS_MS) {
                        delete buttonState[key];
                        changed = true;
                    }
                }
            });

            if (changed) {
                SYH_STORAGE.set({
                    [STUDIO_CHECKBOX_STATE_KEY]: checkboxState,
                    [STUDIO_BUTTON_STATE_KEY]: buttonState
                }, () => resolve());
            } else {
                resolve();
            }
        });
    });
}

if (typeof window !== 'undefined') {
    (window as any).generateCommentKey = generateCommentKey;
    (window as any).cleanupStudioState = cleanupStudioState;
}
