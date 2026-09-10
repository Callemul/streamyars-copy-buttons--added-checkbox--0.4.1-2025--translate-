/**
 * StreamYard Helper — володіння підпискою YouTube-модуля на DOM-спостерігач.
 *
 * Винесено з `youtube/yt_comment_processor.ts` (CRAP 42 за звітом Fallow).
 * Раніше дескриптор підписки (`export let unregisterObserver`) жив у процесорі
 * коментарів, а `yt_init` мутував його через імпорт — саме цей вузол
 * і зв'язував три модулі в один клубок.
 *
 * Модуль навмисно НЕ імпортує нічого з `yt_comment_processor`: обробник
 * коментарів передається аргументом, тож зворотного ребра графа не виникає.
 *
 * Поведінка збережена 1-в-1: `SYH_DOM_OBSERVER.register()` повертає
 * ідемпотентну функцію відписки (фільтрація за посиланням на реєстрацію).
 */

import { SYH_DOM_OBSERVER, type DomHandler } from '../modules/dom/dom_observer';

let unregister: (() => void) | null = null;

/** Чи YouTube-модуль зараз підписаний на DOM-спостерігач. */
export function isCommentObserverActive(): boolean {
    return unregister !== null;
}

/** Знімає поточну підписку, якщо вона є. */
export function stopCommentObserver(): void {
    if (!unregister) return;
    unregister();
    unregister = null;
}

/** Перепідписує YouTube-модуль на появу нових коментарів і запускає спостерігач. */
export function startCommentObserver(selector: string, onComment: DomHandler): void {
    stopCommentObserver();

    unregister = SYH_DOM_OBSERVER.register(selector, onComment);
    SYH_DOM_OBSERVER.start(document.body || document.documentElement);
}
