/**
 * StreamYard Helper — копіювання в буфер обміну з плаваючим банером-підтвердженням.
 *
 * Винесено з `modules/utils.ts`. Єдина причина зміни цього файлу — вигляд або
 * тайминг тост-повідомлення, тому воно не має жити поруч із транслітерацією
 * та очікувачами DOM.
 *
 * Поведінка збережена 1-в-1: порожній текст не звертається до буфера,
 * попередні банери видаляються, показ триває 2500 мс + 300 мс на зникнення.
 */

const BANNER_CLASS = 'copy-success-banner';
const BANNER_VISIBLE_CLASS = 'visible';
const DEFAULT_BANNER_MESSAGE = 'Скопійовано!';

/** Скільки банер лишається на екрані до початку згасання. */
const BANNER_VISIBLE_MS = 2500;
/** Тривалість CSS-переходу згасання перед видаленням вузла. */
const BANNER_FADE_OUT_MS = 300;

function removeExistingBanners(): void {
    if (typeof document === 'undefined' || !document.querySelectorAll) return;
    document.querySelectorAll(`.${BANNER_CLASS}`).forEach(el => el.remove());
}

export type BannerVariant = 'success' | 'error' | 'info';

export function showBanner(message: string, variantOrError?: BannerVariant | boolean): void {
    if (typeof document === 'undefined' || !document.body) return;

    removeExistingBanners();

    const isError = variantOrError === true || variantOrError === 'error';
    const banner = document.createElement('div');
    banner.className = isError ? `${BANNER_CLASS} error` : BANNER_CLASS;
    banner.textContent = message;
    document.body.appendChild(banner);

    const makeVisible = () => banner.classList?.add(BANNER_VISIBLE_CLASS);
    if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(makeVisible);
    } else {
        setTimeout(makeVisible, 0);
    }

    setTimeout(() => {
        banner.classList?.remove(BANNER_VISIBLE_CLASS);
        setTimeout(() => banner.remove?.(), BANNER_FADE_OUT_MS);
    }, BANNER_VISIBLE_MS);
}

export function showErrorBanner(message: string): void {
    showBanner(message, 'error');
}

/**
 * Копіює текст у буфер обміну і показує банер-підтвердження.
 * Порожній `textToCopy` логується як помилка і НЕ призводить до показу банера.
 */
export function copyAndShowBanner(textToCopy: string, bannerMessage?: string): void {
    if (!textToCopy) {
        console.error("No text provided to copy.");
        return;
    }
    navigator.clipboard.writeText(textToCopy)
        .then(() => showBanner(bannerMessage || DEFAULT_BANNER_MESSAGE))
        .catch(err => console.error('Copy failed: ', err));
}
