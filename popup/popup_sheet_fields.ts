// popup/popup_sheet_fields.ts
//
// ЄДИНИЙ РЕЄСТР ПОЛІВ АРКУША ПОПАПУ (T8).
//
// До цього файлу одне поле аркуша реєструвалося вручну в шести місцях:
// розмітка шаблону, `setAttrId` у рендерері, ключ у `POPUP_SHEET_KEYS`,
// легасі-префікс, окрема `restoreSheet<Field>()` і окреме збереження в
// біндінгах. Шосте місце легко забувалось — і поле мовчки переставало
// зберігатись, бо жодна перевірка цього не бачила.
//
// Тепер джерело одне: таблиця `SHEET_FIELDS` нижче. З неї генеруються
//   • рендер   — `popup_sheet_renderer.renderSheetTemplates` (id елементів);
//   • перелік ключів на завантаження — `buildPopupKeysToLoad`;
//   • відновлення — `popup_sheet_field_restorer`;
//   • збереження — `popup_sheet_bindings`.
//
// Додати поле = розмітка з класом-гачком у `<template id="sheet-content-template">`
// + ОДИН рядок у цій таблиці.
//
// ─────────────────────────────────────────────────────────────────────────────
// ЧОМУ ДВА ВИДИ ПРИВ'ЯЗКИ ДО СХОВИЩА — `value` і `state`
//
//   `value` — значення самого елемента (`.value` або `.innerHTML`) зберігається
//             і відновлюється УНІВЕРСАЛЬНИМ кодом. Нове поле такого штибу не
//             потребує жодного рядка поза цією таблицею.
//   `state` — ключі, які логічно належать елементу, але мають власну логіку
//             (видимість панелі статистики, розкритий `<details>`, лічильник
//             журналу, позиція роздільника). Вони теж перелічені тут — бо саме
//             цей перелік визначає, ЩО завантажується зі сховища, — але читає
//             їх профільний відновлювач.
//
// ─────────────────────────────────────────────────────────────────────────────
// ZERO DATA LOSS (docs/rules/storage.md)
//
// Кожен ключ має дві форми: канонічну (`syh:popup:sheet:<id>:<field>`) та
// історичну (`tg_<field>__<id>`). Легасі-префікс записаний У ТАБЛИЦІ ЯВНО, а
// не виводиться з імені поля, — саме тому, що два ключі з конвенції випадають
// (`dividerPos`, `collected`), і мовчазна «нормалізація» такого ключа
// означала б втрату даних користувача. Тест
// `tests/popup_sheet_fields.test.js` фіксує обидві форми.

import { POPUP_SHEET_KEYS, getSheetCollectedStorageKey } from '../modules/storage/storage';
import type { SheetKeyBuilder, SheetLegacyPrefix } from './popup_sheet_keys';

/** Як поводитися зі значенням елемента. */
export type SheetFieldKind =
    /** `<textarea>` — значення в `.value` */
    | 'textarea'
    /** `<input type="text">` — значення в `.value` */
    | 'text'
    /** контейнер або `contenteditable` — значення в `.innerHTML` */
    | 'html'
    /** елемент без власного збереженого значення (кнопка, лічильник, колонка) */
    | 'element';

/** Одна прив'язка «поле стану ↔ пара ключів сховища». */
export interface SheetStateBinding {
    /** Ім'я поля стану; воно ж суфікс канонічного ключа. */
    readonly field: string;
    /** Будівник канонічного ключа (`POPUP_SHEET_KEYS.<field>`). */
    readonly key: SheetKeyBuilder;
    /** Історичний префікс: повний легасі-ключ = `${legacyPrefix}${sheetId}`. */
    readonly legacyPrefix: SheetLegacyPrefix;
}

export interface SheetFieldDescriptor {
    /** Клас-гачок у `<template id="sheet-content-template">`. */
    readonly cssHook: string;
    /** Префікс id: реальний id елемента = `${idPrefix}__${sheetId}`. */
    readonly idPrefix: string;
    readonly kind: SheetFieldKind;
    /** Значення елемента зберігається й відновлюється універсальним кодом. */
    readonly value?: SheetStateBinding;
    /** Ключі цього елемента з власною логікою відновлення. */
    readonly state?: readonly SheetStateBinding[];
}

/** Скорочення для ключів, що дотримуються конвенції `tg_<field>__`. */
function tg(field: keyof typeof POPUP_SHEET_KEYS): SheetStateBinding {
    return { field, key: POPUP_SHEET_KEYS[field], legacyPrefix: `tg_${field}__` };
}

/**
 * Позиція роздільника колонок кроку 3.
 *
 * КВІРК 1-в-1 (був і до T8): «легасі»-форма збігається з канонічною, тож
 * фолбек тут мертвий. Лишено як є — рефакторинг не змінює поведінку сховища.
 */
const DIVIDER_POS: SheetStateBinding = {
    field: 'dividerPos',
    key: POPUP_SHEET_KEYS.dividerPos,
    legacyPrefix: 'syh:popup:divider_pos:'
};

/** Зібрані з YouTube коментарі аркуша. Той самий квірк, що й у `dividerPos`. */
const COLLECTED: SheetStateBinding = {
    field: 'collected',
    key: getSheetCollectedStorageKey,
    legacyPrefix: 'syh:popup:collected:'
};

/**
 * Поля аркуша — у порядку розмітки шаблону.
 *
 * Порядок значущий лише для читабельності: рендер проставляє id незалежно,
 * а перелік ключів іде в `chrome.storage.get`, якому порядок байдужий.
 */
