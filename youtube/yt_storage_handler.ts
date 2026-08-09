import { STORAGE_KEYS, getSheetCollectedStorageKey } from '../modules/storage';
import { processAllYTComments, stateCache } from './yt_comment_processor';
import { cleanupYouTubeUI, initializeYouTubeModule } from './yt_init';
import {
    orEmptyRecord,
    readChangedValue,
    readYoutubeEnabled,
    resolveYoutubeToggleTransition,
    selectChangedEntries,
    type YoutubeToggleTransition
} from './yt_storage_rules';

/** Побічні ефекти для кожного напрямку перемикання модуля. */
const TOGGLE_EFFECTS: Record<YoutubeToggleTransition, () => void> = {
    enable: () => { initializeYouTubeModule(); },
    disable: () => { cleanupYouTubeUI(); },
    none: () => {}
};

export function handleOptionsChange(newOptions: Record<string, any>): void {
    const wasEnabled = stateCache.youtubeEnabled;
    stateCache.youtubeEnabled = readYoutubeEnabled(newOptions);

    TOGGLE_EFFECTS[resolveYoutubeToggleTransition(wasEnabled, stateCache.youtubeEnabled)]();
}

type ChangeHandler = (newValue: any) => void;

const changeHandlers: Record<string, ChangeHandler> = {
    [STORAGE_KEYS.OPTIONS]: (newValue) => handleOptionsChange(orEmptyRecord(newValue)),
    [STORAGE_KEYS.YT_BUTTON_STATES]: (newValue) => {
        stateCache.buttonStates = orEmptyRecord(newValue);
        processAllYTComments();
    },
    [STORAGE_KEYS.YT_CHECKBOX_STATE]: (newValue) => {
        stateCache.checkboxStates = orEmptyRecord(newValue);
        processAllYTComments();
    }
};

/** Зібрані у Google-таблицю коментарі приїжджають окремим ключем із префіксом аркуша. */
function applyCollectedListChange(changes: Record<string, any>): void {
    const collected = readChangedValue(changes, getSheetCollectedStorageKey('vp_ss'));
    if (collected) {
        stateCache.collectedList = collected;
    }
}

export function handleStorageChange(changes: Record<string, any>): void {
    for (const { key, newValue } of selectChangedEntries(changes, Object.keys(changeHandlers))) {
        changeHandlers[key](newValue);
    }

    applyCollectedListChange(changes);
}
