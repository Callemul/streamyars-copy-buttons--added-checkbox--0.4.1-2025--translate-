// youtube/youtube_content.ts
import { YT_SELECTORS } from './yt_selectors';
import { addButtonsToYTComment, extractCommentId, restoreButtonState, restoreCheckboxState } from './yt_ui';
import { bindYTEvents, YTCollectedItem } from './yt_events';
import { SYH_STORAGE, STORAGE_KEYS, getSheetCollectedStorageKey } from '../modules/storage';
import { SYH_COMMENT_ASSISTANT } from '../modules/comment_assistant';
import { SYH_CONFIG } from '../modules/config';
import { isAllowedChannel } from './yt_channel_gate';

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

import { SYH_DOM_OBSERVER } from '../modules/dom_observer';

let unregisterObserver: (() => void) | null = null;

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
 * Запуск спостерігача за DOM через централізований DomObserverService
 */
function startObserver() {
    if (unregisterObserver) {
        unregisterObserver();
        unregisterObserver = null;
    }

    const selector = Array.isArray(YT_SELECTORS.commentBlock) 
        ? YT_SELECTORS.commentBlock.join(',') 
        : YT_SELECTORS.commentBlock;

    unregisterObserver = SYH_DOM_OBSERVER.register(selector, (el) => {
        if (stateCache.youtubeEnabled) {
            processYTComment(el);
        }
    });

    SYH_DOM_OBSERVER.start(document.body || document.documentElement);
}

/**
 * Ініціалізація модуля
 */
function initYouTubeModule() {
    if (!isAllowedChannel()) {
        console.log('[SYH YT] YouTube module skipped: Channel is not in allowed list');
        if (unregisterObserver) {
            unregisterObserver();
            unregisterObserver = null;
        }
        document.querySelectorAll('.syh-yt-buttons').forEach(el => el.remove());
        return;
    }

    const vpSsCollectedKey = getSheetCollectedStorageKey('vp_ss');

    SYH_STORAGE.get(
        [STORAGE_KEYS.OPTIONS, STORAGE_KEYS.YT_BUTTON_STATES, STORAGE_KEYS.YT_CHECKBOX_STATE, vpSsCollectedKey],
        (res) => {
            const options = res[STORAGE_KEYS.OPTIONS] || {};
            stateCache.youtubeEnabled = options.youtube_enabled !== false;

            if (!stateCache.youtubeEnabled) {
                console.log('[SYH YT] YouTube module is disabled in options');
                return;
            }

            stateCache.buttonStates = res[STORAGE_KEYS.YT_BUTTON_STATES] || {};
            stateCache.checkboxStates = res[STORAGE_KEYS.YT_CHECKBOX_STATE] || {};
            stateCache.collectedList = res[vpSsCollectedKey] || [];

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
    if (changes[STORAGE_KEYS.OPTIONS]) {
        const newOptions = changes[STORAGE_KEYS.OPTIONS].newValue || {};
        const wasEnabled = stateCache.youtubeEnabled;
        stateCache.youtubeEnabled = newOptions.youtube_enabled !== false;

        if (!wasEnabled && stateCache.youtubeEnabled) {
            initYouTubeModule();
        } else if (wasEnabled && !stateCache.youtubeEnabled) {
            if (unregisterObserver) {
                unregisterObserver();
                unregisterObserver = null;
            }
            // Видаляємо кнопки, якщо модуль вимкнено
            document.querySelectorAll('.syh-yt-buttons').forEach(el => el.remove());
        }
    }

    if (changes[STORAGE_KEYS.YT_BUTTON_STATES] && changes[STORAGE_KEYS.YT_BUTTON_STATES].newValue) {
        stateCache.buttonStates = changes[STORAGE_KEYS.YT_BUTTON_STATES].newValue;
        processAllYTComments();
    }

    if (changes[STORAGE_KEYS.YT_CHECKBOX_STATE] && changes[STORAGE_KEYS.YT_CHECKBOX_STATE].newValue) {
        stateCache.checkboxStates = changes[STORAGE_KEYS.YT_CHECKBOX_STATE].newValue;
        processAllYTComments();
    }

    const vpSsCollectedKey = getSheetCollectedStorageKey('vp_ss');
    if (changes[vpSsCollectedKey] && changes[vpSsCollectedKey].newValue) {
        stateCache.collectedList = changes[vpSsCollectedKey].newValue;
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

