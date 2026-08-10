// modules/anti_afk_service.ts
//
// Життєвий цикл Anti-AFK захисту: конфігурація з опцій, превентивний таймер
// активності, MutationObserver над модалками та резервний таймер сканування.
//
// Виділено з `modules/anti_afk.ts`, де замикання `checkOptionsAndRun` займало
// 50 рядків із cyclomatic 11 усередині `AntiAfkService.start`.
//
// Життєвий цикл зроблено ідемпотентним: `applyOptions` гарантовано очищає
// попередні таймери й спостерігача перед (пере)запуском, тож переналаштування
// зі storage більше не лишає осиротілих інтервалів. Латентний баг виправлено —
// див. docs/audits/active/audit_2026-08-10_KILO_antiafk-timer-observer-leak-on-reconfigure.md

import { SYH_STORAGE, STORAGE_KEYS } from './storage';
import { checkAndClickAntiAfk, simulateUserActivity, type I18nAdapterLike } from './anti_afk_detector';

/** Період превентивної імітації активності (2.5 хв). */
const ACTIVITY_SIMULATION_INTERVAL_MS = 150000;
/** Дефолтний період резервного сканування, якщо в опціях нічого немає. */
const DEFAULT_AFK_INTERVAL_SEC = 30;
/** Нижня межа резервного сканування, щоб не з'їдати CPU. */
const MIN_AFK_INTERVAL_MS = 5000;

interface AntiAfkOptions {
    anti_afk_enabled?: boolean;
    anti_afk_interval_sec?: number;
}

interface StorageLike {
    get: (...args: any[]) => void;
    onChanged?: (...args: any[]) => void;
}

/** Опції вважаються увімкненими, доки явно не вимкнені. */
function isAntiAfkEnabled(options?: AntiAfkOptions): boolean {
    return options?.anti_afk_enabled !== false;
}

/** Переводить `anti_afk_interval_sec` у мілісекунди із затисканням знизу. */
function resolveAfkIntervalMs(options?: AntiAfkOptions): number {
    const intervalSec = options?.anti_afk_interval_sec || DEFAULT_AFK_INTERVAL_SEC;
    return Math.max(intervalSec * 1000, MIN_AFK_INTERVAL_MS);
}

/** Чи інвалідовано контекст розширення (розширення перезавантажили/вимкнули). */
function isExtensionContextInvalidated(): boolean {
    try {
        return typeof chrome !== 'undefined' && !!chrome.runtime && !chrome.runtime.id;
    } catch {
        return true;
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
        storage?: StorageLike,
        i18n?: I18nAdapterLike,
        customTargetNode?: Element | Document | null
    ): void {
        this.stop();

        const applyOptions = (options?: AntiAfkOptions) => this.applyOptions(options, i18n, customTargetNode);

        // Синхронний первинний запуск із дефолтними налаштуваннями
        applyOptions();

        // Динамічне підтягування налаштувань користувача зі сховища
        this.subscribeToOptions(storage, applyOptions);
    }

    /** Перечитує конфіг і (пере)піднімає таймери та спостерігача. */
    private applyOptions(
        options: AntiAfkOptions | undefined,
        i18n: I18nAdapterLike | undefined,
        customTargetNode: Element | Document | null | undefined
    ): void {
        // Ідемпотентність: будь-яке (пере)налаштування спершу очищає попередні
        // таймери та спостерігача, щоб зміна інтервалу на льоту не лишала
        // осиротілих інтервалів (витік) — див. audit antiafk-timer-observer-leak.
        this.stop();

        if (!isAntiAfkEnabled(options)) {
            console.log("[SYH Anti-AFK] Anti-AFK вимкнено у налаштуваннях.");
            return;
        }

        const intervalMs = resolveAfkIntervalMs(options);
        const intervalSec = options?.anti_afk_interval_sec || DEFAULT_AFK_INTERVAL_SEC;

        console.log(`[SYH Anti-AFK] Anti-AFK активовано (Превентивна активність + MutationObserver + Резервний таймер ${intervalSec}с).`);

        const rootNode = this.resolveRootNode(customTargetNode);

        checkAndClickAntiAfk(rootNode, i18n);

        this.startActivitySimulation();
        this.startModalObserver(rootNode, i18n);
        this.startFallbackScanner(rootNode, i18n, intervalMs);
    }

    private resolveRootNode(customTargetNode?: Element | Document | null): Element | Document | null {
        if (customTargetNode) return customTargetNode;
        if (typeof document === 'undefined') return null;
        return document.body || document.documentElement;
    }

    /** Превентивна активність: одразу + періодично. */
    private startActivitySimulation(): void {
        simulateUserActivity();
        this.activityTimer = setInterval(simulateUserActivity, ACTIVITY_SIMULATION_INTERVAL_MS);
    }

    /** Реакція на появу модалки в DOM. */
    private startModalObserver(rootNode: Element | Document | null, i18n?: I18nAdapterLike): void {
        if (!rootNode || typeof MutationObserver === 'undefined') return;

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

    /** Резервне періодичне сканування + самозупинка на мертвому контексті. */
    private startFallbackScanner(
        rootNode: Element | Document | null,
        i18n: I18nAdapterLike | undefined,
        intervalMs: number
    ): void {
        this.afkTimer = setInterval(() => {
            if (isExtensionContextInvalidated()) {
                this.stop();
                return;
            }

            checkAndClickAntiAfk(rootNode, i18n);
        }, intervalMs);
    }

    /** Первинне читання опцій + підписка на їх зміни. */
    private subscribeToOptions(
        storage: StorageLike | undefined,
        applyOptions: (options?: AntiAfkOptions) => void
    ): void {
        const activeStorage = (storage || SYH_STORAGE) as any;
        if (!activeStorage || typeof activeStorage.get !== 'function') return;

        activeStorage.get([STORAGE_KEYS.OPTIONS], (data: Record<string, unknown>) => {
            if (data?.[STORAGE_KEYS.OPTIONS]) {
                applyOptions(data[STORAGE_KEYS.OPTIONS] as AntiAfkOptions);
            }
        });

        if (typeof activeStorage.onChanged === 'function') {
            activeStorage.onChanged((changes: Record<string, { newValue?: unknown }>) => {
                if (changes[STORAGE_KEYS.OPTIONS]) {
                    applyOptions(changes[STORAGE_KEYS.OPTIONS].newValue as AntiAfkOptions);
                }
            });
        }
    }
}
