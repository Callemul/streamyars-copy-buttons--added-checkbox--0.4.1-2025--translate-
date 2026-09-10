// modules/video_copier_downloader.ts
/**
 * Послідовність масового завантаження свіжих відео StreamYard.
 * Кожен крок сценарію винесений в окрему функцію, тому складність кожної гілки мінімальна.
 */
import { SYH_I18N } from '../registry/i18n';
import { showBanner } from '../core/utils_notify';
import { collectFreshVideoCards, queryVideoCards, startOfToday } from './video_copier_fresh';

export const DOWNLOAD_DELAYS = {
    menu: 600,
    menuItem: 1200,
    videoStart: 1500,
    close: 1000
} as const;

export const MORE_OPTIONS_SELECTOR = 'button[aria-label="More options"]';
export const MENU_ITEM_SELECTOR = 'span.ListItemText__StyledText-sc-1i1a88x-0';
export const VIDEO_DOWNLOAD_SELECTOR = '[data-testid="download-row-download-button-video"]';
export const CLOSE_MODAL_SELECTOR = 'button[aria-label="Close modal"]';

export function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/** Локалізована назва пункту меню плюс англійський фолбек. */
export function matchesDownloadLabel(label: string, downloadText: string): boolean {
    return label.includes(downloadText) || label.includes('Download');
}

export function findDownloadMenuItem(items: HTMLElement[], downloadText: string): HTMLElement | undefined {
    return items.find(el => matchesDownloadLabel(el.innerText, downloadText));
}

export function openCardMenu(card: Element): void {
    const moreBtn = card.querySelector(MORE_OPTIONS_SELECTOR) as HTMLElement | null;
    moreBtn?.click();
}

export function clickDownloadMenuItem(): void {
    const items = Array.from(document.querySelectorAll(MENU_ITEM_SELECTOR)) as HTMLElement[];
    const downloadText = SYH_I18N.getMessage('download', 'Download');
    const target = findDownloadMenuItem(items, downloadText);
    target?.closest('button')?.click();
}

async function startVideoDownload(index: number): Promise<void> {
    const videoDownloadBtn = document.querySelector(VIDEO_DOWNLOAD_SELECTOR) as HTMLElement | null;
    if (!videoDownloadBtn) return;

    videoDownloadBtn.click();
    console.log(`[SYH] Завантаження ${index + 1} розпочато.`);
    await wait(DOWNLOAD_DELAYS.videoStart);
}

/** Модалку закриваємо кнопкою, а якщо її немає — клавішею Escape. */
export function closeDownloadModal(): void {
    const closeBtn = document.querySelector(CLOSE_MODAL_SELECTOR) as HTMLElement | null;
    if (closeBtn) {
        closeBtn.click();
        return;
    }
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
}

export async function downloadSingleFreshVideo(card: Element, index: number): Promise<void> {
    openCardMenu(card);
    await wait(DOWNLOAD_DELAYS.menu);

    clickDownloadMenuItem();
    await wait(DOWNLOAD_DELAYS.menuItem);

    await startVideoDownload(index);

    closeDownloadModal();
    await wait(DOWNLOAD_DELAYS.close);
}

async function downloadSafely(card: Element, index: number): Promise<void> {
    try {
        await downloadSingleFreshVideo(card, index);
    } catch (err) {
        console.error(`[SYH] Помилка на відео ${index + 1}: `, err);
    }
}

export async function downloadSequentially(cards: Element[]): Promise<void> {
    for (const [i, card] of cards.entries()) {
        await downloadSafely(card, i);
    }
}

export async function downloadAllFreshVideos(): Promise<void> {
    const freshCards = collectFreshVideoCards(queryVideoCards(), startOfToday());

    if (freshCards.length === 0) {
        showBanner('Немає свіжих відео для завантаження.');
        return;
    }

    console.log(`[SYH] Знайдено ${freshCards.length} свіжих відео для скачування.`);
    await downloadSequentially(freshCards);
}
