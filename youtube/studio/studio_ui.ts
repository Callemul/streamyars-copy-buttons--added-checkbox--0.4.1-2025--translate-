// youtube/studio/studio_ui.ts
import { SHEET_LABELS, getAllSheetIds, type SheetId } from '../../modules/sheets';
import { getToolbarElement, getMetadataElement } from './studio_selectors';
import { UiFactory } from '../../modules/ui_factory';
import { buildActionButtonConfig } from '../../modules/comment_actions';
import { formatCategoryLabel } from './studio_header_badge_markup';

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
 * Кнопка студійної панелі за канонічним id дії.
 * Реєстр описує всі три поверхні, тож для Studio дія завжди знайдеться;
 * фолбек лишається на випадок, якщо дію свідомо приберуть з реєстру.
 */
function createStudioActionButton(actionId: 'copy' | 'question' | 'prayer'): HTMLButtonElement {
    const config = buildActionButtonConfig('studio', actionId);
    if (!config) {
        throw new Error(`[SYH] Дія "${actionId}" не описана для поверхні studio`);
    }
    return UiFactory.createButton(config);
}

/**
 * Ensures Studio action buttons, Badge dropdown, and Checkbox are injected into comment thread element
 */
function ensureToolbarActionButtons(toolbar: HTMLElement): {
    copyBtn: HTMLButtonElement;
    questionBtn: HTMLButtonElement;
    prayerBtn: HTMLButtonElement;
} {
    let copyBtn = toolbar.querySelector<HTMLButtonElement>('.syh-studio-btn-copy');
    let questionBtn = toolbar.querySelector<HTMLButtonElement>('.syh-studio-btn-question');
    let prayerBtn = toolbar.querySelector<HTMLButtonElement>('.syh-studio-btn-prayer');

    if (!copyBtn || !questionBtn || !prayerBtn) {
        toolbar.querySelectorAll('.syh-studio-btn').forEach(el => el.remove());

        // Опис кнопок — з єдиного реєстру дій (`modules/comment_actions.ts`),
        // спільного зі StreamYard- і YouTube-панелями. Тут лишається тільки
        // студійна специфіка: три іменовані слоти, які повертає ця функція.
        copyBtn = createStudioActionButton('copy');
        questionBtn = createStudioActionButton('question');
        prayerBtn = createStudioActionButton('prayer');

        toolbar.appendChild(copyBtn);
        toolbar.appendChild(questionBtn);
        toolbar.appendChild(prayerBtn);
    }

    return { copyBtn, questionBtn, prayerBtn };
}

function ensureMetadataBadgeAndCheckbox(metadata: HTMLElement): {
    badgeEl: HTMLElement;
    dropdownEl: HTMLElement;
    checkboxEl: HTMLInputElement;
    badgeWrapper: HTMLElement;
} {
    let checkboxEl = metadata.querySelector<HTMLInputElement>('.syh-studio-checkbox');
    let badgeEl = metadata.querySelector<HTMLElement>('.syh-studio-badge');
    let dropdownEl = metadata.querySelector<HTMLElement>('.syh-studio-dropdown');
    let badgeWrapper = metadata.querySelector<HTMLElement>('.syh-studio-badge-wrapper');

    if (!badgeEl || !dropdownEl || !checkboxEl || !badgeWrapper) {
        metadata.querySelectorAll('.syh-studio-badge-wrapper, .syh-studio-checkbox-wrapper').forEach(el => el.remove());

        badgeWrapper = document.createElement('div');
        badgeWrapper.className = 'syh-studio-badge-wrapper';

        badgeEl = document.createElement('button');
        (badgeEl as HTMLButtonElement).type = 'button';
        badgeEl.className = 'syh-studio-badge';

        dropdownEl = document.createElement('div');
        dropdownEl.className = 'syh-studio-dropdown';
        dropdownEl.style.display = 'none';

        const optionKeys: (SheetId | 'auto_reset')[] = [...getAllSheetIds(), 'auto_reset'];

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

    return { badgeEl, dropdownEl, checkboxEl, badgeWrapper };
}

export function injectStudioCommentUI(threadEl: HTMLElement): StudioCommentUIElements | null {
    const toolbar = getToolbarElement(threadEl);
    if (!toolbar) return null;

    const { copyBtn, questionBtn, prayerBtn } = ensureToolbarActionButtons(toolbar);

    const metadata = getMetadataElement(threadEl);
    let badgeEl: HTMLElement | null = null;
    let dropdownEl: HTMLElement | null = null;
    let checkboxEl: HTMLInputElement | null = null;
    let badgeWrapper: HTMLElement | null = null;

    if (metadata) {
        const metaRes = ensureMetadataBadgeAndCheckbox(metadata);
        badgeEl = metaRes.badgeEl;
        dropdownEl = metaRes.dropdownEl;
        checkboxEl = metaRes.checkboxEl;
        badgeWrapper = metaRes.badgeWrapper;
    }

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
 * Applies icon, active state, and tooltip to a single Studio button.
 */
function applyStudioButtonUI(
    btn: HTMLButtonElement,
    iconHtml: string,
    type: 'question' | 'prayer',
    buttonState: 'question' | 'prayer' | null,
    sheetLabel: string | null
): void {
    const suffix = type === 'question' ? 'питань' : 'молитов';
    btn.innerHTML = iconHtml;
    if (buttonState === type) {
        btn.classList.add('syh-btn-active');
        btn.title = sheetLabel
            ? `Відправлено до ${sheetLabel} - ${suffix}`
            : `Відправлено до ${suffix}`;
    } else {
        btn.classList.remove('syh-btn-active');
        btn.title = sheetLabel
            ? `Додати до ${sheetLabel} - ${suffix}`
            : 'Категорію не визначено (натисніть на Badge)';
    }
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

    applyStudioButtonUI(questionBtn, '<span class="syh-icon">\u2753</span>', 'question', buttonState, sheetLabel);
    applyStudioButtonUI(prayerBtn, '<span class="syh-icon">\uD83D\uDE4F</span>', 'prayer', buttonState, sheetLabel);
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

// `formatCategoryLabel` імпортується з `studio_header_badge_markup` як єдине
// джерело правди (SSOT) — усуває дублювання з іншим порядком/підсвічуванням.

// Pure ESM module export
