/**
 * StreamYard Helper — перевірка живучості контексту розширення.
 *
 * Винесено з `modules/messaging.ts` (ціль №3 у `fallow health --targets`:
 * 115 LOC, fan-in 6, щільність складності 0.34 при порозі 0.3).
 *
 * Єдиний запобіжник проти класичного «Extension context invalidated»: після
 * перезавантаження/оновлення розширення `chrome.runtime` може зникнути або
 * почати кидати виняток на самому лише читанні властивості.
 */

export function isExtensionContextValid(): boolean {
    try {
        return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
    } catch {
        return false;
    }
}
