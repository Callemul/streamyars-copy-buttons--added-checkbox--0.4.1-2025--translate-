// modules/video_copier_ui_kit.ts
/**
 * Дрібні UI-примітиви копіювача відео: hover-фарбування, тимчасовий
 * зворотний зв'язок після копіювання та фабрика квадратної кнопки.
 *
 * Виокремлено з `video_copier_ui.ts` — це єдиний шар, який знає про таймери
 * повернення початкового вигляду кнопки.
 */
import { CommentService } from '../comments/comment_service';
import { UiFactory } from '../ui_factory';
import { SQUARE_BUTTON_STYLE } from './video_copier_theme';

/** Скільки кнопка тримає підтверджувальний стан перед поверненням у дефолт. */
export const FEEDBACK_DELAY_MS = 2000;

/** Перемикає фон кнопки між базовим і hover-кольором. */
export function applyHoverColors(btn: HTMLElement, base: string, hover: string): void {
    btn.onmouseover = () => { btn.style.backgroundColor = hover; };
    btn.onmouseout = () => { btn.style.backgroundColor = base; };
}

/** Тимчасово підміняє іконку кнопки (`innerHTML`) і повертає початкову. */
export function tempIconChange(btn: HTMLElement, tempIcon: string, delayMs: number = FEEDBACK_DELAY_MS): void {
    const originalIcon = btn.innerHTML;
    btn.innerHTML = tempIcon;
    setTimeout(() => { btn.innerHTML = originalIcon; }, delayMs);
}

/** Тимчасово підміняє текст кнопки і повертає ЯВНО заданий підпис. */
export function tempLabelChange(
    btn: HTMLElement,
    tempLabel: string,
    restoreLabel: string,
    delayMs: number = FEEDBACK_DELAY_MS
): void {
    btn.innerText = tempLabel;
    setTimeout(() => { btn.innerText = restoreLabel; }, delayMs);
}

/**
 * Пише текст у буфер через SSOT-адаптер `CommentService.copyToClipboard`
 * і повертає результат, щоб виклик міг показати різний відгук на успіх і
 * невдачу. Ніколи не кидає: винятки перехоплюються всередині сервісу, а
 * результат — булевий прапорець успіху (з фолбеком `execCommand` за потреби).
 */
export async function copyAndFlash(
    text: string,
    onCopied: () => void,
    onFailed?: () => void
): Promise<boolean> {
    const success = await CommentService.copyToClipboard(text);
    if (success) {
        onCopied();
    } else {
        onFailed?.();
    }
    return success;
}

/** Квадратна іконкова кнопка для панелі контролів у картці списку. */
export function createSquareButton(
    icon: string,
    tooltipText: string,
    onClickCallback: (e: MouseEvent) => void
): HTMLButtonElement {
    const btn = UiFactory.createButton({
        action: 'copier-action',
        icon: icon,
        title: tooltipText,
        className: 'syh-square-btn',
        onClick: onClickCallback
    });

    btn.style.cssText = SQUARE_BUTTON_STYLE;
    btn.onmouseover = () => {
        btn.style.backgroundColor = '#f4f4f9';
        btn.style.borderColor = '#ccc';
    };
    btn.onmouseout = () => {
        btn.style.backgroundColor = '#fff';
        btn.style.borderColor = '#ddd';
    };

    return btn;
}
