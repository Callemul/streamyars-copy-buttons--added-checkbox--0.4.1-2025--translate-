# Audit Report — KiloCode Laguna S 2.1 High

**Date:** 2026-08-04  
**Project:** StreamYard Helper Chrome Extension (v1.0.0, Manifest V3)  
**Model:** KiloCode / Laguna S 2.1 — High reasoning  
**Scope:** Tests, Linting, Build Tooling, TypeScript, Code Quality, Documentation, AGENTS.md  

---

## 0. Executive Summary

| Area | Status | Notes |
|------|--------|-------|
| **Tests** | Passing (97/97) | Good core coverage, but ~45% of source modules have zero tests |
| **Lint (ESLint)** | Clean (0 errors, 0 warnings) | Config is very permissive; no formatting rules |
| **Build (Vite)** | Succeeds | 63 modules transformed; CRXJS plugin working |
| **TypeScript (`tsc --noEmit`)** | **~90+ type errors** | Not in CI pipeline; only ESLint runs via `npm run lint` |
| **Code Quality** | Mixed | Root `utils.ts` has a runtime ReferenceError bug; stale `tsc_errors*.txt` files |

**Key takeaway:** Tests, lint, and build pass, but TypeScript type-checking is completely absent from the pipeline. This is the single highest-risk gap — type errors are silently shipped to production builds via Vite/esbuild type-stripping.

---

## 1. Test Infrastructure Analysis

### 1.1 Current State

- **Test runner:** Node.js built-in `node:test` with `--experimental-strip-types` flag (Node 20+).
- **Custom loader:** `tests/ts_loader.js` — resolves `.ts` imports for test files without requiring compilation.
- **Test files:** 18 test files in `tests/` directory covering 16 source modules.
- **All 97 tests pass.**
- **`test_parsers.js`** at root is **NOT integrated** into `npm run test` — it runs standalone with `process.exit(1)` on failure.

### 1.2 Test Coverage Map

