// youtube/studio/studio_events.ts
//
// ПРИЗНАЧЕННЯ: Прив'язка подій та оновлення UI для кожного ytcp-comment у YouTube Studio.
//
// ТОЧКИ ВХОДУ (де шукати основну логіку):
//   bindStudioCommentEvents()  — головна функція, що обробляє один коментар:
//     • Рядки ~83-104  : зчитування videoTitle/videoHref + REPLY INHERITANCE (спадкування від батьківського коментаря)
//     • Рядки ~122-136 : визначення категорії, оновлення badge/кнопок/checkbox
//     • Рядки ~154+    : обробники подій (Copy / ❓ / 🙏 / Badge-dropdown / Checkbox / ПКМ)
//   retroactiveUpdateVideoComments() — масове оновлення Badge після зміни категорії вручну
//   saveStudioCollectedItem()        — збереження питань/молитов до storage за sheetId
//
// СТРУКТУРА DOM (YouTube Studio):
//   ytcp-comment-thread
//     └── ytcp-comment[id="comment"]            ← батьківський коментар (має videoTitle, video href)
//     └── ytcp-comment-replies
//           └── ytcp-comment[is-reply]           ← вкладені відповіді (НЕ мають videoTitle!)
//                                                  videoKey успадковується від батьківського коментаря
//                                                  через блок REPLY INHERITANCE (~ряд 88)
//
// ПОШУК ПО ОЗНАКАХ:
//   Бейдж категорії відео    → updateStudioBadgeUI()  у studio_ui.ts
//   Визначення категорії     → resolveCategoryForVideo() у studio_category_matcher.ts
//   Збереження відеокарти    → setStudioVideoSheetOverride() у studio_video_map.ts
//   Ключі коментаря          → generateCommentKey() у studio_comment_key.ts
//   Селектори DOM            → studio_selectors.ts

import { SYH_STORAGE } from '../../modules/storage.ts';
import { SheetId, SHEET_LABELS } from '../../modules/sheets.ts';
import { ChannelKey } from '../../modules/channel_config.ts';
import { copyToClipboard } from '../yt_events.ts';
import { getAuthorNameText, getCommentText, getVideoTitleText, getVideoLinkHref, getCommentTextAreaElement } from './studio_selectors.ts';
import { injectStudioCommentUI, updateStudioButtonsUI, updateStudioBadgeUI, updateStudioCheckedClass } from './studio_ui.ts';
import { generateVideoKey, setStudioVideoSheetOverride, VIDEO_MAP_STORAGE_KEY } from './studio_video_map.ts';
import { generateCommentKey, STUDIO_BUTTON_STATE_KEY, STUDIO_CHECKBOX_STATE_KEY } from './studio_comment_key.ts';
import { resolveCategoryForVideo, VideoSheetMapEntry } from './studio_category_matcher.ts';

// Helper to toggle z-index on all relevant ancestor elements up to the scrolling list
function toggleZIndexStack(startEl: HTMLElement, active: boolean) {
    let curr: HTMLElement | null = startEl;
    while (curr && curr.id !== 'items' && curr.tagName !== 'BODY') {
        if (curr.classList && (curr.classList.contains('ytcp-comment-thread') || curr.tagName.toLowerCase() === 'ytcp-comment')) {
            if (active) {
                curr.classList.add('syh-dropdown-active');
            } else {
                curr.classList.remove('syh-dropdown-active');
            }
        }
        curr = (curr.parentElement || (curr.getRootNode && (curr.getRootNode() as any).host) || null) as HTMLElement | null;
    }
}

export function setStudioDropdownVisible(dropdownEl: HTMLElement, visible: boolean) {
    if (!dropdownEl) return;
    if (visible) {
        // Close all other dropdowns first
        document.querySelectorAll('.syh-studio-dropdown').forEach(d => {
            (d as HTMLElement).style.display = 'none';
            toggleZIndexStack(d as HTMLElement, false);
        });
        dropdownEl.style.display = 'block';
        toggleZIndexStack(dropdownEl, true);
    } else {
        dropdownEl.style.display = 'none';
        toggleZIndexStack(dropdownEl, false);
    }
}

let activeStudioDropdownInfo: { dropdown: HTMLElement, metaContainer: HTMLElement } | null = null;

