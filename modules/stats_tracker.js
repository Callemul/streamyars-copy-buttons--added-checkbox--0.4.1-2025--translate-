window.SYH_STATS_TRACKER = {
    intervalId: null,
    currentBrand: "DefaultShow",
    chartInstance: null,

    init: function() {
        this.setupObservers();
        this.startTracking();
    },

    setupObservers: function() {
        const self = this;
        
        // Вставляємо кнопки в шапку: Фази + Аналітика
        function injectHeaderButtons() {
            const headerCenter = document.querySelector('[data-testid="header-center"]');
            const statusWrap = document.querySelector('[data-testid="header-status-wrap"]');
            
            if (headerCenter && statusWrap && !document.getElementById('syh-header-controls')) {
                headerCenter.style.display = 'flex';
                headerCenter.style.alignItems = 'center';
                headerCenter.style.flexDirection = 'row';

                const btnContainer = document.createElement('div');
                btnContainer.id = 'syh-header-controls';
                btnContainer.style.cssText = 'display: flex; gap: 8px; margin: 0 15px; flex-shrink: 0; z-index: 100;';

                // Кнопка фіксації блоку питань
                const btnQ = document.createElement('button');
                btnQ.innerText = '❓ Старт: Питання';
                btnQ.title = 'Натисни, коли починається блок питань';
                btnQ.style.cssText = 'background: #f39c12; color: white; border: none; border-radius: 4px; padding: 0 10px; cursor: pointer; font-weight: bold; font-size: 12px; height: 28px; transition: 0.2s;';
                btnQ.onclick = () => self.markPhase('questions', btnQ);

                // Кнопка фіксації блоку молитов
                const btnP = document.createElement('button');
                btnP.innerText = '🙏 Старт: Молитви';
                btnP.title = 'Натисни, коли починається молитовний блок';
                btnP.style.cssText = 'background: #005DF7; color: white; border: none; border-radius: 4px; padding: 0 10px; cursor: pointer; font-weight: bold; font-size: 12px; height: 28px; transition: 0.2s;';
                btnP.onclick = () => self.markPhase('prayers', btnP);

                // Кнопка Аналітики
                const btnAnalytics = document.createElement('button');
                btnAnalytics.id = 'syh-analytics-btn';
                btnAnalytics.innerText = '📈 Аналітика';
                btnAnalytics.style.cssText = 'background: #28a745; color: white; border: none; border-radius: 4px; padding: 0 12px; cursor: pointer; font-weight: bold; font-size: 13px; height: 28px; margin-left: 10px;';
                btnAnalytics.onclick = () => self.showAnalyticsModal();

                btnContainer.appendChild(btnQ);
                btnContainer.appendChild(btnP);
                btnContainer.appendChild(btnAnalytics);

                headerCenter.insertBefore(btnContainer, statusWrap);
                
                // Перевіряємо, чи вже зафіксовані фази в базі, щоб змінити текст кнопок
                self.restoreButtonStates(btnQ, btnP);
            }
        }

        setTimeout(injectHeaderButtons, 1000); 
        const uiObserver = new MutationObserver(() => injectHeaderButtons());
        uiObserver.observe(document.body, { childList: true, subtree: true });
    },

    restoreButtonStates: function(btnQ, btnP) {
        const today = new Date().toISOString().split('T')[0];
        const self = this;
        chrome.storage.local.get(['syh_stream_charts'], function(result) {
            const db = result.syh_stream_charts || {};
            if (db[self.currentBrand] && db[self.currentBrand][today]) {
                if (db[self.currentBrand][today].phase_questions_start) {
                    btnQ.innerText = '✅ Питання';
                    btnQ.style.opacity = '0.7';
                }
                if (db[self.currentBrand][today].phase_prayers_start) {
                    btnP.innerText = '✅ Молитви';
                    btnP.style.opacity = '0.7';
                }
            }
        });
    },

    markPhase: function(phase, btnElement) {
        const timerWrapper = document.querySelector('div[class*="Timer__TimerWrapper"]');
        if (!timerWrapper) {
            alert("Ефір ще не розпочався (немає таймера)!");
            return;
        }
        
        const timerText = timerWrapper.innerText.replace(/\n/g, '').trim();
        const today = new Date().toISOString().split('T')[0];
        const self = this;

        chrome.storage.local.get(['syh_stream_charts'], function(result) {
            let db = result.syh_stream_charts || {};
            if (!db[self.currentBrand]) db[self.currentBrand] = {};
            if (!db[self.currentBrand][today]) db[self.currentBrand][today] = { data: [] };

            if (phase === 'questions') {
                db[self.currentBrand][today].phase_questions_start = timerText;
                btnElement.innerText = '✅ Питання';
            } else if (phase === 'prayers') {
                db[self.currentBrand][today].phase_prayers_start = timerText;
                btnElement.innerText = '✅ Молитви';
            }
            btnElement.style.opacity = '0.7';

            chrome.storage.local.set({ 'syh_stream_charts': db });
        });
    },

    startTracking: function() {
        const self = this;
        
        this.intervalId = setInterval(() => {
            const liveTag = document.querySelector('span[class*="Tags__LiveTag"]');
            if (!liveTag) return; 

            const brandNode = document.querySelector('.BrandSelect__BrandNameText-sc-16g9tfx-1');
            if (brandNode) self.currentBrand = brandNode.innerText.trim();

            const timerWrapper = document.querySelector('div[class*="Timer__TimerWrapper"]');
            const timerText = timerWrapper ? timerWrapper.innerText.replace(/\n/g, '').trim() : "0:00";

            const viewerEl = document.querySelector('p[class*="ViewerCount__StatText"]');
            const viewerCount = viewerEl ? parseInt(viewerEl.innerText.trim(), 10) : 0;

            if (isNaN(viewerCount)) return;

            const today = new Date().toISOString().split('T')[0];

            chrome.storage.local.get(['syh_stream_charts'], function(result) {
                let db = result.syh_stream_charts || {};
                
                if (!db[self.currentBrand]) db[self.currentBrand] = {};
                if (!db[self.currentBrand][today]) db[self.currentBrand][today] = { data: [] };

                const session = db[self.currentBrand][today];
                
                // Фіксуємо кількість людей, які очікували на старті (перший запис)
                if (session.initial_viewers === undefined && session.data.length === 0) {
                    session.initial_viewers = viewerCount;
                }

                const lastEntry = session.data[session.data.length - 1];
                if (lastEntry && lastEntry.time === timerText) return;

                session.data.push({
                    time: timerText,
                    viewers: viewerCount
                });

                chrome.storage.local.set({ 'syh_stream_charts': db });
            });
        }, 60000); 
    },

    showAnalyticsModal: function() {
        if (document.getElementById('syh-chart-modal')) return;

        const modalHtml = `
            <div id="syh-chart-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 999999; display: flex; align-items: center; justify-content: center;">
                <div style="background: #1B1F29; border-radius: 12px; width: 900px; max-width: 95vw; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); color: white;">
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="margin: 0; font-size: 20px;">📈 Аналітика: <span style="color: #005DF7;">${this.currentBrand}</span></h2>
                        <button id="syh-close-chart" style="background: none; border: none; color: #aaa; font-size: 24px; cursor: pointer; padding: 0 10px;">&times;</button>
                    </div>

                    <div style="display: flex; gap: 10px; margin-bottom: 20px; align-items: center;">
                        <label style="font-size: 14px; color: #ccc;">Порівняти з:</label>
                        <select id="syh-compare-select" style="padding: 6px; border-radius: 4px; background: #2A303C; color: white; border: 1px solid #4F5461; outline: none; cursor: pointer;">
                            <option value="none">--- Ні ---</option>
                        </select>
                        <button id="syh-dl-csv-btn" style="background: #4F5461; color: white; border: none; border-radius: 4px; padding: 6px 15px; cursor: pointer; font-weight: bold; margin-left: auto;">CSV</button>
                        <button id="syh-dl-pres-btn" style="background: #005DF7; color: white; border: none; border-radius: 4px; padding: 6px 15px; cursor: pointer; font-weight: bold;">📄 Презентація (HTML)</button>
                    </div>

                    <div style="position: relative; height: 400px; width: 100%;">
                        <canvas id="syhChartCanvas"></canvas>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('syh-close-chart').onclick = () => {
            document.getElementById('syh-chart-modal').remove();
            if (this.chartInstance) this.chartInstance.destroy();
        };

        this.loadChartData();
    },

    loadChartData: function() {
        const self = this;
        const today = new Date().toISOString().split('T')[0];

        chrome.storage.local.get(['syh_stream_charts'], function(result) {
            const db = result.syh_stream_charts || {};
            const brandData = db[self.currentBrand] || {};
            
            const select = document.getElementById('syh-compare-select');
            const dates = Object.keys(brandData).filter(d => d !== today).sort().reverse();
            
            dates.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d;
                opt.innerText = d;
                select.appendChild(opt);
            });

            self.renderChart(brandData[today], null);

            select.onchange = (e) => {
                const pastDate = e.target.value;
                const pastData = pastDate !== 'none' ? brandData[pastDate] : null;
                self.renderChart(brandData[today], pastData);
            };

            document.getElementById('syh-dl-csv-btn').onclick = () => self.exportCSV(brandData[today], today);
            document.getElementById('syh-dl-pres-btn').onclick = () => self.exportPresentation(brandData[today], today);
        });
    },

    renderChart: function(todayData, pastData) {
        if (this.chartInstance) this.chartInstance.destroy();

        if (!todayData || !todayData.data || todayData.data.length === 0) {
            const ctx = document.getElementById('syhChartCanvas').getContext('2d');
            ctx.font = "16px Arial";
            ctx.fillStyle = "#aaa";
            ctx.fillText("Немає даних.", 20, 50);
            return;
        }

        const labels = todayData.data.map(d => d.time);
        const viewersToday = todayData.data.map(d => d.viewers);

        const datasets = [
            {
                label: 'Глядачі (Сьогодні)',
                data: viewersToday,
                borderColor: '#005DF7',
                backgroundColor: 'rgba(0, 93, 247, 0.1)',
                type: 'line',
                yAxisID: 'y',
                fill: true,
                tension: 0.4
            }
        ];

        if (pastData && pastData.data) {
            const viewersPast = labels.map(time => {
                const p = pastData.data.find(d => d.time === time);
                return p ? p.viewers : null;
            });
            datasets.push({
                label: 'Глядачі (Минулий раз)',
                data: viewersPast,
                borderColor: '#888',
                borderDash: [5, 5],
                type: 'line',
                yAxisID: 'y',
                tension: 0.4
            });
        }

        if (typeof Chart === 'undefined') return;

        const ctx = document.getElementById('syhChartCanvas').getContext('2d');
        
        // Лінії для відміток фаз на графіку
        const plugins = [];
        const createLine = (label, value, color) => ({
            id: label,
            beforeDraw: chart => {
                const index = labels.indexOf(value);
                if (index === -1) return;
                const xAxis = chart.scales.x;
                const yAxis = chart.scales.y;
                const x = xAxis.getPixelForTick(index);
                const ctx = chart.ctx;
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(x, yAxis.top);
                ctx.lineTo(x, yAxis.bottom);
                ctx.lineWidth = 2;
                ctx.strokeStyle = color;
                ctx.stroke();
                ctx.fillStyle = color;
                ctx.fillText(label, x + 5, yAxis.top + 15);
                ctx.restore();
            }
        });

        if (todayData.phase_questions_start) plugins.push(createLine('Питання', todayData.phase_questions_start, '#f39c12'));
        if (todayData.phase_prayers_start) plugins.push(createLine('Молитви', todayData.phase_prayers_start, '#28a745'));

        this.chartInstance = new Chart(ctx, {
            data: { labels: labels, datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { ticks: { color: '#ccc' } },
                    y: { type: 'linear', display: true, position: 'left', ticks: { color: '#ccc' } }
                }
            },
            plugins: plugins
        });
    },

    exportCSV: function(dataObj, dateStr) {
        if (!dataObj || !dataObj.data) return;
        let csv = "data:text/csv;charset=utf-8,\uFEFFЧас Ефіру,Глядачі\n";
        dataObj.data.forEach(row => csv += `${row.time},${row.viewers}\n`);
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csv));
        link.setAttribute("download", `StreamStats_${this.currentBrand}_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    calcStats: function(arr) {
        if (!arr || arr.length === 0) return { min: 0, max: 0, avg: 0, median: 0 };
        const sum = arr.reduce((a, b) => a + b, 0);
        const avg = Math.round(sum / arr.length);
        const max = Math.max(...arr);
        const min = Math.min(...arr);
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
        return { min, max, avg, median };
    },

    exportPresentation: function(dataObj, dateStr) {
        if (!dataObj || !dataObj.data || dataObj.data.length === 0) return;

        const allViewers = dataObj.data.map(d => d.viewers);
        const overall = this.calcStats(allViewers);
        const initialViewers = dataObj.initial_viewers || allViewers[0] || 0;

        // Розбиваємо по фазах
        let p1 = [], p2 = [], p3 = [];
        let tQ = dataObj.phase_questions_start || "99:99:99";
        let tP = dataObj.phase_prayers_start || "99:99:99";

        dataObj.data.forEach(d => {
            // Просте порівняння строк часу працює, якщо формат H:MM:SS або MM:SS консистентний, 
            // але для надійності конвертуємо в секунди:
            const toSec = t => t.split(':').reverse().reduce((prev, curr, i) => prev + parseInt(curr) * Math.pow(60, i), 0);
            const sTime = toSec(d.time);
            const sQ = toSec(tQ);
            const sP = toSec(tP);

            if (sTime < sQ) p1.push(d.viewers);
            else if (sTime >= sQ && sTime < sP) p2.push(d.viewers);
            else p3.push(d.viewers);
        });

        const st1 = this.calcStats(p1);
        const st2 = this.calcStats(p2);
        const st3 = this.calcStats(p3);

        const htmlTemplate = `
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <title>Аналітика ефіру - ${this.currentBrand}</title>
    <style>
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
    </style>
</head>
<body>
    <div class="slide">
        <h1>📊 Загальна статистика: ${this.currentBrand}</h1>
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
    </div>

    <div class="slide">
        <h1>📑 Розподіл по блоках (Фази)</h1>
        <table>
            <tr>
                <th>Фаза</th>
                <th>Середній онлайн</th>
                <th>Пік у фазі</th>
                <th>Медіана</th>
            </tr>
            <tr>
                <td>📖 Субботняя школа</td>
                <td class="accent">${st1.avg || '-'}</td>
                <td>${st1.max || '-'}</td>
                <td>${st1.median || '-'}</td>
            </tr>
            <tr>
                <td>❓ Питання</td>
                <td class="accent">${st2.avg || '-'}</td>
                <td>${st2.max || '-'}</td>
                <td>${st2.median || '-'}</td>
            </tr>
            <tr>
                <td>🙏 Молитви</td>
                <td class="accent">${st3.avg || '-'}</td>
                <td>${st3.max || '-'}</td>
                <td>${st3.median || '-'}</td>
            </tr>
        </table>
    </div>
</body>
</html>`;

        const blob = new Blob([htmlTemplate], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Presentation_${this.currentBrand}_${dateStr}.html`;
        link.click();
    }
};