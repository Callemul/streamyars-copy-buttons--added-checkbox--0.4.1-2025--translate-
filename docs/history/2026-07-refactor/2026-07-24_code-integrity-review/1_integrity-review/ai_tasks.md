# 🤖 Задачі для AI-агентів — рефакторинг StreamYard Helper

> **Як використовувати:** Давайте агенту одну задачу за раз. Кожна задача — самодостатня, з повним контекстом.
> Після завершення задачі — перевірте результат і дайте наступну.

---

## Зміст

Задачі розбиті на 4 фази, кожна в окремому файлі:

| Фаза | Файл | Задачі | Опис |
|------|------|--------|------|
| 1 | [phase1_quick_wins.md](phase1_quick_wins.md) | 1.1–1.8 | XSS-фікс, permissions, версії, jQuery, clipboard, magic numbers, дублікати, CSS-класи |
| 2 | [phase2_architecture.md](phase2_architecture.md) | 2.1–2.5 | Vite бандлер, CSS extraction, lazy loading Chart.js, state/DOM separation, storage adapter |
| 3 | [phase3_quality.md](phase3_quality.md) | 3.1–3.6 | ESLint, тести, MutationObserver оптимізація, DOM polling, timezone баг, accessibility |
| 4 | [phase4_scaling.md](phase4_scaling.md) | 4.1–4.4 | TypeScript, i18n, Service Worker, Options Page |

---

## Порядок виконання

```
Фаза 1 (Quick Wins) → Фаза 2 (Архітектура) → Фаза 3 (Якість) → Фаза 4 (Масштабування)
```

- **Фаза 1** — швидкі виправлення, незалежні одне від одного
- **Фаза 2** — архітектурні зміни (деякі задачі залежать між собою: 2.1 → 2.2, 2.3)
- **Фаза 3** — покращення якості коду (залежить від Фази 2 частково)
- **Фаза 4** — опціональне масштабування (залежить від Фази 2)
