import { STORAGE_KEYS, getSheetCollectedStorageKey } from '../modules/storage';
import { processAllYTComments, stateCache } from './yt_comment_processor';
import { cleanupYouTubeUI, initializeYouTubeModule } from './yt_init';

export function handleOptionsChange(newOptions: Record<string, any>): void {
    const wasEnabled = stateCache.youtubeEnabled;
    stateCache.youtubeEnabled = newOptions.youtube_enabled !== false;

    if (!wasEnabled && stateCache.youtubeEnabled) {
        initializeYouTubeModule();
    } else if (wasEnabled && !stateCache.youtubeEnabled) {
        cleanupYouTubeUI();
    }
}

type ChangeHandler = (newValue: any) => void;

const changeHandlers: Record<string, ChangeHandler> = {
    [STORAGE_KEYS.OPTIONS]: (newValue) => handleOptionsChange(newValue || {}),
    [STORAGE_KEYS.YT_BUTTON_STATES]: (newValue) => {
        stateCache.buttonStates = newValue || {};
        processAllYTComments();
    },
    [STORAGE_KEYS.YT_CHECKBOX_STATE]: (newValue) => {
        stateCache.checkboxStates = newValue || {};
        processAllYTComments();
    }
};

export function handleStorageChange(changes: Record<string, any>): void {
    for (const [key, handler] of Object.entries(changeHandlers)) {
        if (changes[key]) {
            handler(changes[key].newValue);
        }
    }

    const vpSsCollectedKey = getSheetCollectedStorageKey('vp_ss');
    if (changes[vpSsCollectedKey]?.newValue) {
        stateCache.collectedList = changes[vpSsCollectedKey].newValue;
    }
}