// modules/anti_afk_detector.ts
//
// Розпізнавання та натискання кнопки "Stay in the studio" у діалозі AFK.
//
// Виділено з `modules/anti_afk.ts`, де `checkAndClickAntiAfk` була функцією на
// 40 рядків із cognitive 13 усередині hotspot-файлу (churn-score 30.2 за Fallow).
// Тут зібрано ЛИШЕ пошук/зіставлення/клік — без таймерів і без життєвого циклу.

import { SYH_I18N } from '../../registry/i18n';
import { SYH_BUS } from '../../core/event_bus';

export interface I18nAdapterLike {
    getMessage(key: string, fallback?: string): string;
}

/** Селектори модальних вікон у порядку зменшення специфічності. */
const DIALOG_SELECTORS = [
    'div[role="dialog"][aria-label="Are you still there?"]',
    'div[role="dialog"]',
    '[aria-modal="true"]',
    'div[class*="modal"]',
    'div[class*="Dialog"]'
] as const;

/** Базові тексти кнопки «залишитись у студії» різними мовами. */
const BASE_TARGET_TEXTS: readonly string[] = [
    'stay in the studio',
    'stay in studio',
    'stay in',
    'still there',
    'залишитися в студії',
    'остаться в студии'
];

/**
 * Броньований сканер для виявлення кнопки "Stay in studio".
 * Спершу шукає всередині відомих модалок, інакше — по всьому вузлу.
 */
function findModalCandidateButtons(docNode: Document | Element): Element[] {
    for (const selector of DIALOG_SELECTORS) {
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

/**
 * Збирає список цільових текстів: базові + локалізований варіант.
 * Порожній/пробільний локалізований рядок ігнорується, щоб не збігатися з усім підряд.
 */
function buildTargetTexts(i18n?: I18nAdapterLike): string[] {
    const targetTexts = [...BASE_TARGET_TEXTS];

    const localized = i18n && typeof i18n.getMessage === 'function'
        ? i18n.getMessage('stayInStudio')
        : SYH_I18N.getMessage('stayInStudio');

    if (localized && localized.trim()) {
        targetTexts.push(localized.trim().toLowerCase());
    }

    return targetTexts;
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

/** Натискає кнопку й публікує подію. Повертає false, якщо клік кинув виняток. */
function clickStayButton(btn: Element): boolean {
    try {
        console.log("[SYH Anti-AFK] AFK таймаут перехоплено! Натискаю 'Stay in the studio'.");
        (btn as HTMLElement).click();
        SYH_BUS.emit('ANTI_AFK_TRIGGERED', { timestamp: Date.now() });
        return true;
    } catch (err) {
        console.warn("[SYH Anti-AFK] Помилка при натисканні кнопки Stay in studio:", err);
        return false;
    }
}

export function checkAndClickAntiAfk(
    docNode: Document | Element | null = typeof document !== 'undefined' ? document : null,
    i18n?: I18nAdapterLike
): boolean {
    if (!docNode) return false;

    const candidateButtons = findModalCandidateButtons(docNode);
    if (candidateButtons.length === 0) return false;

    const targetTexts = buildTargetTexts(i18n);

    for (const btn of candidateButtons) {
        if (isStayInStudioButton(btn, targetTexts) && clickStayButton(btn)) {
            return true;
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
