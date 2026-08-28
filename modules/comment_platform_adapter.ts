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
    unmarkEventsBound?(element: Element): void;
    buildCollectedItem(commentKey: string, context: CommentContext, type: 'question' | 'prayer'): CommentPayload;
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

    public async markChecked(element: Element, commentKey: string, caches: CommentStateCaches): Promise<void> {
        this.applyCheckboxState(this.getButtons(element), true);
        await CommentService.saveCheckboxState(this.getCheckboxStatesKey(), caches.checkboxStates, commentKey, true);
    }

    public async unmarkChecked(element: Element, commentKey: string, caches: CommentStateCaches): Promise<void> {
        this.applyCheckboxState(this.getButtons(element), false);
        await CommentService.saveCheckboxState(this.getCheckboxStatesKey(), caches.checkboxStates, commentKey, false);
    }

    public async beforeAction(
        _type: 'question' | 'prayer',
        context: CommentContext,
        element: Element
    ): Promise<{ sheetId: string } | null> {
        const sheetId = this.getSheetId(context, element);
        return sheetId ? { sheetId } : null;
    }

    public async afterAction(_action: ActionContext): Promise<void> {
        // Default no-op
    }

    public buildCollectedItem(commentKey: string, context: CommentContext, type: 'question' | 'prayer'): CommentPayload {
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
