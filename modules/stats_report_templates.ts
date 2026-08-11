/**
 * StreamYard Helper — шаблони звітів аналітики ефіру.
 *
 * Чисті функції «звіт → рядок»: Markdown, HTML-фрагмент для буфера обміну
 * та автономна HTML-презентація на два слайди. Виділено з `stats_exporter.ts`,
 * жодних побічних ефектів і жодного доступу до DOM.
 */

import type { PhaseStatsReport } from './stats_types';

/** Підписи фаз у тому самому порядку, що й st1/st2/st3. */
const PHASE_LABELS = ['📖 Суботня школа', '❓ Питання', '🙏 Молитви'] as const;

/** Markdown-звіт для кнопки «📋 MD». */
export function renderSummaryMarkdown(
    report: PhaseStatsReport,
    dateStr: string,
    currentBrand: string
): string {
    const { overall: o, initialViewers: iv, st1: s1, st2: s2, st3: s3 } = report;

    return `# 📊 Підсумкова аналітика ефіру: ${currentBrand}
**Дата:** ${dateStr}
**Глядачів на старті:** ${iv}

## 📈 Загальні показники
- **Пік онлайн:** ${o.max}
- **Середній онлайн:** ${o.avg}
- **Медіана:** ${o.median}
- **Мінімум:** ${o.min}

## 📑 Розподіл по блоках (Фази)
| Фаза | Середній онлайн | Пік у фазі | Медіана |
| --- | --- | --- | --- |
| ${PHASE_LABELS[0]} | ${s1.avg} | ${s1.max} | ${s1.median} |
| ${PHASE_LABELS[1]} | ${s2.avg} | ${s2.max} | ${s2.median} |
| ${PHASE_LABELS[2]} | ${s3.avg} | ${s3.max} | ${s3.median} |`;
}

/** HTML-звіт для кнопки «📋 HTML». */
export function renderSummaryHtml(
    report: PhaseStatsReport,
    dateStr: string,
    currentBrand: string
): string {
    const ov = report.overall;
    const viewers = report.initialViewers;
    const phases = [report.st1, report.st2, report.st3];

    const rows = phases.map((phase, i) => `      <tr>
        <td>${PHASE_LABELS[i]}</td>
        <td>${phase.avg}</td>
        <td>${phase.max}</td>
        <td>${phase.median}</td>
      </tr>`).join('\n');

    return `<div class="syh-summary-report">
  <h2>📊 Підсумкова аналітика ефіру: ${currentBrand}</h2>
  <p><strong>Дата:</strong> ${dateStr}</p>
  <p><strong>Глядачів на старті:</strong> ${viewers}</p>

  <h3>📈 Загальні показники</h3>
  <ul>
    <li><strong>Пік онлайн:</strong> ${ov.max}</li>
    <li><strong>Середній онлайн:</strong> ${ov.avg}</li>
    <li><strong>Медіана:</strong> ${ov.median}</li>
    <li><strong>Мінімум:</strong> ${ov.min}</li>
  </ul>

  <h3>📑 Розподіл по блоках (Фази)</h3>
  <table border="1" cellpadding="5" cellspacing="0">
    <thead>
      <tr>
        <th>Фаза</th>
        <th>Середній онлайн</th>
        <th>Пік у фазі</th>
        <th>Медіана</th>
      </tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
</div>`;
}

/** Стилі автономної презентації (окремий файл, тому inline-CSS). */
const PRESENTATION_STYLES = `
        body { background: #e2e8f0; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 20px; gap: 20px; margin: 0; }
        .slide { width: 1000px; height: 562px; background: white; box-shadow: 0 5px 15px rgba(0,0,0,0.1); border-radius: 8px; padding: 40px; display: flex; flex-direction: column; box-sizing: border-box; }
        h1 { color: #005DF7; border-bottom: 2px solid #005DF7; padding-bottom: 10px; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 20px; }
        .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; text-align: center; border-radius: 8px; }
        .val { font-size: 36px; font-weight: bold; color: #005DF7; }
        .lab { font-size: 14px; color: #64748b; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 15px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 18px; }
        th { background: #005DF7; color: white; }
        .accent { color: #005DF7; font-weight: bold; }
    `;

/** Підписи фаз у презентації — історично відрізняються від PHASE_LABELS. */
const PRESENTATION_PHASE_LABELS = ['📖 Субботняя школа', '❓ Питання', '🙏 Молитви'] as const;

/** Слайд 1: загальні показники ефіру. */
function renderOverviewSlide(report: PhaseStatsReport, dateStr: string, currentBrand: string): string {
    const { overall, initialViewers } = report;
    return `    <div class="slide">
        <h1>📊 Загальна статистика: ${currentBrand}</h1>
        <p>Дата: <b>${dateStr}</b></p>
        <div style="background: #fff3cd; border-left: 5px solid #ffc107; padding: 15px; font-size: 18px;">
            👀 Глядачів, які очікували на старті ефіру: <b>${initialViewers}</b>
        </div>
        <div class="grid">
            <div class="card"><div class="val">${overall.max}</div><div class="lab">Пік онлайн</div></div>
            <div class="card"><div class="val">${overall.avg}</div><div class="lab">Середнє</div></div>
            <div class="card"><div class="val">${overall.median}</div><div class="lab">Медіана</div></div>
            <div class="card"><div class="val">${overall.min}</div><div class="lab">Мінімум</div></div>
        </div>
    </div>`;
}

/** Слайд 2: розподіл глядачів по фазах. */
function renderPhasesSlide(report: PhaseStatsReport): string {
    const phases = [report.st1, report.st2, report.st3];
    const rows = phases.map((phase, i) => `            <tr>
                <td>${PRESENTATION_PHASE_LABELS[i]}</td>
                <td class="accent">${phase.avg ?? '-'}</td>
                <td>${phase.max ?? '-'}</td>
                <td>${phase.median ?? '-'}</td>
            </tr>`).join('\n');

    return `    <div class="slide">
        <h1>📑 Розподіл по блоках (Фази)</h1>
        <table>
            <tr>
                <th>Фаза</th>
                <th>Середній онлайн</th>
                <th>Пік у фазі</th>
                <th>Медіана</th>
            </tr>
${rows}
        </table>
    </div>`;
}

/** Повний автономний HTML-документ презентації (два слайди). */
export function renderPresentationHtml(
    report: PhaseStatsReport,
    dateStr: string,
    currentBrand: string
): string {
    return `
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <title>Аналітика ефіру - ${currentBrand}</title>
    <style>${PRESENTATION_STYLES}</style>
</head>
<body>
${renderOverviewSlide(report, dateStr, currentBrand)}

${renderPhasesSlide(report)}
</body>
</html>`;
}
