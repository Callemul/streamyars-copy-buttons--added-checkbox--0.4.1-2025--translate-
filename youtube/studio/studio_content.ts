import { SYH_STORAGE } from '../../modules/storage';
import { initializeStudioModule } from './studio_init';
import { StudioStorageController, createStorageChangeHandler } from './studio_storage_handler';
import { StudioSPAHandler } from './studio_spa_handler';
import { StudioCommentProcessor } from './studio_comment_processor';

import type { ISyhPlugin } from '../../modules/plugin_registry';

class StudioModuleController {
    private storageController: StudioStorageController;
    private spaHandler: StudioSPAHandler;
    private commentProcessor: StudioCommentProcessor;
    private isInitialized: boolean = false;

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
        console.log('[SYH Studio] Initializing Studio Module...');

        const channelInfo = await initializeStudioModule(
            this.storageController.caches,
            this.storageController.sheetStatsMap
        );
        this.storageController.channelInfo = channelInfo;

        SYH_STORAGE.onChanged(createStorageChangeHandler(this.storageController));
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
        this.spaHandler.stop();
        this.commentProcessor.destroy();
    }
}

const studioController = new StudioModuleController();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => studioController.init());
} else {
    studioController.init();
}

export const SYH_STUDIO_PLUGIN: ISyhPlugin = {
    id: 'syh_studio_module',
    name: 'YouTube Studio Helper',
    enabled: true,
    isSupported: (url = typeof window !== 'undefined' ? window.location.href : '') => url.includes('studio.youtube.com'),
    init: () => {
        studioController.init();
    },
    destroy: () => {
        studioController.destroy();
    }
};

export { studioController };