/**
 * StreamYard Helper — вивантаження звітів аналітики у файли.
 *
 * Єдине місце, де живуть побічні ефекти завантаження: створення тимчасового
 * `<a download>`, `Blob` і `URL.createObjectURL`. Виділено з `stats_exporter.ts`.
 */

import type { StreamChartSession, PhaseStatsReport } from './stats_types';
import { renderPresentationHtml } from './stats_report_templates';

/** Скільки чекати перед відкликанням тимчасового blob-URL. */
const OBJECT_URL_REVOKE_DELAY = 1000;

/**
 * Клікає тимчасове посилання завантаження й одразу прибирає його з DOM.
 * Історично CSV додається в `<body>`, а презентація — ні; це збережено 1-в-1.
 */
function clickTemporaryLink(link: HTMLAnchorElement, attachToBody: boolean): void {
    if (attachToBody) document.body.appendChild(link);
    link.click();
    if (attachToBody) document.body.removeChild(link);
}

/** Зберігає точки вимірювання як CSV з BOM (щоб Excel не ламав кирилицю). */
export function downloadSessionCsv(
    dataObj: StreamChartSession | null,
    dateStr: string,
    currentBrand: string
): void {
    if (!dataObj || !dataObj.data) return;

    let csv = 'data:text/csv;charset=utf-8,\uFEFFЧас Ефіру,Глядачі\n';
    dataObj.data.forEach(row => { csv += `${row.time},${row.viewers}\n`; });

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `StreamStats_${currentBrand}_${dateStr}.csv`);
    clickTemporaryLink(link, true);
}

/** Зберігає готову HTML-презентацію на два слайди. */
export function downloadPresentation(
    report: PhaseStatsReport,
    dateStr: string,
    currentBrand: string
): void {
    const htmlTemplate = renderPresentationHtml(report, dateStr, currentBrand);
    const blob = new Blob([htmlTemplate], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `Presentation_${currentBrand}_${dateStr}.html`;
    clickTemporaryLink(link, false);

    setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_REVOKE_DELAY);
}
