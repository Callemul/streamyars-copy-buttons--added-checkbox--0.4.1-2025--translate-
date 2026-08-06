// youtube/studio/studio_ui.ts
import { SHEET_LABELS, getAllSheetIds, type SheetId } from '../../modules/sheets';
import { getToolbarElement, getMetadataElement } from './studio_selectors';
import { UiFactory } from '../../modules/ui_factory';

export interface StudioCommentUIElements {
    copyBtn: HTMLButtonElement;
    questionBtn: HTMLButtonElement;
    prayerBtn: HTMLButtonElement;
    badgeEl: HTMLElement | null;
    dropdownEl: HTMLElement | null;
    checkboxEl: HTMLInputElement | null;
    metaContainer: HTMLElement | null;
}

/**
 * Ensures Studio action buttons, Badge dropdown, and Checkbox are injected into comment thread element
 */
export function injectStudioCommentUI(threadEl: HTMLElement): StudioCommentUIElements | null {
    const toolbar = getToolbarElement(threadEl);

    // Return null only if there is no toolbar — buttons are the minimum requirement.
    // Missing #metadata (common for replies rendered with delay) must NOT block button injection.
    if (!toolbar) {
        return null;
    }

    // 1. Inject / retrieve Action Buttons in #toolbar
    let copyBtn = toolbar.querySelector<HTMLButtonElement>('.syh-studio-btn-copy');
    let questionBtn = toolbar.querySelector<HTMLButtonElement>('.syh-studio-btn-question');
    let prayerBtn = toolbar.querySelector<HTMLButtonElement>('.syh-studio-btn-prayer');

    if (!copyBtn || !questionBtn || !prayerBtn) {
        toolbar.querySelectorAll('.syh-studio-btn').forEach(el => el.remove());

        copyBtn = UiFactory.createButton({
            action: 'studio-copy',
            icon: '📋',
            title: 'Скопіювати автора та текст коментаря в буфер',
            className: 'syh-studio-btn syh-studio-btn-copy'
        });

        questionBtn = UiFactory.createButton({
            action: 'studio-question',
            icon: '❓',
            title: 'Додати до питань',
            className: 'syh-studio-btn syh-studio-btn-question'
        });

        prayerBtn = UiFactory.createButton({
            action: 'studio-prayer',
            icon: '🙏',
            title: 'Додати до молитов',
            className: 'syh-studio-btn syh-studio-btn-prayer'
        });

        toolbar.appendChild(copyBtn);
        toolbar.appendChild(questionBtn);
        toolbar.appendChild(prayerBtn);
    }

    // 2. Right-aligned Meta Container (Badge + Checkbox) — injected into #metadata if present.
    // For replies that render #metadata with a delay, we skip badge injection gracefully
    // and return a partial UI (buttons only). The caller can handle missing badge/checkbox.
    const metadata = getMetadataElement(threadEl);

    let checkboxEl = metadata?.querySelector<HTMLInputElement>('.syh-studio-checkbox') ?? null;
    let badgeEl = metadata?.querySelector<HTMLElement>('.syh-studio-badge') ?? null;
    let dropdownEl = metadata?.querySelector<HTMLElement>('.syh-studio-dropdown') ?? null;
    let badgeWrapper = metadata?.querySelector<HTMLElement>('.syh-studio-badge-wrapper') ?? null;

    if (metadata && (!badgeEl || !dropdownEl || !checkboxEl || !badgeWrapper)) {
        metadata.querySelectorAll('.syh-studio-badge-wrapper, .syh-studio-checkbox-wrapper').forEach(el => el.remove());

        badgeWrapper = document.createElement('div');
        badgeWrapper.className = 'syh-studio-badge-wrapper';

        badgeEl = document.createElement('button');
        (badgeEl as HTMLButtonElement).type = 'button';
        badgeEl.className = 'syh-studio-badge';

        dropdownEl = document.createElement('div');
        dropdownEl.className = 'syh-studio-dropdown';
        dropdownEl.style.display = 'none';

        const optionKeys: (SheetId | 'auto_reset')[] = [
            ...getAllSheetIds(),
            'auto_reset'
        ];

        optionKeys.forEach((key) => {
            const item = document.createElement('div');
            item.className = 'syh-studio-dropdown-item';
            item.dataset.sheetId = key;
            if (key === 'auto_reset') {
                item.textContent = '\uD83D\uDD04 Скинути до авто';
                item.classList.add('syh-studio-dropdown-reset');
            } else {
                const label = SHEET_LABELS[key];
                item.innerHTML = formatCategoryLabel(label);
            }
            dropdownEl!.appendChild(item);
        });

        badgeWrapper.appendChild(badgeEl);
        badgeWrapper.appendChild(dropdownEl);

        const { wrapper: checkboxWrapper, checkbox: createdCheckbox } = UiFactory.createCheckbox(
            'studio-comment',
            'Прочитано (ПКМ по тексту коментаря або клік по чекбоксу)'
        );
        checkboxWrapper.className = 'syh-studio-checkbox-wrapper';
        createdCheckbox.className = 'syh-studio-checkbox';
        checkboxEl = createdCheckbox;

        metadata.appendChild(badgeWrapper);
        metadata.appendChild(checkboxWrapper);
    }

    // Always return a valid UI object as long as toolbar exists.
    // badgeEl / dropdownEl / checkboxEl / metaContainer may be null if metadata not yet in DOM.
    return {
        copyBtn,
        questionBtn,
        prayerBtn,
        badgeEl,
        dropdownEl,
        checkboxEl,
        metaContainer: badgeWrapper
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
    questionBtn.innerHTML = '<span class="syh-icon">\u2753</span>';
    if (buttonState === 'question') {
        questionBtn.classList.add('syh-btn-active');
        questionBtn.title = sheetLabel
            ? `Відправлено до ${sheetLabel} - питань`
            : 'Відправлено до питань';
    } else {
        questionBtn.classList.remove('syh-btn-active');
        questionBtn.title = sheetLabel
            ? `Додати до ${sheetLabel} - питань`
            : 'Категорію не визначено (натисніть на Badge)';
    }

    // Prayer button
    prayerBtn.innerHTML = '<span class="syh-icon">\uD83D\uDE4F</span>';
    if (buttonState === 'prayer') {
        prayerBtn.classList.add('syh-btn-active');
        prayerBtn.title = sheetLabel
            ? `Відправлено до ${sheetLabel} - молитов`
            : 'Відправлено до молитов';
    } else {
        prayerBtn.classList.remove('syh-btn-active');
        prayerBtn.title = sheetLabel
            ? `Додати до ${sheetLabel} - молитов`
            : 'Категорію не визначено (натисніть на Badge)';
    }
}

/**
 * Updates Badge text and style based on resolved sheet category and source ('auto' | 'manual' | 'unresolved')
 */
export function updateStudioBadgeUI(
    badgeEl: HTMLElement | null,
    resolvedSheetId: SheetId | null,
    source: 'auto' | 'manual' | 'unresolved'
) {
    if (!badgeEl) return;
    badgeEl.classList.remove('syh-badge-manual', 'syh-badge-unresolved', 'syh-badge-auto', 'syh-badge-preach');

    if (resolvedSheetId && SHEET_LABELS[resolvedSheetId]) {
        const label = SHEET_LABELS[resolvedSheetId];
        badgeEl.innerHTML = formatCategoryLabel(label) + (source === 'manual' ? ' (Ручний)' : '');
        badgeEl.title = source === 'manual'
            ? `Категорія обрана вручну: ${label} (натисніть для зміни)`
            : `Категорія визначена автоматично: ${label} (натисніть для зміни)`;

        const isPreach = resolvedSheetId === 'oparin' || resolvedSheetId === 'molchanov_preach';
        if (isPreach) {
            badgeEl.classList.add('syh-badge-preach');
        }

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

/**
 * Formats specific words inside the category labels to make them bold.
 */
function formatCategoryLabel(label: string): string {
    if (label === 'Время перемен СШ') return 'Время перемен <b>СШ</b>';
    if (label === 'Молчанов СШ') return 'Молчанов <b>СШ</b>';
    if (label === 'Опарин проповеди') return '<b>Опарин</b> проповеди';
    if (label === 'Молчанов проповеди') return '<b>Молчанов</b> проповеди';
    if (label.includes('СШ')) return label.replace('СШ', '<b>СШ</b>');
    return label;
}

// Pure ESM module export
