import type { CommentPayload } from './comment_service';

export interface CommentContext {
    id: string;
    author: string;
    text: string;
    videoId?: string;
    videoTitle?: string;
}

export type ButtonStateType = 'question' | 'prayer' | null;

export interface CommentStateCaches {
    buttonStates: Record<string, ButtonStateType>;
    checkboxStates: Record<string, { checked: boolean; timestamp: number }>;
}

export interface PlatformButtons {
    questionBtn: HTMLElement | null;
    prayerBtn: HTMLElement | null;
    copyBtn: HTMLElement | null;
    checkboxEl: HTMLInputElement | null;
    bodyEl: HTMLElement | null;
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
    applyCheckboxState(buttons: PlatformButtons, isChecked: boolean): void;
    markChecked(element: Element, commentKey: string, caches: CommentStateCaches): Promise<void>;
    unmarkChecked?(element: Element, commentKey: string, caches: CommentStateCaches): Promise<void>;
    beforeAction?(type: 'question' | 'prayer', context: CommentContext, element: Element): Promise<{ sheetId: string } | null>;
    afterAction?(action: ActionContext): Promise<void>;
    isEventsBound(element: Element): boolean;
    markEventsBound(element: Element): void;
    buildCollectedItem(commentKey: string, context: CommentContext, type: 'question' | 'prayer'): CommentPayload;
}
