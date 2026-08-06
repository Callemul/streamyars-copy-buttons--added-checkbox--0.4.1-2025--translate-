# Аудит Системи Воркфлоу Агентів — Мета-Аудит

**Дата:** 2026-08-04  
**Аудітор:** KiloCode_Laguna_S_2.1 (`poolside/laguna-s-2.1:free`)  
**Метод:** Повний незалежний аудит динамічними інструментами (grep, glob, read) — жодних кешованих файлів або попередніх аудитів не використовувався. Аудітовано: AGENTS.md, `.kilocoderules`, `.clinerules`, `.cursorrules`, `.blackboxrules`, `.kilocodeignore`, `.clineignore`, глобальний `kilo.jsonc`, `agents/*.md`, `.agents/skills/chrome-extension-guidance/SKILL.md`, `litellm-config.yaml`, `@kilocode/plugin` package.json, структуру `docs/` та `.kilo/`.

---

## 1. Що підключено (Inventory)

| Компонент | Шлях | Розмір | Статус |
|-----------|------|--------|--------|
| **AGENTS.md** | project root | 110 рядків | Активний, джерело істини |
| **.kilocoderules** | project root | 7 рядків | Thin wrapper |
| **.clinerules** | project root | 7 рядків | Thin wrapper |
| **.cursorrules** | project root | 7 рядків | Thin wrapper |
| **.blackboxrules** | project root | 7 рядків | Thin wrapper |
| **.kilocodeignore** | project root | 8 рядків | Активний |
| **.clineignore** | project root | 8 рядків | Дублікат |
| **Глобальний kilo.jsonc** | `~/.config/kilo/kilo.jsonc` | 496 рядків | Активний |
| **Agent definitions** | `~/.config/kilo/agents/*.md` | 5 файлів | Активні |
| **Skill** | `.agents/skills/chrome-extension-guidance/SKILL.md` | 48 рядків | Потенційно непрацює |
| **@kilocode/plugin** | `.kilo/node_modules/@kilocode/plugin/` | SDK | Інфраструктурний |
| **litellm-config.yaml** | project root | 164 рядки | Gitignored |
| **MCP конфігурація** | (не знайдено) | — | **ВІДСУТНЯ** |

---

## 2. Виявлені проблеми (Findings)

### 2.1 ❌ Масова дублікація rule-файлів (CRITICAL)

Чотири файли містять майже ідентичний вміст:

| Файл | Header | Використовується? |
|------|--------|-------------------|
| `.kilocoderules` | "FOR KILOCODE" | ✅ Так |
| `.clinerules` | "FOR CLINE & KILOCODE" | ❌ Cline не використовується |
| `.cursorrules` | "FOR AI EXTENSIONS (CURSOR / BLACKBOX / CLINE / KILOCODE)" | ❌ Cursor, Blackbox не використовуються |
| `.blackboxrules` | "FOR BLACKBOX AI" | ❌ Blackbox не використовується |

**Кожен файл повторює:** "Read AGENTS.md", "Use dynamic tools (grep, glob, read)", "Follow AGENTS.md protocol".

**Ризик:** Якщо AGENTS.md оновлюється, треба оновлювати 4 файли = 5 джерел істини.

### 2.2 ❌ Дублікація architect agent instructions (HIGH)

Інструкції для `architect` агента дублюються:
1. **`kilo.jsonc`** рядки 20-42: inline JSON `prompt` (скорочене, trunc на 2000 символів)
2. **`agents/architect.md`**: повний prompt (63 рядки)

**Ризик:** Агенти можуть працювати з різними інструкціями.

### 2.3 ❌ Plaintext API key у litellm-config.yaml (SECURITY CRITICAL)

```yaml
api_key: ***REMOVED-NVIDIA-API-KEY***
```
- Ключ повторюється в **8 різних model entries**
- Файл gitignored, але в усьому іншій копіях/бекапах вимикається

### 2.4 ❌ 50+ невикористаних моделей у глобальній конфігурації (BLOAT)

`kilo.jsonc` містить 496 рядків, з них ~480 — це визначення моделей у `nvidia2` provider. **Лише 2 моделі** (`nemotron-3-ultra-550b-a55b`, `deepseek-v4-pro`) використовуються в agent definitions.

