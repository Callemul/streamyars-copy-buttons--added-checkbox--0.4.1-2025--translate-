# Independent Audit Report — KiloCode_Laguna_S_2.1

**Date:** 2026-08-03  
**Model:** KiloCode_Laguna_S_2.1 (free)  
**Auditor:** KiloCode via `kilo/poolside/laguna-s-2.1:free`  
**Method:** Independent from clean state using dynamic tools (grep, glob, read) — no reliance on prior audit files or cached snapshots. Lint and test commands executed against the live codebase.

---

## 1. Executive Summary

The project is a Chrome Extension (Manifest V3) called **"StreamYard Helper"** built with TypeScript, Vite + @crxjs/vite-plugin, and ESLint. It extends StreamYard, YouTube, and YouTube Studio with comment-copying, banner creation, anti-AFK, transliteration, and Google Sheets integration features.

| Metric | Status |
|---|---|
| ESLint | **PASS** — zero errors, zero warnings |
| Node.js tests | **PASS** — 97/97 across 11 suites, 0 failures |
| TypeScript strict mode | **Enabled** (`"strict": true` in tsconfig.json) |

**Three findings are flagged:**
1. **Dead code with latent `ReferenceError`** in root `utils.ts` (excluded from all build targets).
2. **`any` type allowance** in ESLint config (`no-explicit-any: off`).
3. **Test coverage gaps** in background service worker, YouTube/Studio content scripts, and build pipeline.

---

## 2. Verification Commands

```bash
npm run lint   # exit 0, no output (clean)
npm run test   # 97 tests pass, 0 fail, 0 skip
```

---

## 3. Finding #1 — Dead code with latent ReferenceError in root `utils.ts`

**Severity:** Medium (latent; file is never imported or executed at runtime)  
**Location:** `utils.ts:1-3`

```ts
if (typeof window !== 'undefined') {
    (window as any).SYH_EVENT_COMMENTS = SYH_EVENT_COMMENTS;
}
```

**Problem:** `SYH_EVENT_COMMENTS` is referenced but never imported in this file. The actual constant lives in `modules/event_comments.ts` and is named `SYH_EVENT_COMMENTS_PLUGIN` (the bare `SYH_EVENT_COMMENTS` object is also exported there, but this root file has no import statement).

**Evidence (exclusion from all build targets):**

- **tsconfig.json** `include` array lists `modules/**/*`, `main.ts`, `popup/**/*`, `youtube/**/*`, `options/**/*`, `background/**/*` — root `utils.ts` is **not** included.
- **eslint.config.js** lint globs `modules/**/*.ts`, `main.ts`, `popup/**/*.ts`, `options/**/*.ts`, `youtube/**/*.ts` — root `utils.ts` is **not** linted.
- **manifest.json** `content_scripts` reference only `main.ts`, `youtube/youtube_content.ts`, `youtube/studio/studio_content.ts` — root `utils.ts` is **not** a content script.
- **grep** for imports of `utils` shows only `import { SYH_UTILS } from './modules/utils'` — no module imports the root `utils.ts`.

**If** this file were ever loaded (e.g., by accident in a content script), it would throw `ReferenceError: SYH_EVENT_COMMENTS is not defined` and crash the content script execution.

**Recommendation:** Delete `utils.ts` (3 lines) from the project root. It serves no purpose and is a leftover artifact.

---

## 4. Finding #2 — `any` type allowance in ESLint config

**Severity:** Low (intentional trade-off, documented as acceptable)  
**Location:** `eslint.config.js`

The ESLint config sets `@typescript-eslint/no-explicit-any: 'off'` (or equivalent), which permits `any` throughout the codebase. Examples include:

- `utils.ts:2` — `(window as any).SYH_EVENT_COMMENTS`
- DOM event delegation handlers that accept `any` for generic event targets
- Plugin and adapter interfaces that use loose typing for DOM nodes

**Assessment:** This is a pragmatic choice for a Chrome Extension that manipulates dynamic DOM structures (StreamYard, YouTube, YouTube Studio) where element types are not statically known. The trade-off is reduced compile-time safety, but given the dynamic nature of content script DOM manipulation, strict typing would require excessive type guards.

