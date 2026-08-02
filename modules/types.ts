export interface PrayerItem {
    id?: string;
    author: string;
    text: string;
    type?: string;
    icon?: string;
    roomId?: string;
    timestamp?: number;
}

export interface YTCollectedItem {
    id: string;
    author: string;
    text: string;
    type: 'question' | 'prayer';
    timestamp: number;
    videoId: string;
    videoTitle?: string;
}

export interface CommentData {
    id: string;
    author: string;
    text: string;
    videoId: string;
}

export type BannerCategory = 'stream' | 'audience' | 'prayer' | 'none';

export interface StudioOverrideLogEntry {
    timestamp: string;
    channelKey: 'vp' | 'slovo' | 'unknown';
    channelLabel: string;
    videoTitle: string;
    autoDetectedSheet: string | null;
    assignedSheet: string;
}