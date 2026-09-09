import type { VideoSheetMapEntry } from '../../modules/types';
import type { CommentActionStateType, CommentStateActionId } from '../../modules/comment_actions';
// youtube/studio/state_resolvers.ts
import { generateCommentKey } from './studio_comment_key';
import type { CommentContext, CommentStateCaches } from '../../modules/comment_platform_adapter';

export interface StudioEventCaches extends CommentStateCaches {
    videoSheetMap: Record<string, VideoSheetMapEntry>;
    collectedItems?: CommentPayload[];
}

type CommentPayload = {
    id: string;
    author: string;
    text: string;
    type: CommentStateActionId;
    timestamp: number;
    videoId?: string;
    videoTitle?: string;
};

type ButtonStateType = CommentActionStateType;

function findInCollectedItems(
    commentKey: string,
    ctx: CommentContext | null,
    collectedItems: CommentPayload[] | undefined
): CommentPayload | undefined {
    if (!collectedItems) return undefined;
    return collectedItems.find(item =>
        item.id === commentKey ||
        (ctx && item.author === ctx.author && item.text === ctx.text)
    );
}

export function getEffectiveButtonState(
    commentKey: string,
    ctx: CommentContext | null,
    caches: StudioEventCaches
): ButtonStateType {
    let state = caches.buttonStates[commentKey] || null;
    if (!state && ctx) {
        const fallbackKey = generateCommentKey('', ctx.author, ctx.text);
        state = caches.buttonStates[fallbackKey] || null;
    }
    if (!state && ctx) {
        const found = findInCollectedItems(commentKey, ctx, caches.collectedItems);
        if (found) {
            state = found.type;
        }
    }
    return state;
}

export function getEffectiveCheckboxState(
    commentKey: string,
    ctx: CommentContext | null,
    caches: StudioEventCaches
): boolean {
    let checked = caches.checkboxStates[commentKey]?.checked || false;
    if (!checked && ctx) {
        const fallbackKey = generateCommentKey('', ctx.author, ctx.text);
        checked = caches.checkboxStates[fallbackKey]?.checked || false;
    }
    if (!checked && ctx) {
        const found = findInCollectedItems(commentKey, ctx, caches.collectedItems);
        if (found) {
            checked = true;
        }
    }
    return checked;
}