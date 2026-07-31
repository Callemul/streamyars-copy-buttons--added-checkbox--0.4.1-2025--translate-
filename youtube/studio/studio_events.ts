// youtube/studio/studio_events.ts
import { SYH_STORAGE } from '../../modules/storage.ts';
import { SheetId, SHEET_LABELS } from '../../modules/sheets.ts';
import { ChannelKey } from '../../modules/channel_config.ts';
import { copyToClipboard } from '../yt_events.ts';
import { getAuthorNameText, getCommentText, getVideoTitleText, getVideoLinkHref, getCommentTextAreaElement } from './studio_selectors.ts';
import { injectStudioCommentUI, updateStudioButtonsUI, updateStudioBadgeUI, updateStudioCheckedClass } from './studio_ui.ts';
import { generateVideoKey, setStudioVideoSheetOverride, VIDEO_MAP_STORAGE_KEY } from './studio_video_map.ts';
import { generateCommentKey, STUDIO_BUTTON_STATE_KEY, STUDIO_CHECKBOX_STATE_KEY } from './studio_comment_key.ts';
import { resolveCategoryForVideo, VideoSheetMapEntry } from './studio_category_matcher.ts';

export interface StudioEventCaches {
    videoSheetMap: Record<string, VideoSheetMapEntry>;
    buttonStates: Record<string, 'question' | 'prayer'>;
    checkboxStates: Record<string, { checked: boolean; timestamp: number }>;
}

export function saveStudioCollectedItem(
    sheetId: SheetId,
    item: { id: string; author: string; text: string; type: 'question' | 'prayer'; timestamp: number; videoId: string; videoTitle: string }
): Promise<void> {
    const storageKey = `syh_collected__${sheetId}`;
    return new Promise((resolve) => {
        SYH_STORAGE.get([storageKey], (res) => {
            const list: any[] = res[storageKey] || [];
            const index = list.findIndex(i => i.id === item.id);
            let updated: any[];
            if (index >= 0) {
                updated = [...list];
                updated[index] = item;
            } else {
                updated = [item, ...list];
            }
            SYH_STORAGE.set({ [storageKey]: updated }, () => resolve());
        });
    });
}

/**
 * Binds all event listeners and restores current UI states for a single comment thread
 */
