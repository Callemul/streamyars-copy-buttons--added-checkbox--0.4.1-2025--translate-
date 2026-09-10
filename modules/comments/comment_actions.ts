// modules/comment_actions.ts
//
// ЄДИНИЙ РЕЄСТР ДІЙ НАД КОМЕНТАРЕМ (SSOT).
//
// До появи цього файлу та сама трійка дій (копіювати / до питань / до молитов)
// описувалась незалежно на трьох поверхнях:
//   - StreamYard   — `modules/ui_comments.ts`        (`copy-comment`, `copy-author-comment`, `copy-prayer`)
//   - YouTube      — `youtube/yt_comment_panel.ts`   (`copy-comment`, `add-question`, `add-prayer`)
//   - YouTube Studio — `youtube/studio/studio_ui.ts` (`studio-copy`, `studio-question`, `studio-prayer`)
// Через це «додати кнопку» означало правки в 10 місцях, і кнопка з'являлась
// лише там, де про неї згадали (аудит 2026-09-08, T1).
//
// Тепер дія описується ТУТ і тільки тут. Поверхня додає лише свої відмінності
// (історичне значення `data-action`, іконку, підпис, CSS-класи, порядок).
//
// Модуль навмисно без DOM і без залежностей від сервісів — це чиста таблиця,
// тому його можна імпортувати з будь-якого шару без ризику циклів.

import type { ButtonConfig } from '../ui_factory';

/** Поверхні, на яких показується панель дій над коментарем. */
export type CommentPlatformId = 'streamyard' | 'youtube' | 'studio';

/** Канонічні ідентифікатори дій. Нова дія додається сюди і в `COMMENT_ACTIONS`. */
export type CommentActionId = 'copy' | 'question' | 'prayer';

/**
 * Стан, який дія лишає в кеші кнопок коментаря.
 * `null` — дія не змінює стану (копіювання).
 *
 * Це джерело для `ButtonStateType`: раніше union `'question' | 'prayer' | null`
 * був вписаний руками у 16 файлах.
 */
export type CommentActionStateType = 'question' | 'prayer' | null;

/**
 * Дії, які лишають стан на кнопці (усе, крім копіювання).
 * Саме цей union раніше був вписаний руками у 16 файлах.
 */
export type CommentStateActionId = Exclude<CommentActionStateType, null>;

/** Чим конкретна поверхня відрізняється від канонічного опису дії. */
export interface CommentActionPlatformOverride {
    /**
     * Значення `data-action` у DOM цієї поверхні.
     * Історичні імена збережено 1-в-1: на них зав'язані наявні обробники,
     * контекстне меню та тести.
     */
    domAction: string;
    /** Іконка (або текстовий підпис — YouTube використовує саме текст). */
    icon?: string;
    title?: string;
    className?: string;
    /** `data-type` кнопки; StreamYard добирає кнопки селектором `[data-type="comment"]`. */
    type?: string;
    /**
     * DOM-події, на які реагує кнопка цієї поверхні. За замовчуванням — `['click']`.
     *
     * StreamYard історично слухає `mouseup`, бо для 🙏 має значення, якою кнопкою
     * миші натиснули (ЛКМ / коліщатко / ПКМ). Це саме та відмінність поверхні,
     * заради якої існує реєстр: `CommentInjector` більше не має знати про неї.
     */
    events?: readonly string[];
    /**
     * Кнопки миші, які дія приймає (`0` — ЛКМ, `1` — коліщатко, `2` — ПКМ).
     * За замовчуванням — тільки ЛКМ.
     *
     * Значуще лише для поверхонь, що слухають `mouseup`: на StreamYard від
     * кнопки миші залежить іконка молитви (🙏🙏🙏 / 🙏❤️🙏 / ❤️❤️❤️), тому
     * правило живе поряд із підписом, який його документує.
     */
    mouseButtons?: readonly number[];
}

export interface CommentActionDefinition {
    id: CommentActionId;
    stateType: CommentActionStateType;
    /** Дефолтні іконка й підпис, якщо поверхня не перекриває їх. */
    icon: string;
    title: string;
    /** `null` означає, що дія на цій поверхні свідомо відсутня. */
    platforms: Readonly<Record<CommentPlatformId, CommentActionPlatformOverride | null>>;
}

/** Кнопки миші, які дія приймає за замовчуванням: лише ЛКМ. */
export const DEFAULT_ACTION_MOUSE_BUTTONS: readonly number[] = [0];

/** Усі три кнопки миші — StreamYard-молитва розрізняє їх за іконкою. */
const ALL_MOUSE_BUTTONS: readonly number[] = [0, 1, 2];

/** Події, на які реагують кнопки коментаря за замовчуванням. */
export const DEFAULT_ACTION_EVENTS: readonly string[] = ['click'];

/**
 * StreamYard слухає `mouseup`, а не `click`: тип молитви (🙏🙏🙏 / 🙏❤️🙏 / ❤️❤️❤️)
 * визначається кнопкою миші, а `click` не розрізняє коліщатко і ПКМ.
 */
const STREAMYARD_ACTION_EVENTS: readonly string[] = ['mouseup'];

/**
 * Реєстр дій. Значення перенесені 1-в-1 із трьох колишніх описів —
 * жоден підпис, жодна іконка й жоден `data-action` не змінені.
 */
