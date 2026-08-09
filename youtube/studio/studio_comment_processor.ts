// youtube/studio/studio_comment_processor.ts
import { bindStudioCommentEvents, type StudioEventCaches } from './studio_events';
import { SYH_DOM_OBSERVER } from '../../modules/dom_observer';
import { getSortedCommentThreads } from './studio_thread_sorter';
import { StudioHeaderUpdater } from './studio_header_updater';
import { createContextMenuHandler } from './studio_context_menu';

export class StudioCommentProcessor {
    private enabled: boolean = true;
    private frameId: number | null = null;
    private unregisterObserver: (() => void) | null = null;
    private scrollHandler: (() => void) | null = null;
    private contextMenuHandler: ((e: MouseEvent) => void) | null = null;
    private caches: StudioEventCaches;
    private headerUpdater: StudioHeaderUpdater;
    private isCommentsPage: () => boolean;
    private enabledRef = { current: true };

    constructor(
        caches: StudioEventCaches,
        sheetStatsMap: Record<string, { questions: number; prayers: number }>,
        isCommentsPage: () => boolean
    ) {
        this.caches = caches;
        this.headerUpdater = new StudioHeaderUpdater(sheetStatsMap);
        this.isCommentsPage = isCommentsPage;
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        this.enabledRef.current = enabled;
    }

    public setCaches(caches: StudioEventCaches): void {
        this.caches = caches;
    }

    public setSheetStatsMap(sheetStatsMap: Record<string, { questions: number; prayers: number }>): void {
        this.headerUpdater.setSheetStatsMap(sheetStatsMap);
    }

    public async startModule(): Promise<void> {
        if (!this.enabled || !this.isCommentsPage()) return;

        this.headerUpdater.refreshChannelInfo();
        this.headerUpdater.updateHeaderCounters(this.enabled, this.isCommentsPage);
        await this.setupObserver();
        this.setupScrollHandler();
        this.setupContextMenuHandler();
        this.scheduleProcessComments(false);
    }

    private async setupObserver(): Promise<void> {
        if (!this.unregisterObserver) {
            this.unregisterObserver = SYH_DOM_OBSERVER.register(
                '.ytcp-comment-thread, ytcp-comment-thread, ytcp-comment, #comments-content, #items',
                () => {
                    if (this.enabledRef.current && this.isCommentsPage()) {
                        this.scheduleProcessComments(false);
                    }
                }
            );
            SYH_DOM_OBSERVER.start(document.body);
        }
    }

    private setupScrollHandler(): void {
        if (!this.scrollHandler) {
            this.scrollHandler = () => {
                if (this.enabledRef.current && this.isCommentsPage()) {
                    this.scheduleProcessComments(false);
                }
            };
            window.addEventListener('scroll', this.scrollHandler, { capture: true, passive: true });
        }
    }

    private setupContextMenuHandler(): void {
        if (!this.contextMenuHandler) {
            this.contextMenuHandler = createContextMenuHandler(this.enabledRef, this.isCommentsPage);
            window.addEventListener('contextmenu', this.contextMenuHandler, { capture: true });
        }
    }

    public stopModule(): void {
        if (this.frameId !== null) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }

        if (this.unregisterObserver) {
            this.unregisterObserver();
            this.unregisterObserver = null;
        }

        if (this.scrollHandler) {
            window.removeEventListener('scroll', this.scrollHandler, { capture: true, passive: true });
            this.scrollHandler = null;
        }

        if (this.contextMenuHandler) {
            window.removeEventListener('contextmenu', this.contextMenuHandler, { capture: true });
            this.contextMenuHandler = null;
        }

        this.cleanupInjectedUI();
    }

    private cleanupInjectedUI(): void {
        document.querySelectorAll('.syh-studio-btn, .syh-studio-video-meta, .syh-header-counters-wrapper').forEach((el) => el.remove());
        document.querySelectorAll('.syh-studio-comment-checked').forEach((el) => el.classList.remove('syh-studio-comment-checked'));
    }

    public scheduleProcessComments(forceUpdate: boolean = false): void {
        if (this.frameId !== null) return;

        this.frameId = requestAnimationFrame(() => {
            this.frameId = null;
            this.processVisibleComments(forceUpdate);
        });
    }

    public processVisibleComments(forceUpdate: boolean = false): void {
        if (!this.enabled || !this.isCommentsPage()) return;

        this.headerUpdater.refreshChannelInfo();
        this.headerUpdater.updateHeaderCounters(this.enabled, this.isCommentsPage);

        const channelKey = this.headerUpdater.getChannelKey();
        const channelLabel = this.headerUpdater.getChannelLabel();

        const sortedThreads = getSortedCommentThreads();
        sortedThreads.forEach((threadEl) => {
            bindStudioCommentEvents(threadEl, channelKey, channelLabel, this.caches, forceUpdate);
        });
    }

    public destroy(): void {
        this.stopModule();
    }
}