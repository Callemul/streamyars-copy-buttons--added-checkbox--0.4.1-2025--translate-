// youtube/yt_events.ts
import { YT_SELECTORS } from './yt_selectors';
import { extractCommentData, restoreButtonState, restoreCheckboxState } from './yt_ui';
import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage';

export interface YTCollectedItem {
    id: string;
    author: string;
    text: string;
    type: 'question' | 'prayer';
    timestamp: number;
    videoId: string;
}

export function getVideoId(): string {
    if (typeof window === 'undefined') return '';
    try {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v') || '';
    } catch {
        return '';
    }
}

/**
 * Копіює текст у буфер обміну з фолбеком
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch (err) {
        console.warn('[SYH YT] Clipboard API error, trying execCommand:', err);
    }

    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
    } catch (err) {
        console.error('[SYH YT] Copy failed:', err);
        return false;
    }
}

/**
 * Зберігає збираний коментар у syh_yt_collected
 */
export function saveCollectedItem(
    item: YTCollectedItem,
    collectedList: YTCollectedItem[]
): YTCollectedItem[] {
    const index = collectedList.findIndex(i => i.id === item.id);
    let updated: YTCollectedItem[];
    if (index >= 0) {
        updated = [...collectedList];
        updated[index] = item;
    } else {
        updated = [item, ...collectedList];
    }
    SYH_STORAGE.set({ [STORAGE_KEYS.YT_COLLECTED]: updated });
    return updated;
}

/**
 * Налаштовує обробники подій для кнопок, чекбоксу та ПКМ коментаря
 */
export function bindYTEvents(
    commentNode: Element,
    commentId: string,
    caches: {
        buttonStates: Record<string, 'question' | 'prayer'>;
        checkboxStates: Record<string, { checked: boolean; timestamp: number }>;
        collectedList: YTCollectedItem[];
    }
): void {
    if (!commentNode || (commentNode as HTMLElement).dataset.syhEventsBound === 'true') {
        return;
    }
    (commentNode as HTMLElement).dataset.syhEventsBound = 'true';

    const btnQuestion = commentNode.querySelector('.syh-yt-btn-question') as HTMLButtonElement | null;
    const btnPrayer = commentNode.querySelector('.syh-yt-btn-prayer') as HTMLButtonElement | null;
    const btnCopy = commentNode.querySelector('.syh-yt-btn-copy') as HTMLButtonElement | null;
    const checkbox = commentNode.querySelector('.syh-yt-checkbox') as HTMLInputElement | null;
    const bodyEl = commentNode.querySelector(YT_SELECTORS.commentBody) as HTMLElement | null;

    // Спільна функція установки чекбоксу при додаванні
    const autoCheck = () => {
        if (!checkbox) return;
        checkbox.checked = true;
        commentNode.classList.add('syh-yt-comment-checked');
        caches.checkboxStates[commentId] = {
            checked: true,
            timestamp: Date.now()
        };
        SYH_STORAGE.set({ [STORAGE_KEYS.YT_CHECKBOX_STATE]: caches.checkboxStates });
    };

    // 1. Клік "Додати до питань"
    if (btnQuestion) {
        btnQuestion.addEventListener('click', async (e) => {
            e.stopPropagation();
            const { author, text } = extractCommentData(commentNode);
            const formatted = `@${author}\n\n${text}`;
            await copyToClipboard(formatted);

            // Оновлення кнопок
            btnQuestion.innerText = 'Скопійовано';
            btnQuestion.dataset.state = 'added';
            if (btnPrayer) {
                btnPrayer.dataset.state = '';
                btnPrayer.innerText = 'Додати до молитов';
            }

            setTimeout(() => {
                btnQuestion.innerText = 'Додано до питань';
            }, 1500);

            // Кеш кнопок
            caches.buttonStates[commentId] = 'question';
            SYH_STORAGE.set({ [STORAGE_KEYS.YT_BUTTON_STATES]: caches.buttonStates });

            // Збереження у зібрані
            const item: YTCollectedItem = {
                id: commentId,
                author,
                text,
                type: 'question',
                timestamp: Date.now(),
                videoId: getVideoId()
            };
            caches.collectedList = saveCollectedItem(item, caches.collectedList);

            // Авто-чекбокс
            autoCheck();
        });
    }

    // 2. Клік "Додати до молитов"
    if (btnPrayer) {
        btnPrayer.addEventListener('click', async (e) => {
            e.stopPropagation();
            const { author, text } = extractCommentData(commentNode);
            const formatted = `@${author}\n\n${text}`;
            await copyToClipboard(formatted);

            // Оновлення кнопок
            btnPrayer.innerText = 'Скопійовано';
            btnPrayer.dataset.state = 'added';
            if (btnQuestion) {
                btnQuestion.dataset.state = '';
                btnQuestion.innerText = 'Додати до питань';
            }

            setTimeout(() => {
                btnPrayer.innerText = 'Додано до молитов';
            }, 1500);

            // Кеш кнопок
            caches.buttonStates[commentId] = 'prayer';
            SYH_STORAGE.set({ [STORAGE_KEYS.YT_BUTTON_STATES]: caches.buttonStates });

            // Збереження у зібрані
            const item: YTCollectedItem = {
                id: commentId,
                author,
                text,
                type: 'prayer',
                timestamp: Date.now(),
                videoId: getVideoId()
            };
            caches.collectedList = saveCollectedItem(item, caches.collectedList);

            // Авто-чекбокс
            autoCheck();
        });
    }

    // 3. Клік 📄 (копіювати)
    if (btnCopy) {
        btnCopy.addEventListener('click', async (e) => {
            e.stopPropagation();
            const { author, text } = extractCommentData(commentNode);
            const formatted = `@${author}\n\n${text}`;
            const success = await copyToClipboard(formatted);

            const origText = btnCopy.innerText;
            btnCopy.innerText = success ? '✓' : '❌';
            btnCopy.classList.add('syh-copied-flash');
            setTimeout(() => {
                btnCopy.innerText = origText;
                btnCopy.classList.remove('syh-copied-flash');
            }, 1200);
        });
    }

    // 4. Зміна Checkbox
    if (checkbox) {
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            const isChecked = checkbox.checked;
            if (isChecked) {
                commentNode.classList.add('syh-yt-comment-checked');
            } else {
                commentNode.classList.remove('syh-yt-comment-checked');
            }
            caches.checkboxStates[commentId] = {
                checked: isChecked,
                timestamp: Date.now()
            };
            SYH_STORAGE.set({ [STORAGE_KEYS.YT_CHECKBOX_STATE]: caches.checkboxStates });
        });
    }

    // 5. ПКМ на #body (тіло коментаря) — тогл чекбоксу
    if (bodyEl && checkbox) {
        bodyEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }
}
