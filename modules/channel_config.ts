// modules/channel_config.ts
import { SHEET_IDS, type SheetId } from './sheets';

export type ChannelKey = 'vp' | 'slovo' | 'unknown';

export interface ChannelInfo {
    key: 'vp' | 'slovo';
    label: string;
    keywords: string[];
    handles: string[];
}

export interface CategoryMatcherRule {
    sheetId: SheetId;
    matchers: ((title: string) => boolean)[];
}

export interface ChannelConfigItem extends ChannelInfo {
    rules: CategoryMatcherRule[];
}

export class ChannelRegistry {
    private channels: Map<string, ChannelConfigItem> = new Map();

    constructor() {
        this.registerDefaultChannels();
    }

    private registerDefaultChannels() {
        this.registerChannel({
            key: 'vp',
            label: 'Время перемен',
            keywords: ['время перемен', 'времяперемен', 'vremya peremen', 'vremyaperemen'],
            handles: ['@vperemen', '@vperementv', '@vremyaperemen'],
            rules: [
                {
                    sheetId: SHEET_IDS.VP_SS,
                    matchers: [
                        (t) => (t.includes('субботн') && t.includes('школ')) ||
                               (t.includes('суботн') && t.includes('школ')) ||
                               /(?:^|[^\p{L}\p{N}])сш(?:[^\p{L}\p{N}]|$)/ui.test(t)
                    ]
                },
                {
                    sheetId: SHEET_IDS.OPARIN,
                    matchers: [
                        (t) => /опарин|опарін/i.test(t)
                    ]
                }
            ]
        });

        this.registerChannel({
            key: 'slovo',
            label: 'Слово живое',
            keywords: ['слово живое', 'словоживое', 'slovo zhivoe', 'slovozhivoe'],
            handles: ['@slovozhivoe', '@slovo_zhivoe'],
            rules: [
                {
                    sheetId: SHEET_IDS.MOLCHANOV_SS,
                    matchers: [
                        (t) => (t.includes('субботн') && t.includes('школ')) ||
                               (t.includes('суботн') && t.includes('школ')) ||
                               /(?:^|[^\p{L}\p{N}])сш(?:[^\p{L}\p{N}]|$)/ui.test(t)
                    ]
                },
                {
                    sheetId: SHEET_IDS.MOLCHANOV_PREACH,
                    matchers: [() => true] // fallback
                }
            ]
        });
    }

    public registerChannel(config: ChannelConfigItem): void {
        this.channels.set(config.key, config);
    }

    public getChannel(key: string): ChannelConfigItem | undefined {
        return this.channels.get(key);
    }

    public detectChannelKey(channelName: string, channelHandle?: string): ChannelKey {
        const nameLower = (channelName || '').toLowerCase().trim();
        const handleLower = (channelHandle || '').toLowerCase().trim();

        for (const info of this.channels.values()) {
            if (handleLower && info.handles.some(h => handleLower.includes(h.toLowerCase()))) {
                return info.key as ChannelKey;
            }
            if (nameLower && info.keywords.some(kw => nameLower.includes(kw))) {
                return info.key as ChannelKey;
            }
        }
        return 'unknown';
    }

    public matchCategory(videoTitle: string, channelKey: ChannelKey): SheetId | null {
        if (!videoTitle || channelKey === 'unknown') return null;
        const channel = this.channels.get(channelKey);
        if (!channel) return null;

        const lowerTitle = videoTitle.toLowerCase();
        for (const rule of channel.rules) {
            if (rule.matchers.some(m => m(lowerTitle))) {
                return rule.sheetId;
            }
        }
        return null;
    }
}

export const CHANNEL_REGISTRY = new ChannelRegistry();

export const ALLOWED_CHANNELS: Record<string, ChannelInfo> = new Proxy({}, {
    get: (_, prop: string) => CHANNEL_REGISTRY.getChannel(prop),
    ownKeys: () => Array.from(CHANNEL_REGISTRY['channels'].keys())
});

export function isAllowedChannelKey(key: string): key is 'vp' | 'slovo' {
    return CHANNEL_REGISTRY.getChannel(key) !== undefined;
}

export function detectChannelKey(channelName: string, channelHandle?: string): ChannelKey {
    return CHANNEL_REGISTRY.detectChannelKey(channelName, channelHandle);
}

export function matchCategory(videoTitle: string, channelKey: ChannelKey): SheetId | null {
    return CHANNEL_REGISTRY.matchCategory(videoTitle, channelKey);
}

export const SABBATH_SCHOOL_KEYWORDS_REGEX = /памятн|пам'ятн|молчанов|опарин|опарін|молчанів/i;
export const SPEAKER_SUFFIX_CLEANUP_REGEX = /\s*\(\s*(?:Опарин|Молчанов|Василенко|Жаловага|Молчанів|Опарін).*?$/gi;

// Pure ESM Export - Window pollution removed
