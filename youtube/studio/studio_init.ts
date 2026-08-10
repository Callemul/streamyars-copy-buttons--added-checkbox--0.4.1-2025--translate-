import { SYH_STORAGE, getSheetCollectedStorageKey } from '../../modules/storage';
import { STORAGE_KEYS } from '../../modules/storage_keys';
import { VIDEO_MAP_STORAGE_KEY } from './studio_video_map';
import { SYH_COMMENT_ASSISTANT } from '../../modules/comment_assistant';
import { SYH_CONFIG } from '../../modules/config';
import { cleanupStudioState, STUDIO_BUTTON_STATE_KEY, STUDIO_CHECKBOX_STATE_KEY } from './studio_comment_key';
import { getAllSheetIds } from '../../modules/sheets';
import { getStudioChannelInfo, type StudioChannelInfo } from './studio_channel';
import { buildCollectedAggregation } from './studio_aggregator';
import type { CommentPayload } from '../../modules/comment_service';
import type { SheetHeaderStats } from './studio_header_counters';

export async function initializeStudioModule(
    caches: StudioModuleCaches,
    sheetStatsMap: Record<string, SheetHeaderStats>
): Promise<StudioChannelInfo | null> {
    SYH_COMMENT_ASSISTANT.init({
        SELECTORS: {
            commentBlock: 'ytcp-comment',
            commentText: '#content-text'
        },
        TRIGGER_WORDS_QUESTION: SYH_CONFIG.TRIGGER_WORDS_QUESTION,
        TRIGGER_WORDS_PRAYER: SYH_CONFIG.TRIGGER_WORDS_PRAYER,
        TRIGGER_WORDS: SYH_CONFIG.TRIGGER_WORDS
    });

    await cleanupStudioState().catch((err) => console.warn('[SYH Studio] Cleanup error:', err));

    await loadStorageData(caches, sheetStatsMap);

    const channelInfo = getStudioChannelInfo();
    return channelInfo;
}

export interface StudioModuleCaches {
    videoSheetMap: Record<string, string>;
    buttonStates: Record<string, 'question' | 'prayer'>;
    checkboxStates: Record<string, { checked: boolean; timestamp: number }>;
    collectedItems: CommentPayload[];
}

async function loadStorageData(
    caches: StudioModuleCaches,
    sheetStatsMap: Record<string, SheetHeaderStats>
): Promise<void> {
    const sheetIds = getAllSheetIds();
    const collectedKeys = sheetIds.map((sId) => getSheetCollectedStorageKey(sId));
    const keysToFetch = [
        STORAGE_KEYS.STUDIO_ENABLED,
        VIDEO_MAP_STORAGE_KEY,
        STUDIO_BUTTON_STATE_KEY,
        STUDIO_CHECKBOX_STATE_KEY,
        ...collectedKeys
    ];

    const res = await SYH_STORAGE.getAsync<Record<string, any>>(keysToFetch);
    caches.videoSheetMap = res[VIDEO_MAP_STORAGE_KEY] || {};
    caches.buttonStates = res[STUDIO_BUTTON_STATE_KEY] || {};
    caches.checkboxStates = res[STUDIO_CHECKBOX_STATE_KEY] || {};

    const { collectedItems, sheetStatsMap: stats } = buildCollectedAggregation(res, sheetIds);
    caches.collectedItems = collectedItems;
    Object.assign(sheetStatsMap, stats);
}