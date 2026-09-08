/**
 * StreamYard Helper — сховище зібраних коментарів по аркушах.
 *
 * Виокремлено з `comment_service.ts`. Єдине джерело правди для списку
 * `syh:popup:collected:<sheetId>`: будь-яка зміна списку проходить через
 * `updateCollectedList`, який атомарно перечитує сховище, застосовує
 * оновлювач і одразу емітить `SHEET_DATA_PROCESSED` з перерахованими
 * лічильниками. Це не дає лічильникам у попапі розʼїхатися зі сховищем.
 */
import { SYH_STORAGE, STORAGE_KEYS, getSheetCollectedStorageKey } from './storage';
import { SYH_BUS } from './event_bus';
import type { CommentPayload, ButtonStateValue } from './comment_types';

/**
 * Дублем вважається збіг за `id` АБО повний збіг трійки автор+текст+тип.
 * Друга умова ловить один і той самий коментар, зібраний із різних платформ,
 * де `id` формується по-різному.
 */
function isSameComment(item: CommentPayload, candidate: CommentPayload): boolean {
    return item.id === candidate.id ||
        (item.author === candidate.author && item.text === candidate.text && item.type === candidate.type);
}

/** Читає список аркуша, застосовує оновлювач, зберігає та сповіщає підписників. */
async function updateCollectedList(
    sheetId: string,
    updater: (list: CommentPayload[]) => CommentPayload[]
): Promise<CommentPayload[]> {
    const storageKey = getSheetCollectedStorageKey(sheetId);
    const result = await SYH_STORAGE.getAsync<Record<string, CommentPayload[]>>([storageKey]);
    const list = result[storageKey] || [];
    const updated = updater(list);

    await SYH_STORAGE.setAsync({ [storageKey]: updated });
    emitSheetTotals(sheetId, updated);
    return updated;
}

/** Єдине місце, де рахуються підсумки аркуша для шини подій. */
function emitSheetTotals(sheetId: string, list: CommentPayload[]): void {
    SYH_BUS.emit('SHEET_DATA_PROCESSED', {
        sheetId,
        totalQuestions: list.filter(i => i.type === 'question').length,
        totalPrayers: list.filter(i => i.type === 'prayer').length
    });
}

/** Зберігає коментар: оновлює дубль на місці або кладе новий на початок списку. */
export async function saveCollectedComment(
    sheetId: string,
    comment: CommentPayload
): Promise<CommentPayload[]> {
    return updateCollectedList(sheetId, (list) => {
        const index = list.findIndex(item => isSameComment(item, comment));

        return index >= 0
            ? list.map((item, idx) => idx === index ? comment : item)
            : [comment, ...list];
    });
}

/** Стани кнопок коментарів так, як їх описує схема сховища. */
type ButtonStateMap = Record<string, ButtonStateValue>;

/** Знімає стани кнопок YouTube/Studio для перелічених коментарів (мутує на місці). */
function dropButtonStates(states: ButtonStateMap, commentIds: string[]): ButtonStateMap {
    commentIds.forEach(id => { delete states[id]; });
    return states;
}

/**
 * Видаляє коментар за `id` або за парою автор+текст, якщо вони передані,
 * та скидає стани кнопок YouTube/Studio для видалених елементів.
 */
export async function removeCollectedComment(
    sheetId: string,
    commentId: string,
    author?: string,
    text?: string
): Promise<CommentPayload[]> {
    const storageKey = getSheetCollectedStorageKey(sheetId);
    // Без явного параметра типу: діє схема сховища (T17), тож стани кнопок
    // приходять типізованими, а не як `any`.
    const result = await SYH_STORAGE.getAsync([
        storageKey,
        STORAGE_KEYS.YT_BUTTON_STATES,
        STORAGE_KEYS.STUDIO_BUTTON_STATE
    ]);

    const list: CommentPayload[] = result[storageKey] || [];
    const idsToRemove = new Set<string>();
    if (commentId) {
        idsToRemove.add(commentId);
    }

    const updated = list.filter(item => {
        const isMatch = item.id === commentId ||
            Boolean(author && text && item.author === author && item.text === text);
        if (isMatch && item.id) {
            idsToRemove.add(item.id);
        }
        return !isMatch;
    });

    const commentIds = Array.from(idsToRemove);
    const ytBtnStates: ButtonStateMap = result[STORAGE_KEYS.YT_BUTTON_STATES] || {};
    const studioBtnStates: ButtonStateMap = result[STORAGE_KEYS.STUDIO_BUTTON_STATE] || {};
    dropButtonStates(ytBtnStates, commentIds);
    dropButtonStates(studioBtnStates, commentIds);

    await SYH_STORAGE.setAsync({
        [storageKey]: updated,
        [STORAGE_KEYS.YT_BUTTON_STATES]: ytBtnStates,
        [STORAGE_KEYS.STUDIO_BUTTON_STATE]: studioBtnStates
    });

    emitSheetTotals(sheetId, updated);
    return updated;
}

/**
 * Повне очищення аркуша: список обнуляється, а стани кнопок YT/Studio для його
 * коментарів знімаються, щоб кнопки не лишилися візуально «зібраними».
 */
export async function clearAllCollectedForSheet(sheetId: string): Promise<void> {
    const storageKey = getSheetCollectedStorageKey(sheetId);
    const result = await SYH_STORAGE.getAsync([
        storageKey,
        STORAGE_KEYS.YT_BUTTON_STATES,
        STORAGE_KEYS.STUDIO_BUTTON_STATE
    ]);

    const items: CommentPayload[] = result[storageKey] || [];
    const commentIds = items.map(item => item.id);

    const ytBtnStates: ButtonStateMap = result[STORAGE_KEYS.YT_BUTTON_STATES] || {};
    const studioBtnStates: ButtonStateMap = result[STORAGE_KEYS.STUDIO_BUTTON_STATE] || {};

    await SYH_STORAGE.setAsync({
        [storageKey]: [],
        [STORAGE_KEYS.YT_BUTTON_STATES]: dropButtonStates(ytBtnStates, commentIds),
        [STORAGE_KEYS.STUDIO_BUTTON_STATE]: dropButtonStates(studioBtnStates, commentIds)
    });

    emitSheetTotals(sheetId, []);
}
