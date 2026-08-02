// youtube/studio/studio_channel.ts
import { detectChannelKey, ChannelKey, ALLOWED_CHANNELS } from '../../modules/channel_config';
import { getChannelNameElement } from './studio_selectors';

export interface StudioChannelInfo {
    key: ChannelKey;
    name: string;
    label: string;
}

/**
 * Extract channel information from DOM or URL, and resolve ChannelKey ('vp' | 'slovo' | 'unknown')
 */
export function getStudioChannelInfo(): StudioChannelInfo {
    let name = '';
    let handle = '';

    // 1. Try extracting name from DOM element (#entity-label-container #entity-name)
    const nameEl = getChannelNameElement();
    if (nameEl && nameEl.textContent) {
        name = nameEl.textContent.trim();
    }

    // 2. Try extracting channel handle or ID from location.pathname / location.href
    const pathname = window.location.pathname;
    const handleMatch = pathname.match(/@[\w.-]+/);
    if (handleMatch) {
        handle = handleMatch[0];
    }

    const key = detectChannelKey(name, handle);

    let label = 'Невідомий канал';
    if (key !== 'unknown' && ALLOWED_CHANNELS[key]) {
        label = ALLOWED_CHANNELS[key].label;
    } else if (name) {
        label = name;
    }

    return {
        key,
        name,
        label
    };
}

if (typeof window !== 'undefined') {
    (window as any).getStudioChannelInfo = getStudioChannelInfo;
}