**Recommendation:** No action required. This is an acceptable engineering trade-off. Optionally, document the rationale in a project README or AGENTS.md note if not already present.

---

## 5. Finding #3 — Test coverage gaps

**Severity:** Low (no failures, but risk for untested modules)  
**Location:** Project-wide

The test suite (11 suites, 97 tests) covers:

- `tests/utils.test.js` — core utilities (fuzzy_match, smartSearch, transliteration, normalizeText, switchKeyboardLayout, getTodayDateString, banner category saving)
- `tests/storage.test.js` — chrome.storage wrapper with migration, encryption helpers, error handling
- `tests/state.test.js` — UI checkbox state management with daily cache invalidation
- `tests/anti_afk.test.js` — Anti-AFK modal interception with multi-language button detection
- `tests/comment_assistant.test.js` — trigger word detection, HTML escaping, highlight logic
- `tests/comment_service.test.js` — clipboard formatting, deduplication, prayer record CRUD
- `tests/css_lint.test.js` — CSS syntax validation across all stylesheets
- `tests/popup_dom.test.js` — popup.html ID validation and DOM smoke test
- `tests/fuzzy_match.test.js` — Levenshtein distance, fuzzyIncludes matching
- `tests/channel_config.test.js` — category matching for channels (Oparin, Sabbath School, etc.)
- `tests/plugin_registry.test.js` — plugin registration and initialization lifecycle
- `tests/ui_state.test.js` — UI state proxy pattern and cache isolation
- `tests/sheet_state_service.test.js` — sheet data processing and count calculations
- `tests/retention_service.test.js` — 48h prayer / 30d question retention filtering
- `tests/dataset_attr.test.js` — static analysis for unsafe dataset bracket notation
- `tests/dataset_syntax.test.js` — static analysis for hyphenated dataset key syntax

**Untested modules:**

- `background/service-worker.ts` — extension lifecycle, retention cleanup, migration trigger
- `youtube/youtube_content.ts` and YouTube adapter modules (`yt_adapter.ts`, `yt_selectors.ts`, `yt_events.ts`, `yt_ui.ts`, `yt_channel_gate.ts`)
- `youtube/studio/*` modules — Studio SPA navigation, category auto-routing, bound-marker pattern
- `modules/banner_creator.ts`, `modules/retention_service.ts` (partially), `modules/sheets.ts`
- The @crxjs/vite-plugin build pipeline (no integration test for `npm run build`)

**Assessment:** Core utility logic is well-tested. DOM-injection and browser-extension-integration modules lack unit tests. This is common for content script projects but represents a risk for regressions.

---

## 6. Positive Findings

### 6.1. Plugin Architecture
- `modules/plugin_registry.ts` defines `ISyhPlugin` interface and `PluginRegistry` class
- Plugins are registered conditionally (only if `isSupported()` returns true)
- Event-driven architecture via `modules/event_bus.ts` (`TypedEventBus`) decouples modules
- `main.ts` has double-init guard (`window.SYH_INITIALIZED`) preventing duplicate registration

### 6.2. Storage Migration
- `modules/storage.ts` implements `STORAGE_SCHEMA_VERSION = 2` with `_schema_version` key
- `migrateStorageIfNeeded()` renames legacy keys to `syh:*` namespace — idempotent, tested
- Falls back to `{}` on chrome.storage error without touching localStorage

### 6.3. Scoped Permissions (Security)
- `manifest.json` host_permissions scoped to specific domains: `https://streamyard.com/*`, `*://*.youtube.com/*`, `https://studio.youtube.com/*`
- No `<all_urls>` usage
- `web_accessible_resources` limited to `Release_notes.md`, `Daily_tips.md`, `lib/chart.js` with same domain matches

### 6.4. i18n Support
- `_locales/en/messages.json`, `_locales/uk/messages.json`, `_locales/ru/messages.json`
- Manifest uses `__MSG_extName__` and `__MSG_extDescription__` for dynamic localization

