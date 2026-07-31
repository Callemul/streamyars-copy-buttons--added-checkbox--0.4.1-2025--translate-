// youtube/studio/studio_ui.ts
import { SHEET_IDS, SHEET_LABELS, SheetId } from '../../modules/sheets.ts';
import { getToolbarElement, getVideoThumbnailElement } from './studio_selectors.ts';

export interface StudioCommentUIElements {
    copyBtn: HTMLButtonElement;
    questionBtn: HTMLButtonElement;
    prayerBtn: HTMLButtonElement;
    badgeEl: HTMLElement;
    dropdownEl: HTMLElement;
    checkboxEl: HTMLInputElement;
    metaContainer: HTMLElement;
}

/**
 * Ensures Studio action buttons, Badge dropdown, and Checkbox are injected into comment thread element
 */
export function injectStudioCommentUI(threadEl: HTMLElement): StudioCommentUIElements | null {
    const toolbar = getToolbarElement(threadEl);
    const videoThumb = getVideoThumbnailElement(threadEl);

    if (!toolbar || !videoThumb) {
        return null;
    }

    // 1. Inject / retrieve Action Buttons in #toolbar
    let copyBtn = toolbar.querySelector<HTMLButtonElement>('.syh-studio-btn-copy');
    let questionBtn = toolbar.querySelector<HTMLButtonElement>('.syh-studio-btn-question');
    let prayerBtn = toolbar.querySelector<HTMLButtonElement>('.syh-studio-btn-prayer');

    if (!copyBtn || !questionBtn || !prayerBtn) {
        // Remove existing partial buttons if any
        toolbar.querySelectorAll('.syh-studio-btn').forEach(el => el.remove());

        copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'syh-studio-btn syh-studio-btn-copy';
        copyBtn.innerHTML = '<span class="syh-icon">📋</span>';
        copyBtn.title = 'Скопіювати автора та текст коментаря в буфер';

        questionBtn = document.createElement('button');
        questionBtn.type = 'button';
        questionBtn.className = 'syh-studio-btn syh-studio-btn-question';
        questionBtn.innerHTML = '<span class="syh-icon">❓</span>';

        prayerBtn = document.createElement('button');
        prayerBtn.type = 'button';
        prayerBtn.className = 'syh-studio-btn syh-studio-btn-prayer';
        prayerBtn.innerHTML = '<span class="syh-icon">🙏</span>';

        // Append to toolbar
        toolbar.appendChild(copyBtn);
        toolbar.appendChild(questionBtn);
        toolbar.appendChild(prayerBtn);
    }

    // 2. Inject / retrieve Video Meta (Badge + Checkbox) under #video-title in ytcp-comment-video-thumbnail
    let metaContainer = videoThumb.querySelector<HTMLElement>('.syh-studio-video-meta');
    let badgeEl: HTMLElement | null = null;
    let dropdownEl: HTMLElement | null = null;
    let checkboxEl: HTMLInputElement | null = null;

    if (!metaContainer) {
        metaContainer = document.createElement('div');
        metaContainer.className = 'syh-studio-video-meta';

        // Badge wrapper
        const badgeWrapper = document.createElement('div');
        badgeWrapper.className = 'syh-studio-badge-wrapper';

        badgeEl = document.createElement('button');
        badgeEl.type = 'button';
        badgeEl.className = 'syh-studio-badge';

        dropdownEl = document.createElement('div');
        dropdownEl.className = 'syh-studio-dropdown';
        dropdownEl.style.display = 'none';

        // Populate dropdown options
        const optionKeys: (SheetId | 'auto_reset')[] = [
            SHEET_IDS.VP_SS,
            SHEET_IDS.OPARIN,
            SHEET_IDS.MOLCHANOV_SS,
            SHEET_IDS.MOLCHANOV_PREACH,
            'auto_reset'
        ];

        optionKeys.forEach((key) => {
            const item = document.createElement('div');
            item.className = 'syh-studio-dropdown-item';
            item.dataset.sheetId = key;
            if (key === 'auto_reset') {
                item.textContent = '🔄 Скинути до авто';
                item.classList.add('syh-studio-dropdown-reset');
            } else {
                item.textContent = SHEET_LABELS[key];
            }
            dropdownEl!.appendChild(item);
        });

        badgeWrapper.appendChild(badgeEl);
        badgeWrapper.appendChild(dropdownEl);

        // Checkbox wrapper
        const checkboxWrapper = document.createElement('label');
        checkboxWrapper.className = 'syh-studio-checkbox-wrapper';
        checkboxWrapper.title = 'Позначити коментар як прочитаний (ПКМ по тексту коментаря або клік по чекбоксу)';

        checkboxEl = document.createElement('input');
        checkboxEl.type = 'checkbox';
        checkboxEl.className = 'syh-studio-checkbox';

        const checkboxLabel = document.createElement('span');
        checkboxLabel.className = 'syh-studio-checkbox-text';
        checkboxLabel.textContent = 'Прочитано';

        checkboxWrapper.appendChild(checkboxEl);
        checkboxWrapper.appendChild(checkboxLabel);

        metaContainer.appendChild(badgeWrapper);
        metaContainer.appendChild(checkboxWrapper);

        videoThumb.appendChild(metaContainer);
    } else {
        badgeEl = metaContainer.querySelector<HTMLElement>('.syh-studio-badge')!;
        dropdownEl = metaContainer.querySelector<HTMLElement>('.syh-studio-dropdown')!;
        checkboxEl = metaContainer.querySelector<HTMLInputElement>('.syh-studio-checkbox')!;
    }

    return {
        copyBtn,
        questionBtn,
        prayerBtn,
        badgeEl,
        dropdownEl,
        checkboxEl,
        metaContainer
    };
}

