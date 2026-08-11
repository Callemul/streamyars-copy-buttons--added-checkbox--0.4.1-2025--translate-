// youtube/yt_ui.ts
//
// Тонкий фасад-бочка UI коментарів YouTube.
//
// Рефакторинг (Fallow health): файл був хотспотом піддерева `youtube/`
// (207 LOC, CC 36, cognitive 32; `extractCommentId` — CC 13/cognitive 13,
// `addButtonsToYTComment` — 57 LOC) і не мав жодного прямого тесту.
// Тепер реалізація живе в:
//   - `yt_comment_identity.ts`     — ID коментаря + пара «автор/текст»;
//   - `yt_comment_panel.ts`        — побудова панелі кнопок і чекбокса;
//   - `yt_comment_visual_state.ts` — синхронізація DOM зі станом.
//
// Реекспорти нижче навмисні: `yt_comment_processor.ts`, `yt_adapter.ts` і
// тести історично імпортують цей контракт саме звідси.
// Поведінка збережена 1-в-1 (див. tests/yt_ui_api.test.js).

export interface CommentData {
    id: string;
    author: string;
    text: string;
    videoId: string;
}

export { extractCommentId, extractCommentData } from './yt_comment_identity';
export { addButtonsToYTComment } from './yt_comment_panel';
export {
    applyButtonVisualState,
    applyCheckboxStateFromCache,
    restoreButtonState,
    restoreCheckboxState
} from './yt_comment_visual_state';
