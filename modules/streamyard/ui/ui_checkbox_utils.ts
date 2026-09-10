/**
 * StreamYard Helper — стан чекбоксів списків.
 *
 * Виокремлено з `ui_shared_utils.ts`. Тут живе лише DOM-представлення стану:
 * єдиним джерелом правди про «відмічено/ні» лишається `CommentService`
 * (правило Single Source of Truth з AGENTS.md), а цей модуль тільки
 * віддзеркалює його у розмітці.
 */
import { CommentService } from '../../comment_service';

/** Три можливі стани master-чекбокса списку. */
type MasterCheckboxState = { checked: boolean; indeterminate: boolean };

/**
 * Порожній список трактується як «нічого не відмічено», а не як
 * «усі відмічені» — інакше майстер-галочка стояла б на порожньому списку.
 */
function resolveMasterState(checkboxes: HTMLInputElement[]): MasterCheckboxState {
    const total = checkboxes.length;
    if (total === 0) return { checked: false, indeterminate: false };

    const checkedCount = checkboxes.filter(cb => cb.checked).length;
    if (checkedCount === 0) return { checked: false, indeterminate: false };
    if (checkedCount === total) return { checked: true, indeterminate: false };
    return { checked: false, indeterminate: true };
}

/** Приводить master-чекбокс до стану, що відповідає переданому набору. */
export function updateMasterCheckboxFromElements(
    masterCheckboxSelector: string,
    checkboxes: HTMLInputElement[]
): void {
    const masterCheckbox = document.querySelector<HTMLInputElement>(masterCheckboxSelector);
    if (!masterCheckbox) return;

    const { checked, indeterminate } = resolveMasterState(checkboxes);
    masterCheckbox.checked = checked;
    masterCheckbox.indeterminate = indeterminate;
}

/**
 * Відновлює галочку в щойно вставленому контейнері за кешем StreamYard.
 * Знята галочка навмисно не проставляється: свіжий DOM і так приходить чистим.
 */
export function restoreCheckboxFromCache(
    container: Element,
    textKey: string
): void {
    if (CommentService.getStreamYardCheckboxState(textKey)) {
        const checkbox = container.querySelector<HTMLInputElement>('.syh-checkbox');
        if (checkbox) checkbox.checked = true;
    }
}
