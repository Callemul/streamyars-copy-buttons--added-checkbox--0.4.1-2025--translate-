# Сесія 1C — eval() → Vite import (Chart.js)

## Контекст
Chrome Extension MV3, Vite + TS.
Верифікація: `npm run lint && npm run test && npm run build`

## Скоуп
Читай і змінюй ТІЛЬКИ: `modules/stats_exporter.ts` (+ `package.json` якщо потрібен npm install)
**Якщо код не збігається з описом — ЗУПИНИСЬ і доповідь.**

## Формат звіту
- Змінено: `файл` → `функція/блок`
- Кожен критерій приймання: ✅ або ❌
- Повний вивід верифікації

---

## H4: eval() — блокер Chrome Web Store (~2 год)

**Файл:** `modules/stats_exporter.ts` (~рядок 165)

**Проблема:** Chart.js завантажується через `fetch()` + `(0, eval)(scriptText)`. У MV3 `eval()` заборонений CSP → Chrome Web Store відхилить.

**Рішення (обери один варіант):**

**Варіант A — Vite бандлер (рекомендовано):**
```typescript
// npm install chart.js
import { Chart } from 'chart.js/auto';
```

**Варіант B — статичний скрипт:**
```json
// manifest.json → web_accessible_resources:
{ "resources": ["lib/chart.min.js"], "matches": ["<all_urls>"] }
```
```typescript
const script = document.createElement('script');
script.src = chrome.runtime.getURL('lib/chart.min.js');
document.head.appendChild(script);
```

**Приймання:**
- [ ] `npm run build` без помилок
- [ ] Графіки статистики рендеряться
- [ ] 0 штук `eval()`, `new Function()`, `setTimeout(string)` у зібраному коді
- [ ] CSP в manifest.json без `unsafe-eval`
