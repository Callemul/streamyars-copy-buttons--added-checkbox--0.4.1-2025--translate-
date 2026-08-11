// modules/video_copier_ui.ts
/**
 * UI-шар копіювача відео StreamYard — фасад-бочка.
 *
 * Раніше — один файл на 371 рядок (cyclomatic 68, 48 функцій), у якому поряд
 * жили палітра, inline-CSS, чисті хелпери посилань, UI-примітиви й усі чотири
 * точки ін'єкції. Реалізацію розділено за відповідальностями:
 *   - `./video_copier_theme`         — підписи, кольори, inline-стилі;
 *   - `./video_copier_links`         — чисті правила читання даних і URL;
 *   - `./video_copier_ui_kit`        — hover, тимчасовий відгук, квадратна кнопка;
 *   - `./video_copier_title_button`  — кнопка біля заголовка H2;
 *   - `./video_copier_share_modal`   — кнопка в модалці Share;
 *   - `./video_copier_card_buttons`  — контролі в картках списку;
 *   - `./video_copier_master_button` — майстер-кнопка масового скачування.
 *
 * Логіка «свіжості» лишилась у `video_copier_fresh`, сценарій завантаження —
 * у `video_copier_downloader`. Публічний контракт цього модуля збережено 1-в-1.
 */
import { VIDEO_CARD_SELECTOR } from './video_copier_fresh';
import { TITLE_WRAPPER_SELECTOR, injectTitleButton } from './video_copier_title_button';
import { SHARE_MODAL_SELECTOR, injectModalButton } from './video_copier_share_modal';
import { injectListButtons } from './video_copier_card_buttons';
import { LIST_WRAP_SELECTOR, injectMasterDownloadButton } from './video_copier_master_button';

export { LABELS } from './video_copier_theme';

export {
    STREAMYARD_BASE_URL,
    SHARE_TEXT_PREFIX,
    buildVideoUrl,
    formatVideoShareText,
    readCardTitleText,
    readShareUrl
} from './video_copier_links';

export {
    FEEDBACK_DELAY_MS,
    applyHoverColors,
    copyAndFlash,
    createSquareButton,
    tempIconChange,
    tempLabelChange
} from './video_copier_ui_kit';

export { TITLE_BUTTON_CLASS, TITLE_WRAPPER_SELECTOR, injectTitleButton } from './video_copier_title_button';

export {
    COPY_INPUT_WRAPPER_SELECTOR,
    MODAL_BUTTON_ID,
    SHARE_MODAL_SELECTOR,
    findShareInputWrapper,
    injectModalButton
} from './video_copier_share_modal';

export {
    CARD_MENU_SELECTOR,
    LIST_CONTROLS_CLASS,
    PROCESSED_CARD_CLASS,
    appendButtonsToCard,
    buildCardControls,
    injectListButtons,
    processVideoCard
} from './video_copier_card_buttons';

export { LIST_WRAP_SELECTOR, MASTER_BUTTON_ID, injectMasterDownloadButton } from './video_copier_master_button';

/** Перелік «селектор → ін'єктор» для реєстрації у централізованому DOM-спостерігачі. */
export const VIDEO_COPIER_INJECTIONS: ReadonlyArray<{ selector: string; inject: () => void }> = [
    { selector: TITLE_WRAPPER_SELECTOR, inject: injectTitleButton },
    { selector: SHARE_MODAL_SELECTOR, inject: injectModalButton },
    { selector: VIDEO_CARD_SELECTOR, inject: injectListButtons },
    { selector: LIST_WRAP_SELECTOR, inject: injectMasterDownloadButton }
];
