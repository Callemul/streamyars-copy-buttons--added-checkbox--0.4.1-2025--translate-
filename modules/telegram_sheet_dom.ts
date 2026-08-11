/**
 * StreamYard Helper — знімок DOM-стану вкладки Telegram у попапі.
 *
 * ⚠️ Це ЄДИНА частина колишнього `telegram_parser.ts`, що торкається DOM.
 * Її винесено сюди, щоб парсери (`telegram_old_*`, `telegram_line_export`,
 * `telegram_text_rules`) залишились справді чистими, як і обіцяв заголовок
 * старого модуля.
 */

/** Повний зріз того, що показано на одному аркуші вкладки Telegram. */
export interface TelegramSheetDOMState {
    finalResultHtml: string;
    statsHtml: string;
    statsVisible: boolean;
    deletedLogHtml: string;
    deletedLogCount: number;
    deletedLogDetailsVisible: boolean;
    deletedLogDetailsOpen: boolean;
    cleanedLogHtml: string;
    cleanedLogCount: number;
    cleanedLogDetailsVisible: boolean;
    cleanedLogDetailsOpen: boolean;
}

/** Читач елементів за id; за замовчуванням — глобальний `document`. */
export type ElementReader = (id: string) => HTMLElement | null;

const defaultElementReader: ElementReader = (id) =>
    (typeof document !== 'undefined' ? document.getElementById(id) : null);

/**
 * Збирає стан аркуша для збереження/відновлення.
 *
 * Лічильники передаються ззовні (вони живуть у стані попапу, а не в DOM)
 * і мають дефолт `0`, щоб не ламати історичних викликачів.
 */
export function collectTelegramSheetStateFromDOM(
    sheetId: string,
    deletedLogCount: number = 0,
    cleanedLogCount: number = 0,
    getElementByIdFn: ElementReader = defaultElementReader
): TelegramSheetDOMState {
    const outputDiv = getElementByIdFn(`finalResultDiv__${sheetId}`);
    const statsBar = getElementByIdFn(`statsBar__${sheetId}`);
    const deletedLogDiv = getElementByIdFn(`deletedLog__${sheetId}`);
    const cleanedLogDiv = getElementByIdFn(`cleanedLog__${sheetId}`);
    const deletedLogDetails = getElementByIdFn(`deletedLogDetails__${sheetId}`) as HTMLDetailsElement | null;
    const cleanedLogDetails = getElementByIdFn(`cleanedLogDetails__${sheetId}`) as HTMLDetailsElement | null;

    return {
        finalResultHtml: outputDiv?.innerHTML || '',
        statsHtml: statsBar?.innerHTML || '',
        statsVisible: statsBar ? statsBar.style.display !== 'none' : false,
        deletedLogHtml: deletedLogDiv?.innerHTML || '',
        deletedLogCount,
        deletedLogDetailsVisible: true,
        deletedLogDetailsOpen: deletedLogDetails?.open || false,
        cleanedLogHtml: cleanedLogDiv?.innerHTML || '',
        cleanedLogCount,
        cleanedLogDetailsVisible: true,
        cleanedLogDetailsOpen: cleanedLogDetails?.open || false
    };
}
