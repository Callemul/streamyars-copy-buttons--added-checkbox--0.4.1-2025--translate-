import { SYH_STORAGE, STORAGE_KEYS } from '../modules/storage';
import { CommentService } from '../modules/comment_service';
import type { StudioOverrideLogEntry } from '../modules/types';
import { validateImportedConfig, extractImportedItems } from './validation';
import { DEFAULT_OPTIONS, type OptionsState } from './defaults';
import { populateFormElements } from './form';

class OptionsController {
    private toastTimer: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        this.initNavigation();
        this.initEvents();
        this.loadSettings();
    }

    private initNavigation(): void {
        const navItems = document.querySelectorAll<HTMLButtonElement>('.nav-item');
        const sections = document.querySelectorAll<HTMLElement>('.content-section');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetId = item.getAttribute('data-target');
                navItems.forEach(n => n.classList.remove('active'));
                sections.forEach(s => s.classList.remove('active'));

                item.classList.add('active');
                if (targetId) {
                    const targetSec = document.getElementById(targetId);
                    if (targetSec) targetSec.classList.add('active');
                }
            });
        });
    }

    private initEvents(): void {
        const saveBtn = document.getElementById('saveTopBtn');
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveSettings());

        const exportBtn = document.getElementById('exportConfigBtn');
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportConfig());

        const importInput = document.getElementById('importConfigFile') as HTMLInputElement;
        if (importInput) importInput.addEventListener('change', (e) => this.importConfig(e));

        const resetBtn = document.getElementById('resetDefaultsBtn');
        if (resetBtn) resetBtn.addEventListener('click', () => this.resetDefaults());

        const copyLogBtn = document.getElementById('copyStudioLogBtn');
        if (copyLogBtn) copyLogBtn.addEventListener('click', () => this.copyStudioLog());

        const clearLogBtn = document.getElementById('clearStudioLogBtn');
        if (clearLogBtn) clearLogBtn.addEventListener('click', () => this.clearStudioLog());
    }

    private loadSettings(): void {
        SYH_STORAGE.get([STORAGE_KEYS.DB, STORAGE_KEYS.OPTIONS, STORAGE_KEYS.STUDIO_ENABLED], (result) => {
            const db = result[STORAGE_KEYS.DB] || {};
            const opts: Partial<OptionsState> = result[STORAGE_KEYS.OPTIONS] || {};
            populateFormElements(db, opts, DEFAULT_OPTIONS, result[STORAGE_KEYS.STUDIO_ENABLED]);
            this.loadStudioLog();
        });
    }

    private saveSettings(): void {
        const sschoolVal = (document.getElementById('optSschoolName') as HTMLInputElement)?.value.trim() || DEFAULT_OPTIONS.newTitleSS;
        const preachVal = (document.getElementById('optPreachName') as HTMLInputElement)?.value.trim() || DEFAULT_OPTIONS.newTitlePreach;
        const langVal = (document.getElementById('optLanguage') as HTMLSelectElement)?.value || DEFAULT_OPTIONS.ui_locale;
        const antiAfkVal = (document.getElementById('optAntiAfkEnabled') as HTMLInputElement)?.checked;
        const antiAfkIntervalVal = parseInt((document.getElementById('optAntiAfkInterval') as HTMLInputElement)?.value || '30', 10);
        const autoHealVal = (document.getElementById('optAutoHealEnabled') as HTMLInputElement)?.checked;
        const truncVal = parseInt((document.getElementById('optTruncationLength') as HTMLInputElement)?.value || '195', 10);
        const showCopyVal = (document.getElementById('optShowCopyButtons') as HTMLInputElement)?.checked;
        const compactSecondaryVal = (document.getElementById('optCompactSecondaryTabs') as HTMLInputElement)?.checked;
        const youtubeEnabledVal = (document.getElementById('optYouTubeEnabled') as HTMLInputElement)?.checked;
        const studioEnabledVal = (document.getElementById('optStudioEnabled') as HTMLInputElement)?.checked;

        SYH_STORAGE.get([STORAGE_KEYS.DB], (result) => {
            const currentDb = result[STORAGE_KEYS.DB] || {};
            currentDb.newTitleSS = sschoolVal;
            currentDb.newTitlePreach = preachVal;

            const newOptions: OptionsState = {
                newTitleSS: sschoolVal,
                newTitlePreach: preachVal,
                ui_locale: langVal,
                anti_afk_enabled: antiAfkVal,
                anti_afk_interval_sec: antiAfkIntervalVal,
                auto_heal_enabled: autoHealVal,
                text_truncation_length: truncVal,
                show_copy_buttons: showCopyVal,
                compact_secondary_tabs_default: compactSecondaryVal,
                youtube_enabled: youtubeEnabledVal,
                studio_enabled: studioEnabledVal
            };

            SYH_STORAGE.set({
                [STORAGE_KEYS.DB]: currentDb,
                [STORAGE_KEYS.OPTIONS]: newOptions,
                [STORAGE_KEYS.STUDIO_ENABLED]: studioEnabledVal
            }, () => {
                this.showToast('✅ Налаштування успішно збережено!');
            });
        });
    }

    private loadStudioLog(): void {
        SYH_STORAGE.get([STORAGE_KEYS.STUDIO_OVERRIDE_LOG], (res) => {
            const logs: StudioOverrideLogEntry[] = res[STORAGE_KEYS.STUDIO_OVERRIDE_LOG] || [];
            const tbody = document.getElementById('studioLogBody');
            if (!tbody) return;

            tbody.innerHTML = '';
            if (logs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="padding: 12px; text-align: center; color: var(--text-muted);">Записи у лозі відсутні</td></tr>';
                return;
            }

            logs.slice().reverse().forEach(entry => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid var(--border)';

                const timeTd = document.createElement('td');
                timeTd.style.padding = '6px 8px';
                timeTd.textContent = entry.timestamp ? new Date(entry.timestamp).toLocaleString('uk-UA') : '—';

                const chanTd = document.createElement('td');
                chanTd.style.padding = '6px 8px';
                chanTd.textContent = entry.channelLabel || entry.channelKey || '—';

                const videoTd = document.createElement('td');
                videoTd.style.padding = '6px 8px';
                videoTd.textContent = entry.videoTitle || '—';

                const autoTd = document.createElement('td');
                autoTd.style.padding = '6px 8px';
                autoTd.textContent = entry.autoDetectedSheet ? (entry.autoDetectedSheet) : 'Не визначено';

                const assignedTd = document.createElement('td');
                assignedTd.style.padding = '6px 8px';
                assignedTd.style.fontWeight = 'bold';
                assignedTd.textContent = entry.assignedSheet || '—';

                tr.appendChild(timeTd);
                tr.appendChild(chanTd);
                tr.appendChild(videoTd);
                tr.appendChild(autoTd);
                tr.appendChild(assignedTd);
                tbody.appendChild(tr);
            });
        });
    }

    private copyStudioLog(): void {
        SYH_STORAGE.get([STORAGE_KEYS.STUDIO_OVERRIDE_LOG], async (res) => {
            const logs: StudioOverrideLogEntry[] = res[STORAGE_KEYS.STUDIO_OVERRIDE_LOG] || [];
            if (logs.length === 0) {
                this.showToast('ℹ️ Лог порожній, нічого копіювати');
                return;
            }

            const lines = logs.map(entry => {
                const time = entry.timestamp ? new Date(entry.timestamp).toLocaleString('uk-UA') : '—';
                const channel = entry.channelLabel || entry.channelKey || '—';
                const auto = entry.autoDetectedSheet ? (entry.autoDetectedSheet) : 'Не визначено';
                const assigned = entry.assignedSheet || '—';
                return `[${time}] Канал: ${channel} | Відео: "${entry.videoTitle}" | Авто: ${auto} => Ручний вибір: ${assigned}`;
            });

            const textToCopy = `=== YouTube Studio Manual Override Log (${logs.length} записів) ===\n\n` + lines.join('\n');

            const success = await CommentService.copyToClipboard(textToCopy);
            if (success) {
                this.showToast('📋 Лог корекцій YouTube Studio скопійовано!');
            } else {
                alert('Не вдалося скопіювати лог в буфер обміну');
            }
        });
    }

    private clearStudioLog(): void {
        if (confirm('Очистити лог ручних корекцій категорій YouTube Studio?')) {
            SYH_STORAGE.set({ [STORAGE_KEYS.STUDIO_OVERRIDE_LOG]: [] }, () => {
                this.loadStudioLog();
                this.showToast('🗑 Лог Studio успішно очищено');
            });
        }
    }

    private exportConfig(): void {
        const allKeys = Object.values(STORAGE_KEYS);
        SYH_STORAGE.get(allKeys, (result) => {
            const exportData: Record<string, any> = {
                app: 'StreamYard Helper',
                timestamp: new Date().toISOString(),
                version: result[STORAGE_KEYS.VERSION] || '1.0.0',
                db: result[STORAGE_KEYS.DB] || {},
                syh_options: result[STORAGE_KEYS.OPTIONS] || DEFAULT_OPTIONS
            };

            for (const key of allKeys) {
                if (result[key] !== undefined) {
                    exportData[key] = result[key];
                }
            }

            const jsonStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `streamyard_helper_config_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);

            this.showToast('📥 Налаштування та стан успішно експортовано');
        });
    }

    private importConfig(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target?.result as string);
                if (validateImportedConfig(imported)) {
                    const itemsToSave = extractImportedItems(imported);

                    SYH_STORAGE.set(itemsToSave, () => {
                        this.loadSettings();
                        this.showToast('📤 Налаштування та стан успішно імпортовано!');
                    });
                } else {
                    alert('Некоректний формат файлу конфігурації.');
                }
            } catch {
                alert('Помилка при зчитуванні JSON файлу.');
            }
        };
        reader.readAsText(file);
    }

    private resetDefaults(): void {
        if (confirm('Ви впевнені, що хочете скинути всі налаштування до стандартних?')) {
            SYH_STORAGE.set({
                [STORAGE_KEYS.DB]: { newTitleSS: DEFAULT_OPTIONS.newTitleSS, newTitlePreach: DEFAULT_OPTIONS.newTitlePreach },
                [STORAGE_KEYS.OPTIONS]: DEFAULT_OPTIONS
            }, () => {
                this.loadSettings();
                this.showToast('⚠️ Налаштування скинуто до початкових!');
            });
        }
    }

    private showToast(msg: string): void {
        const toast = document.getElementById('toastNotification');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');

        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

export { validateImportedConfig, DEFAULT_OPTIONS, type OptionsState, populateFormElements };

if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', () => {
        new OptionsController();
    });
}