// Global click handler to close dropdowns
document.addEventListener('click', (e) => {
    if (activeStudioDropdownInfo && !activeStudioDropdownInfo.metaContainer.contains(e.target as Node)) {
        setStudioDropdownVisible(activeStudioDropdownInfo.dropdown, false);
        activeStudioDropdownInfo = null;
    }
});

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
 * Прив'язує всі обробники подій і відновлює поточний UI-стан для одного ytcp-comment.
 *
 * Викликається з processVisibleComments() (studio_content.ts) для КОЖНОГО коментаря на сторінці.
 * Також викликається з retroactiveUpdateVideoComments() після ручної зміни категорії.
 *
 * @param threadEl   - елемент ytcp-comment (може бути батьківський АБО is-reply відповідь)
 * @param channelKey - ключ поточного каналу (визначається getStudioChannelInfo())
 * @param caches     - in-memory кеші: { videoSheetMap, buttonStates, checkboxStates }
 * @param forceUpdate - true → ігнорувати прапор isAlreadyBound і оновити примусово
 *
 * Потік обробки:
 *   1. Зчитати author / text / videoTitle / videoHref з DOM
 *   2. [REPLY INHERITANCE] якщо is-reply і videoTitle порожній — взяти від батьківського ytcp-comment
 *   3. Згенерувати videoKey + commentKey
 *   4. Перевірити isAlreadyBound (early-return якщо нічого не змінилось)
 *   5. injectStudioCommentUI() → отримати/створити кнопки + badge + checkbox
 *   6. resolveCategoryForVideo() → визначити sheetId (авто або ручна)
 *   7. Оновити Badge, кнопки ❓🙏, checkbox
 *   8. Прив'язати обробники (кожен лише раз, через data-syh-bound='true')
 */
