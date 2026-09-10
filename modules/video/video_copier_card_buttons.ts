// modules/video_copier_card_buttons.ts
/**
 * Панель контролів у картці загального списку відео: «копіювати назву» та
 * «копіювати посилання». Виокремлено з `video_copier_ui.ts`.
 *
 * Обхід списку тримає СПІЛЬНИЙ `FreshScanState` на весь прохід, тому правило
 * «лише одна Суботня школа» працює в межах одного сканування, а не глобально.
 */
import {
    createFreshScanState,
    isFreshVideoCard,
    queryVideoCards,
    startOfToday,
    type FreshScanState
} from './video_copier_fresh';
import { CONTROLS_WRAP_STYLE } from './video_copier_theme';
import { buildVideoUrl, formatVideoShareText, readCardTitleText } from './video_copier_links';
import { copyAndFlash, createSquareButton, tempIconChange } from './video_copier_ui_kit';

export const PROCESSED_CARD_CLASS = 'syh-processed';
export const LIST_CONTROLS_CLASS = 'syh-list-controls';
export const CARD_MENU_SELECTOR = 'div[class*="MediaCardMenu"]';

/** Картка — це посилання, тому клік по контролях не має вести на сторінку відео. */
function stopCardNavigation(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
}

function createCopyTitleButton(videoTitle: string): HTMLButtonElement {
    const btn = createSquareButton('📝', 'Копіювати назву', () => {
        void copyAndFlash(
            videoTitle,
            () => tempIconChange(btn, '✅'),
            () => tempIconChange(btn, '❌')
        );
    });
    return btn;
}

/** Відсутній URL показується хрестиком, а не мовчазним нічого-не-сталося. */
async function copyVideoUrl(btn: HTMLElement, videoUrl: string | null): Promise<void> {
    if (!videoUrl) {
        tempIconChange(btn, '❌');
        return;
    }
    await copyAndFlash(
        formatVideoShareText(videoUrl),
        () => tempIconChange(btn, '✅'),
        () => tempIconChange(btn, '❌')
    );
}

function createCopyUrlButton(videoUrl: string | null): HTMLButtonElement {
    const btn = createSquareButton('🔗', 'Копіювати посилання', () => {
        void copyVideoUrl(btn, videoUrl);
    });
    return btn;
}

export function buildCardControls(card: Element): HTMLDivElement {
    const controlsWrap = document.createElement('div');
    controlsWrap.className = LIST_CONTROLS_CLASS;
    controlsWrap.style.cssText = CONTROLS_WRAP_STYLE;
    controlsWrap.addEventListener('click', stopCardNavigation);

    controlsWrap.appendChild(createCopyTitleButton(readCardTitleText(card)));
    controlsWrap.appendChild(createCopyUrlButton(buildVideoUrl(card.getAttribute('href'))));

    return controlsWrap;
}

export function appendButtonsToCard(card: Element): void {
    const menuContainer = card.querySelector(CARD_MENU_SELECTOR);
    if (!menuContainer?.parentNode) return;

    menuContainer.parentNode.insertBefore(buildCardControls(card), menuContainer);
}

function injectCardControls(card: Element, now: Date, state: FreshScanState): void {
    if (!isFreshVideoCard(card, now, state)) return;
    if (card.querySelector(`.${LIST_CONTROLS_CLASS}`)) return;
    appendButtonsToCard(card);
}

/**
 * Картка мітиться обробленою НЕЗАЛЕЖНО від того, чи отримала кнопки:
 * так несвіжі картки не перевіряються повторно на кожній мутації DOM.
 */
export function processVideoCard(card: Element, now: Date, state: FreshScanState): void {
    if (card.classList.contains(PROCESSED_CARD_CLASS)) return;
    injectCardControls(card, now, state);
    card.classList.add(PROCESSED_CARD_CLASS);
}

export function injectListButtons(): void {
    const now = startOfToday();
    const state = createFreshScanState();
    queryVideoCards().forEach(card => processVideoCard(card, now, state));
}
