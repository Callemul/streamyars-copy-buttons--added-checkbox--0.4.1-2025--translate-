/**
 * StreamYard Helper — фасад UI.
 *
 * Цей файл — тонкий фасад-бочка: він перевидпускає публічний контракт
 * `SYH_UI` (з `./ui_facade`) та історичний тип `SyhUi` (з `./ui_state`),
 * щоб не зламати споживачів, які імпортують їх саме звідси. Сама збірка
 * об'єкта живе в `./ui_facade`.
 */

export { SYH_UI } from './ui_facade';
export type { SyhUi } from './ui_state';
