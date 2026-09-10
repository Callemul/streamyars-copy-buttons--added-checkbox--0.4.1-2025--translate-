import type { CommentStateActionId } from '../../modules/comments/comment_actions';
// youtube/studio/studio_comment_key.ts
import { STORAGE_KEYS } from '../../modules/storage';
import { RetentionService } from '../../modules/sheets/retention_service';

export const STUDIO_BUTTON_STATE_KEY = STORAGE_KEYS.STUDIO_BUTTON_STATE;
export const STUDIO_CHECKBOX_STATE_KEY = STORAGE_KEYS.STUDIO_CHECKBOX_STATE;

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
    state: CommentStateActionId;
    timestamp?: number;
}

/**
 * Delegates cleanup to central RetentionService
 */
export function cleanupStudioState(): Promise<void> {
    return RetentionService.runGlobalCleanup();
}

// Pure ESM module export
