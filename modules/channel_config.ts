// modules/channel_config.ts
import { SHEET_IDS, SheetId } from './sheets.ts';
import { fuzzyIncludes } from './fuzzy_match.ts';

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

    if (channelKey === 'vp') {
        if (fuzzyIncludes(videoTitle, 'субботняя школа')) {
            return SHEET_IDS.VP_SS;
        }
        if (fuzzyIncludes(videoTitle, 'опарин')) {
            return SHEET_IDS.OPARIN;
        }
        return null;
    }

    if (channelKey === 'slovo') {
        if (fuzzyIncludes(videoTitle, 'субботняя школа')) {
            return SHEET_IDS.MOLCHANOV_SS;
        }
        return SHEET_IDS.MOLCHANOV_PREACH;
    }

    return null;
}

if (typeof window !== 'undefined') {
    (window as any).ALLOWED_CHANNELS = ALLOWED_CHANNELS;
    (window as any).detectChannelKey = detectChannelKey;
    (window as any).matchCategory = matchCategory;
}
