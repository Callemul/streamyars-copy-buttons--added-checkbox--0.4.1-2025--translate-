// youtube/yt_diagnostics.ts
//
// Вузький opt-in модуль діагностики та телеметрії продуктивності (Задача YT-E2).
// ПРИНЦИПИ:
// 1. Жодних персональних даних (жодного збереження author/text/коментарів).
// 2. Opt-in: за замовчуванням логування вимкнене, жодного шуму в production консолі.
// 3. Динамічне перемикання: window.__SYH_DEBUG__ або toggleDiagnostics(true/false).

export interface DiagnosticsMetrics {
    moduleState: 'active' | 'idle' | 'stopped';
    totalProcessedCycles: number;
    totalCommentsProcessed: number;
    lastCycleDurationMs: number;
    avgCycleDurationMs: number;
    coalescedFramesCount: number;
    storageReloadsCount: number;
    storageFailuresCount: number;
}

export class YouTubeDiagnostics {
    private enabled: boolean = false;
    private state: 'active' | 'idle' | 'stopped' = 'stopped';
    private totalCycles: number = 0;
    private totalComments: number = 0;
    private totalDurationMs: number = 0;
    private lastDurationMs: number = 0;
    private coalescedFrames: number = 0;
    private storageReloads: number = 0;
    private storageFailures: number = 0;

    public setEnabled(val: boolean): void {
        this.enabled = val;
    }

    public isEnabled(): boolean {
        if (typeof window !== 'undefined' && (window as unknown as { __SYH_DEBUG__?: boolean }).__SYH_DEBUG__) {
            return true;
        }
        return this.enabled;
    }

    public setModuleState(state: 'active' | 'idle' | 'stopped'): void {
        this.state = state;
        if (this.isEnabled()) {
            console.debug('[SYH Diagnostics] Module state changed:', state);
        }
    }

    public recordCycle(durationMs: number, commentsCount: number): void {
        this.totalCycles++;
        this.totalComments += commentsCount;
        this.lastDurationMs = durationMs;
        this.totalDurationMs += durationMs;
        if (this.isEnabled()) {
            console.debug(`[SYH Diagnostics] Cycle completed: duration=${durationMs.toFixed(2)}ms, comments=${commentsCount}`);
        }
    }

    public recordCoalescedFrame(): void {
        this.coalescedFrames++;
    }

    public recordStorageReload(): void {
        this.storageReloads++;
    }

    public recordStorageFailure(error?: unknown): void {
        this.storageFailures++;
        if (this.isEnabled() && error) {
            console.warn('[SYH Diagnostics] Storage failure:', error);
        }
    }

    public getSummary(): DiagnosticsMetrics {
        return {
            moduleState: this.state,
            totalProcessedCycles: this.totalCycles,
            totalCommentsProcessed: this.totalComments,
            lastCycleDurationMs: this.lastDurationMs,
            avgCycleDurationMs: this.totalCycles > 0 ? this.totalDurationMs / this.totalCycles : 0,
            coalescedFramesCount: this.coalescedFrames,
            storageReloadsCount: this.storageReloads,
            storageFailuresCount: this.storageFailures
        };
    }

    public reset(): void {
        this.state = 'stopped';
        this.totalCycles = 0;
        this.totalComments = 0;
        this.totalDurationMs = 0;
        this.lastDurationMs = 0;
        this.coalescedFrames = 0;
        this.storageReloads = 0;
        this.storageFailures = 0;
    }
}

export const SYH_YT_DIAGNOSTICS = new YouTubeDiagnostics();
