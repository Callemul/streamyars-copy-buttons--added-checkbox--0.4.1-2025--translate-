/**
 * StreamYard Helper — header-контроли трекера статистики.
 *
 * Винесено з `modules/stats_tracker.ts`: раніше побудова 4 кнопок і їх ін'єкція
 * жили замиканнями всередині `setupObservers()`, через що були недосяжні для
 * прямих юніт-тестів. Тут вони — звичайні функції з явною залежністю `host`.
 *
 * Пізнє зв'язування збережено: обробники звертаються до `host.markPhase(...)`
 * у момент кліку, тому підміна методів на `SYH_STATS_TRACKER` у тестах чи в
 * рантаймі впливає на вже змонтовані кнопки — як і в оригіналі.
 */

import { UiFactory } from './ui_factory';
import {
    detectBrandAndSabbathSchool,
    checkSabbathSchoolBrandMismatch,
    type StatsBrandHost
} from './stats_brand_detector';

/** Контракт трекера, від якого залежать header-контроли. */
export interface StatsHeaderHost extends StatsBrandHost {
    markPhase(phase: 'questions' | 'prayers', btnElement: HTMLElement): void;
    showAnalyticsModal(): void;
    restoreButtonStates(btnQ: HTMLElement, btnP: HTMLElement): void;
}

/** Id контейнера кнопок — використовується і як «вже змонтовано»-маркер. */
export const HEADER_CONTROLS_ID = 'syh-header-controls';

const HEADER_CENTER_SELECTOR = '[data-testid="header-center"]';
const HEADER_STATUS_WRAP_SELECTOR = '[data-testid="header-status-wrap"]';

const CONTAINER_CSS = 'display: flex; gap: 8px; margin: 0 15px; flex-shrink: 0; z-index: 100; align-items: center;';
const PHASE_BUTTON_CSS = 'border: none; border-radius: 4px; padding: 0 10px; cursor: pointer; font-weight: bold; font-size: 12px; height: 28px; transition: 0.2s;';
const ANALYTICS_BUTTON_CSS = 'background: #28a745; color: white; border: none; border-radius: 4px; padding: 0 12px; cursor: pointer; font-weight: bold; font-size: 13px; height: 28px; margin-left: 10px;';
const INFO_BUTTON_CSS = 'background: #4F5461; color: white; border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-weight: bold; font-size: 15px; margin-left: 8px; display: flex; align-items: center; justify-content: center; transition: background 0.2s;';
const INFO_BUTTON_BG = '#4F5461';
const INFO_BUTTON_BG_HOVER = '#636979';

interface PhaseButtonSpec {
    phase: 'questions' | 'prayers';
    icon: string;
    title: string;
    background: string;
}

const PHASE_BUTTONS: readonly [PhaseButtonSpec, PhaseButtonSpec] = [
    { phase: 'questions', icon: '❓ Старт: Питання', title: 'Натисни, коли починається блок питань', background: '#f39c12' },
    { phase: 'prayers', icon: '🙏 Старт: Молитви', title: 'Натисни, коли починається молитовний блок', background: '#005DF7' }
];

function createPhaseButton(host: StatsHeaderHost, spec: PhaseButtonSpec): HTMLButtonElement {
    const btn = UiFactory.createButton({
        action: `phase-${spec.phase}`,
        icon: spec.icon,
        title: spec.title,
        onClick: () => host.markPhase(spec.phase, btn)
    });
    btn.style.cssText = `background: ${spec.background}; color: white; ${PHASE_BUTTON_CSS}`;
    return btn;
}

function createAnalyticsButton(host: StatsHeaderHost): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = 'syh-analytics-btn';
    btn.innerText = '📈 Аналітика';
    btn.setAttribute('aria-label', 'Відкрити аналітику');
    btn.style.cssText = ANALYTICS_BUTTON_CSS;
    btn.onclick = () => host.showAnalyticsModal();
    return btn;
}

function createInfoButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = 'syh-info-btn';
    btn.innerHTML = 'ⓘ';
    btn.title = 'Оновлення та Інструкції';
    btn.setAttribute('aria-label', 'Відкрити довідку та оновлення');
    btn.style.cssText = INFO_BUTTON_CSS;
    btn.onmouseover = () => btn.style.background = INFO_BUTTON_BG_HOVER;
    btn.onmouseout = () => btn.style.background = INFO_BUTTON_BG;
    btn.onclick = () => {
        const globalModal = (window as any).SYH_INFO_MODAL;
        if (globalModal && typeof globalModal.showModal === 'function') {
            globalModal.showModal();
        } else {
            console.warn('[SYH] Модуль info_modal недоступний.');
        }
    };
    return btn;
}

function createHeaderControlContainer(host: StatsHeaderHost): HTMLElement {
    const btnContainer = document.createElement('div');
    btnContainer.id = HEADER_CONTROLS_ID;
    btnContainer.style.cssText = CONTAINER_CSS;

    // Деструктуризація КОРТЕЖА (а не результату .map, який знову масив):
    // так у типі видно, що специфікацій рівно дві.
    const [questionSpec, prayerSpec] = PHASE_BUTTONS;
    const btnQ = createPhaseButton(host, questionSpec);
    const btnP = createPhaseButton(host, prayerSpec);
    const btnAnalytics = createAnalyticsButton(host);
    const btnInfo = createInfoButton();

    btnContainer.appendChild(btnQ);
    btnContainer.appendChild(btnP);
    btnContainer.appendChild(btnAnalytics);
    btnContainer.appendChild(btnInfo);

    host.restoreButtonStates(btnQ, btnP);
    return btnContainer;
}

/** Чи вже змонтовано контейнер кнопок у шапці. */
export function isHeaderControlsMounted(): boolean {
    return Boolean(document.getElementById(HEADER_CONTROLS_ID));
}

/**
 * Монтує кнопки в шапку (якщо їх ще немає) і щоразу переоцінює
 * попередження про невідповідність папки медіа.
 */
export function injectHeaderButtons(host: StatsHeaderHost): void {
    const headerCenter = document.querySelector(HEADER_CENTER_SELECTOR) as HTMLElement | null;
    const statusWrap = document.querySelector(HEADER_STATUS_WRAP_SELECTOR);
    if (!headerCenter || !statusWrap) return;

    const { brandName, isSabbathSchool } = detectBrandAndSabbathSchool(host);

    if (!isHeaderControlsMounted()) {
        headerCenter.style.display = 'flex';
        headerCenter.style.alignItems = 'center';
        headerCenter.style.flexDirection = 'row';

        headerCenter.insertBefore(createHeaderControlContainer(host), statusWrap);
    }

    checkSabbathSchoolBrandMismatch(brandName, isSabbathSchool);
}
