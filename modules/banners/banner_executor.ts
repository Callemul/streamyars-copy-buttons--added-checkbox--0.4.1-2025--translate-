import { SPEAKER_SUFFIX_CLEANUP_REGEX } from '../registry/channel_config';
import { QUESTION_AUTHOR_SUFFIX_REGEX } from '../parsers/regex';
import type { SyhBannerCreator } from './banner_types';
import type { BannerItem } from './banner_types';

export async function executeBannerCreationLoop(
    creator: SyhBannerCreator,
    bannersToCreate: BannerItem[]
): Promise<number> {
    let createdCount = 0;
    for (const [index, item] of bannersToCreate.entries()) {
        creator.log(`>>> Обробка банера ${index + 1} з ${bannersToCreate.length}`);
        try {
            const pauseTime = index === 0 ? 600 : 250;
            await new Promise(r => setTimeout(r, pauseTime));

            const cleanQuestion = item.text
                .replace(QUESTION_AUTHOR_SUFFIX_REGEX, "")
                .replace(SPEAKER_SUFFIX_CLEANUP_REGEX, "")
                .trim();
            await creator.createSingleBanner(cleanQuestion);

            if (creator.UTILS && typeof creator.UTILS.saveBannerCategory === 'function') {
                await creator.UTILS.saveBannerCategory(cleanQuestion, item.category);
            }

            createdCount++;
        } catch (error: any) {
            console.error(error);
            creator.log(`Помилка: ${error.message}`);
            await creator.finalCleanup();
        }
    }
    return createdCount;
}