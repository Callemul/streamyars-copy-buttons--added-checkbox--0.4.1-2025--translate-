import type { CopyPayload } from './types';
import { getPrayerIcon, stripLeadingAt } from './utils';
import { resolveActionId } from '../../comments/comment_actions';

/**
 * Формує payload для копіювання за `data-action` кнопки StreamYard.
 *
 * Імена дій (`copy-comment`, `copy-author-comment`, `copy-prayer`) більше не
 * зашиті тут: вони живуть у реєстрі `modules/comment_actions.ts`, а сюди
 * приходить уже канонічний id. Форматування лишається платформним —
 * заголовки й шапки з іконками специфічні саме для StreamYard.
 */
export function formatCopyPayload(
    action: string | undefined,
    author: string,
    commentText: string,
    buttonNum: number
): CopyPayload {
    const actionId = resolveActionId('streamyard', action);

    if (actionId === 'copy') {
        return {
            header: "📄 Комент (без автора)",
            textToCopy: commentText,
            actionType: 'copy'
        };
    }
    if (actionId === 'question') {
        return {
            header: "📑 Автор і його ❓ питання",
            textToCopy: `@${author}\n\n${commentText}`,
            actionType: 'question'
        };
    }
    if (actionId === 'prayer') {
        const prayerIcon = getPrayerIcon(buttonNum);
        return {
            header: `📑 Автор і його ${prayerIcon}`,
            textToCopy: `\n\n\n${prayerIcon} @${author}\n\n${commentText}`,
            actionType: 'prayer',
            prayerIcon
        };
    }
    return { header: '', textToCopy: '', actionType: null };
}

export { getPrayerIcon, stripLeadingAt };