// modules/anti_afk.ts
import { SYH_STORAGE, STORAGE_KEYS } from './storage';
import { SYH_I18N } from './i18n';

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
function findModalCandidateButtons(docNode: Document | Element): Element[] {
    const dialogSelectors = [
        'div[role="dialog"][aria-label="Are you still there?"]',
        'div[role="dialog"]',
        '[aria-modal="true"]',
        'div[class*="modal"]',
        'div[class*="Dialog"]'
    ];

    for (const selector of dialogSelectors) {
        const modal = docNode.querySelector(selector);
        if (modal) {
            const buttons = Array.from(modal.querySelectorAll('button, [role="button"], a'));
            if (buttons.length > 0) {
                return buttons;
            }
        }
    }

    return Array.from(docNode.querySelectorAll('button, [role="button"], div[tabindex="0"], a'));
}

function isStayInStudioButton(btn: Element, targetTexts: string[]): boolean {
    const text = (btn.textContent || '').trim().toLowerCase();
    const ariaLabel = (btn.getAttribute('aria-label') || '').trim().toLowerCase();
    const title = (btn.getAttribute('title') || '').trim().toLowerCase();

    return targetTexts.some(target =>
        text === target || text.includes(target) ||
        ariaLabel === target || ariaLabel.includes(target) ||
        title === target || title.includes(target)
    ) || /stay in (the )?studio/i.test(text) || /still there/i.test(text);
}

export function checkAndClickAntiAfk(
    docNode: Document | Element | null = typeof document !== 'undefined' ? document : null,
    i18n?: I18nAdapterLike
): boolean {
    if (!docNode) return false;

    const candidateButtons = findModalCandidateButtons(docNode);
    if (candidateButtons.length === 0) return false;

    const targetTexts: string[] = [
        'stay in the studio',
        'stay in studio',
        'stay in',
        'still there',
        'залишитися в студії',
        'остаться в студии'
    ];

    const localized = i18n && typeof i18n.getMessage === 'function'
        ? i18n.getMessage('stayInStudio')
        : SYH_I18N.getMessage('stayInStudio');
    if (localized && localized.trim()) {
        targetTexts.push(localized.trim().toLowerCase());
    }

    for (const btn of candidateButtons) {
        if (isStayInStudioButton(btn, targetTexts)) {
            try {
                console.log("[SYH Anti-AFK] AFK таймаут перехоплено! Натискаю 'Stay in the studio'.");
                (btn as HTMLElement).click();
                if (typeof SYH_BUS !== 'undefined') {
                    SYH_BUS.emit('ANTI_AFK_TRIGGERED', { timestamp: Date.now() });
                }
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
    } catch {
        // ignore
    }
}

export class AntiAfkService {
    private afkTimer: ReturnType<typeof setInterval> | null = null;
    private activityTimer: ReturnType<typeof setInterval> | null = null;
    private observer: MutationObserver | null = null;

    public stop(): void {
        if (this.observer !== null) {
            try {
                this.observer.disconnect();
            } catch {
                // ignore
            }
            this.observer = null;
        }
        if (this.afkTimer !== null) {
            clearInterval(this.afkTimer);
            this.afkTimer = null;
        }
        if (this.activityTimer !== null) {
            clearInterval(this.activityTimer);
            this.activityTimer = null;
        }
        console.log("[SYH Anti-AFK] Anti-AFK захист зупинено.");
    }

    public start(
        config?: Record<string, unknown>,
        storage?: { get: (...args: any[]) => void; onChanged?: (...args: any[]) => void },
        i18n?: I18nAdapterLike,
        customTargetNode?: Element | Document | null
    ): void {
        this.stop();

        const checkOptionsAndRun = (options?: { anti_afk_enabled?: boolean; anti_afk_interval_sec?: number }) => {
            const enabled = options?.anti_afk_enabled !== false;
            if (!enabled) {
                console.log("[SYH Anti-AFK] Anti-AFK вимкнено у налаштуваннях.");
                this.stop();
                return;
            }

            const intervalSec = options?.anti_afk_interval_sec || 30;
            const intervalMs = Math.max(intervalSec * 1000, 5000);

            console.log(`[SYH Anti-AFK] Anti-AFK активовано (Превентивна активність + MutationObserver + Резервний таймер ${intervalSec}с).`);

            const rootNode = customTargetNode || (typeof document !== 'undefined' ? document.body || document.documentElement : null);

            checkAndClickAntiAfk(rootNode, i18n);

            simulateUserActivity();
            this.activityTimer = setInterval(simulateUserActivity, 150000);

            if (rootNode && typeof MutationObserver !== 'undefined') {
                try {
                    this.observer = new MutationObserver((mutations) => {
                        for (const mutation of mutations) {
                            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                                const clicked = checkAndClickAntiAfk(rootNode, i18n);
                                if (clicked) break;
                            }
                        }
                    });
                    this.observer.observe(rootNode, { childList: true, subtree: true });
                } catch {
                    console.warn("[SYH Anti-AFK] Помилка старту MutationObserver");
                }
            }

            this.afkTimer = setInterval(() => {
                try {
                    if (typeof chrome !== 'undefined' && chrome.runtime && !chrome.runtime.id) {
                        this.stop();
                        return;
                    }
                } catch {
                    this.stop();
                    return;
                }

                checkAndClickAntiAfk(rootNode, i18n);
            }, intervalMs);
        };

        // Синхронний первинний запуск із дефолтними налаштуваннями
        checkOptionsAndRun();

        // Динамічне підтягування налаштувань користувача зі сховища
        const activeStorage = (storage || SYH_STORAGE) as any;
        if (activeStorage && typeof activeStorage.get === 'function') {
            activeStorage.get([STORAGE_KEYS.OPTIONS], (data: Record<string, unknown>) => {
                if (data?.[STORAGE_KEYS.OPTIONS]) {
                    checkOptionsAndRun(data[STORAGE_KEYS.OPTIONS] as any);
                }
            });

            if (typeof activeStorage.onChanged === 'function') {
                activeStorage.onChanged((changes: Record<string, { newValue?: unknown }>) => {
                    if (changes[STORAGE_KEYS.OPTIONS]) {
                        checkOptionsAndRun(changes[STORAGE_KEYS.OPTIONS].newValue as any);
                    }
                });
            }
        }
    }
}

export const SYH_ANTI_AFK_SERVICE = new AntiAfkService();

export function stopAntiAfk(): void {
    SYH_ANTI_AFK_SERVICE.stop();
}

export function startAntiAfk(
    config?: Record<string, unknown>,
    storage?: unknown,
    i18n?: I18nAdapterLike,
    customTargetNode?: Element | Document | null
): void {
    SYH_ANTI_AFK_SERVICE.start(config, storage as any, i18n, customTargetNode);
}

import type { ISyhPlugin } from './plugin_registry';

export const SYH_ANTI_AFK_PLUGIN: ISyhPlugin = {
    id: 'syh_anti_afk',
    name: 'StreamYard Anti-AFK Defender',
    enabled: true,
    isSupported: (url = typeof window !== 'undefined' ? window.location.href : '') => url.includes('streamyard.com'),
    init: () => {
        startAntiAfk();
    },
    destroy: () => {
        stopAntiAfk();
    }
};

export const SYH_ANTI_AFK = {
    checkAndClickAntiAfk,
    simulateUserActivity,
    startAntiAfk,
    stopAntiAfk
};
