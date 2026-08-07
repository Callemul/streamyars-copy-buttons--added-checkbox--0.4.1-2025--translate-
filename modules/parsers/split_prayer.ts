// modules/parsers/split_prayer.ts
import { PRAYER_SECTION_SPLIT_REGEX } from './regex';

export function splitPrayerSection(msg: string): { questionsText: string; prayersText: string } {
    const parts = msg.split(PRAYER_SECTION_SPLIT_REGEX);
    return {
        questionsText: parts[0] || "",
        prayersText: parts[1] || ""
    };
}