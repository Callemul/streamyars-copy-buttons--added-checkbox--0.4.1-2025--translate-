import { SYH_CONFIG, resolveSelectorString } from '../registry/config';
/**
 * StreamYard Helper — детекція бренда та діагностика «Суботньої школи».
 *
 * Винесено з `modules/stats_tracker.ts`, де ця логіка жила замиканнями всередині
 * `setupObservers()` (153 рядки). Функція `checkSabbathSchoolBrandMismatch` мала
 * cognitive 16 у звіті Fallow через потрійну вкладеність if/else.
 *
 * Поведінка збережена 1-в-1 (див. `tests/stats_header_controls.test.js`).
 */

/** Мінімальний контракт трекера, потрібний для детекції бренда (пізнє зв'язування). */
export interface StatsBrandHost {
    lastKnownBrand: string;
    getBrandFromLocalStorage(): string;
}

const BRAND_NODE_SELECTOR =
    resolveSelectorString(SYH_CONFIG.SELECTORS.brandNameNode);

/** Тексти, які StreamYard показує замість назви бренда — брендом не вважаються. */
const BRAND_PLACEHOLDERS = ['Share ▾', 'Return to dashboard'];

/** Маркери «суботньої школи»: рос. «суббот» та укр. «субот». */
const SABBATH_MARKERS = ['суббот', 'субот'];

const BROADCAST_TITLE_SELECTOR = '[data-testid="header-title-wrap"] p';
const SABBATH_HOST_MARKERS = ['молчанов', 'опар'];

const MEDIA_TAB_ID = 'broadcast-aside-tab-assets';
const MEDIA_TAB_FALLBACK_SELECTOR = '[id*="tab-assets"]';
const MEDIA_TAB_DEFAULT_TITLE = 'Media assets';
const MEDIA_TAB_WARNING_TITLE = '⚠️ ПОМИЛКА: Папка медіа має бути "Субботняя школа"!';
const MEDIA_TAB_WARNING_CSS =
    'background: #e74c3c !important; color: white !important; border: 1px solid #ff4757 !important; animation: syhActivePulse 1.5s infinite alternate !important;';

/** Чистить службовий «chevron-down» і відсіює плейсхолдери. Порожній рядок = бренда немає. */
function readBrandNodeText(brandNode: Element): string {
    const rawText = brandNode.textContent ? brandNode.textContent.replace(/chevron-down/gi, '').trim() : '';
    return rawText && !BRAND_PLACEHOLDERS.includes(rawText) ? rawText : '';
}

/**
 * Назва активного бренда.
 * З DOM — коли вузол є; інакше фолбек на localStorage, а далі на останній відомий бренд.
 * Успішне читання оновлює `host.lastKnownBrand`.
 */
function detectBrandName(host: StatsBrandHost): string {
    const brandNode = document.querySelector(BRAND_NODE_SELECTOR);

    if (brandNode) {
        const brandName = readBrandNodeText(brandNode);
        if (brandName) host.lastKnownBrand = brandName;
        return brandName;
    }

    const brandName = host.getBrandFromLocalStorage() || host.lastKnownBrand;
    if (brandName) host.lastKnownBrand = brandName;
    return brandName;
}

/** Чи це ефір «Суботньої школи» (за заголовком: суботня + Молчанов + Опарин). */
function detectIsSabbathSchool(): boolean {
    const titleNode = document.querySelector(BROADCAST_TITLE_SELECTOR) as HTMLElement | null;
    const titleText = titleNode ? titleNode.innerText.toLowerCase() : '';

    return SABBATH_MARKERS.some(marker => titleText.includes(marker))
        && SABBATH_HOST_MARKERS.every(marker => titleText.includes(marker));
}

export function detectBrandAndSabbathSchool(
    host: StatsBrandHost
): { brandName: string; isSabbathSchool: boolean } {
    const brandName = detectBrandName(host);
    const isSabbathSchool = detectIsSabbathSchool();
    return { brandName, isSabbathSchool };
}

/** Вкладка медіа-асетів: точний id, інакше будь-який `[id*="tab-assets"]`. */
function findMediaTabButton(): HTMLElement | null {
    return (document.getElementById(MEDIA_TAB_ID)
        || document.querySelector(MEDIA_TAB_FALLBACK_SELECTOR)) as HTMLElement | null;
}

function isSabbathSchoolBrand(brandName: string): boolean {
    const lower = brandName.toLowerCase();
    return SABBATH_MARKERS.some(marker => lower.includes(marker));
}

function applyMediaTabWarning(mediaTabBtn: HTMLElement): void {
    if (!mediaTabBtn.dataset.originalTitle) {
        mediaTabBtn.dataset.originalTitle =
            mediaTabBtn.getAttribute('title') || mediaTabBtn.getAttribute('aria-label') || MEDIA_TAB_DEFAULT_TITLE;
    }
    mediaTabBtn.setAttribute('title', MEDIA_TAB_WARNING_TITLE);
    mediaTabBtn.style.cssText = MEDIA_TAB_WARNING_CSS;
}

function restoreMediaTabTitle(mediaTabBtn: HTMLElement): void {
    if (mediaTabBtn.dataset.originalTitle) {
        mediaTabBtn.setAttribute('title', mediaTabBtn.dataset.originalTitle);
        delete mediaTabBtn.dataset.originalTitle;
    }
}

/**
 * Підсвічує вкладку медіа червоним, якщо йде «Суботня школа», а бренд — інший.
 *
 * Скидання стилю та відновлення початкового `title` атомарні: виконуються в одній
 * гілці «не попередження», незалежно від того, чи визначено бренд. Це виправляє
 * латентний баг, коли порожній `brandName` скидав стиль, але лишав попереджувальний
 * `title` (див. audit stats-mediatab-title-stuck).
 */
export function checkSabbathSchoolBrandMismatch(brandName: string, isSabbathSchool: boolean): void {
    const mediaTabBtn = findMediaTabButton();
    if (!mediaTabBtn) return;

    if (brandName && isSabbathSchool && !isSabbathSchoolBrand(brandName)) {
        applyMediaTabWarning(mediaTabBtn);
        return;
    }

    mediaTabBtn.style.cssText = '';
    restoreMediaTabTitle(mediaTabBtn);
}
