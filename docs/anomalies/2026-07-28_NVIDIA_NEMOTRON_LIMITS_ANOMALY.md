# 📌 Аномалія: Падіння безкоштовних моделей (Nvidia Nemotron) у KiloCode після Repomix та обмеження 40 RPM

**Дата фіксації:** 2026-07-28  
**Середовище:** KiloCode / Roo Code / Cline (VS Code)  
**Моделі / API:** Nvidia NIM (`nvidia/nemotron-4-340b-instruct`), OpenRouter Free, Gemini Free  
**Статус:** Вивчено та задокументовано готові рішення.

---

## 1. 🚨 Опис проблеми та діагностика (Root Cause)

При використанні безкоштовних ключів Nvidia NIM у KiloCode (або Roo Code / Cline) регулярно виникає помилка:
```json
{
  "name": "APIError",
  "data": {
    "message": "Not Found",
    "statusCode": 404,
    "metadata": {
      "url": "https://integrate.api.nvidia.com/v1/chat/completions"
    }
  }
}
```

### Причини аномалії:
1. **Перевищення розміру тіла запиту (Payload Size Limit)**:
   - Файл `repomix-output.xml` стискає весь проєкт у ~350,000 токенів.
   - Безкоштовний шлюз Nvidia NIM розрахований максимум на **32,768 токенів (32k)** на один запит. Коли розширення надсилає 350k токенів, шлюз Nvidia скидає з'єднання або повертає код `404 Not Found` (переповнення буфера/маршрутизатора).
2. **Жорсткі Rate Limits (40 RPM та TPM)**:
   - Безкоштовний тариф Nvidia NIM обмежений **40 RPM (Requests Per Minute)** та малим TPM (Tokens Per Minute). 
   - 1–2 запити з великим контекстом миттєво вичерпують TPM.
3. **Чому доводиться бути "нянькою" (натискати "Continue"):**
   - Розширення KiloCode / Roo Code сприймають помилку `404` або перевищення Payload як **незворотну помилку (Permanent Failure)**, а не як тимчасову затримку мережі.
   - Через це автоматичний retry не спрацьовує, сесія зупиняється і чекає ручного клика користувача.

---

## 2. 💡 Чому в UI KiloCode немає галочки "Затримка 2 секунди"?

Популярні розширення VS Code (Roo Code, Cline, KiloCode) свідомо НЕ додають у свій UI або `settings.json` простий регулятор затримки між запитами, оскільки це руйнує інтерактивний UX при використанні платних API.

Для роботи з безкоштовними API з лімітом 40 RPM використовують спеціалізовані рішення.

---

## 3. 🛠️ Готові рішення для безперервної роботи (Без "няньчення")

### РІШЕННЯ 1 (Золотий стандарт): Локальний проксі LiteLLM з індивідуальними лімітами

**LiteLLM Proxy** запускається локально, приймає виклики від KiloCode на `http://localhost:4000`, ставить їх у чергу і самостійно робить паузи, не випускаючи жодної помилки 404/429 у VS Code.

#### Крок 1. Встановлення
```bash
pip install litellm
```

#### Крок 2. Конфігурація `config.yaml` з окремими лімітами та авто-каскадом (Fallback)
Створіть файл `config.yaml`:
```yaml
model_list:
  # 1. Nvidia NIM (Обмеження 30 RPM, 100k TPM)
  - model_name: nvidia-nemotron
    litellm_params:
      model: openai/nvidia/nemotron-4-340b-instruct
      api_base: https://integrate.api.nvidia.com/v1
      api_key: nvapi-ВАШ_КЛЮЧ_NVIDIA
      rpm: 30         # Власний ліміт RPM для Nvidia
      tpm: 100000     # Власний ліміт TPM
      max_retries: 3  # Скільки разів повторювати при помилці

  # 2. Google Gemini 2.0 Flash (Обмеження 14 RPM, 1M TPM)
  - model_name: gemini-flash
    litellm_params:
      model: gemini/gemini-2.0-flash-exp
      api_key: AIzaSy_ВАШ_КЛЮЧ_GEMINI
      rpm: 14         # Власний ліміт RPM
      tpm: 1000000    # Контекст 1,000,000 токенів!

router_settings:
  fallbacks:
    - nvidia-nemotron: ["gemini-flash"] # Якщо Nvidia перевищила RPM або вилетіла, запит автоматично йде на Gemini без зупинки VS Code!

litellm_settings:
  drop_params: true
```

#### Крок 3. Запуск LiteLLM
```bash
litellm --config config.yaml --port 4000
```

#### Крок 4. Підключення KiloCode / Roo Code / Cline у `settings.json`
```json
{
  "kilocode.apiProvider": "openai-compatible",
  "kilocode.openAiBaseUrl": "http://localhost:4000/v1",
  "kilocode.openAiApiKey": "sk-1234",
  "kilocode.openAiModelId": "nvidia-nemotron"
}
```

---

### РІШЕННЯ 2: Розширення Continue.dev (з вбудованим Debounce та Fallback)

Розширення **Continue.dev** (для VS Code / JetBrains) має вбудовану затримку та автоматичне перемикання моделей у `.continue/config.yaml`:

```yaml
name: My Config
version: 0.0.1
schema: v1

models:
  - name: Nvidia NIM (Primary)
    provider: openai
    model: nvidia/nemotron-4-340b-instruct
    apiBase: https://integrate.api.nvidia.com/v1
    apiKey: nvapi-YOUR_KEY
    
  - name: Gemini Flash (Automatic Fallback on 429/404)
    provider: gemini
    model: gemini-2.0-flash-exp
    apiKey: AIzaSy_YOUR_GEMINI_KEY

autocompleteOptions:
  debounceDelay: 1000 # Затримка 1 секунда між запитами
```

---

### РІШЕННЯ 3: Правильна робота з Repomix без перевантаження токенів

1. **Не надсилати сирий `repomix-output.xml` у чат при малих лімітах (32k)**.
2. **Використовувати Repomix як MCP-сервер**:
   Вказати в конфігу MCP розширення (`.roo/mcp.json` або `cline_mcp_settings.json`):
   ```json
   {
     "mcpServers": {
       "repomix": {
         "command": "npx",
         "args": ["-y", "repomix", "--mcp"]
       }
     }
   }
   ```
   Це дозволяє ШІ локально звертатися тільки до тих 5–10 рядків коду, які потрібні для поточної задачі, замість завантаження 350k токенів.
3. **Стиснення Repomix при ручному пакуванні**:
   ```bash
   npx repomix --compress --ignore "**/node_modules/**,**/dist/**,**/*.lock"
   ```
   Зменшує розмір з 350k токенів до 30–50k.
4. **Увімкнення `SWE-Pruner` у KiloCode**:
   У налаштуваннях *KiloCode Settings -> Experimental -> SWE-Pruner* (увімкнути прапорець). Він автоматично очищає великі виводи від інформаційного шуму.
