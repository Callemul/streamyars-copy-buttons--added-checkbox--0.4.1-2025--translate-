// modules/video_copier_title_button.ts
/**
 * Кнопка «Копіювати назву» біля заголовка H2 на сторінці одного відео.
 * Виокремлено з `video_copier_ui.ts` як самостійна точка ін'єкції.
 */
import { COLORS, LABELS, TITLE_BUTTON_STYLE } from './video_copier_theme';
import { applyHoverColors, copyAndFlash, tempLabelChange } from './video_copier_ui_kit';

export const TITLE_WRAPPER_SELECTOR = 'div[class*="TitleWrapper"]';
export const TITLE_BUTTON_CLASS = 'syh-title-btn';

function buildTitleButton(h2: HTMLElement): HTMLButtonElement {
    const btnTitle = document.createElement('button');
    btnTitle.className = TITLE_BUTTON_CLASS;
    btnTitle.innerText = LABELS.copyTitle;
    btnTitle.style.cssText = TITLE_BUTTON_STYLE;
    applyHoverColors(btnTitle, COLORS.green, COLORS.greenHover);

    btnTitle.onclick = (e: MouseEvent) => {
        e.preventDefault();
        void copyAndFlash(
            h2.innerText.trim(),
            () => tempLabelChange(btnTitle, LABELS.copied, LABELS.copyTitle),
            () => tempLabelChange(btnTitle, LABELS.copyFailed, LABELS.copyTitle)
        );
    };

    return btnTitle;
}

/** Ідемпотентно: без H2 або з уже наявною кнопкою контейнер не чіпається. */
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
