// modules/video_copier_ui.ts
/**
 * UI-шар копіювача відео StreamYard: фабрика кнопок та їх ін'єкція у сторінку.
 * Логіка «свіжості» живе у `video_copier_fresh`, сценарій завантаження — у `video_copier_downloader`.
 */
import { UiFactory } from './ui_factory';
import {
    CARD_TITLE_SELECTOR,
    VIDEO_CARD_SELECTOR,
    createFreshScanState,
    isFreshVideoCard,
    queryVideoCards,
    startOfToday,
    type FreshScanState
} from './video_copier_fresh';
import { downloadAllFreshVideos } from './video_copier_downloader';

export const STREAMYARD_BASE_URL = 'https://streamyard.com';
export const SHARE_TEXT_PREFIX = 'Видео (в хорошем качестве)';
export const PROCESSED_CARD_CLASS = 'syh-processed';
export const LIST_CONTROLS_CLASS = 'syh-list-controls';
export const MODAL_BUTTON_ID = 'syh-url-btn';
export const MASTER_BUTTON_ID = 'syh-master-download-btn';
export const TITLE_BUTTON_CLASS = 'syh-title-btn';
export const FEEDBACK_DELAY_MS = 2000;

export const TITLE_WRAPPER_SELECTOR = 'div[class*="TitleWrapper"]';
export const SHARE_MODAL_SELECTOR = 'div[aria-label="embed-modal-content-share"]';
export const COPY_INPUT_WRAPPER_SELECTOR = 'div[class*="CopyInputWrapper"]';
export const CARD_MENU_SELECTOR = 'div[class*="MediaCardMenu"]';
export const LIST_WRAP_SELECTOR = 'div[class*="ListWrap"]';

export const LABELS = {
    copyTitle: '📋 Копіювати назву',
    copied: '✅ Скопійовано!',
    copyUrl: '🚀 Копіювати URL + Текст (Видео в хорошем качестве)',
    copyUrlDone: '✅ Успішно скопійовано!',
    downloadAll: '📥 Завантажити всі свіжі відео (Video Only)',
    downloadRunning: '⏳ Запускаю завантаження... Не чіпайте мишку!',
    downloadDone: '✅ Всі завантаження ініційовано!'
} as const;

const CONTROLS_WRAP_STYLE = 'display: flex; gap: 8px; margin-right: 12px; z-index: 10; position: relative;';

const TITLE_BUTTON_STYLE = `
    padding: 8px 16px;
    background-color: #28a745 !important; 
    color: white !important;
    border: none !important;
    border-radius: 6px !important;
    cursor: pointer !important;
    height: 45px !important;
    font-weight: bold !important;
    font-size: 14px !important;
    white-space: nowrap;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const MODAL_BUTTON_STYLE = `
    width: 100% !important;
    height: 80px !important; 
    background-color: #28a745 !important;
    color: white !important;
    border: none !important;
    border-radius: 8px !important;
    font-size: 16px !important;
    font-weight: bold !important;
    cursor: pointer !important;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
    transition: background-color 0.2s;
`;

const SQUARE_BUTTON_STYLE = `
    width: 32px;
    height: 32px;
    border-radius: 4px;
    border: 1px solid #ddd;
    background-color: #fff;
    color: #4F5461;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    padding: 0;
`;

const MASTER_BUTTON_STYLE = `
    display: block; width: 100%; padding: 15px; margin-bottom: 20px;
    background-color: #005DF7; color: white; font-size: 16px; font-weight: bold;
    border: none; border-radius: 8px; cursor: pointer;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: 0.2s;
`;

// --- Чисті хелпери ---

export function formatVideoShareText(url: string): string {
    return `${SHARE_TEXT_PREFIX}\n\n${url}`;
}

/** `/abc123` → `https://streamyard.com/abc123`; `null` — якщо id відсутній. */
export function buildVideoUrl(href: string | null | undefined): string | null {
    const videoId = href ? href.split('/').pop() : '';
    return videoId ? `${STREAMYARD_BASE_URL}/${videoId}` : null;
}

