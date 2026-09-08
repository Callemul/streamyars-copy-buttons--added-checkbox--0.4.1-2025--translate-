// modules/bootstrap_app.ts
/**
 * Точка збірки контент-скрипта StreamYard Helper.
 * `main.ts` лишається тонким входом, а весь порядок ініціалізації описаний тут
 * невеликими функціями, які можна перевірити юніт-тестами.
 */
import { SYH_CONFIG } from './config';
import { SYH_STATE } from './state';
import { SYH_UTILS } from './utils';
import { SYH_UI } from './ui';
import { SYH_PARSERS } from './parsers';
import { SYH_BANNER_CREATOR } from './banner_creator';
import { SYH_EVENT_COMMENTS_PLUGIN } from './event_comments';
import { SYH_EVENT_BANNERS_PLUGIN } from './event_banners';
import { SYH_VIDEO_COPIER_PLUGIN } from './video_copier';
import { SYH_STATS_TRACKER } from './stats_tracker';
import { SYH_ANTI_AFK_PLUGIN } from './anti_afk';
import { SYH_COMMENT_ASSISTANT } from './comment_assistant';
import { SYH_RIGHT_TABS_COMPACT } from './right_tabs_compact';
import { SYH_MESSAGING } from './messaging';
import { SYH_PLUGINS, type ISyhPlugin, type PluginRegistry } from './plugin_registry';
import { SYH_DOM_OBSERVER } from './dom_observer';

import { resolveObserverContainer, setupDomRegistration } from './bootstrap_dom';
import { routeSyhMessage, type CommentSelectors } from './bootstrap_messages';

export const INIT_FLAG = '__SYH_INITIALIZED__';
/** Фолбек версії для тестових середовищ (напр. node:test), де відсутній chrome.runtime.getManifest */
export const DEFAULT_VERSION = '1.0.0';

export type GlobalScopeLike = Record<string, unknown>;

export function getGlobalScope(): GlobalScopeLike {
    const scope = typeof globalThis !== 'undefined' ? globalThis : window;
    return scope as unknown as GlobalScopeLike;
}

/** ЗАПОБІЖНИК ПОДВІЙНОЇ ІН'ЄКЦІЇ: `false` — розширення вже запущене на цій сторінці. */
export function claimInitLock(scope: GlobalScopeLike = getGlobalScope()): boolean {
    if (scope[INIT_FLAG]) return false;
    scope[INIT_FLAG] = true;
    return true;
}

function readManifestVersion(): string | undefined {
    try {
        return chrome.runtime.getManifest().version;
    } catch {
        return undefined;
    }
}

export function getExtensionVersion(fallback: string = DEFAULT_VERSION): string {
    return readManifestVersion() ?? fallback;
}

/** Безпечно викликає опційний `init()` сервісу, який може бути відсутнім у певних збірках. */
export function callIfFunction(target: unknown, method: string): boolean {
    const fn = (target as Record<string, unknown> | null | undefined)?.[method];
    if (typeof fn !== 'function') return false;

    (fn as () => void).call(target);
    return true;
}

export function initCoreModules(): void {
    try {
        SYH_UTILS.init(SYH_CONFIG);
    } catch (e) {
        console.error('[SYH] Utils init failed:', e);
    }

    try {
        SYH_UI.init(SYH_CONFIG, SYH_STATE);
    } catch (e) {
        console.error('[SYH] UI init failed:', e);
    }

    try {
        SYH_BANNER_CREATOR.init(SYH_CONFIG, SYH_UTILS, SYH_PARSERS);
    } catch (e) {
        console.error('[SYH] BannerCreator init failed:', e);
    }

    try {
        SYH_COMMENT_ASSISTANT.init(SYH_CONFIG);
    } catch (e) {
        console.error('[SYH] CommentAssistant init failed:', e);
    }

    try {
        SYH_COMMENT_ASSISTANT.processAllComments();
    } catch (e) {
        console.error('[SYH] CommentAssistant processAllComments failed:', e);
    }

    try {
        void SYH_RIGHT_TABS_COMPACT.init();
    } catch (e) {
        console.error('[SYH] RightTabsCompact init failed:', e);
    }

    try {
        callIfFunction(SYH_STATE, 'init');
    } catch (e) {
        console.error('[SYH] State init failed:', e);
    }
}

export const SYH_PLUGIN_LIST: readonly ISyhPlugin[] = [
    SYH_EVENT_COMMENTS_PLUGIN,
    SYH_EVENT_BANNERS_PLUGIN,
    SYH_ANTI_AFK_PLUGIN,
    SYH_VIDEO_COPIER_PLUGIN
];

export function registerPlugins(
    registry: PluginRegistry = SYH_PLUGINS,
    plugins: readonly ISyhPlugin[] = SYH_PLUGIN_LIST
): void {
    plugins.forEach(plugin => registry.register(plugin));
    void registry.initSupportedPlugins();
}

/** ДВОСТОРОННЯ СИНХРОНІЗАЦІЯ: прийом сигналів від попапу в реальному часі. */
export function bindPopupMessaging(): void {
    const selectors = SYH_CONFIG.SELECTORS as unknown as CommentSelectors;
    SYH_MESSAGING.onMessage((message, _sender, sendResponse) =>
        routeSyhMessage(message, { selectors, sendResponse })
    );
}

export function initSyhApp(): void {
    console.log('Initializing SYH modules...');

    initCoreModules();
    registerPlugins();
    callIfFunction(SYH_STATS_TRACKER, 'init');

    setupDomRegistration();
    SYH_DOM_OBSERVER.start(resolveObserverContainer());
    bindPopupMessaging();

    console.log('SYH is running.');
}
