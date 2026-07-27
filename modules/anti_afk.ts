// modules/anti_afk.ts

/**
 * ============================================================================
 * STREAMYARD HELPER - ANTI-AFK MODULE (Approach 1: MutationObserver + Fallback)
 * ============================================================================
 * Призначення:
 * Автоматичний захист від викидання зі студії StreamYard через бездіяльність (AFK).
 * Перехоплює діалогове вікно "Are you still there?" і натискає кнопку "Stay in the studio"
 * МИТТЄВО (за кілька мілісекунд) за допомогою MutationObserver.
 * ============================================================================
 */

export interface I18nAdapterLike {
    getMessage(key: string, fallback?: string): string;
}

/**
 * Сканує DOM-дерево на наявність вікна попередження про бездіяльність або кнопки "Stay in the studio"
 * та автоматично імітує клік по ній.
 * 
 * @param docNode Корневий вузол для пошуку (за замовчуванням global document)
 * @param i18n Адаптер i18n для отримання локалізованих рядків
 * @returns boolean true, якщо кнопку було знайдено і натиснуто, false інакше
 */
export function checkAndClickAntiAfk(
    docNode: Document | Element | null = typeof document !== 'undefined' ? document : null,
    i18n?: I18nAdapterLike
): boolean {
    if (!docNode) return false;

    // 1. Пошук модального вікна за різними варіантами селекторів (каскадна перевірка)
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
            const buttons = Array.from(modal.querySelectorAll('button'));
            if (buttons.length > 0) {
                modalButtons = buttons;
                break;
            }
        }
    }

    // 2. Резервний варіант (Fallback): Якщо модальний контейнер не визначився по класах/ролях,
    // скануємо всі кнопки на сторінці
    const candidateButtons = modalButtons.length > 0 
        ? modalButtons 
        : Array.from(docNode.querySelectorAll('button'));

    if (candidateButtons.length === 0) {
        return false;
    }

    // 3. Формуємо списки можливих варіантів тексту кнопки Stay in studio
    const targetTexts: string[] = [
        'stay in the studio',
        'stay in studio',
        'stay in',
        'залишитися в студії',
        'остаться в студии'
    ];

    // Додаємо локалізований рядок, якщо доступний
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
            // Ігноруємо помилки контексту розширення
        }
    }

    // 4. Пошук відповідності кнопки
    for (const btn of candidateButtons) {
        const text = (btn.textContent || '').trim().toLowerCase();
        const ariaLabel = (btn.getAttribute('aria-label') || '').trim().toLowerCase();

        const isMatch = targetTexts.some(target => 
            text === target || text.includes(target) || ariaLabel === target || ariaLabel.includes(target)
        ) || /stay in (the )?studio/i.test(text);

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

let activeAfkTimer: ReturnType<typeof setInterval> | null = null;
let activeAfkObserver: MutationObserver | null = null;

/**
 * Зупиняє активний таймер Anti-AFK перевірок та відключає MutationObserver.
 */
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
    console.log("[SYH Anti-AFK] Anti-AFK захист зупинено.");
}

/**
 * Запускає миттєву перевірку Anti-AFK через MutationObserver + підстрахувальний таймер.
 * 
 * @param config Глобальний конфіг розширення
 * @param storage Адаптер сховища (для зчитування `syh_options`)
 * @param i18n Адаптер i18n
 * @param customTargetNode Опціональний вузол для спостереження (за замовчуванням document.body)
 */
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
        const intervalMs = Math.max(intervalSec * 1000, 5000); // Мінімальний безпечний інтервал 5с

        console.log(`[SYH Anti-AFK] Anti-AFK захист активовано через MutationObserver (резервний інтервал: ${intervalSec}с).`);

        const rootNode = customTargetNode || (typeof document !== 'undefined' ? document.body || document.documentElement : null);

        // 1. Початкова перевірка (якщо діалог вже висить на момент старту)
        checkAndClickAntiAfk(typeof document !== 'undefined' ? document : null, i18n);

        // 2. Миттєвий перехоплювач через MutationObserver (Шлях 1)
        if (rootNode && typeof MutationObserver !== 'undefined') {
            try {
                activeAfkObserver = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                            const clicked = checkAndClickAntiAfk(typeof document !== 'undefined' ? document : null, i18n);
                            if (clicked) break;
                        }
                    }
                });
                activeAfkObserver.observe(rootNode, { childList: true, subtree: true });
            } catch (err) {
                console.warn("[SYH Anti-AFK] Не вдалося запустити MutationObserver, працює таймер:", err);
            }
        }

        // 3. Резервний таймер підстраховки
        activeAfkTimer = setInterval(() => {
            // KILL SWITCH: Самознищення при оновленні розширення (Context Invalidation)
            try {
                if (typeof chrome !== 'undefined' && chrome.runtime && !chrome.runtime.id) {
                    stopAntiAfk();
                    return;
                }
            } catch {
                stopAntiAfk();
                return;
            }

            checkAndClickAntiAfk(typeof document !== 'undefined' ? document : null, i18n);
        }, intervalMs);
    };

    // Зчитуємо налаштування з сховища та підписуємося на їх зміни в реальному часі
    if (storage && typeof storage.get === 'function') {
        storage.get(['syh_options'], (data: any) => {
            checkOptionsAndRun(data?.syh_options);
        });

        if (typeof storage.onChanged === 'function') {
            storage.onChanged((changes: any) => {
                if (changes.syh_options) {
                    checkOptionsAndRun(changes.syh_options.newValue);
                }
            });
        }
    } else {
        checkOptionsAndRun();
    }
}

export const SYH_ANTI_AFK = {
    checkAndClickAntiAfk,
    startAntiAfk,
    stopAntiAfk
};

if (typeof window !== 'undefined') {
    (window as any).SYH_ANTI_AFK = SYH_ANTI_AFK;
}