export function readCardTitleText(card: Element): string {
    const titleElement = card.querySelector(CARD_TITLE_SELECTOR) as HTMLElement | null;
    return titleElement ? titleElement.innerText.trim() : 'Назву не знайдено';
}

export function readShareUrl(inputWrapper: Element): string | null {
    const inputField = inputWrapper.querySelector('input[readonly]') as HTMLInputElement | null;
    return inputField ? inputField.value : null;
}

// --- Дрібні UI-примітиви ---

export function applyHoverColors(btn: HTMLElement, base: string, hover: string): void {
    btn.onmouseover = () => { btn.style.backgroundColor = hover; };
    btn.onmouseout = () => { btn.style.backgroundColor = base; };
}

export function tempIconChange(btn: HTMLElement, tempIcon: string, delayMs: number = FEEDBACK_DELAY_MS): void {
    const originalIcon = btn.innerHTML;
    btn.innerHTML = tempIcon;
    setTimeout(() => { btn.innerHTML = originalIcon; }, delayMs);
}

export function tempLabelChange(
    btn: HTMLElement,
    tempLabel: string,
    restoreLabel: string,
    delayMs: number = FEEDBACK_DELAY_MS
): void {
    btn.innerText = tempLabel;
    setTimeout(() => { btn.innerText = restoreLabel; }, delayMs);
}

export async function copyAndFlash(text: string, onCopied: () => void): Promise<void> {
    await navigator.clipboard.writeText(text);
    onCopied();
}

export function createSquareButton(
    icon: string,
    tooltipText: string,
    onClickCallback: (e: MouseEvent) => void
): HTMLButtonElement {
    const btn = UiFactory.createButton({
        action: 'copier-action',
        icon: icon,
        title: tooltipText,
        className: 'syh-square-btn',
        onClick: onClickCallback
    });

    btn.style.cssText = SQUARE_BUTTON_STYLE;
    btn.onmouseover = () => {
        btn.style.backgroundColor = '#f4f4f9';
        btn.style.borderColor = '#ccc';
    };
    btn.onmouseout = () => {
        btn.style.backgroundColor = '#fff';
        btn.style.borderColor = '#ddd';
    };

    return btn;
}

// --- КНОПКА 1: Біля заголовка H2 (на сторінці одного відео) ---

function buildTitleButton(h2: HTMLElement): HTMLButtonElement {
    const btnTitle = document.createElement('button');
    btnTitle.className = TITLE_BUTTON_CLASS;
    btnTitle.innerText = LABELS.copyTitle;
    btnTitle.style.cssText = TITLE_BUTTON_STYLE;
    applyHoverColors(btnTitle, '#28a745', '#218838');

    btnTitle.onclick = (e: MouseEvent) => {
        e.preventDefault();
        void copyAndFlash(h2.innerText.trim(), () => tempLabelChange(btnTitle, LABELS.copied, LABELS.copyTitle));
    };

    return btnTitle;
}

function injectTitleButtonInto(wrapEl: HTMLElement): void {
    const h2 = wrapEl.querySelector('h2') as HTMLElement | null;
    if (!h2 || wrapEl.querySelector(`.${TITLE_BUTTON_CLASS}`)) return;

    wrapEl.style.display = 'flex';
    wrapEl.style.alignItems = 'center';
    wrapEl.style.gap = '15px';
    wrapEl.appendChild(buildTitleButton(h2));
}

export function injectTitleButton(): void {
    const titleWrappers = document.querySelectorAll(TITLE_WRAPPER_SELECTOR);
    titleWrappers.forEach(wrapper => injectTitleButtonInto(wrapper as HTMLElement));
}

// --- КНОПКА 2: В модальному вікні Share ---

export function findShareInputWrapper(root: ParentNode = document): Element | null {
    const modalContent = root.querySelector(SHARE_MODAL_SELECTOR);
    return modalContent?.querySelector(COPY_INPUT_WRAPPER_SELECTOR) ?? null;
}

