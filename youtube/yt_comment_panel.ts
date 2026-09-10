// youtube/yt_comment_panel.ts
//
// Панель дій під коментарем YouTube: кнопки «до питань» / «до молитов»,
// плаваюча кнопка копіювання та чекбокс «прочитано».
//
// Виділено з `youtube/yt_ui.ts`, де `addButtonsToYTComment` була функцією на
// 57 рядків із чотирма майже однаковими блоками створення елементів.
//
// Склад кнопок більше НЕ описується тут: він береться з єдиного реєстру дій
// `modules/comment_actions.ts` (T1 аудиту 2026-09-08), спільного для
// StreamYard, YouTube і Studio. У цьому файлі лишились суто ютубівські речі:
// клас панелі, чекбокс «прочитано» та позначення тіла коментаря.
//
// Поведінка збережена 1-в-1 (див. tests/yt_ui_api.test.js, tests/comment_actions.test.js).

import { YT_SELECTORS } from './yt_selectors';
import { UiFactory } from '../modules/dom/ui_factory';
import { buildPlatformButtonConfigs } from '../modules/comments/comment_actions';
import { resolveSelector } from '../modules/registry/config';

const PANEL_CLASS = 'syh-yt-buttons';
const CHECKBOX_WRAP_CLASS = 'syh-yt-checkbox-wrap';
const COMMENT_BODY_CLASS = 'syh-yt-comment-body';
const CHECKBOX_TYPE = 'yt-comment';
const CHECKBOX_TITLE = 'Прочитано / Не прочитано';

function buildPanel(): HTMLElement {
    const container = document.createElement('div');
    container.className = PANEL_CLASS;

    buildPlatformButtonConfigs('youtube').forEach(config => container.appendChild(UiFactory.createButton(config)));

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
