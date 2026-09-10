// youtube/youtube_content.ts
import { initializeYouTubeModule } from './yt_init';
import { handleStorageChange } from './yt_storage_handler';
import { SYH_STORAGE } from '../modules/storage/storage';

console.log('[SYH] YouTube content script initializing...');

// Підписка на зміни у сховищі (реактивне оновлення налаштувань та станів)
SYH_STORAGE.onChanged(handleStorageChange);

// Реагування на SPA-навігацію в YouTube
window.addEventListener('yt-navigate-finish', () => {
    initializeYouTubeModule().catch((err) => console.error('[SYH YT] Init error:', err));
});

// Запуск після завантаження DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeYouTubeModule().catch((err) => console.error('[SYH YT] Init error:', err));
    });
} else {
    initializeYouTubeModule().catch((err) => console.error('[SYH YT] Init error:', err));
}

export { initializeYouTubeModule, handleStorageChange };