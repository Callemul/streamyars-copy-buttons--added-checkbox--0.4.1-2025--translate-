import type { CommentStateActionId } from '../modules/comments/comment_actions';
// youtube/yt_comment_visual_state.ts
//
// Візуальний стан коментаря YouTube: підпис/атрибути кнопок і галочка
// «прочитано». Виділено з `youtube/yt_ui.ts` у рамках декомпозиції.
//
// Тут навмисно немає ані запису у сховище, ані слухачів подій — лише чиста
// синхронізація DOM зі станом, який передали ззовні.
//
// Поведінка збережена 1-в-1 (див. tests/yt_ui_api.test.js).

import { type ButtonStateType } from '../modules/comments/comment_platform_adapter';

const CHECKED_COMMENT_CLASS = 'syh-yt-comment-checked';

const CHECKBOX_SELECTOR = '.syh-checkbox[data-type="yt-comment"]';

const QUESTION_LABELS = { idle: 'Додати до питань', active: 'Додано до питань' } as const;
const PRAYER_LABELS = { idle: 'Додати до молитов', active: 'Додано до молитов' } as const;

function applySingleButtonState(
    btn: HTMLElement,
    labels: { idle: string; active: string },
    isActive: boolean
): void {
    btn.dataset.state = isActive ? 'added' : '';
    btn.innerText = isActive ? labels.active : labels.idle;
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

    applySingleButtonState(questionBtn, QUESTION_LABELS, state === 'question');
    applySingleButtonState(prayerBtn, PRAYER_LABELS, state === 'prayer');
}

/**
 * Встановлює візуальний стан чекбокса коментаря на панелі: галочка + CSS-клас.
 */
export function applyCheckboxStateFromCache(
    container: Element,
    commentId: string,
    checkboxStates: Record<string, { checked: boolean; timestamp: number }>
): void {
    const checkbox = container.querySelector(CHECKBOX_SELECTOR) as HTMLInputElement | null;
    if (!checkbox) return;

    const entry = checkboxStates[commentId];
    const isChecked = !!(entry && entry.checked);

    checkbox.checked = isChecked;
    container.classList.toggle(CHECKED_COMMENT_CLASS, isChecked);
}

/**
 * Відновлює стан кнопок коментаря
 */
export function restoreButtonState(
    commentNode: Element,
    commentId: string,
    buttonStates: Record<string, CommentStateActionId>
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