function buildModalButton(inputWrapper: Element): HTMLButtonElement {
    const btnUrl = document.createElement('button');
    btnUrl.id = MODAL_BUTTON_ID;
    btnUrl.innerText = LABELS.copyUrl;
    btnUrl.style.cssText = MODAL_BUTTON_STYLE;
    applyHoverColors(btnUrl, '#28a745', '#218838');

    btnUrl.onclick = (e: MouseEvent) => {
        e.preventDefault();
        void copyShareUrl(btnUrl, inputWrapper);
    };

    return btnUrl;
}

async function copyShareUrl(btnUrl: HTMLElement, inputWrapper: Element): Promise<void> {
    const videoUrl = readShareUrl(inputWrapper);
    if (!videoUrl) return;

    await copyAndFlash(
        formatVideoShareText(videoUrl),
        () => tempLabelChange(btnUrl, LABELS.copyUrlDone, LABELS.copyUrl)
    );
}

function insertModalButton(inputWrapper: Element): void {
    const parent = inputWrapper.parentNode;
    if (!parent || document.getElementById(MODAL_BUTTON_ID)) return;

    const container = document.createElement('div');
    container.style.cssText = 'margin-top: 15px; width: 100%;';
    container.appendChild(buildModalButton(inputWrapper));

    parent.insertBefore(container, inputWrapper.nextSibling);
}

export function injectModalButton(): void {
    const inputWrapper = findShareInputWrapper();
    if (!inputWrapper) return;
    insertModalButton(inputWrapper);
}

// --- КНОПКИ В ЗАГАЛЬНОМУ СПИСКУ ВІДЕО ---

function stopCardNavigation(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
}

function createCopyTitleButton(videoTitle: string): HTMLButtonElement {
    const btn = createSquareButton('📝', 'Копіювати назву', () => {
        void copyAndFlash(videoTitle, () => tempIconChange(btn, '✅'));
    });
    return btn;
}

async function copyVideoUrl(btn: HTMLElement, videoUrl: string | null): Promise<void> {
    if (!videoUrl) {
        tempIconChange(btn, '❌');
        return;
    }
    await copyAndFlash(formatVideoShareText(videoUrl), () => tempIconChange(btn, '✅'));
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

// --- ГОЛОВНА КНОПКА МАСОВОГО СКАЧУВАННЯ ---

async function runMasterDownload(btn: HTMLButtonElement): Promise<void> {
    btn.innerText = LABELS.downloadRunning;
    btn.style.backgroundColor = '#f39c12';
    btn.disabled = true;

    await downloadAllFreshVideos();

    btn.innerText = LABELS.downloadDone;
    btn.style.backgroundColor = '#28a745';
    setTimeout(() => {
        btn.innerText = LABELS.downloadAll;
        btn.style.backgroundColor = '#005DF7';
        btn.disabled = false;
    }, 5000);
}

function buildMasterDownloadButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = MASTER_BUTTON_ID;
    btn.innerText = LABELS.downloadAll;
    btn.style.cssText = MASTER_BUTTON_STYLE;
    applyHoverColors(btn, '#005DF7', '#0047cc');

    btn.onclick = (e: MouseEvent) => {
        e.preventDefault();
        void runMasterDownload(btn);
    };

    return btn;
}

function insertMasterDownloadButton(listContainer: Element): void {
    const parent = listContainer.parentNode;
    if (!parent || document.getElementById(MASTER_BUTTON_ID)) return;

    parent.insertBefore(buildMasterDownloadButton(), listContainer);
}

export function injectMasterDownloadButton(): void {
    const listContainer = document.querySelector(LIST_WRAP_SELECTOR);
    if (!listContainer) return;
    insertMasterDownloadButton(listContainer);
}

/** Перелік «селектор → ін'єктор» для реєстрації у централізованому DOM-спостерігачі. */
export const VIDEO_COPIER_INJECTIONS: ReadonlyArray<{ selector: string; inject: () => void }> = [
    { selector: TITLE_WRAPPER_SELECTOR, inject: injectTitleButton },
    { selector: SHARE_MODAL_SELECTOR, inject: injectModalButton },
    { selector: VIDEO_CARD_SELECTOR, inject: injectListButtons },
    { selector: LIST_WRAP_SELECTOR, inject: injectMasterDownloadButton }
];
