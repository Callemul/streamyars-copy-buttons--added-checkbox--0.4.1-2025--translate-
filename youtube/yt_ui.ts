// youtube/yt_ui.ts
import { YT_SELECTORS } from './yt_selectors.ts';

export interface CommentData {
    id: string;
    author: string;
    text: string;
    videoId: string;
}

/**
 * Витягує ID коментаря з URL посилання (параметр lc=) або з DOM
 */
export function extractCommentId(commentNode: Element): string {
    if (!commentNode) return '';

    // 1. Пошук посилання з параметром lc=
    const linkEl = commentNode.querySelector(YT_SELECTORS.commentLink) || 
                   commentNode.querySelector('a[href*="lc="]');
    if (linkEl) {
        const href = linkEl.getAttribute('href') || '';
        const match = href.match(/lc=([^&]+)/);
        if (match && match[1]) {
            return match[1];
        }
    }

    // 2. Фолбек на ID вузла
    if (commentNode.id) {
        return commentNode.id;
    }

    // 3. Фолбек за атрибутами
    const dataCid = commentNode.getAttribute('data-cid') || commentNode.getAttribute('id');
    if (dataCid) return dataCid;

    // 4. Фолбек по автору та початку тексту
    const authorEl = commentNode.querySelector(YT_SELECTORS.commentAuthor);
    const textEl = commentNode.querySelector(YT_SELECTORS.commentText);
    const author = authorEl?.textContent?.trim() || 'unknown';
    const textSnippet = textEl?.textContent?.trim().slice(0, 20) || 'empty';
    
    // Простий хеш для стабільності
    let hash = 0;
    const str = `${author}_${textSnippet}`;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return `yt_${Math.abs(hash)}`;
}

/**
 * Отримує автора та текст коментаря
 */
export function extractCommentData(commentNode: Element): { author: string; text: string } {
    const authorEl = commentNode.querySelector(YT_SELECTORS.commentAuthor) || 
                     commentNode.querySelector('#author-text');
    const textEl = commentNode.querySelector(YT_SELECTORS.commentText);

    const author = authorEl?.textContent?.trim().replace(/^@/, '') || 'Автор';
    const originalText = textEl?.getAttribute('data-syh-original-text');
    const text = (originalText !== null && originalText !== undefined) 
        ? originalText.trim() 
        : (textEl?.textContent?.trim() || '');

    return { author, text };
}

/**
 * Додає кнопки "Додати до питань", "Додати до молитов", 📄 та чекбокс до коментаря YouTube
 */
export function addButtonsToYTComment(commentNode: Element): HTMLElement | null {
    if (!commentNode || commentNode.querySelector('.syh-yt-buttons')) {
        return null;
    }

    const headerAuthor = commentNode.querySelector(YT_SELECTORS.headerAuthor);
    if (!headerAuthor) return null;

    const container = document.createElement('div');
    container.className = 'syh-yt-buttons';

    // Кнопка "Додати до питань"
    const btnQuestion = document.createElement('button');
    btnQuestion.type = 'button';
    btnQuestion.className = 'syh-yt-btn syh-yt-btn-question';
    btnQuestion.innerText = 'Додати до питань';

    // Кнопка "Додати до молитов"
    const btnPrayer = document.createElement('button');
    btnPrayer.type = 'button';
    btnPrayer.className = 'syh-yt-btn syh-yt-btn-prayer';
    btnPrayer.innerText = 'Додати до молитов';

    // Плаваюча кнопка копіювання 📄
    const btnCopy = document.createElement('button');
    btnCopy.type = 'button';
    btnCopy.className = 'syh-yt-btn-copy';
    btnCopy.title = 'Копіювати текст коментаря (@автор\\n\\nтекст)';
    btnCopy.innerText = '📄';

    // Чекбокс
    const checkboxWrap = document.createElement('label');
    checkboxWrap.className = 'syh-yt-checkbox-wrap';
    checkboxWrap.title = 'Прочитано / Не прочитано';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'syh-yt-checkbox';

    checkboxWrap.appendChild(checkbox);

    container.appendChild(btnQuestion);
    container.appendChild(btnPrayer);
    container.appendChild(btnCopy);
    container.appendChild(checkboxWrap);

    headerAuthor.appendChild(container);

    // Додаємо клас user-select: none до тіла коментаря для ПКМ
    const bodyEl = commentNode.querySelector(YT_SELECTORS.commentBody);
    if (bodyEl) {
        bodyEl.classList.add('syh-yt-comment-body');
    }

    return container;
}

/**
 * Відновлює стан кнопок коментаря
 */
export function restoreButtonState(
    commentNode: Element,
    commentId: string,
    buttonStates: Record<string, 'question' | 'prayer'>
): void {
    const btnQuestion = commentNode.querySelector('.syh-yt-btn-question') as HTMLButtonElement | null;
    const btnPrayer = commentNode.querySelector('.syh-yt-btn-prayer') as HTMLButtonElement | null;

    if (!btnQuestion || !btnPrayer) return;

    const state = buttonStates[commentId];

    if (state === 'question') {
        btnQuestion.dataset.state = 'added';
        btnQuestion.innerText = 'Додано до питань';
        btnPrayer.dataset.state = '';
        btnPrayer.innerText = 'Додати до молитов';
    } else if (state === 'prayer') {
        btnPrayer.dataset.state = 'added';
        btnPrayer.innerText = 'Додано до молитов';
        btnQuestion.dataset.state = '';
        btnQuestion.innerText = 'Додати до питань';
    } else {
        btnQuestion.dataset.state = '';
        btnQuestion.innerText = 'Додати до питань';
        btnPrayer.dataset.state = '';
        btnPrayer.innerText = 'Додати до молитов';
    }
}

/**
 * Відновлює стан чекбоксу коментаря
 */
export function restoreCheckboxState(
    commentNode: Element,
    commentId: string,
    checkboxStates: Record<string, { checked: boolean; timestamp: number }>
): void {
    const checkbox = commentNode.querySelector('.syh-yt-checkbox') as HTMLInputElement | null;
    if (!checkbox) return;

    const entry = checkboxStates[commentId];
    const isChecked = !!(entry && entry.checked);

    checkbox.checked = isChecked;
    if (isChecked) {
        commentNode.classList.add('syh-yt-comment-checked');
    } else {
        commentNode.classList.remove('syh-yt-comment-checked');
    }
}
