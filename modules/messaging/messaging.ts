/**
 * StreamYard Helper - Centralized Messaging Service
 * Безпечний адаптер зв'язку між Content Scripts, Popup та Background Worker.
 * Запобігає помилкам "Extension context invalidated" та незакритим обробникам Promise.
 *
 * Цей файл — тонкий фасад-бочка: він перевидпускає публічний контракт
 * `SYH_MESSAGING` / `SyhMessagingService` з `./messaging_service`, щоб не
 * зламати історичних імпортерів (`bootstrap_app`, тести). Сама реалізація
 * живе в `messaging_context` (живучість контексту), `messaging_senders`
 * (вихідні канали) та `messaging_listener` (вхідний канал).
 */

export { SYH_MESSAGING } from './messaging_service';
export type { SyhMessagingService } from './messaging_service';
