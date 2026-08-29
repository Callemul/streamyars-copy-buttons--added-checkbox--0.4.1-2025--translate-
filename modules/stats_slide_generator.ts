/**
 * StreamYard Helper — генератор графічного слайда аналітики (1920x1080, Full HD 16:9).
 *
 * Створює автономне високоякісне зображення (PNG) для показу наживо в StreamYard
 * (через «Слайди» або «Бренд/Оверлеї») або публікації в Telegram/соцмережах.
 *
 * Відображає:
 *   - Заголовок ефіру (бренд, дата, глядачі на старті);
 *   - 3 акцентні блоки по фазах (Суботня школа, Питання, Молитви);
 *   - Для кожної фази: Мінімум, Максимум, Медіана, Середнє статистичне;
 *   - Загальний підсумковий блок ефіру.
 */

import type { PhaseStatsReport, StatsSummary } from './stats_types';

export const SLIDE_WIDTH = 1920;
export const SLIDE_HEIGHT = 1080;

interface PhaseCardSpec {
    title: string;
    stats: StatsSummary;
    accentColor: string;
    bgHeaderColor: string;
}

/** Малює прямокутник із заокругленими кутами */
function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fillColor?: string,
    strokeColor?: string,
    lineWidth = 1
): void {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();

    if (fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fill();
    }
    if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    }
    ctx.restore();
}

/** Відмальовує картку однієї фази з 4 метриками */
function renderPhaseCard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    spec: PhaseCardSpec
): void {
    // Тіло картки
    drawRoundedRect(ctx, x, y, w, h, 16, '#222836', '#31394D', 2);

    // Плашка заголовка картки
    drawRoundedRect(ctx, x, y, w, 70, 16, spec.bgHeaderColor);
    // Закриваємо нижні заокруглення шапки картки
    ctx.fillStyle = spec.bgHeaderColor;
    ctx.fillRect(x, y + 40, w, 30);

    // Заголовок фази
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(spec.title, x + w / 2, y + 36);

    // 4 метрики у сітці 2x2 всередині картки
    const metrics = [
        { label: '📉 Мінімум', val: spec.stats.min, color: '#95a5a6' },
        { label: '📈 Пік (Макс)', val: spec.stats.max, color: spec.accentColor },
        { label: '🎯 Медіана', val: spec.stats.median, color: '#e0e0e0' },
        { label: '📊 Середнє', val: spec.stats.avg, color: '#FFFFFF' }
    ];

    const padding = 20;
    const tileW = (w - padding * 3) / 2;
    const tileH = (h - 70 - padding * 3) / 2;

    metrics.forEach((m, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const tileX = x + padding + col * (tileW + padding);
        const tileY = y + 70 + padding + row * (tileH + padding);

        // Міні-плитка метрики
        drawRoundedRect(ctx, tileX, tileY, tileW, tileH, 12, '#181C26', '#2A3142', 1);

        // Підпис
        ctx.fillStyle = '#8B949E';
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(m.label, tileX + tileW / 2, tileY + 16);

        // Значення
        ctx.fillStyle = m.color;
        ctx.font = 'bold 42px sans-serif';
        ctx.textBaseline = 'bottom';
        ctx.fillText(String(m.val ?? 0), tileX + tileW / 2, tileY + tileH - 14);
    });
}

/**
 * Рендерить повний слайд 1920x1080 на переданий canvas (або створює новий).
 */
