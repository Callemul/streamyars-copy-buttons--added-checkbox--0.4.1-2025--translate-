import type { CommentStateActionId } from '../../modules/comment_actions';
import type { VideoSheetMapEntry } from '../../modules/types';
import { SYH_COMMENT_ASSISTANT } from '../../modules/comment_assistant';
import { SYH_CONFIG } from '../../modules/config';
import { cleanupStudioState } from './studio_comment_key';
import { getStudioChannelInfo, type StudioChannelInfo } from './studio_channel';
import type { CommentPayload } from '../../modules/comment_service';
import type { SheetHeaderStats } from './studio_header_counters';

export async function initializeStudioModule(
    _caches?: StudioModuleCaches,
    _sheetStatsMap?: Record<string, SheetHeaderStats>
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

    const channelInfo = getStudioChannelInfo();
    return channelInfo;
}

export interface StudioModuleCaches {
    videoSheetMap: Record<string, VideoSheetMapEntry>;
    buttonStates: Record<string, CommentStateActionId>;
    checkboxStates: Record<string, { checked: boolean; timestamp: number }>;
    collectedItems: CommentPayload[];
}

