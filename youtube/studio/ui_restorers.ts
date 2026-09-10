import { resolveCategoryForVideo } from './studio_category_matcher';
import type { SheetId } from '../../modules/registry/sheets';
import { 
    updateStudioButtonsUI, 
    updateStudioBadgeUI, 
    updateStudioCheckedClass 
} from './studio_ui';
import type { StudioCommentUIElements } from './studio_ui';
import { getEffectiveButtonState, getEffectiveCheckboxState, type StudioEventCaches } from './state_resolvers';
import { getCommentContextForRestore } from './comment_context';

export function restoreButtonState(
    element: HTMLElement,
    commentKey: string,
    channelKey: string,
    caches: StudioEventCaches,
    getStudioUI: (element: Element) => StudioCommentUIElements | null
): void {
    const ctx = getCommentContextForRestore(element, commentKey, channelKey, caches, getStudioUI);
    const buttonState = getEffectiveButtonState(commentKey, ctx, caches);

    let resolvedSheetId: SheetId | null = null;
    let categorySource: 'auto' | 'manual' | 'unresolved' = 'unresolved';

    if (ctx && ctx.videoId) {
        const categoryResult = resolveCategoryForVideo(
            ctx.videoTitle || '',
            ctx.videoId,
            channelKey as any,
            caches.videoSheetMap
        );
        resolvedSheetId = categoryResult.sheetId;
        categorySource = categoryResult.source;
    }

    const ui = getStudioUI(element);
    if (ui && ui.questionBtn && ui.prayerBtn) {
        updateStudioButtonsUI(ui, resolvedSheetId, buttonState);
        if (ui.badgeEl) {
            updateStudioBadgeUI(ui.badgeEl, resolvedSheetId, categorySource);
        }
    }
}

export function restoreCheckboxState(
    element: HTMLElement,
    commentKey: string,
    caches: StudioEventCaches,
    getStudioUI: (element: Element) => StudioCommentUIElements | null
): void {
    const ctx = getCommentContextForRestore(element, commentKey, '', caches, getStudioUI);
    const checkboxState = getEffectiveCheckboxState(commentKey, ctx, caches);
    const threadEl = element.closest('ytcp-comment, ytcp-comment-thread') as HTMLElement | null;
    if (threadEl) {
        updateStudioCheckedClass(threadEl, checkboxState);
    }
    const ui = getStudioUI(element);
    if (ui && ui.checkboxEl) {
        ui.checkboxEl.checked = checkboxState;
    }
}

export function isCheckboxOutOfSync(
    element: HTMLElement,
    commentKey: string,
    caches: StudioEventCaches,
    getStudioUI: (element: Element) => StudioCommentUIElements | null
): boolean {
    const ctx = getCommentContextForRestore(element, commentKey, '', caches, getStudioUI);
    const ui = getStudioUI(element);
    if (!ui || !ui.checkboxEl) return false;

    const expectedChecked = getEffectiveCheckboxState(commentKey, ctx, caches);
    const threadEl = element.closest('ytcp-comment, ytcp-comment-thread') as HTMLElement | null;
    const currentClassChecked = threadEl ? threadEl.classList.contains('syh-studio-comment-checked') : false;

    return ui.checkboxEl.checked !== expectedChecked || currentClassChecked !== expectedChecked;
}

export function isButtonOutOfSync(
    element: HTMLElement,
    commentKey: string,
    caches: StudioEventCaches,
    getStudioUI: (element: Element) => StudioCommentUIElements | null
): boolean {
    const ctx = getCommentContextForRestore(element, commentKey, '', caches, getStudioUI);
    const ui = getStudioUI(element);
    if (!ui || !ui.questionBtn || !ui.prayerBtn) return false;

    const expectedState = getEffectiveButtonState(commentKey, ctx, caches);
    const hasQuestionActive = ui.questionBtn.classList.contains('syh-btn-active');
    const hasPrayerActive = ui.prayerBtn.classList.contains('syh-btn-active');

    const currentActiveState = hasQuestionActive ? 'question' : (hasPrayerActive ? 'prayer' : null);
    return currentActiveState !== expectedState;
}