/**
 * StreamYard Helper — спільний кеш стану YouTube-модуля.
 *
 * Винесено з `youtube/yt_comment_processor.ts` (CRAP 42 за звітом Fallow):
 * раніше «процесор коментарів» був заразом і сховищем стану, тож
 * `yt_init` та `yt_storage_handler` імпортували його заради двох змінних.
 * Тепер стан живе окремо і не тягне за собою ані DOM, ані chrome-API.
 */

import type { YTCollectedItem } from '../modules/types';

export interface StateCache {
    buttonStates: Record<string, 'question' | 'prayer'>;
    checkboxStates: Record<string, { checked: boolean; timestamp: number }>;
    collectedList: YTCollectedItem[];
    youtubeEnabled: boolean;
}

/** Аркуш Google-таблиці, у який збираються коментарі з YouTube. */
export const YT_COLLECTED_SHEET_ID = 'vp_ss';

export const stateCache: StateCache = {
    buttonStates: {},
    checkboxStates: {},
    collectedList: [],
    youtubeEnabled: true
};
