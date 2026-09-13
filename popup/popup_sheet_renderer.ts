// popup/popup_sheet_renderer.ts
//
// Клонування шаблону аркуша і перелік ключів, які попап вантажить на старті.
//
// Обидві операції генеруються з єдиного реєстру полів (`popup_sheet_fields.ts`,
// T8). До цього тут лежав ручний список із 31 виклику `setAttrId` — рівно те
// місце, де забуте поле мовчки лишалось без id, а отже без відновлення.

import { STORAGE_KEYS } from '../modules/storage/storage';
import { getAllSheetIds, SHEET_LABELS } from '../modules/registry/sheets';
import { SHEET_FIELDS, sheetFieldId, sheetStateKeys, allSheetStateBindings } from './popup_sheet_fields';
import { localize } from '../modules/dom/localize';

export function renderSheetTemplates(): void {
    const template = document.getElementById('sheet-content-template') as HTMLTemplateElement | null;
    const container = document.getElementById('sheet-contents-container');
    if (!template || !container) return;

    // `localize(document)` не заходить у `template.content`, тому шаблон локалізуємо
    // окремо і до клонування — тоді кожен аркуш отримує вже перекладену розмітку.
    localize(template.content);

    const sheetIds = getAllSheetIds();
    sheetIds.forEach((sId, idx) => {
        const clone = template.content.firstElementChild?.cloneNode(true) as HTMLElement | null;
        if (!clone) return;

        clone.id = `sheet-content-${sId}`;
        clone.setAttribute('aria-label', SHEET_LABELS[sId] || sId);
        if (idx === 0) clone.classList.add('active');

        // Один прохід по реєстру замість 31 рядка `setAttrId`.
        SHEET_FIELDS.forEach(field => {
            const el = clone.querySelector(field.cssHook);
            if (el) el.id = sheetFieldId(field, sId);
        });

        container.appendChild(clone);
    });
}

/** Ключі попапу, які не належать конкретному аркушу. */
const POPUP_GLOBAL_KEYS: readonly string[] = [
    STORAGE_KEYS.DB,
    STORAGE_KEYS.OPTIONS,
    STORAGE_KEYS.PRAYERS,
    STORAGE_KEYS.POPUP_ACTIVE_TAB,
    STORAGE_KEYS.POPUP_ACTIVE_SUBTAB,
    STORAGE_KEYS.POPUP_TEXTAREA_SIZES,
    STORAGE_KEYS.POPUP_TRANSLIT_OLD,
    STORAGE_KEYS.POPUP_TRANSLIT_NEW,
    STORAGE_KEYS.POPUP_SCROLL_POSITIONS,
    // Історичні форми тих самих ключів — читання старих даних (docs/rules/storage.md).
    'tg_active_tab',
    'tg_active_subtab',
    'tg_textarea_sizes',
    'tg_translit_old',
    'tg_translit_new',
    'tg_scroll_positions'
];

/**
 * Перелік ключів для одного `chrome.storage.get`.
 *
 * Для кожного аркуша беруться ОБИДВІ форми кожного ключа — канонічна і
 * легасі. Пара, у якої обидві форми збіглися історично (`dividerPos`,
 * `collected`), дає в списку дубль; він нешкідливий і збережений навмисно,
 * щоб вихід лишався 1-в-1 із докомітною поведінкою.
 */
export function buildPopupKeysToLoad(sheetIds: string[]): string[] {
    const bindings = allSheetStateBindings();
    const keysToLoad = [...POPUP_GLOBAL_KEYS];

    sheetIds.forEach(sId => {
        bindings.forEach(binding => keysToLoad.push(...sheetStateKeys(binding, sId)));
    });

    return keysToLoad;
}
