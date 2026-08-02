// youtube/studio/studio_video_map.ts
import { SYH_STORAGE, STORAGE_KEYS } from '../../modules/storage.ts';
import { SheetId, SHEET_LABELS } from '../../modules/sheets.ts';
import { ChannelKey } from '../../modules/channel_config.ts';
import { VideoSheetMapEntry } from './studio_category_matcher.ts';

export const VIDEO_MAP_STORAGE_KEY = STORAGE_KEYS.STUDIO_VIDEO_SHEET_MAP;
export const MANUAL_OVERRIDE_LOG_KEY = STORAGE_KEYS.STUDIO_OVERRIDE_LOG;

export interface CorrectionLogEntry {
    timestamp: string;
    channelKey: ChannelKey;
    channelLabel: string;
    videoTitle: string;
    autoDetectedSheet: SheetId | null;
    assignedSheet: SheetId | 'auto_reset';
}

/**
 * Generate unique videoKey from video link href or title
 */
export function generateVideoKey(videoLinkHref: string | null, videoTitle: string): string {
    if (videoLinkHref && videoLinkHref.trim()) {
        try {
            // Standardize URL / pathname if full URL or relative href
            const url = new URL(videoLinkHref, 'https://studio.youtube.com');
            return url.pathname + url.search;
        } catch (e) {
            return videoLinkHref.trim();
        }
    }
    return (videoTitle || '').trim();
}

/**
 * Fetch syh_studio_video_sheet_map from storage
 */
export function getStudioVideoSheetMap(): Promise<Record<string, VideoSheetMapEntry>> {
    return new Promise((resolve) => {
        SYH_STORAGE.get([VIDEO_MAP_STORAGE_KEY], (res) => {
            const map = res[VIDEO_MAP_STORAGE_KEY] || {};
            resolve(map);
        });
    });
}

/**
 * Save manual override or reset for videoKey to syh_studio_video_sheet_map
 * and log to syh_studio_manual_override_log if manual override set/changed
 */
export function setStudioVideoSheetOverride(
    videoKey: string,
    sheetId: SheetId | null,
    channelKey: ChannelKey,
    channelLabel: string,
    videoTitle: string,
    autoDetectedSheet: SheetId | null
): Promise<Record<string, VideoSheetMapEntry>> {
    return new Promise((resolve) => {
        if (!videoKey) {
            getStudioVideoSheetMap().then(resolve);
            return;
        }

        SYH_STORAGE.get([VIDEO_MAP_STORAGE_KEY, MANUAL_OVERRIDE_LOG_KEY], (res) => {
            const map: Record<string, VideoSheetMapEntry> = res[VIDEO_MAP_STORAGE_KEY] || {};
            const log: CorrectionLogEntry[] = res[MANUAL_OVERRIDE_LOG_KEY] || [];

            if (sheetId === null) {
                // Reset to auto -> remove key from map
                delete map[videoKey];
            } else {
                map[videoKey] = {
                    sheetId,
                    source: 'manual',
                    channelKey,
                    videoTitle,
                    updatedAt: Date.now()
                };

                // Add log entry
                const logEntry: CorrectionLogEntry = {
                    timestamp: new Date().toISOString(),
                    channelKey,
                    channelLabel: channelLabel || channelKey,
                    videoTitle,
                    autoDetectedSheet,
                    assignedSheet: sheetId
                };

                log.push(logEntry);
                // Keep last 500 records
                if (log.length > 500) {
                    log.splice(0, log.length - 500);
                }
            }

            SYH_STORAGE.set(
                {
                    [VIDEO_MAP_STORAGE_KEY]: map,
                    [MANUAL_OVERRIDE_LOG_KEY]: log
                },
                () => {
                    resolve(map);
                }
            );
        });
    });
}

if (typeof window !== 'undefined') {
    (window as any).generateVideoKey = generateVideoKey;
    (window as any).getStudioVideoSheetMap = getStudioVideoSheetMap;
    (window as any).setStudioVideoSheetOverride = setStudioVideoSheetOverride;
}
