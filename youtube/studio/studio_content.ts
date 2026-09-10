import { SYH_STORAGE } from '../../modules/storage';
import { initializeStudioModule } from './studio_init';
import { StudioStorageController, createStorageChangeHandler } from './studio_storage_handler';
import { StudioSPAHandler } from './studio_spa_handler';
import { StudioCommentProcessor } from './studio_comment_processor';

import type { ISyhPlugin } from '../../modules/core/plugin_registry';

export class StudioModuleController {
    private storageController: StudioStorageController;
    private spaHandler: StudioSPAHandler;
    private commentProcessor: StudioCommentProcessor;
    private isInitialized: boolean = false;
    private unsubscribeStorage: (() => void) | null = null;

    constructor() {
        this.storageController = new StudioStorageController();
        this.storageController.handleStateChange = () => this.handleStateChange();
        this.storageController.scheduleProcessComments = (forceUpdate: boolean) => this.scheduleProcessComments(forceUpdate);
        this.storageController.updateHeaderCounters = () => this.commentProcessor?.updateHeaderCounters();

        this.spaHandler = new StudioSPAHandler(() => this.handleStateChange());
        
        this.commentProcessor = new StudioCommentProcessor(
            this.storageController.caches,
            this.storageController.sheetStatsMap,
            () => this.isCommentsPage()
        );
    }

    public async init(): Promise<void> {
        if (this.isInitialized) return;
        this.isInitialized = true;

        console.log('[SYH Studio] Initializing Studio Module...');

        await this.storageController.loadStorageData();

        const channelInfo = await initializeStudioModule(
            this.storageController.caches,
            this.storageController.sheetStatsMap
        );
        this.storageController.channelInfo = channelInfo;

        this.unsubscribeStorage = SYH_STORAGE.onChanged(createStorageChangeHandler(this.storageController));
        this.spaHandler.start();
        this.handleStateChange();
    }

    private isCommentsPage(): boolean {
        return window.location.pathname.includes('/comments/');
    }

    private handleStateChange(): void {
        if (!this.storageController.enabled || !this.isCommentsPage()) {
            this.commentProcessor.setEnabled(false);
            this.commentProcessor.stopModule();
            return;
        }

        this.commentProcessor.setEnabled(true);
        this.commentProcessor.startModule();
    }

    private scheduleProcessComments(forceUpdate: boolean = false): void {
        this.commentProcessor.scheduleProcessComments(forceUpdate);
    }

    public destroy(): void {
        this.isInitialized = false;
        if (this.unsubscribeStorage) {
            this.unsubscribeStorage();
            this.unsubscribeStorage = null;
        }
        this.spaHandler.stop();
        this.commentProcessor.destroy();
    }
}

const studioController = new StudioModuleController();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        studioController.init().catch((err) => console.error('[SYH Studio] Init error:', err));
    });
} else {
    studioController.init().catch((err) => console.error('[SYH Studio] Init error:', err));
}

export const SYH_STUDIO_PLUGIN: ISyhPlugin = {
    id: 'syh_studio_module',
    name: 'YouTube Studio Helper',
    enabled: true,
    isSupported: (url = typeof window !== 'undefined' ? window.location.href : '') => url.includes('studio.youtube.com'),
    init: () => {
        studioController.init().catch((err) => console.error('[SYH Studio] Init error:', err));
    },
    destroy: () => {
        studioController.destroy();
    }
};

export { studioController };