export const COMMENT_ACTIONS: ReadonlyArray<CommentActionDefinition> = [
    {
        id: 'copy',
        stateType: null,
        icon: '📄',
        title: 'Копіювати тільки коментар',
        platforms: {
            streamyard: {
                domAction: 'copy-comment',
                type: 'comment',
                events: STREAMYARD_ACTION_EVENTS
            },
            youtube: {
                domAction: 'copy-comment',
                title: 'Копіювати текст коментаря (@автор\\n\\nтекст)',
                className: 'syh-yt-btn-copy'
            },
            studio: {
                domAction: 'studio-copy',
                icon: '📋',
                title: 'Скопіювати автора та текст коментаря в буфер',
                className: 'syh-studio-btn syh-studio-btn-copy'
            }
        }
    },
    {
        id: 'question',
        stateType: 'question',
        icon: '❓',
        title: 'Додати до питань',
        platforms: {
            streamyard: {
                domAction: 'copy-author-comment',
                title: 'Відмітити як Питання',
                type: 'comment',
                events: STREAMYARD_ACTION_EVENTS
            },
            youtube: {
                domAction: 'add-question',
                icon: 'Додати до питань',
                className: 'syh-yt-btn syh-yt-btn-question'
            },
            studio: {
                domAction: 'studio-question',
                className: 'syh-studio-btn syh-studio-btn-question'
            }
        }
    },
    {
        id: 'prayer',
        stateType: 'prayer',
        icon: '🙏',
        title: 'Додати до молитов',
        platforms: {
            streamyard: {
                domAction: 'copy-prayer',
                title: 'ЛКМ: 🙏🙏🙏 | Коліщатко: 🙏❤️🙏 | ПКМ: ❤️❤️❤️',
                type: 'comment',
                events: STREAMYARD_ACTION_EVENTS,
                mouseButtons: ALL_MOUSE_BUTTONS
            },
            youtube: {
                domAction: 'add-prayer',
                icon: 'Додати до молитов',
                className: 'syh-yt-btn syh-yt-btn-prayer'
            },
            studio: {
                domAction: 'studio-prayer',
                className: 'syh-studio-btn syh-studio-btn-prayer'
            }
        }
    }
];

/**
 * Порядок кнопок у панелі кожної поверхні.
 * Він історично різний, тому лишається явним, а не виводиться з реєстру.
 */
export const PLATFORM_ACTION_ORDER: Readonly<Record<CommentPlatformId, ReadonlyArray<CommentActionId>>> = {
    streamyard: ['copy', 'question', 'prayer'],
    youtube: ['question', 'prayer', 'copy'],
    studio: ['copy', 'question', 'prayer']
};

const ACTIONS_BY_ID = new Map<CommentActionId, CommentActionDefinition>(
    COMMENT_ACTIONS.map(action => [action.id, action])
);

/** Опис дії за канонічним id. */
export function getCommentAction(id: CommentActionId): CommentActionDefinition | undefined {
    return ACTIONS_BY_ID.get(id);
}

/** Дії конкретної поверхні у порядку їх появи в панелі. */
export function getPlatformActions(platform: CommentPlatformId): CommentActionDefinition[] {
    return PLATFORM_ACTION_ORDER[platform]
        .map(id => ACTIONS_BY_ID.get(id))
        .filter((action): action is CommentActionDefinition => !!action && !!action.platforms[platform]);
}

/**
 * Зворотне перетворення: `data-action` із DOM → канонічний id дії.
 * Потрібне обробникам кліків, які бачать лише атрибут.
 */
export function resolveActionId(platform: CommentPlatformId, domAction: string | undefined | null): CommentActionId | null {
    if (!domAction) return null;

    for (const action of COMMENT_ACTIONS) {
        if (action.platforms[platform]?.domAction === domAction) {
            return action.id;
        }
    }
    return null;
}

/** Стан, який дія записує в кеш кнопок (`null` — не змінює). */
export function getActionStateType(id: CommentActionId): CommentActionStateType {
    return ACTIONS_BY_ID.get(id)?.stateType ?? null;
}

/**
 * Конфіг кнопки для `UiFactory.createButton` — з канонічного опису
 * плюс оверайди поверхні.
 */
export function buildActionButtonConfig(
    platform: CommentPlatformId,
    id: CommentActionId
): ButtonConfig | null {
    const action = ACTIONS_BY_ID.get(id);
    const override = action?.platforms[platform];
    if (!action || !override) return null;

    const config: ButtonConfig = {
        action: override.domAction,
        icon: override.icon ?? action.icon,
        title: override.title ?? action.title
    };

    if (override.className) config.className = override.className;
    if (override.type) config.type = override.type;

    return config;
}

/** Конфіги всіх кнопок поверхні у правильному порядку. */
export function buildPlatformButtonConfigs(platform: CommentPlatformId): ButtonConfig[] {
    return getPlatformActions(platform)
        .map(action => buildActionButtonConfig(platform, action.id))
        .filter((config): config is ButtonConfig => config !== null);
}

/**
 * Події, на які має бути навішений слухач кнопки дії на цій поверхні.
 * Порожній або відсутній список означає стандартний `click`.
 */
export function getActionEvents(platform: CommentPlatformId, id: CommentActionId): readonly string[] {
    const events = ACTIONS_BY_ID.get(id)?.platforms[platform]?.events;
    return events && events.length > 0 ? events : DEFAULT_ACTION_EVENTS;
}

/**
 * Чи реагує дія на цю кнопку миші.
 * Дія без явного списку приймає лише ЛКМ — саме так поводились усі кнопки
 * StreamYard, крім 🙏, ще до появи реєстру.
 */
export function acceptsMouseButton(
    platform: CommentPlatformId,
    id: CommentActionId,
    mouseButton: number
): boolean {
    const allowed = ACTIONS_BY_ID.get(id)?.platforms[platform]?.mouseButtons
        ?? DEFAULT_ACTION_MOUSE_BUTTONS;
    return allowed.includes(mouseButton);
}
