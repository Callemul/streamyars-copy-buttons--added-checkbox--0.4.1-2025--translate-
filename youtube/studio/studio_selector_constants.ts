// youtube/studio/studio_selector_constants.ts
//
// ПРИЗНАЧЕННЯ: чиста таблиця CSS-селекторів YouTube Studio (без DOM-логіки).
//
// Винесено з `studio_selectors.ts`, щоб таблицю можна було читати/оновлювати
// незалежно від логіки запитів (`studio_selector_queries.ts`) та від фасаду.
//
// КОНТРАКТ ЗНАЧЕНЬ: масив = список альтернатив за спаданням пріоритету.
// Історично він склеюється в одну CSS-групу через кому (див. `resolveSelectorString`),
// тому фактично перемагає перший вузол у порядку DOM, а не перший селектор у масиві.
// Це навмисно збережено 1-в-1; зміна семантики — окреме рішення.
//
// СТРУКТУРА DOM YouTube Studio (для розуміння селекторів):
//   ytcp-comment-thread                         ← один тред (батько з відповідями)
//     ├─ ytcp-comment[id="comment"]            ← БАТЬКІВСЬКИЙ коментар
//     │     ├─ #metadata #name .author-text     ← ім'я автора
//     │     ├─ #content-text                    ← текст коментаря
//     │     ├─ ytcp-comment-action-buttons
//     │     │     └─ #toolbar                    ← тут ін'єкціюємо 📋❓🙏
//     │     └─ ytcp-comment-video-thumbnail
//     │           ├─ #video-title               ← назва відео (getVideoTitleText)
//     │           ├─ a#body                     ← посилання на відео (getVideoLinkHref)
//     │           └─ .syh-studio-video-meta     ← наша ін'єкція (badge + checkbox)
//     └─ ytcp-comment-replies
//           └─ ytcp-comment[is-reply]             ← ВКЛАДЕНА відповідь
//                 └─ те ж саме, але #video-title = порожній!
//                   videoKey успадковується в studio_events.ts (REPLY INHERITANCE)

export const STUDIO_SELECTORS = {
    CHANNEL_NAME: ['#entity-label-container #entity-name', 'ytcp-navigation-drawer #entity-name', '#entity-name'],
    COMMENT_THREAD: ['.ytcp-comment-thread', 'ytcp-comment-thread'],
    COMMENT: ['ytcp-comment#comment', 'ytcp-comment'],
    COMMENT_TEXT_AREA: ['#expander-container', '#content-text', '#content', '#expander'],
    CONTENT_TEXT: ['#content-text', 'ytcp-comment-text #content-text', '.content-text'],
    AUTHOR_NAME: ['#metadata #name .author-text', '#metadata #name', '#name .author-text', '#name'],
    ACTION_TOOLBAR: ['ytcp-comment-action-buttons #toolbar', '#action-buttons #toolbar', '#toolbar'],
    METADATA: ['#metadata', '.metadata-container'],
    VIDEO_THUMBNAIL: ['ytcp-comment-video-thumbnail', '.video-thumbnail'],
    VIDEO_TITLE: ['#video-title', '.video-title-text'],
    VIDEO_LINK: ['ytcp-comment-video-thumbnail a#body', '#video-title a', 'a.ytcp-comment-video-thumbnail'],
    COMMENTS_ITEMS_CONTAINER: ['#comments-content #items', '#iron-list #items', '#comments-section #items', '#items'],
    COMMENT_HEADER_SPAN: ['#comment-header span.ytcp-comments-section', '#comment-header span', 'ytcp-comments-section #comment-header span'],
    COMMENT_HEADER: ['#comment-header', 'ytcp-comments-section #comment-header']
};

/**
 * Селектор батьківського треду для «успадкування» даних відео у відповідях.
 *
 * ⚠️ Навмисно КЛАС, а не тег: історична поведінка `closest('.ytcp-comment-thread')`.
 * Тег без класу успадкування не вмикає (зафіксовано тестом «КВІРК» у
 * `tests/studio_selectors.test.js`).
 */
export const PARENT_THREAD_SELECTOR = '.ytcp-comment-thread';
