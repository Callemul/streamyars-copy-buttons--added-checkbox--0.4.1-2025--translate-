// youtube/studio/studio_category_matcher.ts
import type { SheetId } from '../../modules/sheets';
import { matchCategory, type ChannelKey } from '../../modules/channel_config';

// Форма переїхала в `modules/types.ts` до решти збережених форм (T17, крок 3);
// реекспорт зберігає історичний контракт цього модуля.
import type { VideoSheetMapEntry } from '../../modules/types';
export type { VideoSheetMapEntry };

export interface CategoryMatchResult {
    sheetId: SheetId | null;
    source: 'auto' | 'manual' | 'unresolved';
}

/**
 * Resolves sheet category for a video using manual override from videoSheetMap if present,
 * otherwise falling back to auto-matching via matchCategory(videoTitle, channelKey).
 */
export function resolveCategoryForVideo(
    videoTitle: string,
    videoKey: string,
    channelKey: ChannelKey,
    videoSheetMap: Record<string, VideoSheetMapEntry> = {}
): CategoryMatchResult {
    // 1. Check manual override map
    if (videoKey && videoSheetMap[videoKey]) {
        const entry = videoSheetMap[videoKey];
        if (entry && entry.sheetId) {
            return {
                sheetId: entry.sheetId,
                source: entry.source || 'manual'
            };
        }
    }

    // 2. Auto-match if no manual override
    const autoSheet = matchCategory(videoTitle, channelKey);
    if (autoSheet) {
        return {
            sheetId: autoSheet,
            source: 'auto'
        };
    }

    return {
        sheetId: null,
        source: 'unresolved'
    };
}

// Pure ESM module export