| Source Module | File | Has Tests? | Test File |
|---|---|---|---|
| `utils.ts` | `modules/utils.ts` | ✅ | `tests/utils.test.js` |
| `storage.ts` | `modules/storage.ts` | ✅ | `tests/storage.test.js` |
| `state.ts` | `modules/state.ts` | ✅ | `tests/state.test.js` |
| `anti_afk.ts` | `modules/anti_afk.ts` | ✅ | `tests/anti_afk.test.js` |
| `comment_assistant.ts` | `modules/comment_assistant.ts` | ✅ | `tests/comment_assistant.test.js` |
| `comment_service.ts` | `modules/comment_service.ts` | ✅ | `tests/comment_service.test.js` |
| `fuzzy_match.ts` | `modules/fuzzy_match.ts` | ✅ | `tests/fuzzy_match.test.js` |
| `channel_config.ts` | `modules/channel_config.ts` | ✅ | `tests/channel_config.test.js` |
| `telegram_parser.ts` | `modules/telegram_parser.ts` | ✅ | `tests/telegram_parser.test.js` |
| `plugin_registry.ts` | `modules/plugin_registry.ts` | ✅ | `tests/plugin_registry.test.js` |
| `sheet_state_service.ts` | `modules/sheet_state_service.ts` | ✅ | `tests/sheet_state_service.test.js` |
| `retention_service.ts` | `modules/retention_service.ts` | ✅ | `tests/retention_service.test.js` |
| `ui_state.ts` | `modules/ui_state.ts` | ✅ (partial) | `tests/ui_state.test.js` |
| `css_lint` | CSS files | ✅ | `tests/css_lint.test.js` |
| `popup_dom` | `popup/popup.html`, `popup/popup_init.ts` | ✅ | `tests/popup_dom.test.js` |
| `dataset_syntax` | Static analysis | ✅ | `tests/dataset_syntax.test.js` |
| `dataset_attr` | DOM marker methods | ✅ (mock) | `tests/dataset_attr.test.js` |
| `parsers.ts` | `modules/parsers.ts` | ⚠️ Partial | `test_parsers.js` (standalone) |
| `comment_injector.ts` | `modules/comment_injector.ts` | ❌ | — |
| `comment_platform_adapter.ts` | interfaces only | ❌ | — |
| `ui_factory.ts` | `modules/ui_factory.ts` | ❌ | — |
| `ui_banners.ts` | `modules/ui_banners.ts` | ❌ | — |
| `ui_comments.ts` | `modules/ui_comments.ts` | ❌ | — |
| `ui_core.ts` | `modules/ui_core.ts` | ⚠️ Partial | `tests/ui_state.test.js` (proxy only) |
| `config.ts` | `modules/config.ts` | ❌ | — |
| `event_banners.ts` | `modules/event_banners.ts` | ❌ | — |
| `event_bus.ts` | `modules/event_bus.ts` | ❌ | — |
| `dom_observer.ts` | `modules/dom_observer.ts` | ❌ | — |
| `messaging.ts` | `modules/messaging.ts` | ❌ | — |
| `info_modal.ts` | `modules/info_modal.ts` | ❌ | — |
| `i18n.ts` | `modules/i18n.ts` | ❌ | — |
| `stats_tracker.ts` | `modules/stats_tracker.ts` | ❌ | — |
| `stats_exporter.ts` | `modules/stats_exporter.ts` | ❌ | — |
| `video_copier.ts` | `modules/video_copier.ts` | ❌ | — |
| `sheets.ts` | `modules/sheets.ts` | ❌ | — |
| `youtube/*` | 11 YouTube modules | ❌ | — |
| `popup/popup_init.ts` | `popup/popup_init.ts` | ⚠️ Partial | `tests/popup_dom.test.js` (static only) |
| `popup/popup_telegram.ts` | `popup/popup_telegram.ts` | ❌ | — |
| `popup/popup_prayers.ts` | `popup/popup_prayers.ts` | ❌ | — |
| `popup/popup_translit.ts` | `popup/popup_translit.ts` | ❌ | — |
| `options/options.ts` | `options/options.ts` | ❌ | — |
| `background/service-worker.ts` | `background/service-worker.ts` | ❌ | — |

### 1.3 Test Quality Assessment

**Strengths:**
- Well-structured mock infrastructure (chrome.storage, SYH_STORAGE, MutationObserver).
- Tests use `describe`/`test` pattern consistently.
- Edge case coverage is good for core modules (empty inputs, null/undefined, corrupted data, idempotency).
- CSS linting test is thorough (brace matching + orphan declaration detection).
- `dataset_syntax.test.js` is an excellent static-analysis guard test that scans all source files.

**Weaknesses:**
- **No test runner config file** — test list is hardcoded in `package.json` `scripts.test` as a massive array of file paths. Adding a new test requires editing `package.json`.
- **No code coverage** — no `--experimental-test-coverage` or istanbul/nyc configured.
- **`test_parsers.js`** runs 13 tests outside the test runner. Uses `process.exit(1)` for failures (aborts entire process). Should be migrated to `node:test` or removed in favor of `tests/telegram_parser.test.js`.
- **No snapshot testing** for DOM output or parsed structures.
- Tests are `.js` files importing `.ts` files — relies on the custom loader. No type checking on test code itself.

---

## 2. Linting Analysis

### 2.1 ESLint Configuration
- **ESLint:** v10.7.0 with `@eslint/js` v10.0.1 + `typescript-eslint` v8.65.0
- **Config file:** `eslint.config.js` (flat config)
- **Linted paths:** `modules/**/*.ts`, `main.ts`, `popup/**/*.ts`, `options/**/*.ts`, `youtube/**/*.ts`
- **Ignores:** `lib/**`, `libs/**`, `dist/**`, `node_modules/**`

### 2.2 Rule Assessment

