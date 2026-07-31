// youtube/youtube_content.ts
import { YT_SELECTORS } from './yt_selectors.ts';
import { addButtonsToYTComment, extractCommentId, restoreButtonState, restoreCheckboxState } from './yt_ui.ts';
import { bindYTEvents, YTCollectedItem } from './yt_events.ts';
import { SYH_STORAGE } from '../modules/storage.ts';
import { SYH_COMMENT_ASSISTANT } from '../modules/comment_assistant.ts';
import { SYH_CONFIG } from '../modules/config.ts';
import { isAllowedChannel } from './yt_channel_gate.ts';

console.log('[SYH] YouTube content script initializing...');

interface StateCache {
    buttonStates: Record<string, 'question' | 'prayer'>;
    checkboxStates: Record<string, { checked: boolean; timestamp: number }>;
    collectedList: YTCollectedItem[];
    youtubeEnabled: boolean;
}

const stateCache: StateCache = {
    buttonStates: {},
    checkboxStates: {},
    collectedList: [],
    youtubeEnabled: true
};

let observer: MutationObserver | null = null;

/**
 * Обробка одного вузла коментаря YouTube
 */
function processYTComment(commentNode: Element) {
    if (!commentNode || !stateCache.youtubeEnabled) return;

    // Впевнюємося, що селектор headerAuthor присутній
    const headerAuthor = commentNode.querySelector(YT_SELECTORS.headerAuthor);
    if (!headerAuthor) return;

    // 1. Ін'єкція UI (кнопки, 📄, чекбокс)
    addButtonsToYTComment(commentNode);

    // 2. Витягуємо ID
    const commentId = extractCommentId(commentNode);
    if (!commentId) return;

    // 3. Інтеграція хайлайту тригерних слів
    try {
        SYH_COMMENT_ASSISTANT.processComment(commentNode);
    } catch (err) {
        console.warn('[SYH YT] Highlight error:', err);
    }

    // 4. Відновлення станів з кешу
    restoreButtonState(commentNode, commentId, stateCache.buttonStates);
    restoreCheckboxState(commentNode, commentId, stateCache.checkboxStates);

    // 5. Прив'язка обробників подій
    bindYTEvents(commentNode, commentId, stateCache);
}

/**
 * Сканування та обробка всіх коментарів на сторінці
 */
function processAllYTComments() {
    if (!stateCache.youtubeEnabled) return;
    const comments = document.querySelectorAll(YT_SELECTORS.commentBlock);
    comments.forEach(comment => processYTComment(comment));
}

/**
 * Запуск спостерігача за DOM (MutationObserver)
 */
function startObserver() {
    if (observer) observer.disconnect();

    observer = new MutationObserver((mutations) => {
        if (!stateCache.youtubeEnabled) return;

        for (const mutation of mutations) {
            for (const node of Array.from(mutation.addedNodes)) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;
                const el = node as Element;

                if (el.matches && el.matches(YT_SELECTORS.commentBlock)) {
                    processYTComment(el);
                } else if (el.querySelectorAll) {
                    const comments = el.querySelectorAll(YT_SELECTORS.commentBlock);
                    comments.forEach(comment => processYTComment(comment));
                }
            }
        }
    });

    observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
    });
}

/**
 * Ініціалізація модуля
 */
function initYouTubeModule() {
    if (!isAllowedChannel()) {
        console.log('[SYH YT] YouTube module skipped: Channel is not in allowed list');
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        document.querySelectorAll('.syh-yt-buttons').forEach(el => el.remove());
        return;
    }

    SYH_STORAGE.get(
        ['syh_options', 'syh_yt_button_states', 'syh_yt_checkbox_state', 'syh_yt_collected'],
        (res) => {
            const options = res.syh_options || {};
            stateCache.youtubeEnabled = options.youtube_enabled !== false;

            if (!stateCache.youtubeEnabled) {
                console.log('[SYH YT] YouTube module is disabled in options');
                return;
            }

            stateCache.buttonStates = res.syh_yt_button_states || {};
            stateCache.checkboxStates = res.syh_yt_checkbox_state || {};
            stateCache.collectedList = res.syh_yt_collected || [];

            // 1. Ініціалізація помічника коментарів з селекторами YouTube
            SYH_COMMENT_ASSISTANT.init({
                SELECTORS: YT_SELECTORS,
                TRIGGER_WORDS: SYH_CONFIG?.TRIGGER_WORDS || ['вопрос']
            });

            // 2. Первинна обробка коментарів
            processAllYTComments();

            // 3. Запуск MutationObserver
            startObserver();

            console.log('[SYH YT] YouTube module loaded successfully');
        }
    );
}

// Підписка на зміни у сховищі (реактивне оновлення налаштувань та станів)
SYH_STORAGE.onChanged((changes) => {
    if (changes.syh_options) {
        const newOptions = changes.syh_options.newValue || {};
        const wasEnabled = stateCache.youtubeEnabled;
        stateCache.youtubeEnabled = newOptions.youtube_enabled !== false;

        if (!wasEnabled && stateCache.youtubeEnabled) {
            initYouTubeModule();
        } else if (wasEnabled && !stateCache.youtubeEnabled) {
            if (observer) observer.disconnect();
            // Видаляємо кнопки, якщо модуль вимкнено
            document.querySelectorAll('.syh-yt-buttons').forEach(el => el.remove());
        }
    }

    if (changes.syh_yt_button_states && changes.syh_yt_button_states.newValue) {
        stateCache.buttonStates = changes.syh_yt_button_states.newValue;
        processAllYTComments();
    }

    if (changes.syh_yt_checkbox_state && changes.syh_yt_checkbox_state.newValue) {
        stateCache.checkboxStates = changes.syh_yt_checkbox_state.newValue;
        processAllYTComments();
    }
});

// Реагування на SPA-навігацію в YouTube
window.addEventListener('yt-navigate-finish', () => {
    initYouTubeModule();
});

// Запуск після завантаження DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initYouTubeModule);
} else {
    initYouTubeModule();
}

