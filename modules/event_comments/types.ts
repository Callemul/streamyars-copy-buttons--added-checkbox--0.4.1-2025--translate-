import type { CommentActionId } from '../comment_actions';

import type { SyhConfig, SelectorValue } from '../config';
import type { SyhState } from '../state';
import type { SyhUtils } from '../utils';
import type { SyhUi } from '../ui';

/** Аліас на канонічний union із реєстру дій (`modules/comment_actions.ts`). */
export type CommentActionType = CommentActionId;

/**
 * Результат `formatCopyPayload`.
 *
 * Дискримінована унія замість одного інтерфейсу з `actionType: ... | null`:
 * «порожній» payload завжди має порожній `textToCopy`, тому стандартна перевірка
 * `if (payload.textToCopy)` сама звужує тип до варіанта з ненульовим `actionType`.
 * Це прибирає `TS2322` на `SYH_BUS.emit('COMMENT_ACTION', ...)` без приведень типів
 * і без жодної зміни рантайму (форма об'єктів та сама).
 */
export type CopyPayload =
    | {
        header: string;
        textToCopy: string;
        actionType: CommentActionType;
        prayerIcon?: string;
    }
    | {
        header: '';
        textToCopy: '';
        actionType: null;
    };

/** Варіант `CopyPayload`, у якому є що копіювати, а отже — гарантовано є `actionType`. */
export type CopyablePayload = Extract<CopyPayload, { actionType: CommentActionType }>;

/**
 * Мінімальний структурний контракт спостерігача, який тримає `bindAutoHealScanner`.
 * Модуль користується лише `disconnect()`, тож ширший тип тут не потрібен.
 */
export interface AutoHealObserver {
    disconnect(): void;
}

export interface SyhEventComments {
    SELECTORS: Record<string, SelectorValue> | null;
    STATE: SyhState | null;
    UTILS: SyhUtils | null;
    UI: SyhUi | null;
    TIMINGS: Record<string, number> | null;
    isBound: boolean;
    unregisterAutoHeal?: (() => void) | null;
    _clickHandler?: (e: MouseEvent) => void;
    _middleClickHandler?: (e: MouseEvent) => void;
    _contextHandler?: (e: MouseEvent) => void;
    _changeHandler?: (e: Event) => void;
    _syhButtonMouseDownHandler?: (e: MouseEvent) => void;
    _mouseupHandler?: (e: MouseEvent) => void;
    _copyPrayerContextHandler?: (e: MouseEvent) => void;
    autoHealObserver?: AutoHealObserver | null;

    init(config?: SyhConfig, state?: SyhState, utils?: SyhUtils, ui?: SyhUi): void;
    bindEvents(): void;
    destroy(): void;

    // Реекспорт standalone-біндерів із `./auto_heal` та `./handlers`.
    // Це не методи: фасад віддає ті самі функції без обгортки, тому вони
    // приймають екземпляр явним аргументом (`bindStarButtonClickHandler(self)`).
    bindAutoHealScanner: (self: SyhEventComments) => void;
    bindStarButtonClickHandler: (self: SyhEventComments) => void;
    bindMiddleClickHandler: (self: SyhEventComments) => void;
    bindContextMenuHandlers: (self: SyhEventComments) => void;
    bindSyhButtonMouseHandlers: (self: SyhEventComments) => void;
    bindCheckboxChangeHandler: (self: SyhEventComments) => void;

    saveToDatabase(author: string, text: string, type: string, icon: string): Promise<void>;
    removeFromDatabase(text: string): Promise<void>;
}
