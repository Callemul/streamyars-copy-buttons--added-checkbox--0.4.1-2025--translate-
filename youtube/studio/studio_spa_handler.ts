// youtube/studio/studio_spa_handler.ts
export class StudioSPAHandler {
    private lastPath: string = '';
    private pollInterval: number | null = null;
    private pathChangeCallback: () => void;

    constructor(pathChangeCallback: () => void) {
        this.pathChangeCallback = pathChangeCallback;
    }

    public start(): void {
        this.lastPath = window.location.pathname;
        window.addEventListener('popstate', () => this.checkPathChange());
        window.addEventListener('yt-navigate-finish', () => this.checkPathChange());

        if (this.pollInterval === null) {
            this.pollInterval = window.setInterval(() => {
                this.checkPathChange();
            }, 1000);
        }
    }

    public stop(): void {
        if (this.pollInterval !== null) {
            window.clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    private checkPathChange(): void {
        const currentPath = window.location.pathname;
        if (currentPath !== this.lastPath) {
            this.lastPath = currentPath;
            console.log('[SYH Studio] Location changed to:', currentPath);
            this.pathChangeCallback();
        }
    }
}