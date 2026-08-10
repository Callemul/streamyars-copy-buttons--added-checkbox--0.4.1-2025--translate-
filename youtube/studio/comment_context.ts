import type { CommentContext } from '../../modules/comment_platform_adapter';
import type { StudioCommentUIElements } from './studio_ui';
import type { StudioEventCaches } from './state_resolvers';
import { readCommentAuthor, readCommentBodyText, readVideoRef } from './comment_context_fields';

/** Підстановка для коментаря, з якого не вдалося витягти жодного тексту. */
const EMPTY_TEXT_PLACEHOLDER = '[comment]';

/**
 * Збирає `CommentContext` картки Studio для відновлення її UI-стану.
 *
 * Раніше — монолітна функція на 50 рядків (cyclomatic 13 / cognitive 12,
 * severity critical за `fallow health`) із вкладеним обходом DOM-вузлів
 * (cognitive 15). Читання окремих полів винесено в `./comment_context_fields`,
 * обхід вузлів — у спільний `./studio_comment_text`. Поведінка збережена 1-в-1.
 *
 * `channelKey` і `caches` лишаються в сигнатурі заради контракту викликачів
 * (`./ui_restorers`), хоча тіло ними не користується — див. звіт аудиту.
 */
export function getCommentContextForRestore(
    element: HTMLElement,
    commentKey: string,
    channelKey: string,
    caches: StudioEventCaches,
    getStudioUI: (element: Element) => StudioCommentUIElements | null
): CommentContext | null {
    const ui = getStudioUI(element);
    if (!ui) return null;

    // Порядок читань збережено з оригіналу: автор → текст → відео.
    const author = readCommentAuthor(element);
    const text = readCommentBodyText(element);
    const { videoTitle, videoKey } = readVideoRef(element);

    return {
        id: commentKey,
        author,
        text: text || EMPTY_TEXT_PLACEHOLDER,
        videoId: videoKey || '',
        videoTitle: videoTitle || ''
    };
}
