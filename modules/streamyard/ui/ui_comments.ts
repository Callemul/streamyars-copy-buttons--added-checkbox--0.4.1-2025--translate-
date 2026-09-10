/**
 * StreamYard Helper — кнопки дій усередині картки коментаря.
 *
 * Файл свідомо тонкий. Після рефакторингу CRAP-хотспотів (звіт Fallow 3.14)
 * тут лишилась одна відповідальність — побудова панелі кнопок коментаря, а
 * решта роз'їхалась по профільних модулях:
 *   - `ui_comment_labels`  — мітки `data-syh-type`;
 *   - `ui_comments_filter` — фільтрація, лічильники, порожній стан;
 *   - `ui_comments_copy`   — кнопка копіювання у вкладці Starred.
 *
 * Реекспорти нижче зберігають історичний контракт «усе про коментарі
 * імпортується з `ui_comments`», яким користуються фасад `ui.ts` і тести.
 * Циклу не виникає: профільні модулі не імпортують цей файл.
 */

import { SYH_UI_STATE } from './ui_state';
import { SYH_CONFIG, queryBySelectorValue } from '../../config';
import { UiFactory } from '../../ui_factory';
import { buildPlatformButtonConfigs } from '../../comments/comment_actions';
import { restoreCheckboxFromCache } from './ui_shared_utils';
import { applySavedLabels } from './ui_comment_labels';

const CHECKBOX_TITLE = 'Відмітити коментар як опрацьований';

function buildCommentButtonsContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'syh-custom-buttons-comment';

    // Склад і порядок кнопок — з єдиного реєстру дій (`modules/comment_actions.ts`),
    // спільного зі StreamYard-, YouTube- і Studio-панелями.
    buildPlatformButtonConfigs('streamyard').forEach(config => {
        container.appendChild(UiFactory.createButton(config));
    });

    const { wrapper: cbWrap } = UiFactory.createCheckbox('comment', CHECKBOX_TITLE);
    container.appendChild(cbWrap);

    return container;
}

/**
 * Вставляє панель кнопок у картку коментаря і відновлює її збережений стан
 * (чекбокс «опрацьовано» + мітку типу). Ідемпотентна.
 */
export function addButtonsToComment(commentNode: Element): void {
    const selectors = SYH_UI_STATE.SELECTORS || SYH_CONFIG.SELECTORS;
    const targetContainer = queryBySelectorValue(selectors.commentButtonContainer, commentNode);

    if (!targetContainer || targetContainer.querySelector('.syh-custom-buttons-comment')) {
        return;
    }

    targetContainer.appendChild(buildCommentButtonsContainer());

    const commentText = queryBySelectorValue(selectors.commentText, commentNode)?.textContent || '';

    restoreCheckboxFromCache(targetContainer, commentText);
    applySavedLabels(commentNode, commentText);
}

// --- Історичний публічний контракт модуля (реекспорти) ---

export { updateCommentVisuals, applySavedLabels } from './ui_comment_labels';

export {
    buildSortedCommentTexts,
    evalCategoryMatch,
    updateListItemOrdering,
    filterCommentListItems,
    updateCommentTabCounts,
    renderCommentEmptyState
} from './ui_comments_filter';

export { addStarredTabCopyButton } from './ui_comments_copy';