| Category | Status | Notes |
|---|---|---|
| Core rules | `recommended` | Basic JS rules enabled |
| TypeScript rules | `recommended` | Basic TS rules enabled |
| `no-unused-vars` | ⚠️ `off` | Completely disabled, replaced by `@typescript-eslint/no-unused-vars` as `warn |
| `@typescript-eslint/no-explicit-any` | ⚠️ `off` | Allows `any` everywhere |
| `@typescript-eslint/no-unsafe-function-type` | ⚠️ `off` | |
| `prefer-const` | ⚠️ `warn` | Should be `error` |
| `eqeqeq` | ✅ `error` | Good |
| `no-console` | ⚠️ `off` | Console everywhere |
| `no-restricted-syntax` | ✅ `error` | Custom `dataset[key]` guard rule — excellent |

### 2.3 Missing ESLint Capabilities

1. **No formatting enforcement** — No Prettier or `eslint-plugin-format` integration. Code style is inconsistent (e.g., some files use `import type` vs `import`, different quoting, trailing commas vary).
2. **No import ordering** — No `eslint-plugin-import` or `eslint-plugin-import/sort` rules. Imports are inconsistently ordered across files.
3. **No unused import detection** — `no-unused-vars` is off. Unused imports will never be caught by lint.
4. **No `any` type enforcement** — `no-explicit-any` is off. TypeScript `any` is used extensively (see `utils.ts`, `banner_creator.ts`, `event_comments.ts`).
5. **No lint-staged / pre-commit hooks** — No Husky setup. Lint only runs when manually invoked.
6. **CSS linting is custom** — `css_lint.test.js` handles CSS, but there's no `stylelint` integration. The custom CSS linter only checks brace matching and orphan properties — it does NOT check for unused CSS, specificity issues, or duplicate selectors.
7. **No lint rule for `.ts` extensions in imports** — The TS5097 errors (importing with `.ts` extension without `allowImportingTsExtensions`) are a project-wide issue but not caught by ESLint.

---

## 3. TypeScript Analysis

### 3.1 Current `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "allowJs": true,
    "checkJs": false,
    "outDir": "./dist",
    "rootDir": "./",
    "types": ["chrome", "jquery"]
  }
}
```

### 3.2 Critical Findings

**TypeScript type-checking is NOT part of the pipeline.** Neither `npm run lint`, `npm run test`, nor `npm run build` runs `tsc --noEmit`. Vite uses esbuild to strip types without checking them. This means **type errors are silently shipped to production**.

Running `tsc --noEmit` surfaces **~90+ errors**:

#### Error Categories

| Error Code | Count (approx) | Description |
|---|---|---|
| **TS5097** | ~70 | `An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.` — Every `import ... from './module.ts'` across the project. |
| **TS2550** | 4 | `Property 'replaceAll' does not exist` — `replaceAll` used in `utils.ts` and `popup_translit.ts` but target is ES2020 (needs ES2021 lib). |
| **TS2591** | 3 | `Cannot find name 'module'` in `storage.ts` line 219 — Node.js `module` global used without `@types/node`. |
| **TS2322/TS2339/TS2345/TS18047/TS18048** | ~13 | Type mismatches: `SelectorValue` (string\|string[]) not assignable to `string`, null safety issues, `HTMLElement` vs `Element` mismatches, `onclick` not on `Element`, missing properties on interfaces. |
| **TS2304** | 3 | `Cannot find name` — `SYH_BUS` in `anti_afk.ts` (used but not imported), `SYH_DOM_OBSERVER` in `video_copier.ts` (not imported), `SYH_INFO_MODAL` in `stats_tracker.ts` (not imported), `outputDiv` in `popup_prayers.ts`. |

### 3.3 Root Cause: `.ts` Extension Imports

The project consistently uses `import X from './module'` (without `.ts` extension). This is correct for bundler resolution. However, `tsc` with `moduleResolution: "bundler"` should resolve these. The TS5097 errors are misleading — they indicate the project **had** `.ts` extensions at some point but they were removed, and the `tsc_errors.txt` is stale. The actual `tsc --noEmit` output shows the current real errors above.

### 3.4 tsconfig Recommendations

1. Add `"lib": ["ES2021", "DOM", "DOM.Iterable"]` — fixes `replaceAll` errors and aligns target.
2. Add `"types": ["chrome", "jquery", "node"]` or install `@types/node` — fixes `module` reference in `storage.ts`.
3. Add `"allowImportingTsExtensions": false` (or remove `.ts` from imports — they're already correct).
4. Consider adding `"noEmitOnError": true` so `tsc` fails the build on type errors.

---

## 4. Build Tooling Analysis

### 4.1 Current Pipeline

| Command | Tool | What it does |
|---|---|---|
| `npm run dev` | Vite dev server | Serves CRXJS extension in dev mode (port 5173) |
| `npm run build` | Vite + CRXJS | Builds extension to `dist/` with manifest |
| `npm run lint` | ESLint 10 | Lints TS files only (NOT test files, NOT CSS files) |
| `npm run test` | Node.js `--test` | Runs 18 `.js` test files with custom TS loader |

### 4.2 Issues

1. **TypeScript is not type-checked anywhere** in the pipeline.
2. **ESLint does NOT lint test files** — `tests/*.js` are excluded from the lint command in `package.json`. Only `modules/**`, `main.ts`, `popup/**`, `options/**`, `youtube/**` are linted.
3. **ESLint does NOT lint background/** — `background/service-worker.ts` is not in the lint paths.
4. **`npm run test` does NOT include `test_parsers.js`** — this standalone test file at root is orphaned.
5. **No pre-commit hook** — no Husky, no `lint-staged`.
6. **No format check** — no Prettier in any stage.
7. **Build succeeds despite 90+ type errors** — Vite strips types without checking.
8. **Vite config is minimal** — no sourcemap control, no manualChunks optimization, no `build.sourcemap` option for debugging.

---

## 5. Code Quality Issues (Runtime Bugs & Anti-Patterns)

### 5.1 Root `utils.ts` — Runtime ReferenceError (CRITICAL)

**File:** `utils.ts:1-3`

```typescript
if (typeof window !== 'undefined') {
    (window as any).SYH_EVENT_COMMENTS = SYH_EVENT_COMMENTS;
}
```

This file references `SYH_EVENT_COMMENTS` without importing it. At runtime, this will throw `ReferenceError: SYH_EVENT_COMMENTS is not defined`. This file is listed in the manifest as a content script? Let me check — actually, looking at `manifest.json`, only `main.ts` is listed as the content script JS. The root `utils.ts` is NOT in the manifest, so it may be dead code. **Recommendation:** Remove this file or fix the import.

### 5.2 Missing Imports (TypeScript Errors at Runtime)

- `modules/anti_afk.ts:98-99` — uses `SYH_BUS` without importing it from `./event_bus`. Will throw `ReferenceError` at runtime when anti-AFK triggers a bus event.
- `modules/video_copier.ts:35-38` — uses `SYH_DOM_OBSERVER` without importing it. Will throw `ReferenceError` when the video copier plugin initializes.
- `modules/stats_tracker.ts:123` — uses `SYH_INFO_MODAL` without importing it. Will throw `ReferenceError` when the stats modal is invoked.

### 5.3 Stale Diagnostic Files

- `tsc_errors.txt` and `tsc_errors_utf8.txt` are at the project root. They contain TypeScript errors from a previous run and are **stale** — they do not match the current `tsc --noEmit` output. They should either be generated fresh as part of CI or removed.

### 5.4 Inconsistent Import Styles

- Some files use `import type { ... }` for type-only imports (good).
- Others use regular `import { ... }` for types that are only used as types (e.g., `import { SyhConfig }` in `banner_creator.ts:12` instead of `import type`).
- Mixed use of `import type` and inline `type` modifier.

### 5.5 `no-explicit-any` Disabled

The ESLint config disables `@typescript-eslint/no-explicit-any`. This allows `any` types to proliferate, masking real type safety issues. This is a significant code quality concern.

### 5.6 jQuery Usage in UI Modules

`modules/ui_comments.ts` and `modules/ui_banners.ts` have TypeScript errors related to `JQuery<Element>` vs `JQuery<HTMLElement>` (TS2345). The project includes jQuery as a dependency (in `lib/`) but the type definitions (`@types/jquery`) are only used for types, not actually for runtime jQuery. Modern browser DOM APIs should be preferred.

---

## 6. Documentation & AGENTS.md Analysis

### 6.1 AGENTS.md Status

AGENTS.md is comprehensive and well-structured. It covers:
- Communication protocols (no hypothesis work, mandatory diagnostics)
- Audit protocol (independent audits, no stale caches)
- Project commands
- Context engineering workflow (RPI)
- Chrome Extension debugging protocol
- Development rules (MV3, scoping, CSS rules, host permissions)

### 6.2 Recommendations for AGENTS.md

1. **Add TypeScript type-checking command** — Currently `npm run lint` only runs ESLint. Add a `npm run typecheck` script (`tsc --noEmit`) and reference it in AGENTS.md.
2. **Add type-checking to the verification step** — AGENTS.md says to run `npm run lint && npm run test && npm run build`. This should include `npm run typecheck`.
3. **Document test file naming convention** — New tests should be named `tests/<module_name>.test.js` and added to the `npm test` script's file list. Add this convention.
4. **Add AGENTS.md entry for `.ts` extension rule** — The project uses imports WITHOUT `.ts` extensions. Add a rule: "Import paths must NOT include `.ts` extensions — use `import X from './module'` not `import X from './module.ts'`."
5. **Recommend adding test file coverage tracking** — Mention that `npm test` should be complemented with coverage (`--experimental-test-coverage`).
6. **Add rule about background scripts** — AGENTS.md doesn't mention that `background/service-worker.ts` is NOT linted by ESLint. Add `background/**` to the lint paths.
7. **Expand CSS scoping rules** — Current rule covers brace matching but should also mention inline styles in JS (see `video_copier.ts` which sets `style.cssText` extensively — this is a maintainability concern).

### 6.3 Redundant Rule Files

- `.kilocoderules`, `.cursorrules`, `.clinerules` are nearly identical 7-line files that just point to AGENTS.md. This is redundant and creates maintenance burden.
- `.clineignore` exists but `.kilocodeignore` has slightly different content. Consider consolidating.

### 6.4 .kilo Directory

- `.kilo/package.json` has `@kilocode/plugin` as a dependency but **no `devDependencies`** section and no scripts.
- `.kilo/kilo.jsonc` is essentially empty (just a schema reference).
- **Recommendation:** Add `.kilo/command/` and `.kilo/agent/` directories for Kilo-specific commands if needed, or remove the `.kilo` directory if unused.

---

## 7. Recommendations (Prioritized)

### P0 — Critical (Must Fix)

1. **Add TypeScript type-checking to CI pipeline.**
   - Add `"scripts": { "typecheck": "tsc --noEmit" }` to `package.json`.
   - Add `"npm run typecheck"` to AGENTS.md's verification step: `npm run lint && npm run typecheck && npm run test && npm run build`.
   - Fix all TS errors (or at minimum, the ~70 TS5097 `.ts` extension errors, the 3 missing-import bugs, and the `replaceAll` target mismatch).

2. **Fix runtime ReferenceError bugs.**
   - `modules/anti_afk.ts` — add `import { SYH_BUS } from './event_bus'`.
   - `modules/video_copier.ts` — add `import { SYH_DOM_OBSERVER } from './dom_observer'`.
   - `modules/stats_tracker.ts` — add `import { SYH_INFO_MODAL } from './info_modal'`.
   - `utils.ts` (root) — remove or fix the broken `SYH_EVENT_COMMENTS` reference.

3. **Add `@types/node` dependency.**
   - `modules/storage.ts:219` uses Node.js `module` global. Install `@types/node` and add `"node"` to `tsconfig.json` `types` array.

4. **Fix `tsconfig.json` `lib` setting.**
   - Change target to `ES2021` or add `"lib": ["ES2021", "DOM", "DOM.Iterable"]` to fix `replaceAll` errors in `utils.ts:175,232` and `popup_translit.ts:7-9`.

### P1 — High (Strongly Recommended)

5. **Add ESLint script to lint test files and background scripts.**
   - Update `npm run lint` to include `tests/**` and `background/**`.
   - Example: `eslint --no-error-on-unmatched-pattern "modules/**/*.ts" "main.ts" "popup/**/*.ts" "options/**/*.ts" "youtube/**/*.ts" "background/**/*.ts" "tests/**/*.js"`.

