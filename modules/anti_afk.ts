// modules/anti_afk.ts
import { STORAGE_KEYS } from './storage.ts';

/**
 * ============================================================================
 * STREAMYARD HELPER - ANTI-AFK MODULE (GOLDEN STANDARD: BULLETPROOF + PREVENTIVE)
 * ============================================================================
 * Розроблено за Золотим стандартом проєкту (DEVELOPER_NOTES.md).
 * 
 * Подвійний захист від AFK:
 * 1. Превентивний захист (User Activity Simulation):
 *    Періодично (раз на 3 хвилини) відправляє легку фонову подію `mousemove`,
 *    завдяки чому StreamYard вважає користувача активним і ВЗАГАЛІ НЕ ПОКАЗУЄ вікно AFK.
 * 
 * 2. Броньований (Bulletproof) сканер:
 *    Якщо діалог все ж з'явився, сканує абсолютно всі клікабельні вузли
 *    (button, [role="button"], a, div[tabindex]), ігноруючи специфічні React-класи.
 * ============================================================================
 */

export interface I18nAdapterLike {
    getMessage(key: string, fallback?: string): string;
}

/**
 * Броньований сканер для виявлення кнопки "Stay in studio"
 */
export function checkAndClickAntiAfk(
    docNode: Document | Element | null = typeof document !== 'undefined' ? document : null,
    i18n?: I18nAdapterLike
): boolean {
    if (!docNode) return false;

    // 1. Пошук контейнера модалки за різними варіантами селекторів
    const dialogSelectors = [
        'div[role="dialog"][aria-label="Are you still there?"]',
        'div[role="dialog"]',
        '[aria-modal="true"]',
        'div[class*="modal"]',
        'div[class*="Dialog"]'
    ];

    let modalButtons: Element[] = [];
    for (const selector of dialogSelectors) {
        const modal = docNode.querySelector(selector);
        if (modal) {
            const buttons = Array.from(modal.querySelectorAll('button, [role="button"], a'));
            if (buttons.length > 0) {
                modalButtons = buttons;
                break;
            }
        }
    }

    // 2. Броньований Fallback: скануємо абсолютно всі клікабельні елементи сторінки
    const candidateButtons = modalButtons.length > 0 
        ? modalButtons 
        : Array.from(docNode.querySelectorAll('button, [role="button"], div[tabindex="0"], a'));

    if (candidateButtons.length === 0) {
        return false;
    }

    // 3. Варіанти пошукових ключів
    const targetTexts: string[] = [
        'stay in the studio',
        'stay in studio',
        'stay in',
        'still there',
        'залишитися в студії',
        'остаться в студии'
    ];

    if (i18n && typeof i18n.getMessage === 'function') {
        const localized = i18n.getMessage('stayInStudio');
        if (localized && localized.trim()) {
            targetTexts.push(localized.trim().toLowerCase());
        }
    } else if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getMessage === 'function') {
        try {
            const localized = chrome.i18n.getMessage('stayInStudio');
            if (localized && localized.trim()) {
                targetTexts.push(localized.trim().toLowerCase());
            }
        } catch {
            // ignore
        }
    }

    // 4. Пошук відповідності серед усіх елементів
    for (const btn of candidateButtons) {
        const text = (btn.textContent || '').trim().toLowerCase();
        const ariaLabel = (btn.getAttribute('aria-label') || '').trim().toLowerCase();
        const title = (btn.getAttribute('title') || '').trim().toLowerCase();

        const isMatch = targetTexts.some(target => 
            text === target || text.includes(target) || 
            ariaLabel === target || ariaLabel.includes(target) ||
            title === target || title.includes(target)
        ) || /stay in (the )?studio/i.test(text) || /still there/i.test(text);

        if (isMatch) {
            try {
                console.log("[SYH Anti-AFK] AFK таймаут перехоплено! Натискаю 'Stay in the studio'.");
                (btn as HTMLElement).click();
                return true;
            } catch (err) {
                console.warn("[SYH Anti-AFK] Помилка при натисканні кнопки Stay in studio:", err);
            }
        }
    }

    return false;
}

/**
 * Превентивна імітація активності миші (Preventive User Activity Simulation)
 * Запобігає появі вікна AFK взагалі.
 */