export function bindStudioCommentEvents(
    threadEl: HTMLElement,
    channelKey: ChannelKey,
    channelLabel: string,
    caches: StudioEventCaches
): void {
    const ui = injectStudioCommentUI(threadEl);
    if (!ui) return;

    const author = getAuthorNameText(threadEl);
    const text = getCommentText(threadEl);
    const videoTitle = getVideoTitleText(threadEl);
    const videoHref = getVideoLinkHref(threadEl);

    const videoKey = generateVideoKey(videoHref, videoTitle);
    const commentKey = generateCommentKey(videoTitle, author, text);

    // Resolve category
    const categoryResult = resolveCategoryForVideo(videoTitle, videoKey, channelKey, caches.videoSheetMap);
    const resolvedSheetId = categoryResult.sheetId;

    // Restore UI states
    const buttonState = caches.buttonStates[commentKey] || null;
    const checkboxState = caches.checkboxStates[commentKey]?.checked || false;

    updateStudioBadgeUI(ui.badgeEl, resolvedSheetId, categoryResult.source);
    updateStudioButtonsUI(ui, resolvedSheetId, buttonState);
    ui.checkboxEl.checked = checkboxState;
    updateStudioCheckedClass(threadEl, checkboxState);

    // Store attributes on element for fast lookup during retroactive updates
    threadEl.dataset.syhVideoKey = videoKey;
    threadEl.dataset.syhCommentKey = commentKey;

    // If events already bound on this specific element instance, stop after state update
    if (threadEl.dataset.syhStudioEventsBound === 'true') {
        return;
    }
    threadEl.dataset.syhStudioEventsBound = 'true';

    // Helper: auto-check comment when added to questions/prayers
    const autoCheck = () => {
        ui.checkboxEl.checked = true;
        updateStudioCheckedClass(threadEl, true);
        caches.checkboxStates[commentKey] = {
            checked: true,
            timestamp: Date.now()
        };
        SYH_STORAGE.set({ [STUDIO_CHECKBOX_STATE_KEY]: caches.checkboxStates });
    };

    // 1. Copy button handler
    ui.copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const formatted = author ? `@${author}\n\n${text}` : text;
        const success = await copyToClipboard(formatted);

        const origHtml = ui.copyBtn.innerHTML;
        ui.copyBtn.innerHTML = success ? '<span class="syh-icon">✓</span> <span class="syh-label">Скопійовано</span>' : '<span class="syh-icon">❌</span> <span class="syh-label">Помилка</span>';
        setTimeout(() => {
            ui.copyBtn.innerHTML = origHtml;
        }, 1200);
    });

    // Helper for question / prayer click
    const handleAddClick = async (type: 'question' | 'prayer') => {
        // Re-check current video category resolution (in case user changed badge dropdown)
        const currentRes = resolveCategoryForVideo(videoTitle, videoKey, channelKey, caches.videoSheetMap);
        const targetSheetId = currentRes.sheetId;

        if (!targetSheetId) {
            // Unresolved sheet category -> block action & highlight/open badge dropdown
            ui.dropdownEl.style.display = 'block';
            ui.badgeEl.classList.add('syh-badge-highlight');
            setTimeout(() => ui.badgeEl.classList.remove('syh-badge-highlight'), 2000);
            return;
        }

        const formatted = author ? `@${author}\n\n${text}` : text;
        await copyToClipboard(formatted);

        // Update button state cache & storage
        caches.buttonStates[commentKey] = type;
        SYH_STORAGE.set({ [STUDIO_BUTTON_STATE_KEY]: caches.buttonStates });

        // Save item to sheet collection
        await saveStudioCollectedItem(targetSheetId, {
            id: commentKey,
            author,
            text,
            type,
            timestamp: Date.now(),
            videoId: videoKey,
            videoTitle
        });

        // Update UI
        updateStudioButtonsUI(ui, targetSheetId, type);
        autoCheck();
    };

    // 2. Question button click
    ui.questionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleAddClick('question');
    });

    // 3. Prayer button click
    ui.prayerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleAddClick('prayer');
    });

    // 4. Badge click -> toggle dropdown
    ui.badgeEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = ui.dropdownEl.style.display === 'block';
        // Close all other dropdowns
        document.querySelectorAll('.syh-studio-dropdown').forEach(d => (d as HTMLElement).style.display = 'none');
        ui.dropdownEl.style.display = isVisible ? 'none' : 'block';
    });

    // Dropdown item selection
    ui.dropdownEl.addEventListener('click', async (e) => {
        e.stopPropagation();
        const itemEl = (e.target as HTMLElement).closest<HTMLElement>('.syh-studio-dropdown-item');
        if (!itemEl) return;

        const selectedVal = itemEl.dataset.sheetId;
        const newSheetId: SheetId | null = selectedVal === 'auto_reset' ? null : (selectedVal as SheetId);
        const autoCat = resolveCategoryForVideo(videoTitle, videoKey, channelKey, {}).sheetId;

        ui.dropdownEl.style.display = 'none';

        // Update storage and videoSheetMap
        caches.videoSheetMap = await setStudioVideoSheetOverride(
            videoKey,
            newSheetId,
            channelKey,
            channelLabel,
            videoTitle,
            autoCat
        );

        // Retroactively update all comments in DOM matching videoKey
        retroactiveUpdateVideoComments(videoKey, channelKey, caches);
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
        if (!ui.metaContainer.contains(e.target as Node)) {
            ui.dropdownEl.style.display = 'none';
        }
    });

    // 5. Checkbox change handler
    ui.checkboxEl.addEventListener('change', (e) => {
        e.stopPropagation();
        const isChecked = ui.checkboxEl.checked;
        updateStudioCheckedClass(threadEl, isChecked);

        caches.checkboxStates[commentKey] = {
            checked: isChecked,
            timestamp: Date.now()
        };
        SYH_STORAGE.set({ [STUDIO_CHECKBOX_STATE_KEY]: caches.checkboxStates });
    });

    // 6. Contextmenu (RMB / ПКМ) on comment text area (#expander-container / #content-text)
    const textAreaEl = getCommentTextAreaElement(threadEl);
    if (textAreaEl) {
        textAreaEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            ui.checkboxEl.checked = !ui.checkboxEl.checked;
            ui.checkboxEl.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }
}

/**
 * Retroactively updates all visible comment threads in DOM matching a given videoKey
 */
export function retroactiveUpdateVideoComments(
    targetVideoKey: string,
    channelKey: ChannelKey,
    caches: StudioEventCaches
) {
    const threads = document.querySelectorAll<HTMLElement>('.ytcp-comment-thread');
    threads.forEach((threadEl) => {
        const videoTitle = getVideoTitleText(threadEl);
        const videoHref = getVideoLinkHref(threadEl);
        const videoKey = generateVideoKey(videoHref, videoTitle);

        if (videoKey === targetVideoKey) {
            const ui = injectStudioCommentUI(threadEl);
            if (ui) {
                const categoryResult = resolveCategoryForVideo(videoTitle, videoKey, channelKey, caches.videoSheetMap);
                const commentKey = threadEl.dataset.syhCommentKey || generateCommentKey(videoTitle, getAuthorNameText(threadEl), getCommentText(threadEl));
                const buttonState = caches.buttonStates[commentKey] || null;

                updateStudioBadgeUI(ui.badgeEl, categoryResult.sheetId, categoryResult.source);
                updateStudioButtonsUI(ui, categoryResult.sheetId, buttonState);
            }
        }
    });
}

if (typeof window !== 'undefined') {
    (window as any).bindStudioCommentEvents = bindStudioCommentEvents;
}
