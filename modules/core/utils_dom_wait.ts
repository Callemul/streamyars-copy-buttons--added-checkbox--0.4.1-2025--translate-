/**
 * StreamYard Helper — очікування станів DOM (поллінг).
 *
 * Винесено з `modules/utils.ts`: чотири методи-очікувачі повторювали одну й ту
 * саму «скелетну» конструкцію `setInterval` + лічильник `elapsedTime` + таймаут
 * (≈85 рядків копіпасти). Скелет зведено в `pollUntil`, самі умови лишились 1-в-1.
 *
 * ⚠️ Поведінкові особливості збережено свідомо:
 *   - `waitForElement` вимагає, щоб елемент був ВИДИМИМ (offsetWidth/Height > 0);
 *   - `clickElementByText` по таймауту РЕЗОЛВИТЬСЯ (не відхиляється), лише warn;
 *   - `waitForNewBanner` перечитує селектор на кожному тіку (звідси провайдер).
 */

import { resolveSelector, resolveSelectorAll } from '../registry/config';

/** Крок поллінгу, спільний для всіх очікувачів. */
const POLL_INTERVAL_MS = 100;

/** Запасний селектор тексту банера, коли конфіг ще не ініціалізовано. */
export const DEFAULT_BANNER_TEXT_SELECTOR = '[class*="Banner__BannerText"]';

/**
 * Спільний скелет поллінгу.
 *
 * `attempt` повертає `true`, коли очікування завершено (таймер зупиняється).
 * Інакше нарощується `elapsedTime`, і по досягненню `timeout` викликається
 * `onTimeout`. Виняток усередині `attempt` навмисно НЕ перехоплюється — так само,
 * як у вихідному коді.
 */
function pollUntil(timeout: number, attempt: () => boolean, onTimeout: () => void): void {
    let elapsedTime = 0;
    const timer = setInterval(() => {
        if (attempt()) {
            clearInterval(timer);
            return;
        }
        elapsedTime += POLL_INTERVAL_MS;
        if (elapsedTime >= timeout) {
            clearInterval(timer);
            onTimeout();
        }
    }, POLL_INTERVAL_MS);
}

/** Чи елемент реально займає місце на сторінці. */
function isVisible(element: Element | null): element is HTMLElement {
    if (!element) return false;
    const el = element as HTMLElement;
    return el.offsetWidth > 0 && el.offsetHeight > 0;
}

function describeSelector(selector: string | string[]): string {
    return Array.isArray(selector) ? selector.join(', ') : selector;
}

/** Чекає на ВИДИМИЙ елемент за селектором (або списком фолбеків). */
export function waitForElement(selector: string | string[], timeout: number): Promise<Element> {
    return new Promise((resolve, reject) => {
        pollUntil(
            timeout,
            () => {
                const element = resolveSelector(selector);
                if (!isVisible(element)) return false;
                resolve(element);
                return true;
            },
            () => reject(new Error(
                `Element [${describeSelector(selector)}] not found or not visible within ${timeout}ms`
            ))
        );
    });
}

/** Чекає, доки елемент за селектором зникне з DOM. */
export function waitForElementToDisappear(selector: string, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
        pollUntil(
            timeout,
            () => {
                if (document.querySelector(selector)) return false;
                resolve();
                return true;
            },
            () => reject(new Error(`Element ${selector} did not disappear within ${timeout}ms`))
        );
    });
}

/**
 * Чекає на появу банера з точним текстом `bannerText`.
 *
 * `getBannerSelector` — саме провайдер, а не значення: оригінал читав
 * `this.SELECTORS?.bannerText` на КОЖНОМУ тіку, тож зміна конфіга під час
 * очікування впливала на пошук. Ця семантика збережена.
 */
export function waitForNewBanner(
    bannerText: string,
    timeout: number,
    getBannerSelector: () => string | string[]
): Promise<Element> {
    return new Promise((resolve, reject) => {
        pollUntil(
            timeout,
            () => {
                const banners = resolveSelectorAll(getBannerSelector());
                for (const banner of banners) {
                    if (banner.textContent?.trim() === bannerText.trim()) {
                        resolve(banner);
                        return true;
                    }
                }
                return false;
            },
            () => reject(new Error(
                `New banner with text "${bannerText}" did not appear within ${timeout}ms`
            ))
        );
    });
}

/**
 * Знаходить видимий елемент за входженням тексту і клікає по ньому.
 *
 * ⚠️ По таймауту проміс РЕЗОЛВИТЬСЯ (лише `console.warn`), а не відхиляється —
 * контракт збережено з оригіналу.
 */
export function clickElementByText(text: string, timeout: number): Promise<void> {
    return new Promise((resolve) => {
        pollUntil(
            timeout,
            () => {
                const xpath = `//*[contains(text(), '${text}')]`;
                const matchingElement = document.evaluate(
                    xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
                ).singleNodeValue as HTMLElement | null;

                if (!isVisible(matchingElement)) return false;
                if (matchingElement) {
                    matchingElement.click();
                }
                resolve();
                return true;
            },
            () => {
                console.warn(`SYH: Element with text "${text}" not found.`);
                resolve();
            }
        );
    });
}
