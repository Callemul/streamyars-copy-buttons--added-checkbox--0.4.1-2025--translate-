// youtube/yt_init.ts
import { YT_SELECTORS } from './yt_selectors';
import { SYH_STORAGE, STORAGE_KEYS, getSheetCollectedStorageKey } from '../modules/storage';
import { SYH_COMMENT_ASSISTANT } from '../modules/comment_assistant';
import { SYH_CONFIG } from '../modules/config';
import { isAllowedChannel } from './yt_channel_gate';
import { processAllYTComments, startObserver, stateCache, unregisterObserver } from './yt_comment_processor';

export async function initializeYouTubeModule(): Promise<void> {
    if (!isAllowedChannel()) {
        console.log('[SYH YT] YouTube module skipped: Channel is not in allowed list');
        cleanupYouTubeUI();
        return;
    }

    await loadStorageAndInitialize();
    startObserver();
    console.log('[SYH YT] YouTube module loaded successfully');
}

async function loadStorageAndInitialize(): Promise<void> {
    const vpSsCollectedKey = getSheetCollectedStorageKey('vp_ss');

    const res = await SYH_STORAGE.getAsync<Record<string, any>>([
        STORAGE_KEYS.OPTIONS,
        STORAGE_KEYS.YT_BUTTON_STATES,
        STORAGE_KEYS.YT_CHECKBOX_STATE,
        vpSsCollectedKey
    ]);

    const options = res[STORAGE_KEYS.OPTIONS] || {};
    stateCache.youtubeEnabled = options.youtube_enabled !== false;

    if (!stateCache.youtubeEnabled) {
        console.log('[SYH YT] YouTube module is disabled in options');
        return;
    }

    stateCache.buttonStates = res[STORAGE_KEYS.YT_BUTTON_STATES] || {};
    stateCache.checkboxStates = res[STORAGE_KEYS.YT_CHECKBOX_STATE] || {};
    stateCache.collectedList = res[vpSsCollectedKey] || [];

    initializeCommentAssistant();
    processAllYTComments();
}

function initializeCommentAssistant(): void {
    SYH_COMMENT_ASSISTANT.init({
        SELECTORS: YT_SELECTORS,
        TRIGGER_WORDS: SYH_CONFIG?.TRIGGER_WORDS || ['вопрос']
    });
}

export function cleanupYouTubeUI(): void {
    if (unregisterObserver) {
        unregisterObserver();
    }
    document.querySelectorAll('.syh-yt-buttons').forEach(el => el.remove());
}