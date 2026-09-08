// modules/bootstrap_dom.ts
/**
 * Декларативна реєстрація DOM-спостерігачів StreamYard.
 * Таблиця `DOM_REGISTRATIONS` замінює лінійний ланцюжок викликів, який роздував складність `main.ts`.
 */
import { SYH_CONFIG, resolveFirstSelector, type SelectorValue } from './config';
import { SYH_UI } from './ui';
import { SYH_COMMENT_ASSISTANT } from './comment_assistant';
import { SYH_RIGHT_TABS_COMPACT } from './right_tabs_compact';
import { SYH_DOM_OBSERVER, type DomHandler } from './dom_observer';
import { bindStreamYardComment, unbindStreamYardComment } from './streamyard_comment_binding';

export const OBSERVER_CONTAINER_SELECTORS: readonly string[] = [
    '[data-testid="chat-container"]',
    '.chat-container',
    '#app',
    '#root'
];

export interface DomRegistration {
    selectorKey: string;
    onAdded: DomHandler;
    onRemoved?: DomHandler;
}

export interface DomObserverLike {
    register(selector: string, onAdded?: DomHandler, onRemoved?: DomHandler): unknown;
}

function onCommentAdded(el: Element): void {
    SYH_UI.addButtonsToComment(el);
    // Слухачі — одразу після вставки панелі: інакше `getButtons()` не знайде
    // кнопок і картка лишиться без обробників до наступної мутації (T7).
    bindStreamYardComment(el);
    SYH_COMMENT_ASSISTANT.processComment(el);
}

function onCommentRemoved(el: Element): void {
    unbindStreamYardComment(el);
    SYH_UI.filterStarredComments();
}

function onBannerAdded(el: Element): void {
    SYH_UI.addButtonsToBanner(el);
    SYH_UI.updateMasterCheckboxState();
    SYH_UI.filterBanners();
}

function onBannerRemoved(): void {
    SYH_UI.updateMasterCheckboxState();
    SYH_UI.filterBanners();
}

export const DOM_REGISTRATIONS: readonly DomRegistration[] = [
    { selectorKey: 'commentBlock', onAdded: onCommentAdded, onRemoved: onCommentRemoved },
    { selectorKey: 'bannerBlock', onAdded: onBannerAdded, onRemoved: onBannerRemoved },
    { selectorKey: 'bannerHeader', onAdded: el => SYH_UI.addBannerHeaderControls(el) },
    { selectorKey: 'starredHeaderWrap', onAdded: el => SYH_UI.addStarredTabControls(el) },
    { selectorKey: 'starredTabButton', onAdded: el => SYH_UI.addStarredTabCopyButton(el) },
    { selectorKey: 'rightTabButtons', onAdded: el => SYH_RIGHT_TABS_COMPACT.processTabButton(el as HTMLElement) }
];

/** Перший знайдений контейнер чату; фолбек — `document.body`. */
export function resolveObserverContainer(root: ParentNode = document): Element {
    const found = OBSERVER_CONTAINER_SELECTORS
        .map(selector => root.querySelector(selector))
        .find(el => el !== null);

    return found ?? document.body;
}

export function setupDomRegistration(
    observer: DomObserverLike = SYH_DOM_OBSERVER,
    selectors: Record<string, SelectorValue> = SYH_CONFIG.SELECTORS,
    registrations: readonly DomRegistration[] = DOM_REGISTRATIONS
): number {
    let registered = 0;

    for (const reg of registrations) {
        const selector = resolveFirstSelector(selectors[reg.selectorKey]);
        if (!selector) continue;

        observer.register(selector, reg.onAdded, reg.onRemoved);
        registered++;
    }

    return registered;
}
