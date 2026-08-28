// youtube/studio/studio_spa_handler.ts
export class StudioSPAHandler {
    private lastPath: string = '';
    private pollInterval: number | null = null;
    private pathChangeCallback: () => void;
    private isRunning: boolean = false;
    private onPathEvent = () => this.checkPathChange();

    constructor(pathChangeCallback: () => void) {
        this.pathChangeCallback = pathChangeCallback;
    }

    public start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastPath = window.location.pathname;
        window.addEventListener('popstate', this.onPathEvent);
        window.addEventListener('yt-navigate-finish', this.onPathEvent);

        if (this.pollInterval === null) {
            this.pollInterval = window.setInterval(() => {
                this.checkPathChange();
            }, 1000);
            if (typeof (this.pollInterval as any)?.unref === 'function') {
                (this.pollInterval as any).unref();
            }
        }
    }

    public stop(): void {
        if (!this.isRunning && this.pollInterval === null) return;
        this.isRunning = false;
        window.removeEventListener('popstate', this.onPathEvent);
        window.removeEventListener('yt-navigate-finish', this.onPathEvent);

        if (this.pollInterval !== null) {
            window.clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    public checkPathChange(): void {
        const currentPath = window.location.pathname;
        if (currentPath !== this.lastPath) {
            this.lastPath = currentPath;
            console.log('[SYH Studio] Location changed to:', currentPath);
            this.pathChangeCallback();
        }
    }
}