// youtube/studio/studio_header_dom.ts
//
// DOM-частина баджів лічильників у шапці YouTube Studio: пошук точки вставки,
// створення/перевикористання контейнера та навішування обробників.
//
// Виділено з `studio_header_counters.ts` разом із `studio_header_badge_markup.ts`,
// щоб розділити «де вставити + що робить клік» і «як виглядає розмітка».

import { SYH_STORAGE, STORAGE_KEYS } from '../../modules/storage';
import { CommentService } from '../../modules/comments/comment_service';

const HEADER_COUNTERS_WRAPPER_CLASS = 'syh-header-counters-wrapper';

export interface HeaderTargets {
    targetParent: HTMLElement;
    commentSpan: HTMLElement | null;
}

/**
 * Визначає, у який контейнер вставляти лічильники і біля якого span-а
 * («Коментар») вони мають стояти.
 */
export function resolveHeaderTargets(parentContainer: HTMLElement): HeaderTargets {
    let targetParent = parentContainer;
    let commentSpan: HTMLElement | null = null;

    if (parentContainer.id === 'comment-header') {
        commentSpan = parentContainer.querySelector<HTMLElement>('span.ytcp-comments-section, span');
    } else if (parentContainer.tagName === 'SPAN') {
        commentSpan = parentContainer;
        if (parentContainer.parentElement) {
            targetParent = parentContainer.parentElement;
        }
    } else {
        commentSpan = parentContainer.querySelector<HTMLElement>('#comment-header span.ytcp-comments-section, span.ytcp-comments-section');
        if (commentSpan && commentSpan.parentElement) {
            targetParent = commentSpan.parentElement;
        }
    }

    return { targetParent, commentSpan };
}

/**
 * Повертає наявний контейнер лічильників або створює новий одразу після
 * span-а «Коментар». Ідемпотентно: повторні виклики не дублюють вузол.
 */
export function ensureCountersWrapper(targets: HeaderTargets): HTMLElement {
    const { targetParent, commentSpan } = targets;

    const existing = targetParent.querySelector<HTMLElement>(`.${HEADER_COUNTERS_WRAPPER_CLASS}`);
    if (existing) return existing;

    const wrapper = document.createElement('div');
    wrapper.className = HEADER_COUNTERS_WRAPPER_CLASS;

    if (commentSpan && commentSpan.nextSibling) {
        commentSpan.parentNode?.insertBefore(wrapper, commentSpan.nextSibling);
    } else if (commentSpan) {
        commentSpan.parentNode?.appendChild(wrapper);
    } else {
        targetParent.appendChild(wrapper);
    }

    return wrapper;
}

/** Кнопка 🗑️ — очищення зібраних коментарів однієї категорії. */
function attachDeleteHandler(badgeEl: HTMLElement): void {
    const delBtn = badgeEl.querySelector<HTMLElement>('.syh-stat-del');
    if (!delBtn) return;

    delBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const sId = badgeEl.dataset.sheetId;
        if (sId) {
            if (confirm("Очистити всі зібрані коментарі з YouTube для цієї категорії?")) {
                CommentService.clearAllCollectedForSheet(sId).catch(e => console.error('[SYH] Clear failed:', e));
            }
        }
    });
}

/** Клік по баджу — відкриття відповідної підвкладки у попапі. */
function attachOpenPopupHandler(badgeEl: HTMLElement): void {
    badgeEl.style.cursor = 'pointer';
    badgeEl.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const sId = badgeEl.dataset.sheetId;
        if (!sId) return;

        SYH_STORAGE.set({
            [STORAGE_KEYS.POPUP_ACTIVE_TAB]: 'tab-telegram',
            [STORAGE_KEYS.POPUP_ACTIVE_SUBTAB]: sId
        }, () => {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                try {
                    chrome.runtime.sendMessage({ action: 'OPEN_SHEET_POPUP', sheetId: sId });
                } catch {
                    // Context or API error safely ignored
                }
            }
        });
    });
}

/** Навішує обробники на всі бажді всередині контейнера. */
export function attachBadgeHandlers(wrapper: HTMLElement): void {
    wrapper.querySelectorAll<HTMLElement>('.syh-header-counter-badge').forEach((badgeEl) => {
        attachDeleteHandler(badgeEl);
        attachOpenPopupHandler(badgeEl);
    });
}
