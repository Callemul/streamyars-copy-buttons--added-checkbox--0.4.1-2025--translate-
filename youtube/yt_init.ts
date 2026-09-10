// youtube/yt_init.ts
//
// ПРИЗНАЧЕННЯ: підняття та згортання YouTube-модуля.
//
// СКЛАД (після декомпозиції CRAP-хотспота):
//   ./yt_bootstrap_rules — чисті правила читання стану зі сховища
//   ./yt_state           — спільний кеш стану модуля
//   ./yt_observer        — володіння підпискою на DOM-спостерігач

import { YT_SELECTORS } from './yt_selectors';
import { SYH_STORAGE, getSheetCollectedStorageKey } from '../modules/storage';
import { SYH_COMMENT_ASSISTANT } from '../modules/comments/assistant/index';
import { SYH_CONFIG } from '../modules/config';
import { isAllowedChannel } from './yt_channel_gate';
import { processAllYTComments, startObserver } from './yt_comment_processor';
import { stopCommentObserver } from './yt_observer';
import { YT_COLLECTED_SHEET_ID, stateCache } from './yt_state';
import { applyYtInitState, buildYtInitStorageKeys, resolveYtInitState } from './yt_bootstrap_rules';
import { CommentInjector } from '../modules/comments/comment_injector';

const DEFAULT_TRIGGER_WORDS = ['вопрос'];

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
    const collectedKey = getSheetCollectedStorageKey(YT_COLLECTED_SHEET_ID);

    const res = await SYH_STORAGE.getAsync(buildYtInitStorageKeys(collectedKey));
    const next = resolveYtInitState(res, collectedKey);

    stateCache.youtubeEnabled = next.youtubeEnabled;
    if (!next.youtubeEnabled) {
        console.log('[SYH YT] YouTube module is disabled in options');
        return;
    }

    applyYtInitState(stateCache, next);

    initializeCommentAssistant();
    processAllYTComments();
}

function initializeCommentAssistant(): void {
    SYH_COMMENT_ASSISTANT.init({
        SELECTORS: YT_SELECTORS,
        TRIGGER_WORDS: SYH_CONFIG?.TRIGGER_WORDS || DEFAULT_TRIGGER_WORDS
    });
}

export function cleanupYouTubeUI(): void {
    stopCommentObserver();
    document.querySelectorAll('.syh-yt-buttons').forEach(el => el.remove());
    document.querySelectorAll('.syh-yt-comment-checked').forEach(el => el.classList.remove('syh-yt-comment-checked'));
    document.querySelectorAll('[data-syh-yt-events-bound]').forEach(el => {
        CommentInjector.dispose(el, 'data-syh-yt-events-bound');
    });
}
