// modules/streamyard_adapter.ts
//
// АДАПТЕР ПОВЕРХНІ STREAMYARD (T7 аудиту 2026-09-08).
//
// До цього файлу StreamYard був єдиною поверхнею без адаптера: його кліки
// обробляв паралельний конвеєр `modules/event_comments/*` із власним
// document-level делегуванням. Через це в проєкті жили дві різні архітектури
// для однієї задачі, а «додати дію» означало правку в обох.
//
// Тепер поверхня описана так само, як YouTube і Studio: `CommentInjector`
// навішує слухачі за реєстром `modules/comment_actions.ts`, а все, чим
// StreamYard відрізняється, лежить тут:
//
//   • дія спрацьовує на `mouseup`, а не на `click` (реєстр, поле `events`);
//   • 🙏 приймає всі три кнопки миші (реєстр, поле `mouseButtons`), і від
//     кнопки залежить іконка: 🙏🙏🙏 / 🙏❤️🙏 / ❤️❤️❤️;
//   • дія не «перемикається» повторним натисканням і не пише в аркуші —
//     вона зберігає запис у базі молитов/питань і показує банер копіювання;
//   • питання і молитва ставлять `data-syh-just-added` на 2 с, щоб Auto-Heal
//     не прибрав запис, який ще не встиг отримати зірку;
//   • стан чекбокса зберігається за ТЕКСТОМ коментаря в оперативному
//     `SYH_STATE`, а не за ключем коментаря у `chrome.storage`.
//
// Саме тому адаптер перекриває `runAction` і `onCheckboxToggled`: стандартний
// конвеєр `comment_action_runner` (toggle on / untoggle + збережені коментарі
// аркуша) описує іншу поверхню і тут не застосовний.

import { SYH_CONFIG, closestBySelectorValue, queryBySelectorValue, type SelectorValue } from './config';
import { SYH_UI } from './ui';
import { SYH_UTILS } from './utils';
import { CommentService } from './comment_service';
import { SYH_COMMENT_ASSISTANT } from './comment_assistant/index';
import type { SyhUi } from './ui_state';
import type { SyhUtils } from './utils';

import {
    acceptsMouseButton,
    getPlatformActions,
    type CommentActionId
} from './comment_actions';
import {
    BaseCommentPlatformAdapter,
    type ActionInvocation,
    type ButtonStateType,
    type CommentContext,
    type CommentStateCaches,
    type PlatformButtons
} from './comment_platform_adapter';

import type { CommentEffectHost } from './event_comments/types';
import { formatCopyPayload } from './event_comments/formatters';
import { stripLeadingAt } from './event_comments/utils';
import { applyCommentActionState } from './event_comments/actions';
import { saveToDatabase, removeFromDatabase } from './event_comments/database';

/** Контейнер кнопок SYH усередині картки коментаря. */
const BUTTONS_CONTAINER_SELECTOR = '.syh-custom-buttons-comment';
/** Чекбокс «опрацьовано» саме коментаря (а не банера). */
const COMMENT_CHECKBOX_SELECTOR = '.syh-checkbox[data-type="comment"]';
/** Позначка «щойно додано»: захищає запис від проходу Auto-Heal «привиди». */
const JUST_ADDED_ATTR = 'data-syh-just-added';
/** Скільки тримається позначка «щойно додано». */
const JUST_ADDED_TTL_MS = 2000;
/** Маркер «слухачі навішані» — живе на контейнері кнопок, а не на картці. */
const BOUND_ATTR = 'data-syh-events-bound';

/** Залежності, які в тестах підміняються; у продакшні — глобальні фасади. */
export interface StreamYardAdapterDeps {
    selectors?: Record<string, SelectorValue> | null;
    ui?: SyhUi | null;
    utils?: SyhUtils | null;
}

export class StreamYardCommentAdapter extends BaseCommentPlatformAdapter {
    private readonly deps: StreamYardAdapterDeps;

    constructor(deps: StreamYardAdapterDeps = {}) {
        super();
        this.deps = deps;
    }

    private getSelectors(): Record<string, SelectorValue> {
        return this.deps.selectors ?? SYH_CONFIG.SELECTORS;
    }

