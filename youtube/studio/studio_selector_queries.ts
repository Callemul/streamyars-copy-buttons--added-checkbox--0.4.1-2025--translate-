// youtube/studio/studio_selector_queries.ts
//
// ПРИЗНАЧЕННЯ: низькорівневі примітиви DOM-запитів для селекторів Studio.
//
// Винесено з `studio_selectors.ts`, де кожен геттер повторював один і той самий
// патерн `resolveSelectorString(...)` + `querySelector(...)`, а `getVideoTitleText`
// і `getVideoLinkHref` дублювали ще й гілку «успадкування від батьківського треду»
// (саме вона давала `getVideoLinkHref` cognitive=16 у звіті Fallow).
//
// Поведінка збережена 1-в-1: масив селекторів так само склеюється в CSS-групу.

import { resolveSelectorString, type SelectorValue } from '../../modules/config';
import { PARENT_THREAD_SELECTOR } from './studio_selector_constants';

/** Корінь пошуку: документ або будь-який елемент-контейнер. */
export type StudioQueryRoot = Document | HTMLElement;

/** `querySelector` за `SelectorValue` (масив трактується як CSS-група). */
export function queryOne<T extends HTMLElement = HTMLElement>(
    root: StudioQueryRoot,
    selectorValue: SelectorValue
): T | null {
    return root.querySelector<T>(resolveSelectorString(selectorValue));
}

/** `querySelectorAll` за `SelectorValue`, завжди повертає масив (може бути порожнім). */
export function queryAll<T extends HTMLElement = HTMLElement>(
    root: StudioQueryRoot,
    selectorValue: SelectorValue
): T[] {
    return Array.from(root.querySelectorAll<T>(resolveSelectorString(selectorValue)));
}

/** Обрізаний `textContent` першого збігу або порожній рядок. */
export function readTrimmedText(root: StudioQueryRoot, selectorValue: SelectorValue): string {
    const el = queryOne(root, selectorValue);
    return el ? (el.textContent || '').trim() : '';
}

/**
 * REPLY INHERITANCE: читає значення в межах самого коментаря, а якщо результат
 * порожній (`''` / `null`) — перечитує його з батьківського треду.
 *
 * ⚠️ Фолбек зав'язаний на ЗНАЧЕННЯ, а не на наявність елемента: порожній
 * `#video-title` теж вмикає пошук у батька. Це історична поведінка.
 *
 * `typeof thread.closest !== 'function'` — захисна гілка для не-DOM-заглушок
 * (у тестах у геттери інколи передають прості об'єкти з одним `querySelector`).
 */
export function readWithThreadFallback<V>(
    thread: HTMLElement,
    read: (root: HTMLElement) => V
): V {
    const direct = read(thread);
    if (direct) return direct;
    if (typeof thread.closest !== 'function') return direct;

    const parentThread = thread.closest<HTMLElement>(PARENT_THREAD_SELECTOR);
    return parentThread ? read(parentThread) : direct;
}