export function bindStudioCommentEvents(
    threadEl: HTMLElement,
    channelKey: ChannelKey,
    channelLabel: string,
    caches: StudioEventCaches,
    forceUpdate: boolean = false
): void {
    // Read current video data BEFORE the isAlreadyBound check,
    // because YouTube Studio reuses DOM elements for different comments during virtual scroll.
    // If the videoKey changed, the element must be re-processed even if already bound.
    const author = getAuthorNameText(threadEl);
    const text = getCommentText(threadEl);
    let videoTitle = getVideoTitleText(threadEl);
    let videoHref = getVideoLinkHref(threadEl);

    // --- REPLY INHERITANCE ---
    // Вкладені відповіді (ytcp-comment[is-reply]) НЕ мають власного #video-title.
    // Тому підтягуємо videoTitle/videoHref від батьківського ytcp-comment (без is-reply)
    // у тому ж ytcp-comment-thread. Порядок обробки гарантовано правильний: спочатку
    // батьківський коментар (він записує data-syh-video-key у dataset), потім reply.
    // Сортування забезпечується в processVisibleComments() (studio_content.ts).
    const isReply = threadEl.hasAttribute('is-reply');
    if (isReply && !videoTitle) {
        const parentThread = threadEl.closest('ytcp-comment-thread');
        if (parentThread) {
            const parentComment = parentThread.querySelector<HTMLElement>('ytcp-comment:not([is-reply])');
            if (parentComment) {
                if (!videoTitle) videoTitle = getVideoTitleText(parentComment);
                if (!videoHref)  videoHref  = getVideoLinkHref(parentComment);
                // Fallback: якщо текст/href не знайдено — беремо готовий videoKey з dataset батька
                if (!videoTitle && !videoHref && parentComment.dataset.syhVideoKey) {
                    videoHref = parentComment.dataset.syhVideoKey;
                }
            }
        }
    }

    const videoKey = generateVideoKey(videoHref, videoTitle);
    const commentKey = generateCommentKey(videoTitle, author, text);

    const isAlreadyBound = threadEl.dataset.syhStudioEventsBound === 'true';
    const videoKeyChanged = isAlreadyBound && threadEl.dataset.syhVideoKey !== videoKey;

    // Skip full re-binding only if already bound, video key is the same, and no forceUpdate.
    // If videoKey changed (virtual DOM reuse) — always refresh UI data.
    if (isAlreadyBound && !forceUpdate && !videoKeyChanged) {
        return;
    }

    const ui = injectStudioCommentUI(threadEl);
    if (!ui) return;

    // Resolve category
    const categoryResult = resolveCategoryForVideo(videoTitle, videoKey, channelKey, caches.videoSheetMap);
    const resolvedSheetId = categoryResult.sheetId;

    // Restore UI states
    const buttonState = caches.buttonStates[commentKey] || null;
    const checkboxState = caches.checkboxStates[commentKey]?.checked || false;

    updateStudioButtonsUI(ui, resolvedSheetId, buttonState);
    if (ui.badgeEl) updateStudioBadgeUI(ui.badgeEl, resolvedSheetId, categoryResult.source);
    if (ui.checkboxEl) {
        ui.checkboxEl.checked = checkboxState;
        updateStudioCheckedClass(threadEl, checkboxState);
    } else {
        updateStudioCheckedClass(threadEl, checkboxState);
    }

    // Store attributes on element for fast lookup during retroactive updates
    threadEl.dataset.syhVideoKey = videoKey;
    threadEl.dataset.syhCommentKey = commentKey;

    // If only data changed (virtual scroll reuse), skip re-attaching event listeners
    if (videoKeyChanged && !forceUpdate) {
        return;
    }

    const getFreshContext = () => {
        const freshAuthor = getAuthorNameText(threadEl);
        const freshText = getCommentText(threadEl);
        let freshVideoTitle = getVideoTitleText(threadEl);
        let freshVideoHref = getVideoLinkHref(threadEl);

        const isReply = threadEl.hasAttribute('is-reply');
        if (isReply && !freshVideoTitle) {
            const parentThread = threadEl.closest('ytcp-comment-thread');
            if (parentThread) {
                const parentComment = parentThread.querySelector<HTMLElement>('ytcp-comment:not([is-reply])');
                if (parentComment) {
                    if (!freshVideoTitle) freshVideoTitle = getVideoTitleText(parentComment);
                    if (!freshVideoHref)  freshVideoHref  = getVideoLinkHref(parentComment);
                    if (!freshVideoTitle && !freshVideoHref && parentComment.dataset.syhVideoKey) {
                        freshVideoHref = parentComment.dataset.syhVideoKey;
                    }
                }
            }
        }
        const freshVideoKey = generateVideoKey(freshVideoHref, freshVideoTitle);
        const freshCommentKey = generateCommentKey(freshVideoTitle, freshAuthor, freshText);

        return { freshAuthor, freshText, freshVideoTitle, freshVideoHref, freshVideoKey, freshCommentKey };
    };

    // Helper: auto-check comment when added to questions/prayers
    const autoCheck = (currentCommentKey: string) => {
        if (ui.checkboxEl) {
            ui.checkboxEl.checked = true;
        }
        updateStudioCheckedClass(threadEl, true);
        caches.checkboxStates[currentCommentKey] = {
            checked: true,
            timestamp: Date.now()
        };
        SYH_STORAGE.set({ [STUDIO_CHECKBOX_STATE_KEY]: caches.checkboxStates });
    };

    // 1. Copy button handler
    if (ui.copyBtn.dataset.syhBound !== 'true') {
        ui.copyBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const ctx = getFreshContext();
            const formatted = ctx.freshAuthor ? `@${ctx.freshAuthor}\n\n${ctx.freshText}` : ctx.freshText;
            const success = await copyToClipboard(formatted);

            const origHtml = ui.copyBtn.innerHTML;
            const origTitle = ui.copyBtn.title;
            ui.copyBtn.innerHTML = success ? '<span class="syh-icon">✓</span>' : '<span class="syh-icon">❌</span>';
            ui.copyBtn.title = success ? 'Скопійовано в буфер!' : 'Помилка копіювання';
            setTimeout(() => {
                ui.copyBtn.innerHTML = origHtml;
                ui.copyBtn.title = origTitle;
            }, 1200);
        });
        ui.copyBtn.dataset.syhBound = 'true';
    }

    // Helper for question / prayer click
    const handleAddClick = async (type: 'question' | 'prayer') => {
        const ctx = getFreshContext();
        // Re-check current video category resolution (in case user changed badge dropdown)
        const currentRes = resolveCategoryForVideo(ctx.freshVideoTitle, ctx.freshVideoKey, channelKey, caches.videoSheetMap);
        const targetSheetId = currentRes.sheetId;

        if (!targetSheetId) {
            // Unresolved sheet category -> block action & highlight/open badge dropdown
            setStudioDropdownVisible(ui.dropdownEl, true);
            if (ui.metaContainer) activeStudioDropdownInfo = { dropdown: ui.dropdownEl, metaContainer: ui.metaContainer };
            ui.badgeEl.classList.add('syh-badge-highlight');
            setTimeout(() => ui.badgeEl.classList.remove('syh-badge-highlight'), 2000);
            return;
        }

        const formatted = ctx.freshAuthor ? `@${ctx.freshAuthor}\n\n${ctx.freshText}` : ctx.freshText;
        await copyToClipboard(formatted);

        // Update button state cache & storage
        caches.buttonStates[ctx.freshCommentKey] = type;
        SYH_STORAGE.set({ [STUDIO_BUTTON_STATE_KEY]: caches.buttonStates });

        // Save item to sheet collection
        await saveStudioCollectedItem(targetSheetId, {
            id: ctx.freshCommentKey,
            author: ctx.freshAuthor,
            text: ctx.freshText,
            type,
            timestamp: Date.now(),
            videoId: ctx.freshVideoKey,
            videoTitle: ctx.freshVideoTitle
        });

        // Update UI
        updateStudioButtonsUI(ui, targetSheetId, type);
        autoCheck(ctx.freshCommentKey);
    };

    // 2. Question button click
    if (ui.questionBtn.dataset.syhBound !== 'true') {
        ui.questionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleAddClick('question');
        });
        ui.questionBtn.dataset.syhBound = 'true';
    }

    // 3. Prayer button click
    if (ui.prayerBtn.dataset.syhBound !== 'true') {
        ui.prayerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleAddClick('prayer');
        });
        ui.prayerBtn.dataset.syhBound = 'true';
    }
    if (!ui.dropdownEl || !ui.badgeEl || !ui.metaContainer) {
        // #metadata not yet in DOM (e.g. reply rendered with delay) — skip badge/checkbox binding.
        // Buttons are already bound above; full binding will happen on next processVisibleComments cycle.
        threadEl.dataset.syhStudioEventsBound = 'true';
        return;
    }

    // 4. Badge click -> toggle dropdown
    if (ui.badgeEl.dataset.syhBound !== 'true') {
        ui.badgeEl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isVisible = ui.dropdownEl.style.display === 'block';
            setStudioDropdownVisible(ui.dropdownEl, !isVisible);
            if (!isVisible && ui.metaContainer) {
                activeStudioDropdownInfo = { dropdown: ui.dropdownEl, metaContainer: ui.metaContainer };
            } else {
                activeStudioDropdownInfo = null;
            }
        });
        ui.badgeEl.dataset.syhBound = 'true';
    }

    // Dropdown item selection
    if (ui.dropdownEl.dataset.syhBound !== 'true') {
        ui.dropdownEl.addEventListener('click', async (e) => {
            e.stopPropagation();
            const itemEl = (e.target as HTMLElement).closest<HTMLElement>('.syh-studio-dropdown-item');
            if (!itemEl) return;

            const selectedVal = itemEl.dataset.sheetId;
            const newSheetId: SheetId | null = selectedVal === 'auto_reset' ? null : (selectedVal as SheetId);
            
            const ctx = getFreshContext();
            const autoCat = resolveCategoryForVideo(ctx.freshVideoTitle, ctx.freshVideoKey, channelKey, {}).sheetId;

            setStudioDropdownVisible(ui.dropdownEl, false);
            activeStudioDropdownInfo = null;

            // Update storage and videoSheetMap
            caches.videoSheetMap = await setStudioVideoSheetOverride(
                ctx.freshVideoKey,
                newSheetId,
                channelKey,
                channelLabel,
                ctx.freshVideoTitle,
                autoCat
            );

            // Retroactively update all comments in DOM matching videoKey
            retroactiveUpdateVideoComments(ctx.freshVideoKey, channelKey, caches);
        });
        ui.dropdownEl.dataset.syhBound = 'true';
    }

    // 5. Checkbox change handler
    if (ui.checkboxEl && ui.checkboxEl.dataset.syhBound !== 'true') {
        ui.checkboxEl.addEventListener('change', (e) => {
            e.stopPropagation();
            const isChecked = ui.checkboxEl.checked;
            updateStudioCheckedClass(threadEl, isChecked);

            const ctx = getFreshContext();
            caches.checkboxStates[ctx.freshCommentKey] = {
                checked: isChecked,
                timestamp: Date.now()
            };
            SYH_STORAGE.set({ [STUDIO_CHECKBOX_STATE_KEY]: caches.checkboxStates });
        });
        ui.checkboxEl.dataset.syhBound = 'true';
    }

    // 6. Contextmenu (RMB / ПКМ) on comment text area
    if (threadEl.dataset.syhStudioEventsBound !== 'true') {
        const handleContextMenu = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (!target) return;

            if (target.closest('button, a, input, select, label, .syh-studio-btn, .syh-studio-badge-wrapper, .syh-studio-checkbox-wrapper, ytcp-comment-action-buttons, ytcp-comment-video-thumbnail')) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            if (ui.checkboxEl) {
                ui.checkboxEl.checked = !ui.checkboxEl.checked;
                ui.checkboxEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
        };

        threadEl.addEventListener('contextmenu', handleContextMenu, { capture: true });
        threadEl.dataset.syhStudioEventsBound = 'true';
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
    const threads = document.querySelectorAll<HTMLElement>('ytcp-comment');
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
