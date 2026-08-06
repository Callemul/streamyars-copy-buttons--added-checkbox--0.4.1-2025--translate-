// youtube/yt_channel_gate.ts
import { detectChannelKey, isAllowedChannelKey } from '../modules/channel_config';

export function extractDomChannelInfo(): { channelName: string; channelHandle: string } {
    let channelName = '';
    let channelHandle = '';

    // 1. Пошук блоку власника відео (#owner)
    const ownerEl = document.querySelector('#owner #channel-name, ytd-video-owner-renderer #channel-name, ytd-channel-name');
    if (ownerEl) {
        channelName = ownerEl.textContent || '';
    }

    // 2. Пошук handle посилання (/@handle)
    const handleEl = document.querySelector<HTMLAnchorElement>('#owner a[href*="/@"], ytd-video-owner-renderer a[href*="/@"], a.yt-simple-endpoint[href*="/@"]');
    if (handleEl) {
        const href = handleEl.getAttribute('href') || '';
        const match = href.match(/\/(@[^/?#]+)/);
        if (match) {
            channelHandle = match[1];
        }
    }

    // 3. Запасний варіант — заголовок сторінки каналу (#channel-header)
    if (!channelName && !channelHandle) {
        const headerTitleEl = document.querySelector('#channel-header #text, #header #channel-name');
        if (headerTitleEl) {
            channelName = headerTitleEl.textContent || '';
        }
    }

    // 4. Запасний варіант — метатеги розпізнавання
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
