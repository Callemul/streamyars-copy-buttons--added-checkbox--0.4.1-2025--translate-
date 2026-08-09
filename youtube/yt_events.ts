// youtube/yt_events.ts
import { CommentService } from '../modules/comment_service';
import { CommentInjector } from '../modules/comment_injector';
import { YouTubeCommentAdapter } from './yt_adapter';
import type { YTCollectedItem } from '../modules/types';
import type { CommentStateCaches } from '../modules/comment_platform_adapter';
export type { YTCollectedItem };

export function getVideoId(): string {
    if (typeof window === 'undefined') return '';
    try {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v') || '';
    } catch {
        return '';
    }
}

export async function copyToClipboard(text: string): Promise<boolean> {
    return CommentService.copyToClipboard(text);
}

export async function saveCollectedItem(
    item: YTCollectedItem,
    collectedList: YTCollectedItem[],
    sheetId: string = 'vp_ss'
): Promise<YTCollectedItem[]> {
    try {
        return (await CommentService.saveCollectedComment(sheetId, item)) as YTCollectedItem[];
    } catch {
        return collectedList;
    }
}

export interface YTCaches extends CommentStateCaches {
    collectedList: YTCollectedItem[];
}

export function bindYTEvents(
    commentNode: Element,
    commentId: string,
    caches: {
        buttonStates: Record<string, 'question' | 'prayer'>;
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
