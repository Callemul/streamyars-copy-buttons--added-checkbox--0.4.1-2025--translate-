import type { CommentPayload } from './comment_service';
import type {
    CommentActionDefinition,
    CommentActionId,
    CommentActionStateType,
    CommentStateActionId
} from './comment_actions';

export interface CommentContext {
    id: string;
    author: string;
    text: string;
    videoId?: string;
    videoTitle?: string;
}

/**
 * Стан кнопки коментаря.
 * Джерело — реєстр дій `modules/comment_actions.ts`: union більше не
 * дублюється тут руками (T2 аудиту 2026-09-08).
 */
export type ButtonStateType = CommentActionStateType;

export interface CommentStateCaches {
    buttonStates: Record<string, ButtonStateType>;
    checkboxStates: Record<string, { checked: boolean; timestamp: number }>;
}

export interface PlatformButtons {
    /**
     * Кнопки за канонічним id дії з реєстру — основний спосіб їх віддати.
     * Нова дія в реєстрі підхоплюється без правок цього інтерфейсу.
     */
    actionButtons?: Partial<Record<CommentActionId, HTMLElement | null>>;
    /** @deprecated Історичні іменовані слоти адаптерів YouTube і Studio; новий код віддає `actionButtons`. */
    questionBtn: HTMLElement | null;
    /** @deprecated Див. `actionButtons`. */
    prayerBtn: HTMLElement | null;
    /** @deprecated Див. `actionButtons`. */
    copyBtn: HTMLElement | null;
    checkboxEl: HTMLInputElement | null;
    bodyEl: HTMLElement | null;
}

/**
 * Сумісність із адаптерами, які ще віддають іменовані слоти, а не мапу
 * `actionButtons` (YouTube і Studio). StreamYard уже на мапі.
 */
const LEGACY_BUTTON_SLOTS: Readonly<Record<CommentActionId, keyof PlatformButtons>> = {
    copy: 'copyBtn',
    question: 'questionBtn',
    prayer: 'prayerBtn'
};

/** Кнопка дії: спершу мапа реєстру, потім історичний іменований слот. */
export function getActionButton(buttons: PlatformButtons, id: CommentActionId): HTMLElement | null {
    const fromRegistry = buttons.actionButtons?.[id];
    if (fromRegistry !== undefined) return fromRegistry;

    const legacySlot = LEGACY_BUTTON_SLOTS[id];
    return legacySlot ? (buttons[legacySlot] as HTMLElement | null) ?? null : null;
}

/**
 * Усе, що потрібно платформі, щоб самостійно виконати дію над коментарем.
 * Передається в `CommentPlatformAdapter.runAction` одним об'єктом, щоб додавання
 * поля не ламало сигнатуру реалізацій.
 */
export interface ActionInvocation {
    /** Опис дії з реєстру `modules/comment_actions.ts`. */
    action: CommentActionDefinition;
    /** Подія, що спричинила дію (`click` або `mouseup` — залежить від реєстру). */
    event: Event;
    /** Кнопка, на якій спрацював слухач. */
    button: HTMLElement;
    buttons: PlatformButtons;
    element: Element;
    caches: CommentStateCaches;
}

export interface ActionContext {
    type: ButtonStateType;
    context: CommentContext;
    sheetId: string;
    commentKey: string;
}