/**
 * Updates button labels, tooltips and icons based on sheet category and button active state
 */
export function updateStudioButtonsUI(
    elements: StudioCommentUIElements,
    resolvedSheetId: SheetId | null,
    buttonState: 'question' | 'prayer' | null
) {
    const { questionBtn, prayerBtn } = elements;
    const sheetLabel = resolvedSheetId ? SHEET_LABELS[resolvedSheetId] : null;

    // Question button
    if (buttonState === 'question') {
        questionBtn.classList.add('syh-btn-active');
        questionBtn.innerHTML = '<span class="syh-icon">✓</span>';
        questionBtn.title = sheetLabel
            ? `Відправлено до ${sheetLabel} - питань`
            : 'Відправлено до питань';
    } else {
        questionBtn.classList.remove('syh-btn-active');
        questionBtn.innerHTML = '<span class="syh-icon">❓</span>';
        questionBtn.title = sheetLabel
            ? `Додати до ${sheetLabel} - питань`
            : 'Категорію не визначено (натисніть на Badge)';
    }

    // Prayer button
    if (buttonState === 'prayer') {
        prayerBtn.classList.add('syh-btn-active');
        prayerBtn.innerHTML = '<span class="syh-icon">✓</span>';
        prayerBtn.title = sheetLabel
            ? `Відправлено до ${sheetLabel} - молитов`
            : 'Відправлено до молитов';
    } else {
        prayerBtn.classList.remove('syh-btn-active');
        prayerBtn.innerHTML = '<span class="syh-icon">🙏</span>';
        prayerBtn.title = sheetLabel
            ? `Додати до ${sheetLabel} - молитов`
            : 'Категорію не визначено (натисніть на Badge)';
    }
}

/**
 * Updates Badge text and style based on resolved sheet category and source ('auto' | 'manual' | 'unresolved')
 */
export function updateStudioBadgeUI(
    badgeEl: HTMLElement,
    resolvedSheetId: SheetId | null,
    source: 'auto' | 'manual' | 'unresolved'
) {
    badgeEl.classList.remove('syh-badge-manual', 'syh-badge-unresolved', 'syh-badge-auto');

    if (resolvedSheetId && SHEET_LABELS[resolvedSheetId]) {
        badgeEl.textContent = SHEET_LABELS[resolvedSheetId] + (source === 'manual' ? ' (Ручний)' : '');
        badgeEl.title = source === 'manual'
            ? `Категорія обрана вручну: ${SHEET_LABELS[resolvedSheetId]} (натисніть для зміни)`
            : `Категорія визначена автоматично: ${SHEET_LABELS[resolvedSheetId]} (натисніть для зміни)`;

        if (source === 'manual') {
            badgeEl.classList.add('syh-badge-manual');
        } else {
            badgeEl.classList.add('syh-badge-auto');
        }
    } else {
        badgeEl.textContent = 'Категорію не визначено';
        badgeEl.title = 'Не вдалося визначити категорію відео. Натисніть, щоб обрати вручну.';
        badgeEl.classList.add('syh-badge-unresolved');
    }
}

/**
 * Toggles comment thread checked class (.syh-studio-comment-checked)
 */
export function updateStudioCheckedClass(threadEl: HTMLElement, isChecked: boolean) {
    if (isChecked) {
        threadEl.classList.add('syh-studio-comment-checked');
    } else {
        threadEl.classList.remove('syh-studio-comment-checked');
    }
}

if (typeof window !== 'undefined') {
    (window as any).injectStudioCommentUI = injectStudioCommentUI;
}