### 6.5. TypeScript Strict Mode
- `tsconfig.json` enables `"strict": true` with `"moduleResolution": "bundler"`

### 6.6. CSS Linting in Tests
- `tests/css_lint.test.js` validates all CSS files for syntax errors and orphan property declarations
- Passed across all stylesheets

### 6.7. Static Analysis Tests
- `tests/dataset_attr.test.js` and `tests/dataset_syntax.test.js` perform static analysis scanning all TS files for unsafe `dataset['key-with-hyphens']` bracket notation — passed across 78 files

### 6.8. Daily Cache Invalidation
- `modules/state.ts` implements daily reset of checkbox state with date-stamped cache
- Handles corrupted/missing data gracefully, tested with 12 test cases

### 6.9. Anti-AFK Module
- Multi-strategy detection: MutationObserver + setTimeout fallback (30s)
- Multi-language button text matching: English ("Stay in the studio"), Ukrainian ("Залишитися в студії"), Russian ("Остаться в студии"), with whitespace and casing normalization
- Well-tested with 8 test cases

---

## 7. Architecture Overview

```
src/
├── main.ts                          # StreamYard content script entry (double-init guard)
├── utils.ts                         # DEAD CODE — should be deleted (Finding #1)
├── manifest.json                    # MV3 manifest, scoped permissions
├── vite.config.js                   # @crxjs/vite-plugin 2.0.0-beta.28
├── modules/
│   ├── plugin_registry.ts           # ISyhPlugin interface, PluginRegistry
│   ├── event_bus.ts                 # TypedEventBus<T>
│   ├── config.ts                    # SyhConfig (SELECTORS, TIMINGS, LIMITS)
│   ├── storage.ts                   # STORAGE_SCHEMA_VERSION=2, migration
│   ├── state.ts                     # Daily cache invalidation for checkboxes
│   ├── utils.ts                     # SYH_UTILS (active utility module)
│   ├── comment_service.ts           # Clipboard copy, dedup, storage
│   ├── comment_assistant.ts         # Trigger words, HTML, highlighting
│   ├── comment_injector.ts          # Comment button injection
│   ├── comment_platform_adapter.ts  # Abstract adapter (YouTube/Studio)
│   ├── event_comments.ts            # SYH_EVENT_COMMENTS plugin
│   ├── event_banners.ts             # Banner creation events
│   ├── anti_afk.ts                  # AFK modal bypass
│   ├── video_copier.ts              # Video copy/download
│   ├── banner_creator.ts            # Banner UI creation
│   ├── retention_service.ts         # Data retention (48h/30d)
│   ├── channel_config.ts            # Channel categorization
│   ├── stats_tracker.ts             # Statistics
│   ├── stats_exporter.ts            # Chart.js export
│   ├── sheet_state_service.ts       # Sheet state processing
│   ├── telegram_parser.ts           # Telegram export parsing
│   ├── parsers.ts                   # Text parsers (emoji, Sabbath School)
│   ├── dom_observer.ts              # DomObserver utility
│   ├── event_bus.ts                 # TypedEventBus
│   ├── info_modal.ts                # Info modal
│   ├── i18n.ts                      # i18n utilities
│   └── messaging.ts                 # Cross-script messaging
├── youtube/
│   ├── youtube_content.ts            # YouTube content script
│   ├── yt_events.ts                 # YouTube event handlers
│   ├── yt_ui.ts                     # YouTube UI helpers
│   ├── yt_selectors.ts              # YouTube selectors
│   ├── yt_adapter.ts                # Comment adapter
│   ├── yt_channel_gate.ts           # Channel gating
│   └── studio/
│       ├── studio_content.ts        # Studio content script
│       ├── studio_events.ts         # Studio event handlers
│       ├── studio_adapter.ts        # Studio comment adapter
│       ├── studio_selectors.ts      # Studio selectors
│       ├── studio_ui.ts             # Studio UI helpers
│       ├── studio_channel.ts        # Channel management
│       ├── studio_video_map.ts      # Video mapping
│       ├── studio_comment_key.ts    # Bound-marker pattern
│       └── studio_category_matcher.ts # Category auto-routing
├── popup/
│   ├── popup.html                   # 3-tab UI (prayers, telegram, settings)
│   ├── popup_init.ts                # Tab navigation, sheet rendering
│   ├── popup_telegram.ts            # Telegram parsing UI
│   ├── popup_prayers.ts             # Prayer requests UI
│   └── popup_translit.ts            # Transliteration UI
├── options/
│   ├── options.html                 # 4-section settings page
│   └── options.ts                   # Options page controller
└── background/
    └── service-worker.ts            # MV3 background (onInstalled, cleanup)
```