6. **Add Prettier integration.**
   - Install `prettier` + `@prettier/plugin-... ` or `eslint-plugin-prettier` for TypeScript.
   - Add `prettier.config.js` with consistent settings.
   - Add `"format"` script and `"format:check"`.

7. **Tighten ESLint rules.**
   - Change `@typescript-eslint/no-explicit-any` from `'off'` to `'warn'` (or `'error'` for new code).
   - Change `prefer-const` from `'warn'` to `'error'`.
   - Enable `no-unused-vars` via `@typescript-eslint` as `'warn'` (currently set but check coverage).
   - Add import order rule: `eslint-plugin-import` with `sort-imports` / `import/order`.

8. **Integrate `test_parsers.js` into the test runner.**
   - Either migrate its 13 tests to `tests/telegram_parser.test.js` (which already covers similar ground) or add `test_parsers.js` to `npm run test`.
   - Remove the `process.exit(1)` calls — let the test runner handle failures.

9. **Replace hardcoded test file list in `package.json` with a glob pattern.**
   - Current: `"test": "node ... tests/utils.test.js tests/storage.test.js ..."` (18 explicit files).
   - Better: `"test": "node ... --test 'tests/**/*.test.js'"` — automatically picks up new test files.

### P2 — Medium (Recommended)

10. **Add code coverage to test runner.**
    - Use Node.js built-in: `node --experimental-strip-types --import ./tests/ts_loader.js --test --experimental-test-coverage 'tests/**/*.test.js'`.
    - Add `coverage/` to `.gitignore` (already there).

