// modules/anti_afk.ts
/**
 * ============================================================================
 * STREAMYARD HELPER - ANTI-AFK MODULE (GOLDEN STANDARD: BULLETPROOF + PREVENTIVE)
 * ============================================================================
 * Розроблено за Золотим стандартом проєкту (DEVELOPER_NOTES.md).
 *
 * Подвійний захист від AFK:
 * 1. Превентивний захист (User Activity Simulation):
 *    Періодично (раз на 2.5 хвилини) відправляє легку фонову подію `mousemove`,
 *    завдяки чому StreamYard вважає користувача активним і ВЗАГАЛІ НЕ ПОКАЗУЄ вікно AFK.
 *
 * 2. Броньований (Bulletproof) сканер:
 *    Якщо діалог все ж з'явився, сканує абсолютно всі клікабельні вузли
 *    (button, [role="button"], a, div[tabindex]), ігноруючи специфічні React-класи.
 * ============================================================================
 *
 * Цей файл — тонкий фасад-бочка. Реалізація розділена на:
 *   - `anti_afk_detector.ts` — пошук/зіставлення/клік кнопки + імітація активності;
 *   - `anti_afk_service.ts`  — таймери, MutationObserver, читання опцій.
 * Поведінка збережена 1-в-1 (див. tests/anti_afk.test.js, tests/anti_afk_service.test.js).
 */

import { checkAndClickAntiAfk, simulateUserActivity, type I18nAdapterLike } from './anti_afk_detector';
import { AntiAfkService } from './anti_afk_service';
import type { ISyhPlugin } from '../../plugin_registry';

export { checkAndClickAntiAfk, simulateUserActivity } from './anti_afk_detector';
export type { I18nAdapterLike } from './anti_afk_detector';
export { AntiAfkService } from './anti_afk_service';

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
