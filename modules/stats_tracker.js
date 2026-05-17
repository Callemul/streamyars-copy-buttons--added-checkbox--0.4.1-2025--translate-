window.SYH_STATS_TRACKER = {
    intervalId: null,
    
    init: function() {
        this.startTracking();
        this.injectExportButton();
    },

    startTracking: function() {
        // Запускаємо перевірку кожні 60 секунд (60000 мілісекунд)
        this.intervalId = setInterval(() => this.recordStats(), 60000);
    },

    recordStats: function() {
        // Перевіряємо, чи ми взагалі зараз в ефірі (шукаємо плашку LIVE)
        const liveTag = document.querySelector('span[class*="Tags__LiveTag"]');
        if (!liveTag) return; // Якщо не в ефірі - нічого не пишемо

        // Шукаємо час ефіру
        const timerWrapper = document.querySelector('div[class*="Timer__TimerWrapper"]');
        const timerText = timerWrapper ? timerWrapper.innerText.trim() : "0:00";

        // Шукаємо кількість глядачів
        const viewerEl = document.querySelector('p[class*="ViewerCount__StatText"]');
        const viewerCount = viewerEl ? parseInt(viewerEl.innerText.trim(), 10) : 0;

        if (isNaN(viewerCount)) return;

        // Формуємо дати
        const today = new Date().toISOString().split('T')[0]; // Наприклад: "2026-05-16"
        const realTime = new Date().toLocaleTimeString('uk-UA'); // Наприклад: "22:15:30"

        // Зберігаємо в пам'ять розширення
        chrome.storage.local.get(['syh_stream_stats'], function(result) {
            let allStats = result.syh_stream_stats || {};
            
            if (!allStats[today]) {
                allStats[today] = [];
            }
            
            // Захист від дублів (якщо ефір завис)
            const lastEntry = allStats[today][allStats[today].length - 1];
            if (lastEntry && lastEntry.streamTime === timerText) return;

            // Додаємо новий запис
            allStats[today].push({
                realTime: realTime,
                streamTime: timerText,
                viewers: viewerCount
            });

            chrome.storage.local.set({ 'syh_stream_stats': allStats });
        });
    },

    injectExportButton: function() {
        const observer = new MutationObserver(() => {
            // Шукаємо блок кнопок керування відео (там де кнопка Fullscreen)
            const controlsWrapper = document.querySelector('div[class*="styled__VideoRightControlsWrapper"]');
            
            if (controlsWrapper && !document.getElementById('syh-export-stats-btn')) {
                const btn = document.createElement('button');
                btn.id = 'syh-export-stats-btn';
                btn.innerText = '📊 CSV';
                btn.title = 'Скачати статистику ефіру';
                
                btn.style.cssText = `
                    background: #28a745; 
                    color: white; 
                    border: none; 
                    border-radius: 4px;
                    padding: 4px 10px; 
                    margin-right: 15px; 
                    cursor: pointer; 
                    font-weight: bold;
                    height: 24px;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                `;
                
                btn.onclick = () => this.exportCSV();
                
                // Вставляємо кнопку ПЕРЕД кнопкою Fullscreen
                controlsWrapper.insertBefore(btn, controlsWrapper.firstChild);
            }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    },

    exportCSV: function() {
        const today = new Date().toISOString().split('T')[0];
        
        chrome.storage.local.get(['syh_stream_stats'], function(result) {
            const allStats = result.syh_stream_stats || {};
            const todayStats = allStats[today];

            if (!todayStats || todayStats.length === 0) {
                alert("Немає даних за сьогодні. Ефір ще не йшов або статистика ще не зібралась (зачекайте 1 хвилину після старту).");
                return;
            }

            // Додаємо BOM (\uFEFF), щоб Excel нормально читав кирилицю
            let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
            csvContent += "Реальний час,Час ефіру,Глядачі онлайн\n";

            todayStats.forEach(row => {
                csvContent += `${row.realTime},${row.streamTime},${row.viewers}\n`;
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Stream_Stats_${today}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
};