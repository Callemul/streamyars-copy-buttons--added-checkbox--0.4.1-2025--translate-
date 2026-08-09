// youtube/yt_ui.ts
import { YT_SELECTORS } from './yt_selectors';
import { UiFactory } from '../modules/ui_factory';
import { resolveSelector } from '../modules/config';
import { type ButtonStateType } from '../modules/comment_platform_adapter';

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
    const linkEl = resolveSelector(YT_SELECTORS.commentLink, commentNode) ||
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
    const authorEl = resolveSelector(YT_SELECTORS.commentAuthor, commentNode);
    const textEl = resolveSelector(YT_SELECTORS.commentText, commentNode);
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
    const authorEl = resolveSelector(YT_SELECTORS.commentAuthor, commentNode) ||
                     commentNode.querySelector('#author-text');
    const textEl = resolveSelector(YT_SELECTORS.commentText, commentNode);

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

    const headerAuthor = resolveSelector(YT_SELECTORS.headerAuthor, commentNode);
    if (!headerAuthor) return null;

    const container = document.createElement('div');
    container.className = 'syh-yt-buttons';

    // Кнопка "Додати до питань"
    const btnQuestion = UiFactory.createButton({
        action: 'add-question',
        icon: 'Додати до питань',
        title: 'Додати до питань',
        className: 'syh-yt-btn syh-yt-btn-question'
    });

    // Кнопка "Додати до молитов"
    const btnPrayer = UiFactory.createButton({
        action: 'add-prayer',
        icon: 'Додати до молитов',
        title: 'Додати до молитов',
        className: 'syh-yt-btn syh-yt-btn-prayer'
    });

    // Плаваюча кнопка копіювання 📄
    const btnCopy = UiFactory.createButton({
        action: 'copy-comment',
        icon: '📄',
        title: 'Копіювати текст коментаря (@автор\\n\\nтекст)',
        className: 'syh-yt-btn-copy'
    });

    // Чекбокс
    const { wrapper: checkboxWrap } = UiFactory.createCheckbox(
        'yt-comment',
        'Прочитано / Не прочитано'
    );
    checkboxWrap.className = 'syh-yt-checkbox-wrap';

    container.appendChild(btnQuestion);
    container.appendChild(btnPrayer);
    container.appendChild(btnCopy);
    container.appendChild(checkboxWrap);

    headerAuthor.appendChild(container);

    // Додаємо клас user-select: none до тіла коментаря для ПКМ
    const bodyEl = resolveSelector(YT_SELECTORS.commentBody, commentNode);
    if (bodyEl) {
        bodyEl.classList.add('syh-yt-comment-body');
    }

    return container;
}

/**
 * Встановлює візуальний стан кнопок питання/молитви на панелі коментаря.
 */
export function applyButtonVisualState(
    questionBtn: HTMLElement | null,
    prayerBtn: HTMLElement | null,
    state: ButtonStateType | null
): void {
    if (!questionBtn || !prayerBtn) return;

    if (state === 'question') {
        questionBtn.dataset.state = 'added';
        questionBtn.innerText = 'Додано до питань';
        prayerBtn.dataset.state = '';
        prayerBtn.innerText = 'Додати до молитов';
    } else if (state === 'prayer') {
        prayerBtn.dataset.state = 'added';
        prayerBtn.innerText = 'Додано до молитов';
        questionBtn.dataset.state = '';
        questionBtn.innerText = 'Додати до питань';
    } else {
        questionBtn.dataset.state = '';
        questionBtn.innerText = 'Додати до питань';
        prayerBtn.dataset.state = '';
        prayerBtn.innerText = 'Додати до молитов';
    }
}

/**
 * Встановлює візуальний стан чекбокса коментаря на панелі: галочка + CSS-клас.
 */
export function applyCheckboxStateFromCache(
    container: Element,
    commentId: string,
    checkboxStates: Record<string, { checked: boolean; timestamp: number }>
): void {
    const checkbox = container.querySelector('.syh-yt-checkbox') as HTMLInputElement | null;
    if (!checkbox) return;

    const entry = checkboxStates[commentId];
    const isChecked = !!(entry && entry.checked);

    checkbox.checked = isChecked;
    if (isChecked) {
        container.classList.add('syh-yt-comment-checked');
    } else {
        container.classList.remove('syh-yt-comment-checked');
    }
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
    const state = buttonStates[commentId] ?? null;
    applyButtonVisualState(btnQuestion, btnPrayer, state);
}

/**
 * Відновлює стан чекбоксу коментаря
 */
export function restoreCheckboxState(
    commentNode: Element,
    commentId: string,
    checkboxStates: Record<string, { checked: boolean; timestamp: number }>
): void {
    applyCheckboxStateFromCache(commentNode, commentId, checkboxStates);
}
