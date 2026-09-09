import type { CommentStateActionId } from './comment_actions';
import type { SheetId } from './sheets';

export interface PrayerItem {
    id?: string;
    author: string;
    text: string;
    type?: string;
    icon?: string;
    roomId?: string;
    timestamp?: number;
}

export interface YTCollectedItem {
    id: string;
    author: string;
    text: string;
    type: CommentStateActionId;
    timestamp: number;
    videoId: string;
    videoTitle?: string;
}

export interface CommentData {
    id: string;
    author: string;
    text: string;
    videoId: string;
}

export type BannerCategory = 'stream' | 'audience' | 'prayer' | 'none';

export interface StudioOverrideLogEntry {
    timestamp: string;
    channelKey: 'vp' | 'slovo' | 'unknown';
    channelLabel: string;
    videoTitle: string;
    autoDetectedSheet: string | null;
    assignedSheet: string;
}

export interface CleaningLogEntry {
    before: string;
    after: string;
    removed: string;
    original?: string;
    cleaned?: string;
}

export interface ParsedTelegramItem {
    author: string;
    text: string;
    source: 'old' | 'new' | 'pray' | 'yt';
}

export interface DeletedLogEntry {
    originalId: number | string;
    author: string;
    type: 'block' | 'sub';
    count: number;
}

export type SyhMessageAction =
    | 'unstar_comment'
    | 'FETCH_PRAYERS'
    | 'PING'
    | 'GET_VERSION'
    | 'BACKGROUND_LOG';

export interface SyhRuntimeMessage {
    action?: SyhMessageAction;
    type?: string;
    text?: string;
    data?: unknown;
}


/**
 * Прив'язка відео Studio до аркуша.
 *
 * Форма збережених даних, тому живе тут, поруч із рештою таких форм, а не в
 * `youtube/studio/` — інакше `modules/storage_keys.ts` не міг би на неї
 * послатись, не порушивши напрямок залежностей (ARCHITECTURE §2).
 * `studio_category_matcher.ts` реекспортує її, щоб наявні імпорти не змінювались.
 */
export interface VideoSheetMapEntry {
    sheetId: SheetId;
    source: 'auto' | 'manual';
    channelKey?: string;
    videoTitle?: string;
    updatedAt?: number;
}


/**
 * Збережені розміри елемента, що змінює розмір (textarea попапу).
 *
 * Значення — CSS-рядки (`'300px'`), а не числа: саме так їх кладе
 * `setupResizeObserver` і саме так їх читає `applyElementSize`.
 * Форма збережених даних, тому живе тут (див. `VideoSheetMapEntry`).
 */
export interface StoredElementSize {
    width?: string;
    height?: string;
}
