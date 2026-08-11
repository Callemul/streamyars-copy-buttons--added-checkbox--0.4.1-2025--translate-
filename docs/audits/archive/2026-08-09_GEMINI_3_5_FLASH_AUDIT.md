# Звіт з аудиту конфігурації контролю версій (.gitignore)

**Дата аудиту:** 2026-08-09  
**Модель:** Gemini 3.5 Flash (Antigravity)  
**Проєкт:** streamyards-copy-buttons (Chrome Extension)  

---

## 1. Аналіз поточного стану репозиторію та стеку

### Стек проєкту:
- **Тип проєкту:** Chrome Extension (Manifest V3)
- **Мова:** TypeScript (`tsconfig.json`), JavaScript
- **Збирач та сервер розробки:** Vite (`vite.config.js` з `@crxjs/vite-plugin`)
- **Керування залежностями:** Node.js (`package.json`, `package-lock.json`, `node_modules/`)
- **Лінтер:** ESLint (`eslint.config.js`)
- **Бібліотеки:** Chart.js, jQuery (типи)
- **Тестування:** Власні тести під керуванням Node.js (`tests/*.test.js`)
- **Статичний аналіз:** Використання інструменту `fallow` для пошуку мертвого коду

---

## 2. Аналіз поточного вмісту `.gitignore`

Поточний файл `.gitignore` містить базові правила для:
- Залежностей (`node_modules/`)
- Папки збірки (`dist/`)
- Логів (`*.log`, `npm-debug.log*`, тощо)
- Налаштувань IDE (`.idea/`, `.vscode/`, `.swp`)
- Кешу ШІ (`.gemini/`, `.kilo/`, `.codebase-memory/`)
- Тимчасових файлів збірки Vite (`vite.config.js.timestamp-*`, `*.timestamp-*.mjs`)

### Проблеми, виявлені під час аналізу:
1. **Ігнорування не діє на вже відстежувані файли:**
   - Папка `node_modules/` повністю закоммічена у репозиторій Git, хоча вона прописана у `.gitignore`. Це призводить до роздуття репозиторію (більше 4000 файлів залежностей відстежуються!).
   - Тимчасові файли Vite (`vite.config.js.timestamp-1786261999955-d48fc3b16bff5.mjs`, `vite.config.js.timestamp-1786262400917-7577231b54fcd.mjs`) також відстежуються Git.
2. **Відсутність правил для результатів статичного аналізу та звітів:**
   - Звіти `fallow` (`fallow-targets.json`, `fallow_breakdown.json`, `fallow_final.json`, `health_report.json` тощо) відстежуються Git або висвічуються як untracked.
   - Тимчасові файли логів збірки/тестів (`build_final.txt`, `build_output.txt`, `lint_output.txt`, `test_output.txt` тощо) закоммічені у репозиторій.
3. **Відсутні важливі категорії:**
   - Локальні змінні оточення (`.env`, `.env.local`, тощо).
   - Кеш лінтерів та збирачів (`.eslintcache`, `.vite/`).
   - Файли чатів зі штучним інтелектом (наприклад, файл `чат з ШІ` у корені проєкту відстежується Git).

---

## 3. Рекомендовані зміни до `.gitignore`

Пропонується додати такі правила, розбиті за логічними блоками:

```gitignore
# ==========================================
# Local Environment Variables
# ==========================================
.env
.env.local
.env.*.local

# ==========================================
# Vite & Bundler cache/temp files
# ==========================================
.eslintcache
.vite/
.parcel-cache
.nuxt/

# ==========================================
# Static Analysis Reports & Tool Outputs
# ==========================================
# Fallow analysis reports
fallow-targets.json
fallow_*.json
.fallow-*.json
health_*.json
health_report.json

# Test, lint and build output logs (txt/log)
build_final.txt
build_output*.txt
lint_output*.txt
test_output*.txt

# ==========================================
# AI / Chat logs
# ==========================================
чат з ШІ
```

---

## 4. План дій з очищення репозиторію

Оскільки додавання правил до `.gitignore` не припинить відстеження файлів, які вже були закоммічені, необхідно виконати очищення індексу Git:

1. **Видалити залежності з репозиторію (зберегти локально):**
   ```bash
   git rm -r --cached node_modules
   ```
2. **Видалити тимчасові файли Vite:**
   ```bash
   git rm --cached vite.config.js.timestamp-*
   git rm --cached *.timestamp-*.mjs
   ```
3. **Видалити звіти статичного аналізу та логів:**
   ```bash
   git rm --cached fallow-targets.json
   git rm --cached fallow_*.json
   git rm --cached health_*.json
   git rm --cached health_report.json
   git rm --cached build_final.txt build_output*.txt lint_output*.txt test_output*.txt
   ```
4. **Видалити файли чатів з ШІ:**
   ```bash
   git rm --cached "чат з ШІ"
   ```
5. **Зробити комміт:**
   ```bash
   git commit -m "chore: update .gitignore and clean up untracked/junk files"
   ```
