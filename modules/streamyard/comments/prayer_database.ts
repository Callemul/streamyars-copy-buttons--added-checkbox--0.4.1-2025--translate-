import type { CommentVisualHost } from './types';
import type { PrayerItem } from '../../types';
import { CommentService } from '../../comment_service';

export async function saveToDatabase(
    self: CommentVisualHost,
    author: string,
    text: string,
    type: string,
    icon: string
): Promise<void> {
    const currentRoomId = (typeof window !== 'undefined' && window.location?.pathname)
        ? window.location.pathname.replace(/\//g, '')
        : '';
    const now = Date.now();

    await CommentService.savePrayerRecord({
        author,
        text,
        type,
        icon,
        roomId: currentRoomId,
        timestamp: now
    });
}

export async function removeFromDatabase(
    self: CommentVisualHost,
    text: string
): Promise<void> {
    if (self.UI && self.UI.prayersCache) {
        self.UI.prayersCache = self.UI.prayersCache.filter((item: PrayerItem) => item.text !== text);
    }
    await CommentService.removePrayerRecord(text);
}