### 2.5 ❌ MCP: відсутній, але дозволений для code-skeptic (ARCHITECTURAL GAP)

- `code-skeptic` має `mcp: allow`, але **жодного** MCP сервера налаштовано
- AGENTS.md забороняє `repompack-output.xml`, а anomaly docs радять Repomack як MCP — але MCP не налаштовано
- створює розрив між рекомендаціями та реальністю

### 2.6 ❌ Skill: chrome-extension-guidance — локальний, не доступний through KiloCode skills API (MEDIUM)

- `.agents/` — це **локальний** каталог проєкту
- KiloCode шукає skills у **глобальному** `~/.agents/skills/`
- Цей skill **не може бути завантажений** через `skill` tool
- Багато інструкцій дублюються з system prompt
- Code-skeptic посилається на "actor system", якого немає ніде у коді

### 2.7 ❌ Плагін @kilocode/plugin — інфраструктурний, не project-level (LOW)

- `.kilo/package.json` має лише `@kilocode/plugin: 7.4.16` — це SDK для KiloCode розширення
- `.kilo/.gitignore` ігнорує `package.json` → конфіг не commit-иться
- AGENTS.md посилається на `.kilo/command/*.md` та `.kilo/agent/*.md` — **жодного такого файлу не існує**

### 2.8 ❌ Хаос у docs/ аудит-документації (BLOAT)

**`docs/audits/archive/`:** 11 файлів, з них:
- 3 порушують naming convention: `AUDIT.md`, `TASKS.md`, `2026-08-02 From Sonnet 5 High.md`
- 2 дублікати: `Nemotron_AI_TASKS.md` (дублікат `Nemotron_TASKS.md`), `AUDIT 2.md` (дублікат основного аудиту)

**`docs/рефактор/`:** 30+ файлів "audit battle" документації (порівняння Gemini моделей, оцінка Opus, deprecated плани, session logs). Це **контекстний шум** для будь-якого майбутнього аудиту.

### 2.9 ❌ Hardcoded external directory permission (SECURITY MEDIUM)

```jsonc
"external_directory": {
    "D:\\Chrome Extension\\Gemini-Deep-Research-Helper-v2\\src\\assets\\*": "allow"
}
```
Дає доступ до **іншого проєкту** через KiloCode.

### 2.10 ❌ markdown-files agent: free tier inconsistency (LOW)

```jsonc
"markdown-files": {
    "model": "kilo/nvidia/nemotron-3-ultra-550b-a55b:free"
}
```
Використовує `:free` тариф, хоча інші агенти використовують `high`.

---

## 3. Таблиця: Що вирізати

| # | Компонент | Пріоритет | Дія |
|---|-----------|-----------|-----|
| 1 | `.blackboxrules` | CRITICAL | Видалити |
| 2 | `.cursorrules` | CRITICAL | Видалити |
| 3 | `.clinerules` | HIGH | Видалити (клеви проєкт — KiloCode) |
| 4 | `.clineignore` | HIGH | Видалити (дублікат `.kilocodeignore`) |
| 5 | Inline `prompt` для architect у kilo.jsonc | HIGH | Видалити (залишити agents/architect.md) |
| 6 | Дублікат `Nemotron_AI_TASKS.md` | MEDIUM | Видалити |
| 7 | Дублікат `AUDIT 2.md` | MEDIUM | Видалити |
| 8 | `AUDIT.md` + `TASKS.md` (без дат) | MEDIUM | Перейменувати або видалити |
| 9 | `2026-08-02 From Sonnet 5 High.md` | LOW | Перейменувати |
| 10 | `docs/рефактор/2026-08-01/` (audit battle) | MEDIUM | Архівувати .zip або видалити |
| 11 | Plaintext API key у litellm-config.yaml | CRITICAL | env vars + приклад файл |
| 12 | `external_directory` permission у kilo.jsonc | HIGH | Видалити |
| 13 | 50+ невикористаних моделей у nvidia2 | HIGH | Мінімізувати до 2-3 |
| 14 | Wildcard fallback models у litellm-config.yaml | HIGH | Видалити `nvidia/*` та `"*"` |
| 15 | `markdown-files` agent (free tier) | LOW | Видалити або змінити модель |
| 16 | `.kilo/.gitignore` (ігнорує package.json) | MEDIUM | Виправити або видалити |

