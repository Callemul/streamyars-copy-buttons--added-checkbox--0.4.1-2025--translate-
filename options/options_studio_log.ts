// options/options_studio_log.ts
//
// Дії сторінки налаштувань над журналом ручних корекцій YouTube Studio:
// показати, скопіювати в буфер, очистити.
//
// Виділено з `OptionsController`. Форматування та рендер уже жили в
// `./studio_log`; тут — лише робота зі storage і зв'язок із UI-сповіщеннями,
// тож контролер більше не звертається до `STUDIO_OVERRIDE_LOG` напряму.
//
// Поведінка 1-в-1:
//   - відсутній `#studioLogBody` мовчки скасовує рендер;
//   - порожній журнал не копіюється, а показує інформаційний тост;
//   - невдале копіювання повідомляється через `alert`, а не тост.

import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage';
import { CommentService } from '../modules/comment_service';
import type { StudioOverrideLogEntry } from '../modules/types';
import { buildStudioLogReport, renderStudioLogRows } from './studio_log';

const LOG_BODY_ID = 'studioLogBody';

/** Читає журнал зі storage; відсутній ключ дає порожній масив. */
function withStudioLog(callback: (logs: StudioOverrideLogEntry[]) => void): void {
    SYH_STORAGE.get([STORAGE_KEYS.STUDIO_OVERRIDE_LOG], (res) => {
        callback(res[STORAGE_KEYS.STUDIO_OVERRIDE_LOG] || []);
    });
}

export function loadStudioLog(): void {
    withStudioLog((logs) => {
        const tbody = document.getElementById(LOG_BODY_ID);
        if (!tbody) return;

        renderStudioLogRows(tbody, logs);
    });
}

export function copyStudioLog(notify: (message: string) => void): void {
    withStudioLog(async (logs) => {
        if (logs.length === 0) {
            notify('ℹ️ Лог порожній, нічого копіювати');
            return;
        }

        const success = await CommentService.copyToClipboard(buildStudioLogReport(logs));
        if (success) {
            notify('📋 Лог корекцій YouTube Studio скопійовано!');
        } else {
            alert('Не вдалося скопіювати лог в буфер обміну');
        }
    });
}

export function clearStudioLog(notify: (message: string) => void): void {
    if (!confirm('Очистити лог ручних корекцій категорій YouTube Studio?')) return;

    SYH_STORAGE.set({ [STORAGE_KEYS.STUDIO_OVERRIDE_LOG]: [] }, () => {
        loadStudioLog();
        notify('🗑 Лог Studio успішно очищено');
    });
}
