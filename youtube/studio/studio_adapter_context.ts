/**
 * StreamYard Helper — чистий екстрактор контексту коментаря Studio.
 *
 * Винесено з `youtube/studio/studio_adapter.ts` (`StudioCommentAdapter.getCommentContext`).
 * Метод був повністю детермінований вхідним DOM-вузлом і не чіпляв стан класу,
 * тому його можна викликати і з `retroactiveUpdateVideoComments` напряму,
 * розриваючи циклічний імпорт (`retroactive`-функція більше не створює
 * екземпляр `StudioCommentAdapter`).
 *
 * Поведінка 1-в-1 (див. тест 6 `studio_integration.test.js` про reply-коментарі).
 */

import type { CommentContext } from '../../modules/comments/comment_platform_adapter';
import { getAuthorNameText, getCommentText } from './studio_selectors';
import { resolveReplyVideoMetadata } from './studio_dom_helpers';
import { generateVideoKey } from './studio_video_map';
import { generateCommentKey } from './studio_comment_key';

/**
 * Зчитує автора/текст/відео-метадані нитки в `CommentContext`.
 * Повертає `null`, якщо немає автора.
 */
export function getStudioCommentContext(threadEl: HTMLElement): CommentContext | null {
    const author = getAuthorNameText(threadEl);
    let text = getCommentText(threadEl);
    if (!author) return null;
    if (!text) text = '[comment]';

    const { videoTitle, videoHref } = resolveReplyVideoMetadata(threadEl);
    const videoKey = generateVideoKey(videoHref, videoTitle);
    const commentKey = generateCommentKey(videoTitle, author, text);

    return {
        id: commentKey,
        author,
        text,
        videoId: videoKey,
        videoTitle: videoTitle
    };
}
