// youtube/studio/studio_thread_sorter.ts
import { getCommentThreads } from './studio_selectors';

export function getSortedCommentThreads(): HTMLElement[] {
    const threads = getCommentThreads();
    return threads.slice().sort((a, b) => {
        const aIsReply = a.hasAttribute('is-reply') ? 1 : 0;
        const bIsReply = b.hasAttribute('is-reply') ? 1 : 0;
        return aIsReply - bIsReply;
    });
}

export function isReplyThread(thread: Element): boolean {
    return thread.hasAttribute('is-reply');
}