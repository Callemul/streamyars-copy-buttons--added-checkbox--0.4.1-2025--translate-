import { getPrayerIcon, stripLeadingAt } from './utils';

export function formatCopyPayload(
    action: string | undefined,
    author: string,
    commentText: string,
    buttonNum: number
): CopyPayload {
    if (action === 'copy-comment') {
        return {
            header: "📄 Комент (без автора)",
            textToCopy: commentText,
            actionType: 'copy'
        };
    }
    if (action === 'copy-author-comment') {
        return {
            header: "📑 Автор і його ❓ питання",
            textToCopy: `@${author}\n\n${commentText}`,
            actionType: 'question'
        };
    }
    if (action === 'copy-prayer') {
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