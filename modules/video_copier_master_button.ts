// modules/video_copier_master_button.ts
/**
 * Головна кнопка масового скачування над списком відео.
 * Виокремлено з `video_copier_ui.ts` як самостійна точка ін'єкції.
 *
 * Кнопка блокується на час сценарію, а після завершення ще 5 секунд тримає
 * підтверджувальний стан — це навмисно, щоб користувач помітив результат
 * навіть якщо всі завантаження стартували миттєво.
 */
import { downloadAllFreshVideos } from './video_copier_downloader';
import { COLORS, LABELS, MASTER_BUTTON_STYLE } from './video_copier_theme';
import { applyHoverColors } from './video_copier_ui_kit';

export const MASTER_BUTTON_ID = 'syh-master-download-btn';
export const LIST_WRAP_SELECTOR = 'div[class*="ListWrap"]';

/** Скільки кнопка тримає стан «готово» перед поверненням у дефолт. */
const DONE_STATE_HOLD_MS = 5000;

async function runMasterDownload(btn: HTMLButtonElement): Promise<void> {
    btn.innerText = LABELS.downloadRunning;
    btn.style.backgroundColor = COLORS.running;
    btn.disabled = true;

    await downloadAllFreshVideos();

    btn.innerText = LABELS.downloadDone;
    btn.style.backgroundColor = COLORS.green;
    setTimeout(() => {
        btn.innerText = LABELS.downloadAll;
        btn.style.backgroundColor = COLORS.blue;
        btn.disabled = false;
    }, DONE_STATE_HOLD_MS);
}

function buildMasterDownloadButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = MASTER_BUTTON_ID;
    btn.innerText = LABELS.downloadAll;
    btn.style.cssText = MASTER_BUTTON_STYLE;
    applyHoverColors(btn, COLORS.blue, COLORS.blueHover);

    btn.onclick = (e: MouseEvent) => {
        e.preventDefault();
        void runMasterDownload(btn);
    };

    return btn;
}

/** Ідемпотентність тримається на унікальному `id` кнопки. */
function insertMasterDownloadButton(listContainer: Element): void {
    const parent = listContainer.parentNode;
    if (!parent || document.getElementById(MASTER_BUTTON_ID)) return;

    parent.insertBefore(buildMasterDownloadButton(), listContainer);
}

export function injectMasterDownloadButton(): void {
    const listContainer = document.querySelector(LIST_WRAP_SELECTOR);
    if (!listContainer) return;
    insertMasterDownloadButton(listContainer);
}
