window.SYH_STATS_TRACKER = {
    intervalId: null,
    currentBrand: "DefaultShow",
    chartInstance: null,
    prayerMarkedThisMinute: false,

    init: function() {
        this.setupObservers();
        this.startTracking();
    },

    registerPrayerMarker: function() {
        this.prayerMarkedThisMinute = true;
        console.log("[SYH] Автоматичну відмітку молитви зафіксовано для графіка!");
    },

    setupObservers: function() {
        const self = this;
        
        // Функція для вставки кнопки в ШАПКУ (Header)
        function injectAnalyticsButton() {
            // Шукаємо центральний блок шапки та блок статусу
            const headerCenter = document.querySelector('[data-testid="header-center"]');
            const statusWrap = document.querySelector('[data-testid="header-status-wrap"]');
            const existingBtn = document.getElementById('syh-analytics-btn');
            
            // Якщо блоки існують, а кнопки ще немає
            if (headerCenter && statusWrap && !existingBtn) {
                const btnAnalytics = document.createElement('button');
                btnAnalytics.id = 'syh-analytics-btn';
                btnAnalytics.innerText = '📈 Аналітика';
                btnAnalytics.title = 'Відкрити графіки ефіру';
                
                // Стилізація для шапки
                btnAnalytics.style.cssText = `
                    background: #005DF7; 
                    color: white; 
                    border: none; 
                    border-radius: 4px; 
                    padding: 0 12px; 
                    cursor: pointer; 
                    font-weight: bold; 
                    font-size: 13px; 
                    height: 28px; 
                    display: inline-flex; 
                    align-items: center; 
                    margin: 0 15px; 
                    transition: background 0.2s;
                    flex-shrink: 0; 
                    z-index: 100;
                `;
                
                btnAnalytics.onmouseenter = () => btnAnalytics.style.background = '#004BD6';
                btnAnalytics.onmouseleave = () => btnAnalytics.style.background = '#005DF7';
                
                btnAnalytics.onclick = () => self.showAnalyticsModal();
                
                // Вирівнюємо елементи в шапці
                headerCenter.style.display = 'flex';
                headerCenter.style.alignItems = 'center';
                headerCenter.style.flexDirection = 'row';

                // Вставляємо кнопку РІВНО МІЖ назвою та статусом
                headerCenter.insertBefore(btnAnalytics, statusWrap);
            }
        }

        // Запускаємо одразу
        setTimeout(injectAnalyticsButton, 1000); 

        // Спостерігач для динамічного оновлення
        const uiObserver = new MutationObserver(() => {
            injectAnalyticsButton();
        });
        
        uiObserver.observe(document.body, { childList: true, subtree: true });
    },

    startTracking: function() {
        const self = this;
        
        this.intervalId = setInterval(() => {
            // Перевіряємо, чи ми зараз LIVE
            const liveTag = document.querySelector('span[class*="Tags__LiveTag"]');
            if (!liveTag) return; 

            // Бренд (програма)
            const brandNode = document.querySelector('.BrandSelect__BrandNameText-sc-16g9tfx-1');
            if (brandNode) self.currentBrand = brandNode.innerText.trim();

            // Таймер
            const timerWrapper = document.querySelector('div[class*="Timer__TimerWrapper"]');
            const timerText = timerWrapper ? timerWrapper.innerText.replace(/\n/g, '').trim() : "0:00";

            // Глядачі (з того самого блоку, що ти скинув)
            const viewerEl = document.querySelector('p[class*="ViewerCount__StatText"]');
            const viewerCount = viewerEl ? parseInt(viewerEl.innerText.trim(), 10) : 0;

            if (isNaN(viewerCount)) return;

            const today = new Date().toISOString().split('T')[0];

            chrome.storage.local.get(['syh_stream_charts'], function(result) {
                let db = result.syh_stream_charts || {};
                
                if (!db[self.currentBrand]) db[self.currentBrand] = {};
                if (!db[self.currentBrand][today]) db[self.currentBrand][today] = { data: [], markers: [] };

                const session = db[self.currentBrand][today];
                const lastEntry = session.data[session.data.length - 1];
                
                // Захист від подвійного запису
                if (lastEntry && lastEntry.time === timerText) return;

                session.data.push({
                    time: timerText,
                    viewers: viewerCount
                });
                
                if (self.prayerMarkedThisMinute) {
                    session.markers.push(timerText);
                    self.prayerMarkedThisMinute = false; 
                }

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
                        <h2 style="margin: 0; font-size: 20px;">📈 Аналітика ефіру: <span style="color: #005DF7;">${this.currentBrand}</span></h2>
                        <button id="syh-close-chart" style="background: none; border: none; color: #aaa; font-size: 24px; cursor: pointer; padding: 0 10px;">&times;</button>
                    </div>

                    <div style="display: flex; gap: 15px; margin-bottom: 20px; align-items: center;">
                        <label style="font-size: 14px; color: #ccc;">Порівняти з минулим ефіром:</label>
                        <select id="syh-compare-select" style="padding: 6px; border-radius: 4px; background: #2A303C; color: white; border: 1px solid #4F5461; outline: none; cursor: pointer;">
                            <option value="none">--- Не порівнювати ---</option>
                        </select>
                        <button id="syh-dl-csv-btn" style="background: #28a745; color: white; border: none; border-radius: 4px; padding: 6px 15px; cursor: pointer; font-weight: bold; margin-left: auto; transition: 0.2s;">📥 Завантажити CSV</button>
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

            document.getElementById('syh-dl-csv-btn').onclick = () => {
                self.exportCSV(brandData[today], today);
            };
        });
    },

    renderChart: function(todayData, pastData) {
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        if (!todayData || !todayData.data || todayData.data.length === 0) {
            const ctx = document.getElementById('syhChartCanvas').getContext('2d');
            ctx.font = "16px Arial";
            ctx.fillStyle = "#aaa";
            ctx.fillText("Немає даних. Ефір ще не йшов або Ви ще не були LIVE жодної хвилини.", 20, 50);
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

        if (typeof Chart === 'undefined') {
            alert("Помилка: Бібліотека Chart.js не завантажена. Перевірте, чи є файл lib/chart.js");
            return;
        }

        const ctx = document.getElementById('syhChartCanvas').getContext('2d');
        this.chartInstance = new Chart(ctx, {
            data: { labels: labels, datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { ticks: { color: '#ccc' } },
                    y: { 
                        type: 'linear', display: true, position: 'left',
                        title: { display: true, text: 'Глядачі онлайн', color: '#005DF7' },
                        ticks: { color: '#ccc' }
                    }
                },
                plugins: {
                    legend: { labels: { color: 'white' } },
                    tooltip: {
                        callbacks: {
                            afterBody: function(context) {
                                const time = context[0].label;
                                if (todayData.markers && todayData.markers.includes(time)) {
                                    return '\n📍 БУЛА ВІДМІТКА (Молитва/Подяка)';
                                }
                                return '';
                            }
                        }
                    }
                }
            }
        });
    },

    exportCSV: function(dataObj, dateStr) {
        if (!dataObj || !dataObj.data) return;
        let csv = "data:text/csv;charset=utf-8,\uFEFFЧас Ефіру,Глядачі,Відмітка\n";
        
        dataObj.data.forEach(row => {
            const hasMarker = (dataObj.markers && dataObj.markers.includes(row.time)) ? "ТАК" : "";
            csv += `${row.time},${row.viewers},${hasMarker}\n`;
        });

        const encodedUri = encodeURI(csv);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `StreamStats_${this.currentBrand}_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};