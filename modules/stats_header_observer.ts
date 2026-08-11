/**
 * StreamYard Helper — спостерігач шапки StreamYard.
 *
 * Винесено з `modules/stats_tracker.ts` (`setupObservers()`): вибір цілі для
 * `MutationObserver`, «дебаунс» через `requestAnimationFrame` і початкова
 * відкладена ін'єкція кнопок жили одним замиканням.
 *
 * Поведінка збережена 1-в-1 (див. `tests/stats_tracker_api.test.js`, кейс 3):
 *   - `lastKnownBrand` скидається на початку;
 *   - попередній observer від'єднується перед створенням нового;
 *   - повторна ін'єкція виконується лише коли контролів у DOM уже немає.
 */

import { injectHeaderButtons, isHeaderControlsMounted, type StatsHeaderHost } from './stats_header_controls';

/** Затримка першої спроби ін'єкції: шапка StreamYard монтується не одразу. */
const INITIAL_INJECT_DELAY_MS = 1000;

const HEADER_CENTER_SELECTOR = '[data-testid="header-center"]';

/** Контракт трекера, потрібний спостерігачу шапки. */
export interface StatsObserverHost extends StatsHeaderHost {
    pendingRAF: number | null;
    observer: MutationObserver | null;
}

/**
 * Вузол, за піддеревом якого стежимо.
 * Пріоритет: контейнер шапки → будь-який `<header>` → `document.body`.
 */
function resolveObserverTarget(): Node {
    return document.querySelector(HEADER_CENTER_SELECTOR)?.parentElement
        || document.querySelector('header')
        || document.body;
}

/**
 * Піднімає спостерігач шапки і планує першу ін'єкцію кнопок.
 * Повторний виклик безпечний: попередній observer від'єднується.
 */
export function setupHeaderObserver(host: StatsObserverHost): void {
    host.lastKnownBrand = "";

    const injectControls = (): void => injectHeaderButtons(host);

    setTimeout(injectControls, INITIAL_INJECT_DELAY_MS);

    if (host.observer) {
        host.observer.disconnect();
    }

    host.observer = new MutationObserver(() => {
        if (host.pendingRAF !== null) return;
        host.pendingRAF = requestAnimationFrame(() => {
            host.pendingRAF = null;
            if (!isHeaderControlsMounted()) {
                injectControls();
            }
        });
    });

    host.observer.observe(resolveObserverTarget(), { childList: true, subtree: true });
}
