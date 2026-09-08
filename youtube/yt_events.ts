import type { CommentStateActionId } from '../modules/comment_actions';
// youtube/yt_events.ts
import { CommentInjector } from '../modules/comment_injector';
import { YouTubeCommentAdapter } from './yt_adapter';
import type { YTCollectedItem } from '../modules/types';
import type { CommentStateCaches } from '../modules/comment_platform_adapter';
export type { YTCollectedItem };
export { getVideoId } from './yt_video_id';

export interface YTCaches extends CommentStateCaches {
    collectedList: YTCollectedItem[];
}

export function bindYTEvents(
    commentNode: Element,
    commentId: string,
    caches: {
        buttonStates: Record<string, CommentStateActionId>;
        checkboxStates: Record<string, { checked: boolean; timestamp: number }>;
        collectedList: YTCollectedItem[];
    }
): void {
    const ytCaches: YTCaches = {
        buttonStates: caches.buttonStates,
        checkboxStates: caches.checkboxStates,
        collectedList: caches.collectedList
    };
    const adapter = new YouTubeCommentAdapter();
    const injector = new CommentInjector(adapter, ytCaches);
    injector.bindCommentEvents(commentNode, commentId);
}
