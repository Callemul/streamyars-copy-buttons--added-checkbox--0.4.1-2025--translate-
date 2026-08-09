/**
 * StreamYard Helper — чисті правила кліків у списку молитовних прохань.
 *
 * Винесено з `popup/prayer_handlers_click.ts` (CRAP 42 за звітом Fallow).
 * Тут немає сховища, messaging та рендера — лише маршрутизація кліку та
 * детерміновані перетворення списку, які легко покрити тестами.
 *
 * Поведінка збережена 1-в-1 з оригінальним обробником.
 */

import { PRAYER_ENTRY_TYPE, readStoredPrayers } from './prayer_toolbar_actions';
import type { PrayerItem } from '../modules/types';

/** Спільні з тулбаром примітиви (Single Source of Truth для роботи зі списком). */
export { PRAYER_ENTRY_TYPE, readStoredPrayers };

/** Дія, яку користувач ініціює кліком у списку молитов. */
export type PrayerClickAction =
    | 'edit-author'
    | 'delete-author'
    | 'wipe-all'
    | 'keep-room'
    | 'delete-one';

/** Мінімальний контракт елемента, потрібний для маршрутизації кліку. */
export interface ClickTarget {
    closest(selector: string): Element | null;
}

/** Результат маршрутизації: що робити і над яким елементом. */
export interface PrayerClickRoute {
    action: PrayerClickAction;
    element: Element;
}

/** Атрибути, у яких DOM-рядки списку зберігають прив'язку до даних. */
export const AUTHOR_ATTR = 'data-author';
export const PRAYER_ID_ATTR = 'data-id';

export const WIPE_PRAYERS_CONFIRM_MESSAGE =
    "Повністю очистити старі молитви з пам'яті розширення?";

/**
 * Порядок має значення: перший селектор, що збігся, виграє,
 * решта обробників не викликається (як і в оригінальному `return`-ланцюжку).
 */
export const PRAYER_CLICK_ROUTES: ReadonlyArray<{ action: PrayerClickAction; selector: string }> = [
    { action: 'edit-author', selector: '.edit-prayer-btn' },
    { action: 'delete-author', selector: '.del-author-btn' },
    { action: 'wipe-all', selector: '#syh-wipe-prayers' },
    { action: 'keep-room', selector: '#syh-keep-prayers' },
    { action: 'delete-one', selector: '.del-prayer-btn' }
];

/** Знаходить першу дію, чий селектор збігається з ціллю кліку. */
export function resolvePrayerClickRoute(target: ClickTarget | null | undefined): PrayerClickRoute | null {
    if (!target) return null;

    for (const route of PRAYER_CLICK_ROUTES) {
        const element = target.closest(route.selector);
        if (element) return { action: route.action, element };
    }

    return null;
}

/** Текст підтвердження видалення всіх прохань одного автора. */
export function buildDeleteAuthorConfirm(author: string): string {
    return `Видалити всі прохання від @${author}?`;
}

/** Ім'я автора з кнопки «видалити автора»; відсутній атрибут = порожній рядок. */
export function readAuthorAttribute(el: Element): string {
    return el.getAttribute(AUTHOR_ATTR) || '';
}

/** Ідентифікатор прохання з кнопки «видалити прохання»; може бути `null`. */
export function readPrayerIdAttribute(el: Element): string | null {
    return el.getAttribute(PRAYER_ID_ATTR);
}

/** Розділення списку на «що прибираємо» та «що лишається». */
export interface PrayerSplit {
    removed: PrayerItem[];
    kept: PrayerItem[];
}

/** Ділить список за автором: усі його прохання проти решти. */
export function splitPrayersByAuthor(list: PrayerItem[], author: string): PrayerSplit {
    return {
        removed: list.filter(item => item.author === author),
        kept: list.filter(item => item.author !== author)
    };
}

/** Ділить список за ідентифікатором: одне прохання проти решти. */
export function splitPrayersById(list: PrayerItem[], id: string | null): PrayerSplit {
    const target = list.find(item => item.id === id);
    return {
        removed: target ? [target] : [],
        kept: list.filter(item => item.id !== id)
    };
}

/** `roomId` StreamYard — це шлях URL без слешів; невалідний URL дає `null`. */
export function extractRoomIdFromUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
        return new URL(url).pathname.replace(/\//g, '');
    } catch {
        return null;
    }
}

/**
 * Перепризначає молитви поточній кімнаті й оновлює їхній час.
 *
 * УВАГА: масив мутується на місці — саме так поводився оригінальний обробник,
 * і саме цей масив далі записується у сховище.
 */
export function stampPrayersWithRoom(list: PrayerItem[], roomId: string, now: number): PrayerItem[] {
    list.forEach(item => {
        if (item.type === PRAYER_ENTRY_TYPE) {
            item.roomId = roomId;
            item.timestamp = now;
        }
    });
    return list;
}

/** Перший URL серед активних вкладок; його відсутність зупиняє обробник. */
export function readActiveTabUrl(tabs: Array<{ url?: string }> | undefined | null): string | null {
    const first = tabs?.[0];
    if (!first || !first.url) return null;
    return first.url;
}
