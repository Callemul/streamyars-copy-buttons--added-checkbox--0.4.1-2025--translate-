/**
 * StreamYard Helper — скрол до активного елемента списку.
 *
 * Виокремлено з `ui_shared_utils.ts`. «Активним» вважається елемент, що містить
 * іконку `.lucide-circle-minus` — саме її StreamYard малює на поточному
 * банері/коментарі.
 */
import { SYH_UI_STATE } from './ui_state';
import { SYH_CONFIG, resolveSelectorString } from '../../registry/config';

/** Маркер активного елемента у списках StreamYard. */
const ACTIVE_ITEM_MARKER = '.lucide-circle-minus';

/** Найближчий прокручуваний контейнер StreamYard (клас містить «Scroll»). */
const SCROLL_PARENT_SELECTOR = resolveSelectorString(SYH_CONFIG.SELECTORS.scrollParent);

function findActiveItem(list: Element): HTMLElement | undefined {
    return Array.from(list.children).find(child => child.querySelector(ACTIVE_ITEM_MARKER)) as HTMLElement | undefined;
}

/** Без скрол-контейнера видимість перевірити нічим — скролимо завжди. */
function isItemVisibleInScrollParent(item: HTMLElement, scrollParent: Element): boolean {
    const rect = item.getBoundingClientRect();
    const parentRect = scrollParent.getBoundingClientRect();
    return rect.top >= parentRect.top && rect.bottom <= parentRect.bottom;
}

/** Плавно підводить активний елемент до центру, якщо він поза зоною видимості. */
export function scrollToActiveItem(listSelector: string): void {
    const list = document.querySelector(listSelector);
    if (!list) return;

    const activeLi = findActiveItem(list);
    if (!activeLi) return;

    const scrollParent = activeLi.closest(SCROLL_PARENT_SELECTOR);
    if (scrollParent && isItemVisibleInScrollParent(activeLi, scrollParent)) return;

    activeLi.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Скрол до активного коментаря у вкладці «Starred».
 * Порожній селектор -> скролити нікуди (раніше сюди летіло `undefined`,
 * і `querySelector` усередині так само не знаходив нічого).
 */
export function scrollToActiveComment(): void {
    const selectors = SYH_UI_STATE.SELECTORS || SYH_CONFIG.SELECTORS;
    const listSelector = resolveSelectorString(selectors.starredList);
    if (!listSelector) return;
    scrollToActiveItem(listSelector);
}
