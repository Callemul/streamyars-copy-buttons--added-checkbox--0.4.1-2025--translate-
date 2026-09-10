import { SYH_MESSAGING } from '../modules/messaging';
import type { PrayerItem } from '../modules/core/types';

export function sendUnstarMessage(text: string): void {
    if (!text) return;
    SYH_MESSAGING.sendToActiveTab({ action: 'unstar_comment', text: text });
}

export function sendUnstarMessagesForList(prayersList: PrayerItem[]): void {
    if (!prayersList || prayersList.length === 0) return;
    prayersList.forEach(item => {
        if (item.text) {
            SYH_MESSAGING.sendToActiveTab({ action: 'unstar_comment', text: item.text });
        }
    });
}