export interface CommentPlatformAdapter {
    getCommentContext(element: Element): CommentContext | null;
    getButtons(element: Element): PlatformButtons;
    getSheetId(context: CommentContext, element: Element): string;
    getButtonStatesKey(): string;
    getCheckboxStatesKey(): string;
    applyButtonState(buttons: PlatformButtons, state: ButtonStateType, sheetId: string | null): void;
    getButtonState?(context: CommentContext, commentKey: string, caches: CommentStateCaches): ButtonStateType;
    getCheckboxState?(context: CommentContext, commentKey: string, caches: CommentStateCaches): boolean;
    applyCheckboxState(buttons: PlatformButtons, isChecked: boolean): void;
    markChecked(element: Element, commentKey: string, caches: CommentStateCaches): Promise<void>;
    unmarkChecked?(element: Element, commentKey: string, caches: CommentStateCaches): Promise<void>;
    beforeAction?(type: CommentStateActionId, context: CommentContext, element: Element): Promise<{ sheetId: string } | null>;
    afterAction?(action: ActionContext): Promise<void>;
    /**
     * Повний перехват дії поверхнею.
     *
     * Без цього хука `CommentInjector` іде стандартним конвеєром
     * (`comment_action_runner`: toggle on / untoggle + збережені коментарі аркуша).
     * StreamYard має власну семантику — банер копіювання, база молитов,
     * `data-syh-just-added`, різні іконки за кнопкою миші — і реалізує її тут,
     * замість паралельного конвеєра, який був у StreamYard до T7.
     */
    runAction?(invocation: ActionInvocation): Promise<void> | void;
    /**
     * Перехват перемикання чекбокса «опрацьовано».
     *
     * Без хука інжектор пише стан у `caches.checkboxStates` за ключем коментаря.
     * StreamYard зберігає його інакше (за текстом коментаря, через
     * `CommentService.setStreamYardCheckboxState`), тому перекриває цей крок.
     */
    onCheckboxToggled?(
        element: Element,
        buttons: PlatformButtons,
        isChecked: boolean,
        caches: CommentStateCaches
    ): Promise<void> | void;
    isEventsBound(element: Element): boolean;
    markEventsBound(element: Element): void;
    unmarkEventsBound?(element: Element): void;
    buildCollectedItem(commentKey: string, context: CommentContext, type: CommentStateActionId): CommentPayload;
}

import { CommentService } from './comment_service';

export abstract class BaseCommentPlatformAdapter implements CommentPlatformAdapter {
    abstract getCommentContext(element: Element): CommentContext | null;
    abstract getButtons(element: Element): PlatformButtons;
    abstract getSheetId(context: CommentContext, element: Element): string;
    abstract getButtonStatesKey(): string;
    abstract getCheckboxStatesKey(): string;
    abstract applyButtonState(buttons: PlatformButtons, state: ButtonStateType, sheetId: string | null): void;
    abstract applyCheckboxState(buttons: PlatformButtons, isChecked: boolean): void;
    abstract isEventsBound(element: Element): boolean;
    abstract markEventsBound(element: Element): void;

    public unmarkEventsBound(_element: Element): void {
        // Base implementation: subclasses can override
    }

    public getButtonState(_context: CommentContext, commentKey: string, caches: CommentStateCaches): ButtonStateType {
        return caches.buttonStates[commentKey] || null;
    }

    public getCheckboxState(_context: CommentContext, commentKey: string, caches: CommentStateCaches): boolean {
        return caches.checkboxStates[commentKey]?.checked || false;
    }

    public async markChecked(element: Element, commentKey: string, caches: CommentStateCaches): Promise<void> {
        this.applyCheckboxState(this.getButtons(element), true);
        await CommentService.saveCheckboxState(this.getCheckboxStatesKey(), caches.checkboxStates, commentKey, true);
    }

    public async unmarkChecked(element: Element, commentKey: string, caches: CommentStateCaches): Promise<void> {
        this.applyCheckboxState(this.getButtons(element), false);
        await CommentService.saveCheckboxState(this.getCheckboxStatesKey(), caches.checkboxStates, commentKey, false);
    }

    public async beforeAction(
        _type: CommentStateActionId,
        context: CommentContext,
        element: Element
    ): Promise<{ sheetId: string } | null> {
        const sheetId = this.getSheetId(context, element);
        return sheetId ? { sheetId } : null;
    }

    public async afterAction(_action: ActionContext): Promise<void> {
        // Default no-op
    }

    public buildCollectedItem(commentKey: string, context: CommentContext, type: CommentStateActionId): CommentPayload {
        return {
            id: commentKey,
            author: context.author,
            text: context.text,
            type,
            timestamp: Date.now(),
            videoId: context.videoId,
            videoTitle: context.videoTitle
        };
    }
}
