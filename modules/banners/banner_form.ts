/**
 * StreamYard Helper — покрокові хелпери форми створення банера.
 *
 * Винесено з `modules/banner_creator.ts`, щоб розплутати CRAP-хотспот
 * `createSingleBanner` (CRAP 63.6 / cyclomatic 15 за звітом Fallow 3.14).
 * Кожен крок сценарію «відкрити форму → заповнити → відправити → прибрати»
 * тепер є окремою одиницею з власним контрактом, тож фасад у `banner_creator`
 * лишається лінійним оркестратором без розгалужень.
 *
 * Поведінка збережена 1-в-1 (див. `tests/banner_form.test.js`), включно
 * з навмисно збереженими квірками чинної реалізації:
 *   - кнопка/форма тут читаються через `document.querySelector`, а НЕ через
 *     `resolveSelector`, тому масив-селектор не отримує пріоритетного перебору
 *     (розбіжність із `ensureCleanStart`/`finalCleanup` описана в аудиті
 *     `docs/audits/active/audit_2026-08-10_KILO_banner-selector-resolution-mismatch.md`);
 *   - `addButton.click()` викликається навіть тоді, коли кнопка лишилась
 *     `disabled` після додаткової паузи.
 */

import type { SelectorValue } from '../config';
import type { SyhUtils } from '../utils';

/** Таймаут очікування кнопки «створити банер» і самої форми. */
export const BANNER_FORM_TIMEOUT_MS = 2000;
/** Таймаут очікування появи щойно створеного банера у списку. */
export const NEW_BANNER_TIMEOUT_MS = 5000;
/** Довжина тексту, після якої StreamYard потребує довшої паузи на «осідання». */
export const LONG_TEXT_THRESHOLD = 50;
/** Пауза для довгого тексту. */
export const LONG_TEXT_SETTLE_MS = 300;
/** Пауза для короткого тексту. */
export const SHORT_TEXT_SETTLE_MS = 150;
/** Додаткова пауза, якщо submit-кнопка все ще `disabled`. */
export const DISABLED_SUBMIT_RETRY_MS = 200;
/** Пауза після закриття форми, що лишилась відкритою з попереднього прогону. */
export const CLEAN_START_SETTLE_MS = 300;

/** Id кнопки-дропдауна таймера, яку не можна сплутати з «Скасувати». */
const TIMER_DROPDOWN_ID = 'banner-timer-dropdown-button';

export interface BannerFormControls {
    textarea: HTMLTextAreaElement;
    addButton: HTMLButtonElement;
}

export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * StreamYard довше «переварює» довгий текст банера, тож пауза перед submit
 * залежить від довжини рядка.
 */
export function computeTextSettleDelay(text: string): number {
    return text.length > LONG_TEXT_THRESHOLD ? LONG_TEXT_SETTLE_MS : SHORT_TEXT_SETTLE_MS;
}

/**
 * Кнопка «Скасувати» — це перша кнопка форми, яка не є submit і не належить
 * дропдауну таймера (ні сама, ні як нащадок).
 */
export function findCancelButton(form: Element): HTMLButtonElement | null {
    const buttons = Array.from(form.querySelectorAll('button'));
    const cancelButton = buttons.find(b =>
        b.type !== 'submit' &&
        b.id !== TIMER_DROPDOWN_ID &&
        !b.closest(`#${TIMER_DROPDOWN_ID}`)
    );
    return cancelButton ?? null;
}

/** Клікає кнопку «Скасувати», якщо вона є. Ідемпотентна: без кнопки — no-op. */
export function clickCancelButton(form: Element): void {
    const cancelButton = findCancelButton(form);
    if (cancelButton) {
        cancelButton.click();
    }
}

/**
 * Синхронний пошук у DOM з фолбеком на очікування.
 *
 * Квірк 1-в-1: `document.querySelector` отримує «сирий» `SelectorValue`, тож
 * масив селекторів неявно склеюється через `Array.prototype.toString` у
 * selector-list, а не перебирається за пріоритетом.
 */
export async function resolveCreateBannerButton(
    selector: SelectorValue | undefined,
    utils: SyhUtils
): Promise<HTMLElement> {
    let createBtn: HTMLElement | null = selector
        ? document.querySelector<HTMLElement>(selector as unknown as string)
        : null;

    if (!createBtn) {
        createBtn = await utils.waitForElement(
            selector as unknown as string,
            BANNER_FORM_TIMEOUT_MS
        ) as HTMLElement;
    }

    if (!createBtn) {
        throw new Error('Create banner button not found');
    }
    return createBtn;
}

/** Чекає на форму створення банера; кидає, якщо вона так і не з'явилась. */
export async function resolveCreateBannerForm(
    selector: SelectorValue | undefined,
    utils: SyhUtils
): Promise<Element> {
    const form: Element | null = await utils.waitForElement(
        selector as unknown as string,
        BANNER_FORM_TIMEOUT_MS
    );
    if (!form) {
        throw new Error('Create banner form not found');
    }
    return form;
}

/** Дістає обов'язкові контроли форми; кидає, якщо розмітка змінилась. */
export function readBannerFormControls(form: Element): BannerFormControls {
    const textarea = form.querySelector('textarea') as HTMLTextAreaElement | null;
    const addButton = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;

    if (!textarea || !addButton) {
        throw new Error('Textarea or submit button not found in form');
    }
    return { textarea, addButton };
}

/**
 * Заповнює textarea так, як це зробив би користувач: focus → ввід →
 * `input`-подія з `bubbles` (React слухає саме її) → blur.
 */
export function fillBannerTextarea(textarea: HTMLTextAreaElement, text: string): void {
    textarea.focus();
    textarea.value = text;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.blur();
}

/**
 * Витримує паузу під довжину тексту, за потреби дає формі ще один шанс
 * розблокувати submit — і тисне кнопку в будь-якому разі (квірк 1-в-1).
 */
export async function submitBannerForm(addButton: HTMLButtonElement, text: string): Promise<void> {
    await delay(computeTextSettleDelay(text));
    if (addButton.disabled) {
        await delay(DISABLED_SUBMIT_RETRY_MS);
    }
    addButton.click();
}

/** Чи форма ще присутня в документі (тобто чи потрібен фінальний cancel). */
export function isBannerFormStillOpen(selector: SelectorValue | undefined): boolean {
    return Boolean(selector && document.querySelector(selector as unknown as string));
}
