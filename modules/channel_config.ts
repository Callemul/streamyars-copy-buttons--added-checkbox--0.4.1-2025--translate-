// modules/channel_config.ts
import { SHEET_IDS, type SheetId } from './sheets';
import { fuzzyIncludes } from './fuzzy_match';

export type ChannelKey = 'vp' | 'slovo' | 'unknown';

export interface ChannelInfo {
    key: 'vp' | 'slovo';
    label: string;
    keywords: string[];
    handles: string[];
}

export const ALLOWED_CHANNELS: Record<'vp' | 'slovo', ChannelInfo> = {
    vp: {
        key: 'vp',
        label: 'Время перемен',
        keywords: ['время перемен', 'времяперемен', 'vremya peremen', 'vremyaperemen'],
        handles: ['@vperemen', '@vperementv', '@vremyaperemen']
    },
    slovo: {
        key: 'slovo',
        label: 'Слово живое',
        keywords: ['слово живое', 'словоживое', 'slovo zhivoe', 'slovozhivoe'],
        handles: ['@slovozhivoe', '@slovo_zhivoe']
    }
};

/**
 * Перевірка, чи є ключ каналу допустимим
 */
export function isAllowedChannelKey(key: string): key is 'vp' | 'slovo' {
    return key === 'vp' || key === 'slovo';
}

/**
 * Визначення ключа каналу за назвою або handle
 */
export function detectChannelKey(channelName: string, channelHandle?: string): ChannelKey {
    const nameLower = (channelName || '').toLowerCase().trim();
    const handleLower = (channelHandle || '').toLowerCase().trim();

    // 1. Перевірка за handle, якщо є
    if (handleLower) {
        for (const info of Object.values(ALLOWED_CHANNELS)) {
            if (info.handles.some(h => handleLower.includes(h.toLowerCase()))) {
                return info.key;
            }
        }
    }

    // 2. Перевірка за назвою каналу (keywords)
    if (nameLower) {
        for (const info of Object.values(ALLOWED_CHANNELS)) {
            if (info.keywords.some(kw => nameLower.includes(kw))) {
                return info.key;
            }
        }
    }

    return 'unknown';
}

/**
 * Автоматичне визначення аркуша/категорії за назвою відео та ключем каналу
 */
export function matchCategory(videoTitle: string, channelKey: ChannelKey): SheetId | null {
    if (!videoTitle || channelKey === 'unknown') return null;
    const lowerTitle = videoTitle.toLowerCase();

    if (channelKey === 'vp') {
        const hasSS = (lowerTitle.includes('субботн') && lowerTitle.includes('школ')) || lowerTitle.includes('сш');
        const hasOparin = lowerTitle.includes('опарин');

        if (hasSS) {
            return SHEET_IDS.VP_SS;
        }
        if (hasOparin) {
            return SHEET_IDS.OPARIN;
        }
        return null;
    }

    if (channelKey === 'slovo') {
        if ((lowerTitle.includes('субботн') && lowerTitle.includes('школ')) || lowerTitle.includes('сш')) {
            return SHEET_IDS.MOLCHANOV_SS;
        }
        return SHEET_IDS.MOLCHANOV_PREACH;
    }

    return null;
}

// Pure ESM Export - Window pollution removed