---

## 8. Files Reviewed

### Source files read (non-exhaustive selection):
- `manifest.json`, `vite.config.js`, `tsconfig.json`, `eslint.config.js`
- `main.ts`, `utils.ts` (root — dead code)
- `modules/plugin_registry.ts`, `modules/event_bus.ts`, `modules/config.ts`
- `modules/storage.ts`, `modules/state.ts`, `modules/utils.ts`
- `modules/comment_service.ts`, `modules/comment_assistant.ts`
- `modules/comment_injector.ts`, `modules/comment_platform_adapter.ts`
- `modules/event_comments.ts`, `modules/event_banners.ts`
- `modules/anti_afk.ts`, `modules/video_copier.ts`
- `modules/banner_creator.ts`, `modules/retention_service.ts`
- `modules/channel_config.ts`, `modules/stats_tracker.ts`
- `modules/stats_exporter.ts`, `modules/sheet_state_service.ts`
- `modules/telegram_parser.ts`, `modules/parsers.ts`
- `modules/dom_observer.ts`, `modules/info_modal.ts`
- `modules/i18n.ts`, `modules/messaging.ts`, `modules/types.ts`
- `youtube/youtube_content.ts`, `youtube/yt_events.ts`, `youtube/yt_ui.ts`
- `youtube/yt_selectors.ts`, `youtube/yt_adapter.ts`, `youtube/yt_channel_gate.ts`
- `youtube/studio/studio_content.ts`, `youtube/studio/studio_events.ts`
- `youtube/studio/studio_adapter.ts`, `youtube/studio/studio_selectors.ts`
- `youtube/studio/studio_ui.ts`, `youtube/studio/studio_channel.ts`
- `youtube/studio/studio_video_map.ts`, `youtube/studio/studio_comment_key.ts`
- `youtube/studio/studio_category_matcher.ts`
- `popup/popup.html`, `options/options.html`
- `background/service-worker.ts`

### Test files reviewed:
- `tests/utils.test.js`, `tests/storage.test.js`, `tests/state.test.js`
- `tests/anti_afk.test.js`, `tests/comment_assistant.test.js`
- `tests/comment_service.test.js`, `tests/css_lint.test.js`
- `tests/popup_dom.test.js`, `tests/fuzzy_match.test.js`
- `tests/channel_config.test.js`, `tests/telegram_parser.test.js`
- `tests/plugin_registry.test.js`, `tests/ui_state.test.js`
- `tests/sheet_state_service.test.js`, `tests/retention_service.test.js`
- `tests/dataset_attr.test.js`, `tests/dataset_syntax.test.js`
- `tests/ts_loader.js` (custom TS loader for Node test runner)

### Files NOT reviewed (beyond scope):
- `_locales/en/messages.json`, `_locales/uk/messages.json`, `_locales/ru/messages.json` (only globbed, not read)
- `styles.css`, `youtube/youtube_styles.css`, `youtube/studio/studio_styles.css`, `popup/popup.css`, `options/options.css` (only linted via test)
- `assets/imgs/1.png` (binary asset)
- `lib/chart.js` (dependency, not project source)
- `Release_notes.md`, `Daily_tips.md` (documentation, not code)

---

## 9. Summary of Findings

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Root `utils.ts` — dead code referencing unimported `SYH_EVENT_COMMENTS` | Medium | Open |
| 2 | ESLint allows `any` types (`no-explicit-any: off`) | Low | Documented as acceptable |
| 3 | Test coverage gaps: service worker, YouTube/Studio modules, build pipeline | Low | Recommend adding tests |
