// modules/config.ts
import { SYH_I18N } from './i18n';

export type SelectorValue = string | string[];

export interface SyhConfig {
    SELECTORS: Record<string, SelectorValue>;
    TIMINGS: {
        ANTI_AFK_INTERVAL: number;
        AUTO_HEAL_POLLING: number;
        FILTER_DEBOUNCE: number;
        STATS_TRACKING_INTERVAL: number;
    };
    LIMITS: {
        TEXT_TRUNCATION_LENGTH: number;
    };
    TRIGGER_WORDS: string[];
    TRIGGER_WORDS_QUESTION?: string[];
    TRIGGER_WORDS_PRAYER?: string[];
}

/**
 * Повертає перший CSS-селектор із можливого масиву-фолбеку.
 * Корисно, коли потрібен лише рядок-селектор (наприклад, для реєстрації DOM-спостерігача).
 */
export function resolveFirstSelector(
    selectorValue: SelectorValue | null | undefined
): string | undefined {
    if (!selectorValue) return undefined;
    return Array.isArray(selectorValue) ? selectorValue[0] : selectorValue;
}

/**
 * Об'єднує можливий масив селекторів у один рядок через кому.
 * Повертає порожній рядок, якщо значення невизначене.
 */
export function resolveSelectorString(
    selectorValue: SelectorValue | null | undefined
): string {
    if (!selectorValue) return '';
    return Array.isArray(selectorValue) ? selectorValue.join(',') : selectorValue;
}

/**
 * Нормалізує `SelectorValue` у список непорожніх селекторів-кандидатів
 * у порядку спадання пріоритету.
 *
 * Єдине джерело правди для правила «як читати `SelectorValue`»: використовується
 * в `resolveSelector`, `resolveSelectorAll` та у валідаторі синтаксису
 * (`modules/ui_selector_validator.ts`).
 */
export function toSelectorList(
    selectorValue: SelectorValue | null | undefined
): string[] {
    if (!selectorValue) return [];
    const list = typeof selectorValue === 'string' ? [selectorValue] : selectorValue;
    return list.filter((sel): sel is string => Boolean(sel));
}

/**
 * Додає CSS-суфікс (напр. атрибутний фільтр на кшталт `[data-syh-type="prayer"]`)
 * до КОЖНОГО кандидата в `SelectorValue`, зберігаючи порядок і кількість
 * елементів фолбеку.
 *
 * Приклад: `withSelectorSuffix(['a', 'b'], '[x]')` -> `['a[x]', 'b[x]']`.
 * Якщо суфікс приклеїти лише до рядка (`resolveSelectorString(...) + suffix`),
 * фолбек-кандидати з масиву будуть загублені — саме цю помилку і запобігає хелпер.
 */
export function withSelectorSuffix(
    selectorValue: SelectorValue | null | undefined,
    suffix: string
): SelectorValue {
    return toSelectorList(selectorValue).map(sel => `${sel}${suffix}`);
}

/**
 * `querySelector` для `SelectorValue` зі збереженням історичної семантики
 * «масив === CSS-група» (`['.a','.b']` -> `'.a,.b'`), яку рушій і так застосовував
 * через неявний `ToString`.
 *
 * Відмінність від `resolveSelector`: тут НЕ змінюється те, який саме вузол буде
 * обрано (група віддає перший у DOM, а `resolveSelector` — перший за пріоритетом
 * конфігу). Тому цей хелпер безпечний для «1-в-1» міграції типів, тоді як перехід
 * на `resolveSelector` — це вже зміна поведінки й потребує окремого рішення.
 *
 * Порожнє/відсутнє значення трактується як «нічого не знайдено» замість
 * `querySelector('')`, який кидає `SyntaxError`.
 */
export function queryBySelectorValue<T extends Element = Element>(
    selectorValue: SelectorValue | null | undefined,
    root: ParentNode = document
): T | null {
    const selector = resolveSelectorString(selectorValue);
    return selector ? root.querySelector<T>(selector) : null;
}

/** Парний до `queryBySelectorValue` хелпер для `Element.closest()`. */
export function closestBySelectorValue<T extends Element = Element>(
    start: Element | null | undefined,
    selectorValue: SelectorValue | null | undefined
): T | null {
    const selector = resolveSelectorString(selectorValue);
    return start && selector ? start.closest<T>(selector) : null;
}

/**
 * Допоміжний резолвер селекторів з підтримкою масивів-фолбеків
 */
export function resolveSelector<T extends Element = Element>(
    selectorValue: SelectorValue | null | undefined, 
    root: ParentNode = document
): T | null {
    for (const sel of toSelectorList(selectorValue)) {
        try {
            const el = root.querySelector<T>(sel);
            if (el) return el;
        } catch (e) {
            console.warn(`[SYH Selector] Invalid CSS selector: "${sel}"`, e);
        }
    }
    return null;
}