    private getUi(): SyhUi | null {
        return this.deps.ui !== undefined ? this.deps.ui : SYH_UI;
    }

    private getUtils(): SyhUtils | null {
        return this.deps.utils !== undefined ? this.deps.utils : SYH_UTILS;
    }

    /**
     * Об'єкт, який очікують ефекти дії (`applyCommentActionState` і сусіди).
     * Це той самий набір полів, що раніше давав фасад `SYH_EVENT_COMMENTS`.
     */
    private getEffectHost(): CommentEffectHost {
        const ui = this.getUi();
        return {
            SELECTORS: this.getSelectors(),
            UI: ui,
            UTILS: this.getUtils(),
            saveToDatabase: (author, text, type, icon) => saveToDatabase({ UI: ui }, author, text, type, icon),
            removeFromDatabase: (text) => removeFromDatabase({ UI: ui }, text)
        };
    }

    private getButtonsContainer(element: Element): Element | null {
        return element.querySelector(BUTTONS_CONTAINER_SELECTOR);
    }

    // --- Контекст і кнопки ---

    /**
     * Ключ коментаря на StreamYard — це його текст: саме за ним живе стан
     * чекбокса (`SYH_STATE`) і записи в базі. Порожній текст не є помилкою —
     * картка може ще не мати тексту в момент вставки кнопок, тому контекст
     * повертається завжди, а актуальні author/text читаються в момент дії.
     */
    public getCommentContext(element: Element): CommentContext | null {
        const selectors = this.getSelectors();
        const text = queryBySelectorValue(selectors.commentText, element)?.textContent || '';
        const author = stripLeadingAt(queryBySelectorValue(selectors.commentAuthor, element)?.textContent);

        return { id: text, author, text };
    }

    /**
     * Кнопки добираються за `data-action` із реєстру — нова дія підхоплюється
     * без правок цього файлу.
     *
     * `bodyEl` навмисно `null`: на StreamYard ПКМ по картці нічого не перемикає
     * (це робить лише ПКМ по кнопках платформи, див. `handlers/context_menu.ts`),
     * тож контекстне меню картки лишається браузерним.
     */
    public getButtons(element: Element): PlatformButtons {
        const actionButtons: Partial<Record<CommentActionId, HTMLElement | null>> = {};

        for (const action of getPlatformActions('streamyard')) {
            const domAction = action.platforms.streamyard?.domAction;
            if (!domAction) continue;
            actionButtons[action.id] = element.querySelector<HTMLElement>(
                `.syh-button[data-action="${domAction}"]`
            );
        }

        return {
            actionButtons,
            questionBtn: actionButtons.question ?? null,
            prayerBtn: actionButtons.prayer ?? null,
            copyBtn: actionButtons.copy ?? null,
            checkboxEl: element.querySelector<HTMLInputElement>(COMMENT_CHECKBOX_SELECTOR),
            bodyEl: null
        };
    }

    // --- Частини контракту, яких StreamYard не використовує ---

    /**
     * StreamYard не розкладає коментарі по аркушах: записи йдуть у спільну
     * базу молитов/питань із `roomId` кімнати. Порожній рядок означає
     * «аркуш тут не застосовний» — і стандартний конвеєр із ним не запускається.
     */
    public getSheetId(_context: CommentContext, _element: Element): string {
        return '';
    }

    /** Стан кнопок StreamYard не персиститься за ключами — див. `applyButtonState`. */
    public getButtonStatesKey(): string {
        return '';
    }

    /** Стан чекбокса живе в оперативному `SYH_STATE`, а не в `chrome.storage`. */
    public getCheckboxStatesKey(): string {
        return '';
    }

    /**
     * Візуальний стан коментаря на StreamYard — це мітка `data-syh-type`, яку
     * ставить `SYH_UI.updateCommentVisuals` у момент дії (`action_marking`).
     * Окремого «підсвічування кнопки» тут немає, тому метод нічого не робить.
     */
    public applyButtonState(_buttons: PlatformButtons, _state: ButtonStateType, _sheetId: string | null): void {
        // Поверхня не має стану кнопки — див. коментар вище.
    }

    public applyCheckboxState(buttons: PlatformButtons, isChecked: boolean): void {
        const checkbox = buttons.checkboxEl;
        if (!checkbox) return;
        checkbox.checked = isChecked;
    }

