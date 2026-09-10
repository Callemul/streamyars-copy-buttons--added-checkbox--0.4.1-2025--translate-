/**
 * StreamYard Helper — прив'язка Studio-специфічних подій (бейдж/випадайка).
 *
 * Винесено з `youtube/studio/studio_adapter.ts` (`bindStudioSpecificEvents`):
 * обробники кліку по бейджу (тогл випадайки) та по пункту випадайки
 * (зміна категорії відео + ретроактивне оновлення). Логіка не чіпляла стан класу
 * поза `channelKey`/`channelLabel`/`getCommentContext`, тому винесена як
 * чиста функція.
 *
 * Поведінка збережена 1-в-1 (див. `tests/studio_adapter.test.js`).
 */

import type { CommentContext } from '../../modules/comments/comment_platform_adapter';
import type { ChannelKey } from '../../modules/channel_config';
import type { SheetId } from '../../modules/sheets';
import { toggleDropdown } from './studio_dom_helpers';
import { resolveCategoryForVideo } from './studio_category_matcher';
import { setStudioVideoSheetOverride } from './studio_video_map';
import { retroactiveUpdateVideoComments } from './studio_retroactive';
import { injectStudioCommentUI } from './studio_ui';
import type { StudioEventCaches } from './studio_state_helpers';

/** Мінімальний контракт адаптера, потрібний для прив'язки подій. */
export interface StudioBindingHost {
    getCommentContext(element: Element): CommentContext | null;
    channelKey: ChannelKey;
    channelLabel: string;
}

const BUTTON_BOUND_ATTR = 'data-syh-bound';

/**
 * Прив'язує обробники бейджа та випадайки до однієї нитки.
 * Повторний виклик безпечний: кожен вузол мітиться атрибутом-прапорцем.
 */
export function bindStudioSpecificEvents(
    host: StudioBindingHost,
    element: HTMLElement,
    _commentKey: string,
    caches: StudioEventCaches
): void {
    const ui = injectStudioCommentUI(element);
    if (!ui || !ui.badgeEl || !ui.dropdownEl || !ui.metaContainer) return;

    if (ui.badgeEl.getAttribute(BUTTON_BOUND_ATTR) !== 'true') {
        ui.badgeEl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isVisible = ui!.dropdownEl!.style.display === 'block';
            toggleDropdown(ui!.dropdownEl!, !isVisible, ui!.metaContainer!);
        });
        ui.badgeEl.setAttribute(BUTTON_BOUND_ATTR, 'true');
    }

    if (ui.dropdownEl.getAttribute(BUTTON_BOUND_ATTR) !== 'true') {
        ui.dropdownEl.addEventListener('click', async (e) => {
            e.stopPropagation();
            const itemEl = (e.target as HTMLElement).closest<HTMLElement>('.syh-studio-dropdown-item');
            if (!itemEl) return;

            const selectedVal = itemEl.dataset.sheetId;
            const newSheetId: SheetId | null = selectedVal === 'auto_reset' ? null : (selectedVal as SheetId);

            const ctx = host.getCommentContext(element);
            if (!ctx || !ctx.videoId) return;

            const autoCat = resolveCategoryForVideo(
                ctx.videoTitle || '',
                ctx.videoId,
                host.channelKey,
                {}
            ).sheetId;

            toggleDropdown(ui!.dropdownEl!, false, ui!.metaContainer!);

            caches.videoSheetMap = await setStudioVideoSheetOverride(
                ctx.videoId,
                newSheetId,
                host.channelKey,
                host.channelLabel,
                ctx.videoTitle || '',
                autoCat
            );

            retroactiveUpdateVideoComments(ctx.videoId, host.channelKey, caches);
        });
        ui.dropdownEl.setAttribute(BUTTON_BOUND_ATTR, 'true');
    }
}
