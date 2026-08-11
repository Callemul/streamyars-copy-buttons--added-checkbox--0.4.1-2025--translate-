// youtube/yt_comment_panel.ts
//
// Панель дій під коментарем YouTube: кнопки «до питань» / «до молитов»,
// плаваюча кнопка копіювання та чекбокс «прочитано».
//
// Виділено з `youtube/yt_ui.ts`, де `addButtonsToYTComment` була функцією на
// 57 рядків із чотирма майже однаковими блоками створення елементів. Опис
// кнопок винесено в декларативну таблицю `PANEL_BUTTONS`.
//
// Поведінка збережена 1-в-1 (див. tests/yt_ui_api.test.js).

import { YT_SELECTORS } from './yt_selectors';
import { UiFactory, type ButtonConfig } from '../modules/ui_factory';
import { resolveSelector } from '../modules/config';

const PANEL_CLASS = 'syh-yt-buttons';
const CHECKBOX_WRAP_CLASS = 'syh-yt-checkbox-wrap';
const COMMENT_BODY_CLASS = 'syh-yt-comment-body';
const CHECKBOX_TYPE = 'yt-comment';
const CHECKBOX_TITLE = 'Прочитано / Не прочитано';

/** Порядок збережено з оригіналу: питання → молитви → копіювання. */
const PANEL_BUTTONS: ReadonlyArray<ButtonConfig> = [
    {
        action: 'add-question',
        icon: 'Додати до питань',
        title: 'Додати до питань',
        className: 'syh-yt-btn syh-yt-btn-question'
    },
    {
        action: 'add-prayer',
        icon: 'Додати до молитов',
        title: 'Додати до молитов',
        className: 'syh-yt-btn syh-yt-btn-prayer'
    },
    {
        action: 'copy-comment',
        icon: '📄',
        title: 'Копіювати текст коментаря (@автор\\n\\nтекст)',
        className: 'syh-yt-btn-copy'
    }
];

function buildPanel(): HTMLElement {
    const container = document.createElement('div');
    container.className = PANEL_CLASS;

    PANEL_BUTTONS.forEach(config => container.appendChild(UiFactory.createButton(config)));

    const { wrapper: checkboxWrap } = UiFactory.createCheckbox(CHECKBOX_TYPE, CHECKBOX_TITLE);
    checkboxWrap.className = CHECKBOX_WRAP_CLASS;
    container.appendChild(checkboxWrap);

    return container;
}

/** ПКМ по тілу коментаря має перемикати чекбокс, тому знімаємо виділення тексту. */
function markCommentBody(commentNode: Element): void {
    const bodyEl = resolveSelector(YT_SELECTORS.commentBody, commentNode);
    if (bodyEl) {
        bodyEl.classList.add(COMMENT_BODY_CLASS);
    }
}

/**
 * Додає кнопки "Додати до питань", "Додати до молитов", 📄 та чекбокс до коментаря YouTube
 */
export function addButtonsToYTComment(commentNode: Element): HTMLElement | null {
    if (!commentNode || commentNode.querySelector(`.${PANEL_CLASS}`)) {
        return null;
    }

    const headerAuthor = resolveSelector(YT_SELECTORS.headerAuthor, commentNode);
    if (!headerAuthor) return null;

    const container = buildPanel();
    headerAuthor.appendChild(container);

    markCommentBody(commentNode);

    return container;
}