    // --- Стан «опрацьовано» ---

    private syncCheckboxState(element: Element, isChecked: boolean): void {
        const textKey = queryBySelectorValue(this.getSelectors().commentText, element)?.textContent || '';
        CommentService.setStreamYardCheckboxState(textKey, isChecked);
        SYH_COMMENT_ASSISTANT.processComment(element);
    }

    /**
     * Перемикання чекбокса користувачем.
     * Поведінка 1-в-1 з колишнім делегованим `handleCheckboxChange`:
     * стан пишеться за текстом коментаря, далі картку переобробляє асистент.
     */
    public onCheckboxToggled(element: Element, _buttons: PlatformButtons, isChecked: boolean): void {
        this.syncCheckboxState(element, isChecked);
    }

    public override async markChecked(element: Element, _commentKey: string, _caches: CommentStateCaches): Promise<void> {
        this.applyCheckboxState(this.getButtons(element), true);
        this.syncCheckboxState(element, true);
    }

    public override async unmarkChecked(element: Element, _commentKey: string, _caches: CommentStateCaches): Promise<void> {
        this.applyCheckboxState(this.getButtons(element), false);
        this.syncCheckboxState(element, false);
    }

    // --- Прив'язка слухачів ---

    /**
     * Маркер живе на контейнері кнопок, а не на картці коментаря.
     *
     * StreamYard перемальовує вміст картки: якщо позначити саму картку, після
     * перемальовування кнопки з'являться заново, а маркер лишиться — і кнопки
     * будуть без слухачів. Контейнер зникає разом із кнопками, тож стан
     * прив'язки завжди відповідає реальності.
     */
    public isEventsBound(element: Element): boolean {
        return this.getButtonsContainer(element)?.getAttribute(BOUND_ATTR) === 'true';
    }

    public markEventsBound(element: Element): void {
        this.getButtonsContainer(element)?.setAttribute(BOUND_ATTR, 'true');
    }

    public override unmarkEventsBound(element: Element): void {
        this.getButtonsContainer(element)?.removeAttribute(BOUND_ATTR);
    }

    // --- Дія над коментарем ---

    /**
     * Повний перехват дії: StreamYard має власну семантику, описану у шапці файлу.
     *
     * Порядок ефектів збережено 1-в-1 з колишнього `handleSyhButtonMouseUp`:
     * `preventDefault` → фільтр кнопки миші → пошук картки → читання автора й
     * тексту → `data-syh-just-added` → формування payload → `applyCommentActionState`.
     */
    public async runAction(invocation: ActionInvocation): Promise<void> {
        const { action, event, button, element } = invocation;
        const mouseEvent = event as MouseEvent;

        // `preventDefault` — до фільтра кнопки миші: коліщатко по будь-якій
        // нашій кнопці не має вмикати автоскрол, навіть якщо дія його ігнорує.
        if (typeof mouseEvent.preventDefault === 'function') mouseEvent.preventDefault();

        const mouseButton = typeof mouseEvent.button === 'number' ? mouseEvent.button : 0;
        if (!acceptsMouseButton('streamyard', action.id, mouseButton)) return;

        const selectors = this.getSelectors();
        const commentBlock = closestBySelectorValue(button, selectors.commentBlock) ?? element;
        if (!commentBlock) return;

        const author = stripLeadingAt(queryBySelectorValue(selectors.commentAuthor, commentBlock)?.textContent);
        const commentText = queryBySelectorValue(selectors.commentText, commentBlock)?.textContent || '';

        // Дії зі станом (питання, молитва) створюють запис у базі — позначаємо
        // картку, щоб прохід Auto-Heal «привиди» не прибрав її до появи зірки.
        if (action.stateType !== null) {
            commentBlock.setAttribute(JUST_ADDED_ATTR, 'true');
            setTimeout(() => { commentBlock.removeAttribute(JUST_ADDED_ATTR); }, JUST_ADDED_TTL_MS);
        }

        const domAction = action.platforms.streamyard?.domAction;
        const payload = formatCopyPayload(domAction, author, commentText, mouseButton);

        applyCommentActionState(this.getEffectHost(), payload, author, commentText, commentBlock);
    }
}
