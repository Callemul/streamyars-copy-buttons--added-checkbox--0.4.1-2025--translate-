// options/options_toast.ts
//
// Спливне сповіщення сторінки налаштувань.
//
// Виділено з `OptionsController`: раніше єдиним станом класу було поле
// `toastTimer`, через яке контролер тримав таймер і не міг бути «тонким».
// Тепер таймер живе у замиканні контролера тоста.
//
// Поведінка 1-в-1: за відсутності `#toastNotification` метод виходить одразу
// і НЕ скидає попередній таймер.

/** Скільки тост лишається видимим, мс. */
const TOAST_VISIBLE_MS = 3000;

export interface ToastController {
    /** Показує повідомлення і перезапускає таймер приховування. */
    show(message: string): void;
}

export function createToastController(): ToastController {
    let toastTimer: ReturnType<typeof setTimeout> | null = null;

    return {
        show(message: string): void {
            const toast = document.getElementById('toastNotification');
            if (!toast) return;

            toast.textContent = message;
            toast.classList.add('show');

            if (toastTimer) clearTimeout(toastTimer);
            toastTimer = setTimeout(() => {
                toast.classList.remove('show');
            }, TOAST_VISIBLE_MS);
        }
    };
}
