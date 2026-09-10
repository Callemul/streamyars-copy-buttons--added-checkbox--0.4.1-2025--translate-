// youtube/yt_channel_gate.ts
import { detectChannelKey, isAllowedChannelKey } from '../modules/registry/channel_config';

const CHANNEL_NAME_SELECTORS = [
    '#owner #channel-name, ytd-video-owner-renderer #channel-name, ytd-channel-name',
    '#channel-header #text, #header #channel-name'
];

export function extractDomChannelInfo(): { channelName: string; channelHandle: string } {
    let channelName = '';
    let channelHandle = '';

    if (typeof document === 'undefined') {
        return { channelName, channelHandle };
    }

    for (const sel of CHANNEL_NAME_SELECTORS) {
        const el = document.querySelector(sel);
        if (el?.textContent?.trim()) {
            channelName = el.textContent.trim();
            break;
        }
    }

    const handleEl = document.querySelector<HTMLAnchorElement>(
        '#owner a[href*="/@"], ytd-video-owner-renderer a[href*="/@"], a.yt-simple-endpoint[href*="/@"]'
    );
    if (handleEl) {
        const href = handleEl.getAttribute('href') || '';
        const match = href.match(/\/(@[^/?#]+)/);
        if (match?.[1]) {
            channelHandle = match[1];
        }
    }

    if (!channelName && !channelHandle) {
        const metaOwner = document.querySelector('meta[name="title"], meta[property="og:title"]');
        if (metaOwner) {
            channelName = metaOwner.getAttribute('content') || '';
        }
    }

    return { channelName, channelHandle };
}

/**
 * Перевіряє, чи поточна сторінка YouTube належить до дозволених каналів (VP / Slovo).
 */
export function isAllowedChannel(): boolean {
    if (typeof document === 'undefined') return true;

    const { channelName, channelHandle } = extractDomChannelInfo();
    const key = detectChannelKey(channelName, channelHandle);
    const allowed = isAllowedChannelKey(key);

    if (!allowed) {
        console.log(`[SYH YT Gate] Channel not allowed. Name: "${channelName.trim()}", Handle: "${channelHandle}". Key: "${key}"`);
    } else {
        console.log(`[SYH YT Gate] Allowed channel detected: "${key}" (${channelName.trim() || channelHandle})`);
    }

    return allowed;
}

// Pure ESM module export
