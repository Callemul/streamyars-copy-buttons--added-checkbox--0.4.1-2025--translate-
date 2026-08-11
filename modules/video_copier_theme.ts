// modules/video_copier_theme.ts
/**
 * Візуальна мова копіювача відео StreamYard: підписи кнопок, фірмові кольори
 * та inline-стилі.
 *
 * Виокремлено з `video_copier_ui.ts`, щоб чотири ін'єктори (заголовок, модалка
 * Share, картки списку, майстер-кнопка) не тягли за собою ~60 рядків CSS-рядків
 * і не змішували розмітку з логікою. Значення перенесені 1-в-1.
 */

/** Підписи кнопок. Фіксовані рядки — на них спираються тести й перевірки стану. */
export const LABELS = {
    copyTitle: '📋 Копіювати назву',
    copied: '✅ Скопійовано!',
    copyUrl: '🚀 Копіювати URL + Текст (Видео в хорошем качестве)',
    copyUrlDone: '✅ Успішно скопійовано!',
    copyFailed: '⚠️ Не вдалося скопіювати',
    copyUrlFailed: '⚠️ Не вдалося скопіювати URL',
    downloadAll: '📥 Завантажити всі свіжі відео (Video Only)',
    downloadRunning: '⏳ Запускаю завантаження... Не чіпайте мишку!',
    downloadDone: '✅ Всі завантаження ініційовано!'
} as const;

/** Фірмова палітра кнопок копіювача (базовий колір + колір наведення). */
export const COLORS = {
    green: '#28a745',
    greenHover: '#218838',
    blue: '#005DF7',
    blueHover: '#0047cc',
    running: '#f39c12'
} as const;

export const CONTROLS_WRAP_STYLE = 'display: flex; gap: 8px; margin-right: 12px; z-index: 10; position: relative;';

export const TITLE_BUTTON_STYLE = `
    padding: 8px 16px;
    background-color: #28a745 !important; 
    color: white !important;
    border: none !important;
    border-radius: 6px !important;
    cursor: pointer !important;
    height: 45px !important;
    font-weight: bold !important;
    font-size: 14px !important;
    white-space: nowrap;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

export const MODAL_BUTTON_STYLE = `
    width: 100% !important;
    height: 80px !important; 
    background-color: #28a745 !important;
    color: white !important;
    border: none !important;
    border-radius: 8px !important;
    font-size: 16px !important;
    font-weight: bold !important;
    cursor: pointer !important;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
    transition: background-color 0.2s;
`;

export const SQUARE_BUTTON_STYLE = `
    width: 32px;
    height: 32px;
    border-radius: 4px;
    border: 1px solid #ddd;
    background-color: #fff;
    color: #4F5461;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    padding: 0;
`;

export const MASTER_BUTTON_STYLE = `
    display: block; width: 100%; padding: 15px; margin-bottom: 20px;
    background-color: #005DF7; color: white; font-size: 16px; font-weight: bold;
    border: none; border-radius: 8px; cursor: pointer;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: 0.2s;
`;