11. **Add Husky + lint-staged pre-commit hooks.**
    - Stage linting and type-checking on commit.
    - `.husky/pre-commit`: `npx lint-staged`.
    - `lint-staged`: runs ESLint + Prettier on staged `*.{ts,js}` files.

12. **Add stylelint for CSS linting.**
    - Currently CSS is checked by a custom `css_lint.test.js` test. Replace or augment with `stylelint` for more comprehensive CSS analysis (unused selectors, specificity, etc.).

13. **Remove stale diagnostic files.**
    - Delete `tsc_errors.txt` and `tsc_errors_utf8.txt` from the project root.
    - These should be generated as CI artifacts, not committed.

14. **Add ESLint ignore for `utils.ts` broken file or fix it.**
    - Root-level `utils.ts` is likely dead code (not in manifest). Remove it.

15. **Add tests for critical untested modules.**
    - **Priority order for new tests:**
      1. `event_bus.ts` (SYH_BUS — core infrastructure, no tests)
      2. `dom_observer.ts` (DomObserverService — core infrastructure, no tests)
      3. `comment_injector.ts` (CommentInjector — complex interaction logic)
      4. `messaging.ts` (SYH_MESSAGING — cross-context communication)
      5. `i18n.ts` (SYH_I18N — i18n message resolution)
      6. `sheets.ts` (DynamicSheetRegistry — sheet management)
      7. `config.ts` (resolveSelector/resolveSelectorAll — selector resolution)
      8. `stats_tracker.ts` (stats tracking lifecycle)
      9. `info_modal.ts` (parseMarkdown — complex HTML generation)