export function renderStatsSlideToCanvas(
    report: PhaseStatsReport,
    dateStr: string,
    currentBrand: string,
    canvas?: HTMLCanvasElement
): HTMLCanvasElement {
    const cvs = canvas || document.createElement('canvas');
    cvs.width = SLIDE_WIDTH;
    cvs.height = SLIDE_HEIGHT;

    const ctx = cvs.getContext('2d');
    if (!ctx) return cvs;

    // 1. Темний градієнтний фон студії
    const bgGrad = ctx.createLinearGradient(0, 0, SLIDE_WIDTH, SLIDE_HEIGHT);
    bgGrad.addColorStop(0, '#13161F');
    bgGrad.addColorStop(1, '#1A1F2C');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, SLIDE_WIDTH, SLIDE_HEIGHT);

    // Тонка акцентна лінія згори
    const topBarGrad = ctx.createLinearGradient(0, 0, SLIDE_WIDTH, 0);
    topBarGrad.addColorStop(0, '#2ecc71');
    topBarGrad.addColorStop(0.5, '#f39c12');
    topBarGrad.addColorStop(1, '#005DF7');
    ctx.fillStyle = topBarGrad;
    ctx.fillRect(0, 0, SLIDE_WIDTH, 8);

    // 2. Шапка слайда
    const marginX = 80;
    const headerY = 50;

    // Назва каналу / бренду
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`📊 ${currentBrand}`, marginX, headerY);

    // Підзаголовок і дата
    ctx.fillStyle = '#8B949E';
    ctx.font = '22px sans-serif';
    ctx.fillText(`Аналітика прямого ефіру • Дата: ${dateStr}`, marginX, headerY + 54);

    // Плашка «Очікували на старті» праворуч у шапці
    const startW = 400;
    const startH = 64;
    const startX = SLIDE_WIDTH - marginX - startW;
    drawRoundedRect(ctx, startX, headerY + 10, startW, startH, 12, '#282E3E', '#3D475C', 1);

    ctx.fillStyle = '#F1C40F';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('👀 Глядачів на старті:', startX + 20, headerY + 10 + startH / 2);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(report.initialViewers || 0), startX + startW - 20, headerY + 10 + startH / 2);

    // 3. Три картки фаз (Суботня школа, Питання, Молитви)
    const cardsY = 175;
    const cardGap = 35;
    const totalAvailableW = SLIDE_WIDTH - marginX * 2;
    const cardW = (totalAvailableW - cardGap * 2) / 3;
    const cardH = 650;

    const cards: PhaseCardSpec[] = [
        {
            title: '📖 Суботня школа',
            stats: report.st1,
            accentColor: '#2ecc71',
            bgHeaderColor: '#1E4633'
        },
        {
            title: '❓ Питання',
            stats: report.st2,
            accentColor: '#f39c12',
            bgHeaderColor: '#4E3618'
        },
        {
            title: '🙏 Молитви',
            stats: report.st3,
            accentColor: '#3498db',
            bgHeaderColor: '#1A365D'
        }
    ];

    cards.forEach((spec, i) => {
        const cardX = marginX + i * (cardW + cardGap);
        renderPhaseCard(ctx, cardX, cardsY, cardW, cardH, spec);
    });

    // 4. Підсумковий блок за весь ефір (нижня плашка)
    const bottomY = cardsY + cardH + 30;
    const bottomH = 150;
    drawRoundedRect(ctx, marginX, bottomY, totalAvailableW, bottomH, 16, '#222836', '#31394D', 2);

    // Лейбл підсумку
    ctx.fillStyle = '#8B949E';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('🌐 ПІДСУМОК ЗА ВЕСЬ ЕФІР', marginX + 30, bottomY + 22);

    // 4 горизонтальні показники
    const overallMetrics = [
        { label: 'Пік онлайн (Макс)', val: report.overall.max, color: '#f39c12' },
        { label: 'Середній онлайн', val: report.overall.avg, color: '#FFFFFF' },
        { label: 'Медіана', val: report.overall.median, color: '#e0e0e0' },
        { label: 'Мінімум', val: report.overall.min, color: '#95a5a6' }
    ];

    const colW = (totalAvailableW - 60) / 4;
    overallMetrics.forEach((m, idx) => {
        const itemX = marginX + 30 + idx * colW;

        ctx.fillStyle = '#8B949E';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(m.label, itemX, bottomY + 62);

        ctx.fillStyle = m.color;
        ctx.font = 'bold 44px sans-serif';
        ctx.fillText(String(m.val ?? 0), itemX, bottomY + 86);
    });

    return cvs;
}

/**
 * Генерує Blob зображення слайда PNG для завантаження у файл.
 */
export async function generateSlideBlob(
    report: PhaseStatsReport,
    dateStr: string,
    currentBrand: string,
    canvas?: HTMLCanvasElement
): Promise<Blob> {
    const cvs = renderStatsSlideToCanvas(report, dateStr, currentBrand, canvas);

    if (typeof cvs.toBlob === 'function') {
        return new Promise<Blob>((resolve, reject) => {
            cvs.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Не вдалося сформувати Blob зі слайда'));
            }, 'image/png');
        });
    }

    // Запасний варіант для середовищ без toBlob (dataURL -> Blob)
    const dataUrl = cvs.toDataURL('image/png');
    const binStr = atob(dataUrl.split(',')[1]);
    const len = binStr.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        arr[i] = binStr.charCodeAt(i);
    }
    return new Blob([arr], { type: 'image/png' });
}
