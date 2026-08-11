/**
 * StreamYard Helper — форматування коментаря та запис у буфер обміну.
 *
 * Виокремлено з `comment_service.ts`: цей шар не знає ні про сховище, ні про
 * шину подій, тому тестується без жодних моків Chrome API.
 *
 * Стратегія копіювання свідомо двоступенева і повторює історичну поведінку:
 *   1) `navigator.clipboard.writeText` — основний шлях;
 *   2) прихована `<textarea>` + `document.execCommand('copy')` — фолбек для
 *      сторінок без дозволу на Clipboard API (StreamYard в iframe).
 */

/** Прибирає провідні «@» в автора і повертає канонічний блок для буфера. */
export function formatCommentForClipboard(author: string, text: string): string {
    const cleanAuthor = (author || '').trim().replace(/^@+/, '');
    const cleanText = (text || '').trim();
    return cleanAuthor ? `@${cleanAuthor}\n\n${cleanText}` : cleanText;
}

/** Основний шлях: асинхронний Clipboard API. `false` — якщо він недоступний або відмовив. */
async function tryClipboardApi(text: string): Promise<boolean> {
    try {
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch (err) {
        console.warn('[SYH CommentService] Clipboard API error, falling back to execCommand:', err);
    }
    return false;
}

/** Фолбек: тимчасова прихована `<textarea>` + `execCommand('copy')`. */
function tryExecCommandCopy(text: string): boolean {
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
    } catch (err) {
        console.error('[SYH CommentService] Copy failed:', err);
        return false;
    }
}

/** Безпечний запис у буфер обміну з фолбеком для усіх платформ. */
export async function writeTextToClipboard(text: string): Promise<boolean> {
    if (!text) return false;

    if (await tryClipboardApi(text)) return true;

    if (typeof document === 'undefined' || !document.body) {
        return false;
    }

    return tryExecCommandCopy(text);
}
