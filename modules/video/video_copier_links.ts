// modules/video_copier_links.ts
/**
 * Чисті правила читання даних із картки/модалки StreamYard та побудови посилань.
 *
 * Виокремлено з `video_copier_ui.ts`: жодна функція тут не створює й не змінює
 * DOM, тому вони тестуються на простих стабах і перевикористовуються всіма
 * трьома шляхами копіювання (заголовок, модалка Share, картка списку).
 */
import { CARD_TITLE_SELECTOR } from './video_copier_fresh';

export const STREAMYARD_BASE_URL = 'https://streamyard.com';
export const SHARE_TEXT_PREFIX = 'Видео (в хорошем качестве)';

/** Канонічний блок «підпис + порожній рядок + URL», який лягає в буфер. */
export function formatVideoShareText(url: string): string {
    return `${SHARE_TEXT_PREFIX}\n\n${url}`;
}

/** `/abc123` → `https://streamyard.com/abc123`; `null` — якщо id відсутній. */
export function buildVideoUrl(href: string | null | undefined): string | null {
    const videoId = href ? href.split('/').pop() : '';
    return videoId ? `${STREAMYARD_BASE_URL}/${videoId}` : null;
}

/** Назва відео з картки списку з явним фолбеком замість порожнього рядка. */
export function readCardTitleText(card: Element): string {
    const titleElement = card.querySelector(CARD_TITLE_SELECTOR) as HTMLElement | null;
    return titleElement ? titleElement.innerText.trim() : 'Назву не знайдено';
}

/** Значення readonly-інпуту з модалки Share. */
export function readShareUrl(inputWrapper: Element): string | null {
    const inputField = inputWrapper.querySelector('input[readonly]') as HTMLInputElement | null;
    return inputField ? inputField.value : null;
}
