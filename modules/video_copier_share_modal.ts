// modules/video_copier_share_modal.ts
/**
 * Кнопка «Копіювати URL + Текст» у модальному вікні Share.
 * Виокремлено з `video_copier_ui.ts` як самостійна точка ін'єкції.
 */
import { COLORS, LABELS, MODAL_BUTTON_STYLE } from './video_copier_theme';
import { formatVideoShareText, readShareUrl } from './video_copier_links';
import { applyHoverColors, copyAndFlash, tempLabelChange } from './video_copier_ui_kit';

export const MODAL_BUTTON_ID = 'syh-url-btn';
export const SHARE_MODAL_SELECTOR = 'div[aria-label="embed-modal-content-share"]';
export const COPY_INPUT_WRAPPER_SELECTOR = 'div[class*="CopyInputWrapper"]';

/** Обгортка readonly-інпуту всередині модалки Share, якщо модалка відкрита. */
export function findShareInputWrapper(root: ParentNode = document): Element | null {
    const modalContent = root.querySelector(SHARE_MODAL_SELECTOR);
    return modalContent?.querySelector(COPY_INPUT_WRAPPER_SELECTOR) ?? null;
}

/** Порожній URL свідомо не копіюється і не дає візуального відгуку. */
async function copyShareUrl(btnUrl: HTMLElement, inputWrapper: Element): Promise<void> {
    const videoUrl = readShareUrl(inputWrapper);
    if (!videoUrl) return;

    await copyAndFlash(
        formatVideoShareText(videoUrl),
        () => tempLabelChange(btnUrl, LABELS.copyUrlDone, LABELS.copyUrl)
    );
}

function buildModalButton(inputWrapper: Element): HTMLButtonElement {
    const btnUrl = document.createElement('button');
    btnUrl.id = MODAL_BUTTON_ID;
    btnUrl.innerText = LABELS.copyUrl;
    btnUrl.style.cssText = MODAL_BUTTON_STYLE;
    applyHoverColors(btnUrl, COLORS.green, COLORS.greenHover);

    btnUrl.onclick = (e: MouseEvent) => {
        e.preventDefault();
        void copyShareUrl(btnUrl, inputWrapper);
    };

    return btnUrl;
}

/** Ідемпотентність тримається на унікальному `id` кнопки. */
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