export function resolveSelectorAll<T extends Element = Element>(
    selectorValue: SelectorValue | null | undefined, 
    root: ParentNode = document
): T[] {
    for (const sel of toSelectorList(selectorValue)) {
        try {
            const els = Array.from(root.querySelectorAll<T>(sel));
            if (els.length > 0) return els;
        } catch (e) {
            console.warn(`[SYH Selector] Invalid CSS selector in queryAll: "${sel}"`, e);
        }
    }
    return [];
}

export const SYH_CONFIG: SyhConfig = {
    SELECTORS: {
        // Коментарі (з фолбеками)
        commentBlock: ['[class*="PlatformComment__Wrap"]', '[data-testid="platform-comment"]'],
        commentButtonContainer: ['[class*="PlatformComment__TopRightButtonGroup"]', '[data-testid="comment-button-group"]'],
        commentAuthor: ['[class*="PlatformCommentShell__NameText"]', '[data-testid="comment-author"]'],
        commentText: ['[class*="PlatformCommentShell__ContentSpan"]', '[data-testid="comment-content"]'],
        starButton: ['[class*="PlatformComment__StarButton"]', '[aria-label*="star" i]'],
        starredTabButton: ['#platform-comment-tabs-tab-starredComments', 'button[id*="starredComments"]'],
        starredHeaderWrap: '[class*="StarredCommentList__HeaderWrap"]',
        starredItemWrap: '[class*="StarredCommentList__ItemWrap"]',
        starredList: '[class*="StarredCommentList__List"]',
        starredCommentItem: 'li[class*="StarredCommentList"]',
        
        // Банери
        bannerBlock: '[class*="Banner__LiWrap"]',
        bannerWrap: '[class*="Banner__Wrap"]',
        bannerText: '[class*="Banner__BannerText"]',
        bannerHeader: '[class*="BannersHeader__Header"]',
        bannerButtonContainer: '[class*="Banner__DesktopTopIconRow"]',
        // Активний (показаний зараз глядачам) банер — з іконкою "око перекреслене".
        // Окреме поле від bannerBlock/bannerWrap: це не альтернативне ім'я того
        // самого елемента, а звужений збіг «банер саме у стані показу».
        hiddenBannerBlock: [
            '[class*="Banner__LiWrap"]:has(svg.lucide-eye-off)',
            'div[class*="Banner__Wrap"]:has(svg.lucide-eye-off)'
        ],
        bannerDeleteButton: ['button:has(svg.lucide-trash2)', 'button:has(svg.lucide-trash-2)', '[data-testid="delete-banner-btn"]'],

        // Права панель StreamYard (вкладки Chat, Banners, Brand, Private Chat, Settings, Recording, Widgets тощо)
        rightTabButtons: ['button[role="tab"][id*="broadcast-aside-tab-"]', '[data-testid="dropdown-workaround-id"] button', 'button[class*="RightTabButton__StyledButton"]'],

        // Форма створення банера
        createBannerButton: '[class*="BannerList__BottomRow"] button',
        createBannerForm: 'form[class*="CreateBannerForm__Form"]',
        bannerFormTextarea: 'form[class*="CreateBannerForm__Form"] textarea',
        bannerFormAddButton: 'form[class*="CreateBannerForm__Form"] button[type="submit"]',

        // Таймер
        timerDropdownButton: '#banner-timer-dropdown-button', 
        timerOptionOffId: '#banner-timer-dropdown-option-null', 
        get timerOffTextResult(): string {
            return SYH_I18N.getMessage('timerOff', 'Timer off');
        }
    },

    TIMINGS: {
        ANTI_AFK_INTERVAL: 30000,        // 30 секунд — інтервал Anti-AFK кліків
        AUTO_HEAL_POLLING: 500,          // 500мс — DOM polling для Auto-Heal
        FILTER_DEBOUNCE: 150,            // 150мс — debounce для фільтру пошуку
        STATS_TRACKING_INTERVAL: 60000,  // 60 секунд — інтервал збору статистики
    },

    LIMITS: {
        TEXT_TRUNCATION_LENGTH: 195,     // Максимальна довжина тексту перед обрізанням
    },

    TRIGGER_WORDS_QUESTION: ['вопрос', 'питання', 'вопросы', 'вопросик', 'вопросом'],
    TRIGGER_WORDS_PRAYER: ['молитва', 'молитвенная', 'прошение', 'помолитесь', 'молитись', 'моліться', 'просьба'],
    TRIGGER_WORDS: ['вопрос', 'питання', 'вопросы', 'вопросик', 'вопросом', 'молитва', 'молитвенная', 'прошение', 'помолитесь', 'молитись', 'моліться', 'просьба']
};
