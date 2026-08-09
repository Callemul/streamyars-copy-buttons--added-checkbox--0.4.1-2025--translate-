// modules/video_copier.ts
/**
 * Фасад копіювача відео StreamYard.
 * Реалізація розділена на три модулі:
 *   - `video_copier_fresh`      — правила відбору свіжих відео;
 *   - `video_copier_ui`         — фабрика та ін'єкція кнопок;
 *   - `video_copier_downloader` — сценарій масового завантаження.
 */
import type { ISyhPlugin } from './plugin_registry';
import { SYH_DOM_OBSERVER } from './dom_observer';
import {
    VIDEO_COPIER_INJECTIONS,
    appendButtonsToCard,
    createSquareButton,
    injectListButtons,
    injectMasterDownloadButton,
    injectModalButton,
    injectTitleButton,
    tempIconChange
} from './video_copier_ui';
import { downloadAllFreshVideos, downloadSingleFreshVideo } from './video_copier_downloader';

export {
    FRESH_WINDOW_DAYS,
    SABBATH_SCHOOL_MARKER,
    collectFreshVideoCards,
    createFreshScanState,
    isDuplicateSabbathSchool,
    isFreshVideoCard,
    isWithinFreshWindow,
    parseCardDate,
    readVideoCardInfo,
    startOfToday,
    type FreshScanState
} from './video_copier_fresh';

export interface SyhVideoCopier {
    init(): void;
    startObserver(): void;
    injectTitleButton(): void;
    injectModalButton(): void;
    injectListButtons(): void;
    appendButtonsToCard(card: Element): void;
    createSquareButton(icon: string, tooltipText: string, onClickCallback: (e: MouseEvent) => void): HTMLButtonElement;
    tempIconChange(btn: HTMLElement, tempIcon: string): void;
    injectMasterDownloadButton(): void;
    downloadAllFreshVideos(): Promise<void>;
    downloadSingleFreshVideo(card: Element, index: number): Promise<void>;
}

export const SYH_VIDEO_COPIER: SyhVideoCopier = {
    init: function(): void {
        this.startObserver();
    },

    /** Замість власних MutationObserver реєструємося у централізованому SYH_DOM_OBSERVER. */
    startObserver: function(): void {
        VIDEO_COPIER_INJECTIONS.forEach(({ selector, inject }) => {
            SYH_DOM_OBSERVER.register(selector, () => inject());
        });
    },

    injectTitleButton,
    injectModalButton,
    injectListButtons,
    appendButtonsToCard,
    createSquareButton,
    tempIconChange,
    injectMasterDownloadButton,
    downloadAllFreshVideos,
    downloadSingleFreshVideo
};

export const SYH_VIDEO_COPIER_PLUGIN: ISyhPlugin = {
    id: 'syh_video_copier',
    name: 'StreamYard Video Copier & Downloader',
    enabled: true,
    isSupported: (url = typeof window !== 'undefined' ? window.location.href : '') => url.includes('streamyard.com'),
    init: () => {
        SYH_VIDEO_COPIER.init();
    }
};
