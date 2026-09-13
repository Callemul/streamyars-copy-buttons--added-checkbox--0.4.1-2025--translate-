# Правила: тести

> Винесено з `AGENTS.md`. Загальний контекст — `docs/ARCHITECTURE.md` §6.

## 🩺 Happy DOM Mocking Rule

Проєкт використовує `happy-dom` (`tests/setup/happy-dom.ts`) для глобального DOM-середовища
в тестах. Через це властивості `window`, `location`, `document` та `localStorage` мають
рід-онлі геттери на `global`/`globalThis`. Заборонено їх перезаписувати прямим присвоєнням
(наприклад, `global.localStorage = ...`), оскільки це викличе `TypeError`.

Завжди використовуйте:

```js
Object.defineProperty(global, 'property', { value: ..., configurable: true, writable: true });
```

Приклад бойового використання — `tests/banner_modal_draft.test.js` (підміна `sessionStorage`,
що кидає виняток).

## 🧪 Синтаксис та запуск одиничних тестів

- Файли у `tests/*.test.js` виконуються нативним раннером Node.js **без компіляції TS**.
  Заборонено писати конструкції TypeScript (`as unknown as ...`, `type`, інтерфейси)
  всередині `.js`-тестів.
- Один тестовий файл запускається з повним набором лоадерів:

```bash
node --experimental-strip-types --import ./tests/ts_loader.js --import ./tests/setup/happy-dom.ts --test "tests/<name>.test.js"
```

- Повна перевірка перед комітом — `npm run verify` (typecheck → lint → check:architecture → test → build).