export const SHEET_FIELDS: readonly SheetFieldDescriptor[] = [
    // Крок 1 — старий список
    { cssHook: '.js-old-total-count', idPrefix: 'oldTotalCount', kind: 'element' },
    { cssHook: '.js-old-list', idPrefix: 'oldList', kind: 'textarea', value: tg('oldList') },

    // Крок 2 — номери відповідей
    { cssHook: '.js-answered-ids', idPrefix: 'answeredIds', kind: 'text', value: tg('answered') },

    // Крок 3 — новий список у двох колонках
    { cssHook: '.js-tg-total-count-all', idPrefix: 'tgTotalCountAll', kind: 'element' },
    { cssHook: '.js-step3-columns', idPrefix: 'step3Columns', kind: 'element' },
    { cssHook: '.js-step3-left', idPrefix: 'step3Left', kind: 'element' },
    { cssHook: '.js-tg-total-count-left', idPrefix: 'tgTotalCountLeft', kind: 'element' },
    { cssHook: '.js-new-telegram', idPrefix: 'newTelegram', kind: 'textarea', value: tg('newTelegram') },
    { cssHook: '.js-step3-divider', idPrefix: 'step3Divider', kind: 'element', state: [DIVIDER_POS] },
    { cssHook: '.js-step3-right', idPrefix: 'step3Right', kind: 'element' },
    { cssHook: '.js-tg-total-count-right', idPrefix: 'tgTotalCountRight', kind: 'element' },
    { cssHook: '.js-clear-yt-collected', idPrefix: 'clearYTCollected', kind: 'element' },
    { cssHook: '.js-yt-collected-list', idPrefix: 'ytCollectedList', kind: 'element', state: [COLLECTED] },

    // Кнопки дій
    { cssHook: '.js-process-btn', idPrefix: 'processTelegramBtn', kind: 'element' },
    { cssHook: '.js-clear-state-btn', idPrefix: 'clearStateBtn', kind: 'element' },

    // Панель статистики: html відновлюється лише коли панель видима,
    // тому це `state`, а не `value`.
    { cssHook: '.js-stats-bar', idPrefix: 'statsBar', kind: 'html', state: [tg('statsHtml'), tg('statsVisible')] },
    { cssHook: '.js-count-old', idPrefix: 'countOld', kind: 'element' },
    { cssHook: '.js-count-del', idPrefix: 'countDel', kind: 'element' },
    { cssHook: '.js-count-new-left', idPrefix: 'countNewLeft', kind: 'element' },
    { cssHook: '.js-count-new-yt', idPrefix: 'countNewYT', kind: 'element' },
    { cssHook: '.js-count-total', idPrefix: 'countTotal', kind: 'element' },

    // Результат
    { cssHook: '.js-copy-result-btn', idPrefix: 'copyResultBtn', kind: 'element' },
    { cssHook: '.js-final-result-div', idPrefix: 'finalResultDiv', kind: 'html', value: tg('finalResultHtml') },

    // Журнали: лічильник і розкритість мають власну логіку
    // (`popup_sheet_log_restorer.ts`), тому теж `state`.
    {
        cssHook: '.js-deleted-log-details', idPrefix: 'deletedLogDetails', kind: 'element',
        state: [tg('deletedLogDetailsVisible'), tg('deletedLogDetailsOpen')]
    },
    { cssHook: '.js-deleted-log-count', idPrefix: 'deletedLogCount', kind: 'element', state: [tg('deletedLogCount')] },
    { cssHook: '.js-deleted-log', idPrefix: 'deletedLog', kind: 'element', state: [tg('deletedLogHtml')] },
    {
        cssHook: '.js-cleaned-log-details', idPrefix: 'cleanedLogDetails', kind: 'element',
        state: [tg('cleanedLogDetailsVisible'), tg('cleanedLogDetailsOpen')]
    },
    { cssHook: '.js-cleaned-log-count', idPrefix: 'cleanedLogCount', kind: 'element', state: [tg('cleanedLogCount')] },
    { cssHook: '.js-cleaned-log', idPrefix: 'cleanedLog', kind: 'element', state: [tg('cleanedLogHtml')] }
];

/** id елемента поля в конкретному аркуші. */
export function sheetFieldId(descriptor: SheetFieldDescriptor, sheetId: string): string {
    return `${descriptor.idPrefix}__${sheetId}`;
}

/** Пара ключів (канонічний + легасі) однієї прив'язки для конкретного аркуша. */
export function sheetStateKeys(binding: SheetStateBinding, sheetId: string): [string, string] {
    return [binding.key(sheetId), `${binding.legacyPrefix}${sheetId}`];
}

/** Усі прив'язки до сховища — і `value`, і `state` — одним списком. */
export function allSheetStateBindings(): readonly SheetStateBinding[] {
    return SHEET_FIELDS.flatMap(field => [
        ...(field.value ? [field.value] : []),
        ...(field.state ?? [])
    ]);
}

/**
 * Прив'язка за іменем поля стану.
 *
 * Потрібна відновлювачам із власною логікою (статистика, журнали, роздільник):
 * ключі вони беруть звідси, а не вписують удруге. Кидає виняток на невідоме
 * поле — це помилка програміста, і краще побачити її на першому ж тесті.
 */
export function getSheetStateBinding(field: string): SheetStateBinding {
    const found = allSheetStateBindings().find(binding => binding.field === field);
    if (!found) throw new Error(`[SHEET_FIELDS] немає прив'язки для поля «${field}»`);
    return found;
}

/** Поля, значення яких зберігається й відновлюється універсальним кодом. */
export function persistedValueFields(): readonly (SheetFieldDescriptor & { value: SheetStateBinding })[] {
    return SHEET_FIELDS.filter(
        (f): f is SheetFieldDescriptor & { value: SheetStateBinding } => f.value !== undefined
    );
}
