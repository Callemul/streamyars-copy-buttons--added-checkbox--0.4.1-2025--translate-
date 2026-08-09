// modules/comment_action_runner.ts
//
// Винесено з `CommentInjector.handleAction` — CRAP-хотспота за звітом Fallow
// (cyclomatic 13, cognitive 17, 85 LOC в одному тілі). Функція поєднувала
// чотири незалежні обов'язки: визначення sheetId, читання поточного стану
// кнопки, гілку вимкнення та гілку увімкнення.
//
// Тут вони розділені на самостійні одиниці, що приймають адаптер і кеші
// явними аргументами (замість `this`), тож кожну можна тестувати окремо —
// див. tests/comment_injector.test.js.
//
// ⚠️ Порядок побічних ефектів збережено 1-в-1 з оригіналом: він зафіксований
// характеризаційними тестами (№13 і №22) і на нього спираються адаптери
// StreamYard/YouTube/Studio.

import { CommentService } from './comment_service';
import { SYH_BUS } from './event_bus';
import type {
    ButtonStateType,
    CommentContext,
    CommentPlatformAdapter,
    CommentStateCaches,
    PlatformButtons
} from './comment_platform_adapter';

/** Спільні дані одного проходу дії — щоб не тягати 6 позиційних аргументів. */
interface ActionScope {
    adapter: CommentPlatformAdapter;
    caches: CommentStateCaches;
    buttons: PlatformButtons;
    element: Element;
    ctx: CommentContext;
    commentKey: string;
    sheetId: string;
}

/**
 * Визначає аркуш для дії.
 *
 * `beforeAction` (якщо адаптер його має) є єдиним джерелом істини і може
 * скасувати дію, повернувши `null` або порожній `sheetId` — саме так Studio
 * скасовує збереження, коли категорію відео не вдалося визначити.
 * Без `beforeAction` використовується синхронний `getSheetId`.
 *
 * @returns `null`, якщо дію треба скасувати.
 */
export async function resolveActionSheetId(
    adapter: CommentPlatformAdapter,
    type: 'question' | 'prayer',
    ctx: CommentContext,
    element: Element
): Promise<string | null> {
    if (adapter.beforeAction) {
        const preResult = await adapter.beforeAction(type, ctx, element);
        // beforeAction повернув null (напр. категорія не визначена) — скасовуємо дію
        if (!preResult || !preResult.sheetId) return null;
        return preResult.sheetId;
    }

    return adapter.getSheetId(ctx, element) || null;
}

/**
 * Поточний стан кнопки коментаря.
 * Адаптер може перевизначити читання (Studio робить це для fallback-резолюції),
 * інакше стан береться з локального кешу.
 */
export function readCurrentButtonState(
    adapter: CommentPlatformAdapter,
    ctx: CommentContext,
    commentKey: string,
    caches: CommentStateCaches
): ButtonStateType {
    return adapter.getButtonState
        ? adapter.getButtonState(ctx, commentKey, caches)
        : (caches.buttonStates[commentKey] || null);
}

/** Знімає позначку «опрацьовано»: через хук адаптера або прямим записом у сховище. */
async function clearCheckedState(scope: ActionScope): Promise<void> {
    const { adapter, caches, element, commentKey } = scope;

    if (adapter.unmarkChecked) {
        await adapter.unmarkChecked(element, commentKey, caches);
        return;
    }

    await CommentService.saveCheckboxState(
        adapter.getCheckboxStatesKey(),
        caches.checkboxStates,
        commentKey,
        false
    );
}

/**
 * Гілка ВИМКНЕННЯ — повторне натискання тієї самої активної кнопки.
 * Скидає стан кнопки, прибирає коментар зі зібраних і знімає чекбокс.
 * Свідомо НЕ емітує `COMMENT_ACTION` і не чіпає буфер обміну.
 */
export async function runUntoggleAction(scope: ActionScope): Promise<void> {
    const { adapter, caches, buttons, ctx, commentKey, sheetId } = scope;

    await CommentService.saveButtonState(
        adapter.getButtonStatesKey(),
        caches.buttonStates,
        commentKey,
        null
    );
    adapter.applyButtonState(buttons, null, sheetId);

    await CommentService.removeCollectedComment(sheetId, commentKey, ctx.author, ctx.text);

    adapter.applyCheckboxState(buttons, false);
    await clearCheckedState(scope);

    if (adapter.afterAction) {
        await adapter.afterAction({ type: null, context: ctx, sheetId, commentKey });
    }
}

/**
 * Гілка УВІМКНЕННЯ — коментар копіюється в буфер, позначається типом,
 * зберігається у зібрані та позначається як опрацьований.
 */
export async function runToggleOnAction(
    scope: ActionScope,
    type: 'question' | 'prayer'
): Promise<void> {
    const { adapter, caches, buttons, element, ctx, commentKey, sheetId } = scope;

    const formatted = CommentService.formatForClipboard(ctx.author, ctx.text);
    await CommentService.copyToClipboard(formatted);

    adapter.applyButtonState(buttons, type, sheetId);

    await CommentService.saveButtonState(
        adapter.getButtonStatesKey(),
        caches.buttonStates,
        commentKey,
        type
    );

    const item = adapter.buildCollectedItem(commentKey, ctx, type);
    await CommentService.saveCollectedComment(sheetId, item);

    await adapter.markChecked(element, commentKey, caches);

    if (adapter.afterAction) {
        await adapter.afterAction({ type, context: ctx, sheetId, commentKey });
    }

    SYH_BUS.emit('COMMENT_ACTION', {
        type: type === 'prayer' ? 'prayer' : 'question',
        author: ctx.author,
        text: ctx.text
    });
}

/**
 * Оркестратор дії «Питання»/«Молитва»: резолвить аркуш, читає поточний стан
 * і делегує у відповідну гілку. Тихо виходить, якщо контекст або аркуш
 * недоступні — так само, як робив оригінальний `handleAction`.
 */
export async function runCommentAction(
    adapter: CommentPlatformAdapter,
    caches: CommentStateCaches,
    type: 'question' | 'prayer',
    buttons: PlatformButtons,
    element: Element
): Promise<void> {
    const ctx = adapter.getCommentContext(element);
    if (!ctx) return;

    const commentKey = ctx.id;

    const sheetId = await resolveActionSheetId(adapter, type, ctx, element);
    if (!sheetId) return;

    const scope: ActionScope = { adapter, caches, buttons, element, ctx, commentKey, sheetId };

    const isUntoggle = readCurrentButtonState(adapter, ctx, commentKey, caches) === type;

    if (isUntoggle) {
        await runUntoggleAction(scope);
        return;
    }

    await runToggleOnAction(scope, type);
}
