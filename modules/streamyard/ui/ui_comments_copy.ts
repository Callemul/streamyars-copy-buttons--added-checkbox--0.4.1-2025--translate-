/**
 * StreamYard Helper — кнопка «скопіювати всі списки» у вкладці Starred.
 *
 * Винесено з `modules/ui_comments.ts`, щоб розплутати CRAP-хотспот —
 * 59-рядковий інлайновий обробник кліку (CRAP 31.6 / cyclomatic 10 за звітом
 * Fallow 3.14). Тепер збір даних, форматування і візуальний відгук — три
 * незалежні одиниці, які можна тестувати нарізно.
 *
 * Поведінка збережена 1-в-1 (див. `tests/ui_comments_copy_filter.test.js`),
 * включно з навмисними квірками:
 *   - фолбек на `prayersCache` спрацьовує лише коли з DOM не зібрано НІЧОГО;
 *   - іконка ✅ показується ЛИШЕ при успішному копіюванні; за збоєм —
 *     попереджувальний тост (без оманливої галочки);
 *   - за відсутності даних обробник виходить ДО візуального відгуку.
 */

import { SYH_UI_STATE } from './ui_state';
import { SYH_CONFIG, queryBySelectorValue, type SelectorValue } from '../../registry/config';
import { SYH_UTILS } from '../../core/utils';
import { CommentService } from '../../comments/comment_service';
import type { PrayerItem } from '../../core/types';

const COPY_BUTTON_CLASS = 'syh-starred-tab-copy-btn';
const COPY_ICON_CLASS = 'syh-starred-copy-icon';
const COPY_BUTTON_TITLE = 'Скопіює всі списки зі Starred';
const IDLE_ICON = '📋';
const SUCCESS_ICON = '✅';
const SUCCESS_ANIMATION_CLASS = 'syh-copied-anim';
const SUCCESS_ICON_RESET_MS = 1800;
/** Скасування попереднього таймера спалаху, щоб не лишати осиротілих таймерів. */
const copyFlashTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
/** Ширина, яку кнопка «з'їдає» в шапці вкладки. */
const TAB_PADDING_RIGHT = '28px';

export interface CopyableComment {
    author: string;
    text: string;
}

/**
 * Збирає коментарі з живого DOM-списку Starred.
 * Пропускає видалені (`data-syh-deleted`), приховані фільтром (`display: none`)
 * і порожні за текстом записи.
 */
export function collectStarredCommentsFromDom(
    selectors: Record<string, SelectorValue>
): CopyableComment[] {
    const commentsToCopy: CopyableComment[] = [];
    const commentList = queryBySelectorValue<HTMLElement>(selectors.starredList, document);

    if (!commentList || commentList.children.length === 0) {
        return commentsToCopy;
    }

    Array.from(commentList.children).forEach((liChild) => {
        const li = liChild as HTMLElement;
        if (li.getAttribute('data-syh-deleted') === 'true') return;
        if (li.style.display === 'none') return;

        const commentWrap = queryBySelectorValue(selectors.commentBlock, li) || li;
        const authorText = queryBySelectorValue(selectors.commentAuthor, commentWrap)?.textContent || '';
        const originalText = queryBySelectorValue(selectors.commentText, commentWrap)?.textContent || '';

        if (originalText.trim()) {
            commentsToCopy.push({
                author: authorText.trim(),
                text: originalText.trim()
            });
        }
    });

    return commentsToCopy;
}

/** Фолбек-джерело: кеш зібраних молитв/питань, коли DOM нічого не дав. */
export function collectCommentsFromCache(prayersCache: PrayerItem[]): CopyableComment[] {
    const commentsToCopy: CopyableComment[] = [];

    prayersCache.forEach((p) => {
        if (p.text && p.text.trim()) {
            commentsToCopy.push({ author: p.author || '', text: p.text.trim() });
        }
    });

    return commentsToCopy;
}

/** Обирає джерело даних: живий DOM, а якщо порожньо — кеш. */
export function collectCommentsToCopy(
    selectors: Record<string, SelectorValue>,
    prayersCache: PrayerItem[] | null | undefined
): CopyableComment[] {
    const fromDom = collectStarredCommentsFromDom(selectors);
    if (fromDom.length > 0) return fromDom;

    if (prayersCache && prayersCache.length > 0) {
        return collectCommentsFromCache(prayersCache);
    }
    return fromDom;
}

/** Єдиний формат буфера обміну для всього застосунку — через CommentService. */
export function formatCommentsForClipboard(comments: CopyableComment[]): string {
    return comments
        .map(c => CommentService.formatForClipboard(c.author, c.text))
        .join('\n\n');
}

/** Коротка «галочка» замість іконки як підтвердження дії. */
export function flashCopyIcon(copyBtn: HTMLElement): void {
    const iconSpan = copyBtn.querySelector(`.${COPY_ICON_CLASS}`);
    if (!iconSpan) return;

    iconSpan.textContent = SUCCESS_ICON;
    copyBtn.classList.add(SUCCESS_ANIMATION_CLASS);

    const prev = copyFlashTimers.get(copyBtn);
    if (prev) clearTimeout(prev);
    copyFlashTimers.set(copyBtn, setTimeout(() => {
        iconSpan.textContent = IDLE_ICON;
        copyBtn.classList.remove(SUCCESS_ANIMATION_CLASS);
    }, SUCCESS_ICON_RESET_MS));
}

async function handleStarredCopyClick(copyBtn: HTMLElement, e: MouseEvent): Promise<void> {
    e.stopPropagation();
    e.preventDefault();

    const selectors = SYH_UI_STATE.SELECTORS || SYH_CONFIG.SELECTORS;
    const commentsToCopy = collectCommentsToCopy(selectors, SYH_UI_STATE.prayersCache);

    if (commentsToCopy.length === 0) {
        SYH_UTILS.copyAndShowBanner('', 'Немає коментарів для копіювання');
        return;
    }

    const formattedText = formatCommentsForClipboard(commentsToCopy);

    const success = await CommentService.copyToClipboard(formattedText);
    if (success) {
        SYH_UTILS.copyAndShowBanner(formattedText, `Скопійовано коментарів: ${commentsToCopy.length} 📋`);
        flashCopyIcon(copyBtn);
    } else {
        SYH_UTILS.copyAndShowBanner('', '⚠️ Не вдалося скопіювати в буфер обміну');
    }
}

function createStarredCopyButton(): HTMLButtonElement {
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = COPY_BUTTON_CLASS;
    copyBtn.title = COPY_BUTTON_TITLE;
    copyBtn.setAttribute('aria-label', COPY_BUTTON_TITLE);
    copyBtn.innerHTML = `<span class="${COPY_ICON_CLASS}">${IDLE_ICON}</span>`;

    copyBtn.addEventListener('click', (e: MouseEvent) => handleStarredCopyClick(copyBtn, e));

    return copyBtn;
}

/**
 * Додає маленьку кнопку копіювання списків у правому кутку вкладки Starred.
 * Ідемпотентна: повторний виклик на тому самому вузлі нічого не робить.
 */
export function addStarredTabCopyButton(starredTabNode: Element): void {
    if (!starredTabNode || starredTabNode.querySelector(`.${COPY_BUTTON_CLASS}`)) {
        return;
    }

    const tabEl = starredTabNode as HTMLElement;
    if (getComputedStyle(tabEl).position === 'static') {
        tabEl.style.position = 'relative';
    }
    tabEl.style.paddingRight = TAB_PADDING_RIGHT;

    tabEl.appendChild(createStarredCopyButton());
}
