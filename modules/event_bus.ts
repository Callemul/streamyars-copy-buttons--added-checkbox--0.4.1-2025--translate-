export type SyhEventType =
    | 'COMMENT_ACTION'
    | 'BANNER_ACTION'
    | 'STATE_CHANGED'
    | 'STORAGE_SYNC'
    | 'PHASE_CHANGED'
    | 'SHEET_TAB_CHANGED'
    | 'SHEET_DATA_PROCESSED'
    | 'PRAYER_MARKED'
    | 'ANTI_AFK_TRIGGERED'
    | 'OPTIONS_UPDATED'
    | 'CONTEXT_INVALIDATED'
    | 'FILTER_BANNERS_REQUESTED'
    | 'FILTER_COMMENTS_REQUESTED';

export interface SyhEventPayloads {
    COMMENT_ACTION: { type: 'question' | 'prayer' | 'copy'; author: string; text: string };
    BANNER_ACTION: { action: string; bannerText: string };
    STATE_CHANGED: { key: string; value: boolean };
    STORAGE_SYNC: { key: string; newValue: any };
    PHASE_CHANGED: { phase: 'questions' | 'prayers'; timestamp: string };
    SHEET_TAB_CHANGED: { activeSheetId: string };
    SHEET_DATA_PROCESSED: { sheetId: string; totalQuestions: number; totalPrayers: number };
    PRAYER_MARKED: { author: string; text: string; icon: string };
    ANTI_AFK_TRIGGERED: { timestamp: number };
    OPTIONS_UPDATED: { options: Record<string, any> };
    CONTEXT_INVALIDATED: void;
    FILTER_BANNERS_REQUESTED: { filter?: string; query?: string };
    FILTER_COMMENTS_REQUESTED: { filter?: string; query?: string };
}

type EventCallback<T extends SyhEventType> = (data: SyhEventPayloads[T]) => void;

class TypedEventBus {
    private listeners: Partial<Record<SyhEventType, Set<EventCallback<any>>>> = {};

    public on<T extends SyhEventType>(event: T, callback: EventCallback<T>): () => void {
        if (!this.listeners[event]) {
            this.listeners[event] = new Set();
        }
        this.listeners[event]!.add(callback);

        return () => this.off(event, callback);
    }

    public off<T extends SyhEventType>(event: T, callback: EventCallback<T>): void {
        const eventSet = this.listeners[event];
        if (eventSet) {
            eventSet.delete(callback);
        }
    }

    public emit<T extends SyhEventType>(event: T, data: SyhEventPayloads[T]): void {
        const eventSet = this.listeners[event];
        if (eventSet) {
            eventSet.forEach(cb => {
                try {
                    cb(data);
                } catch (err) {
                    console.error(`[SYH EventBus] Error in listener for event "${event}":`, err);
                }
            });
        }
    }

    public clear(): void {
        this.listeners = {};
    }
}

export const SYH_BUS = new TypedEventBus();