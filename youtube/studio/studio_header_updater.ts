// youtube/studio/studio_header_updater.ts
import { getCommentHeaderLabelElement, getCommentHeaderElement } from './studio_selectors';
import { renderStudioHeaderCounters, type SheetHeaderStats } from './studio_header_counters';
import { getStudioChannelInfo, type StudioChannelInfo } from './studio_channel';

export class StudioHeaderUpdater {
    private channelInfo: StudioChannelInfo | null = null;
    private sheetStatsMap: Record<string, SheetHeaderStats>;

    constructor(sheetStatsMap: Record<string, SheetHeaderStats>) {
        this.sheetStatsMap = sheetStatsMap;
    }

    public setSheetStatsMap(sheetStatsMap: Record<string, SheetHeaderStats>): void {
        this.sheetStatsMap = sheetStatsMap;
    }

    public updateHeaderCounters(enabled: boolean, isCommentsPage: () => boolean): void {
        if (!enabled || !isCommentsPage()) return;

        this.removeLegacyCounters();
        this.ensureChannelInfo();
        this.renderCounters();
    }

    private removeLegacyCounters(): void {
        document.querySelectorAll('ytcp-entity-page-header .syh-header-counters-wrapper').forEach((el) => el.remove());
    }

    private ensureChannelInfo(): void {
        if (!this.channelInfo || this.channelInfo.key === 'unknown') {
            this.channelInfo = getStudioChannelInfo();
        }
    }

    private renderCounters(): void {
        const channelKey = this.channelInfo?.key || 'unknown';
        const headerTarget = getCommentHeaderLabelElement() || getCommentHeaderElement();
        if (headerTarget) {
            renderStudioHeaderCounters(headerTarget, channelKey, this.sheetStatsMap);
        }
    }

    public getChannelKey(): string {
        return this.channelInfo?.key || 'unknown';
    }

    public getChannelLabel(): string {
        return this.channelInfo?.label || 'Невідомий канал';
    }

    public refreshChannelInfo(): void {
        this.channelInfo = getStudioChannelInfo();
    }
}