---

## 4. План дій (Action Plan)

### Фаза 1: Security Hardening (CRITICAL)

- [ ] **1.1** Замінити plaintext API key у `litellm-config.yaml` на `${NVIDIA_API_KEY}` env var. Створити `litellm-config.example.yaml` як шаблон.
- [ ] **1.2** Видалити `external_directory` permission з `~/.config/kilo/kilo.jsonc`.
- [ ] **1.3** Видалити wildcard fallback patterns (`nvidia/*`, `"*"`) з `litellm-config.yaml`.

### Фаза 2: Consolidate Rule Files (HIGH)

- [ ] **2.1** Видалити `.blackboxrules`, `.cursorrules`, `.clinerules`.
- [ ] **2.2** Видалити `.clineignore` (дублікат `.kilocodeignore`).
- [ ] **2.3** Видалити inline `prompt` для `architect` у `kilo.jsonc`. Залишити лише `agents/architect.md` як джерело істини.

### Фаза 3: Config Cleanup (HIGH)

- [ ] **3.1** Мінімізувати `nvidia2` provider у `kilo.jsonc` до 2-3 використовуваних моделей.
- [ ] **3.2** Мінімізувати `litellm-config.yaml` до 2-3 model entries (nemotron-3-ultra, deepseek-v4-pro, fallback).
- [ ] **3.3** Видалити або виправити `markdown-files` agent.

### Фаза 4: Documentation Hygiene (MEDIUM)

- [ ] **4.1** Видалити дублікати аудитів: `Nemotron_AI_TASKS.md`, `AUDIT 2.md`.
- [ ] **4.2** Перейменувати порушників naming convention: `AUDIT.md` → `2026-07-28_Antigravity_AUDIT.md`, `TASKS.md` → `2026-07-28_Antigravity_TASKS.md` (або видалити якщо дублікати існують).
- [ ] **4.3** Архівувати `docs/рефактор/2026-08-01/` у `.zip`.
- [ ] **4.4** Створити `docs/audits/active/` каталог (має існувати для current audits за AGENTS.md protocol).
- [ ] **4.5** Додати `docs/audits/README.md` з naming convention та інструкціями.

### Фаза 5: Infrastructure (MEDIUM)

- [ ] **5.1** Налаштувати MCP Repomack сервер (додати `.mcp.json` або `mcp.json` у проєкт).
- [ ] **5.2** Виправити `.kilo/.gitignore` — дозволити commit `package.json` та `agent-manager.json`.
- [ ] **5.3** Перенести `chrome-extension-guidance` skill у глобальне `~/.agents/skills/` каталог.

### Фаза 6: Verification (після всіх змін)

```bash
# 1. Перевірити правила
ls .kilocoderules .kilocodeignore  # тільки ці 2

# 2. Перевірити naming convention аудитів
find docs/audits/ -name "*.md" | grep -vE "^\d{4}-\d{2}-\d{2}_[^_]+_(AUDIT|TASKS)\.md$"  # повинно видати пусто

# 3. Перевірити відсутність API key
grep -r "nvapi-" litellm-config.yaml  # повинно видати пусто (крім .example)

# 4. Перевірити відсутність external_directory
grep "external_directory" ~/.config/kilo/kilo.jsonc  # повинно видати пусто

# 5. Перевірити структуру
find docs/ -type f | wc -l  # повинно зменшитися ~30 файлів
```

---

## 5. Найбільш критичні ризики (Top 5)

| # | Ризик | Вплив | Дія |
|---|-------|-------|-----|
| 1 | Plaintext API key у litellm-config.yaml | Витік коштів | env vars |
| 2 | 4 дублікатних rule файли | Drift інструкцій | Видалити 3 з 4 |
| 3 | `docs/рефактор/` audit battle (30+ файлів) | Контекстний шум для аудитів | Архівувати |
| 4 | Дублікат аудит-файлів | Плутанина при re-audit | Видалити |
| 5 | External directory permission | Доступ до іншого проєкту | Видалити |

---

*Аудіт виконано незалежно за протоколом AGENTS.md. Жодних кешованих файлів або попередніх аудитів не використовувався.*
