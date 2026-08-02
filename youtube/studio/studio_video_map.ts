// youtube/studio/studio_video_map.ts
import { SYH_STORAGE, STORAGE_KEYS } from '../../modules/storage';
import { SheetId } from '../../modules/sheets';
import { ChannelKey } from '../../modules/channel_config';
import { VideoSheetMapEntry } from './studio_category_matcher';
import type { StudioOverrideLogEntry } from '../../modules/types';

export const VIDEO_MAP_STORAGE_KEY = STORAGE_KEYS.STUDIO_VIDEO_SHEET_MAP;
export const MANUAL_OVERRIDE_LOG_KEY = STORAGE_KEYS.STUDIO_OVERRIDE_LOG;

/**
 * Generate unique videoKey from video link href or title
 */
export function generateVideoKey(videoLinkHref: string | null, videoTitle: string): string {
    if (videoLinkHref && videoLinkHref.trim()) {
        try {
            // Standardize URL / pathname if full URL or relative href
            const url = new URL(videoLinkHref, 'https://studio.youtube.com');
            return url.pathname + url.search;
        } catch (_e) {
            return videoLinkHref.trim();
        }
    }
    return (videoTitle || '').trim();
}

/**
 * Fetch syh_studio_video_sheet_map from storage
 */
export async function getStudioVideoSheetMap(): Promise<Record<string, VideoSheetMapEntry>> {
    const res = await SYH_STORAGE.getAsync<Record<string, any>>([VIDEO_MAP_STORAGE_KEY]);
    return res[VIDEO_MAP_STORAGE_KEY] || {};
}

/**
 * Save manual override or reset for videoKey to syh_studio_video_sheet_map
 * and log to syh_studio_manual_override_log if manual override set/changed
 */
export async function setStudioVideoSheetOverride(
    videoKey: string,
    sheetId: SheetId | null,
    channelKey: ChannelKey,
    channelLabel: string,
    videoTitle: string,
    autoDetectedSheet: SheetId | null
): Promise<Record<string, VideoSheetMapEntry>> {
    if (!videoKey) {
        return getStudioVideoSheetMap();
    }

    const res = await SYH_STORAGE.getAsync<Record<string, any>>([VIDEO_MAP_STORAGE_KEY, MANUAL_OVERRIDE_LOG_KEY]);
    const map: Record<string, VideoSheetMapEntry> = res[VIDEO_MAP_STORAGE_KEY] || {};
    const log: StudioOverrideLogEntry[] = res[MANUAL_OVERRIDE_LOG_KEY] || [];

    if (sheetId === null) {
        delete map[videoKey];
    } else {
        map[videoKey] = {
            sheetId,
            source: 'manual',
            channelKey,
            videoTitle,
            updatedAt: Date.now()
        };

        const logEntry: StudioOverrideLogEntry = {
            timestamp: new Date().toISOString(),
            channelKey,
            channelLabel: channelLabel || channelKey,
            videoTitle,
            autoDetectedSheet,
            assignedSheet: sheetId
        };

        log.push(logEntry);
        if (log.length > 500) {
            log.splice(0, log.length - 500);
        }
    }

    await SYH_STORAGE.setAsync({
        [VIDEO_MAP_STORAGE_KEY]: map,
        [MANUAL_OVERRIDE_LOG_KEY]: log
    });

    return map;
}

// Pure ESM module export