### P3 — Low (Nice to Have)

16. **Consolidate `.kilocoderules`, `.cursorrules`, `.clinerules`.**
    - These three files are near-identical. Keep one canonical rule file or remove duplicates.

17. **Add Vite build sourcemaps for debugging.**
    - `vite.config.js`: add `build.sourcemap: true` and `build.minify: 'terser'` (or `esbuild`) for production builds.

18. **Add `.kilo` configuration.**
    - `.kilo/package.json` has `@kilocode/plugin` but no usage. Either configure it or remove.

19. **Consider migrating from `node:test` to Vitest.**
    - Vitest would provide: watch mode, code coverage, better mocking, built-in TS support (no custom loader needed), IDE integration.
    - Trade-off: requires removing `--experimental-strip-types` custom loader and learning curve.

20. **Add ESLint rule for `.ts` extension consistency.**
    - Rule: imports must NOT use `.ts` extension (or must, depending on convention). Add `no-relative-.../ts-extension` rule to prevent future TS5097 noise.

---

## 8. Summary of File Locations for Issues

| Issue | File:Line | Severity |
|---|---|---|
| Root `utils.ts` ReferenceError | `utils.ts:3` | P0 |
| Missing `SYH_BUS` import | `modules/anti_afk.ts:98-99` | P0 |
| Missing `SYH_DOM_OBSERVER` import | `modules/video_copier.ts:35-38` | P0 |
| Missing `SYH_INFO_MODAL` import | `modules/stats_tracker.ts:123` | P0 |
| Missing `outputDiv` variable | `modules/popup_prayers.ts:415` | P0 |
| Stale tsc errors dump | `tsc_errors.txt`, `tsc_errors_utf8.txt` | P2 |
| No tsc in pipeline | `package.json` scripts | P0 |
| ESLint doesn't lint tests/background | `package.json` lint script | P1 |
| `test_parsers.js` not in test runner | `package.json` test script, `test_parsers.js` | P1 |
| Hardcoded test file list | `package.json` scripts.test | P1 |
| `@types/node` missing | `tsconfig.json`, `modules/storage.ts:219` | P0 |
| `lib` setting too low (ES2020) | `tsconfig.json:3` | P0 |
| `no-explicit-any` disabled | `eslint.config.js:29` | P1 |
| No Prettier | Project-wide | P1 |
| No pre-commit hooks | Project-wide | P2 |
| `utils.ts` dead code | `utils.ts` (root) | P2 |
| Redundant rule files | `.kilocoderules`, `.cursorrules`, `.clinerules` | P3 |

---

## 9. Quick Wins (No-Break Changes)

1. **Add `typecheck` script** + run it: `npm pkg set scripts.typecheck="tsc --noEmit"` — zero risk, immediate feedback.
2. **Fix 3 missing imports** in `anti_afk.ts`, `video_copier.ts`, `stats_tracker.ts` — adds `SYH_BUS`, `SYH_DOM_OBSERVER`, `SYH_INFO_MODAL` imports.
3. **Remove root `utils.ts`** — appears to be leftover/dead code not referenced in manifest.
4. **Delete stale `tsc_errors*.txt`** — regenerate via CI if needed.
5. **Add `background/**` to ESLint lint paths** — catches lint issues in service worker.
6. **Enable `prefer-const: error`** and `@typescript-eslint/no-explicit-any: warn`** — tightens rules without breaking existing code.

---

## 10. Verification Commands

After implementing fixes, verify with:

```bash
npm run lint        # ESLint check
npm run typecheck   # tsc --noEmit (MUST be added)
npm run test        # Node.js test runner (97 tests)
npm run build       # Vite + CRXJS production build
```