export function simulateUserActivity(): void {
    if (typeof document === 'undefined') return;
    try {
        const event = new MouseEvent('mousemove', {
            bubbles: true,
            cancelable: true,
            clientX: Math.floor(Math.random() * 100) + 10,
            clientY: Math.floor(Math.random() * 100) + 10
        });
        (document.body || document.documentElement || document).dispatchEvent(event);
        console.log("[SYH Anti-AFK] Імітація фонової активності користувача виконана.");
    } catch (err) {
        // ignore
    }
}

let activeAfkTimer: ReturnType<typeof setInterval> | null = null;
let activeActivityTimer: ReturnType<typeof setInterval> | null = null;
let activeAfkObserver: MutationObserver | null = null;

export function stopAntiAfk(): void {
    if (activeAfkObserver !== null) {
        try {
            activeAfkObserver.disconnect();
        } catch {
            // ignore
        }
        activeAfkObserver = null;
    }
    if (activeAfkTimer !== null) {
        clearInterval(activeAfkTimer);
        activeAfkTimer = null;
    }
    if (activeActivityTimer !== null) {
        clearInterval(activeActivityTimer);
        activeActivityTimer = null;
    }
    console.log("[SYH Anti-AFK] Anti-AFK захист зупинено.");
}

export function startAntiAfk(
    config?: any,
    storage?: any,
    i18n?: I18nAdapterLike,
    customTargetNode?: Element | Document | null
): void {
    stopAntiAfk();

    const checkOptionsAndRun = (options?: any) => {
        const enabled = options?.anti_afk_enabled !== false;
        if (!enabled) {
            console.log("[SYH Anti-AFK] Anti-AFK вимкнено у налаштуваннях.");
            stopAntiAfk();
            return;
        }

        const intervalSec = options?.anti_afk_interval_sec || (config?.TIMINGS?.ANTI_AFK_INTERVAL ? config.TIMINGS.ANTI_AFK_INTERVAL / 1000 : 30);
        const intervalMs = Math.max(intervalSec * 1000, 5000);

        console.log(`[SYH Anti-AFK] Anti-AFK активовано (Превентивна активність + MutationObserver + Резервний таймер ${intervalSec}с).`);

        const rootNode = customTargetNode || (typeof document !== 'undefined' ? document.body || document.documentElement : null);

        // 1. Початкова перевірка
        checkAndClickAntiAfk(rootNode, i18n);

        // 2. Превентивна імітація активності кожні 2.5 хвилини (150,000 мс)
        simulateUserActivity();
        activeActivityTimer = setInterval(simulateUserActivity, 150000);

        // 3. MutationObserver перехоплення
        if (rootNode && typeof MutationObserver !== 'undefined') {
            try {
                activeAfkObserver = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                            const clicked = checkAndClickAntiAfk(rootNode, i18n);
                            if (clicked) break;
                        }
                    }
                });
                activeAfkObserver.observe(rootNode, { childList: true, subtree: true });
            } catch (err) {
                console.warn("[SYH Anti-AFK] Помилка старту MutationObserver:", err);
            }
        }

        // 4. Резервний таймер
        activeAfkTimer = setInterval(() => {
            try {
                if (typeof chrome !== 'undefined' && chrome.runtime && !chrome.runtime.id) {
                    stopAntiAfk();
                    return;
                }
            } catch {
                stopAntiAfk();
                return;
            }

            checkAndClickAntiAfk(rootNode, i18n);
        }, intervalMs);
    };

    if (storage && typeof storage.get === 'function') {
        storage.get([STORAGE_KEYS.OPTIONS], (data: any) => {
            checkOptionsAndRun(data?.[STORAGE_KEYS.OPTIONS]);
        });

        if (typeof storage.onChanged === 'function') {
            storage.onChanged((changes: any) => {
                if (changes[STORAGE_KEYS.OPTIONS]) {
                    checkOptionsAndRun(changes[STORAGE_KEYS.OPTIONS].newValue);
                }
            });
        }
    } else {
        checkOptionsAndRun();
    }
}

export const SYH_ANTI_AFK = {
    checkAndClickAntiAfk,
    simulateUserActivity,
    startAntiAfk,
    stopAntiAfk
};

if (typeof window !== 'undefined') {
    (window as any).SYH_ANTI_AFK = SYH_ANTI_AFK;
}
