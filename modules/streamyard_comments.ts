// Фасад зони StreamYard-коментарів (історичний контракт імпорту «все з одного
// модуля», яким користуються тести і `bootstrap_app`).
//
// Після T7 тут НЕМАЄ обробки кліків по кнопках коментаря: її веде
// `modules/streamyard_adapter.ts` через `CommentInjector`. Лишились
// загальносторінкові речі: Auto-Heal, зірка, коліщатко, контекстне меню.
export * from './streamyard_comments/index';
export * from './streamyard_comments/types';
export * from './streamyard_comments/handlers';
export * from './streamyard_comments/auto_heal';
export * from './streamyard_comments/prayer_database';