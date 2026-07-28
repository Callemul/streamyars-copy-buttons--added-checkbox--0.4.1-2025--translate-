# 📋 **Tasks List — Post-Audit Action Items**

**Date:** 2026-07-28  
**Source:** Independent audit by Nemotron  
**Status:** Active

---

## 🎯 **Priority: MEDIUM — Should Fix**

| # | Task | File/Location | Description |
|---|------|---------------|-------------|
| 1 | Fix sync handler returns in Service Worker | `background/service-worker.ts:30,35,40` | Only async handlers should `return true`; sync handlers (PING, GET_VERSION, BACKGROUND_LOG) should return `false` or nothing |
| 2 | Add JSON schema validation for config import | `options/options.ts:164-172` | Validate imported config structure before applying; reject unknown keys/invalid values |
| 3 | Fix stale array index in popup prayers deletion | `popup/popup_prayers.js:193, 217, 343` | Replace `data-index` with unique ID (timestamp/uuid) for delete buttons |
| 4 | Fix floating-point sub-index parsing in popup telegram | `popup/popup_telegram.js` | Replace `fid % 1` with `Math.round()` or string split for sub-index extraction |
| 5 | Add Escape/backdrop close to stats modal | `modules/stats_exporter.ts:71-80` | Add `keydown` (Escape) and backdrop click handlers to close modal |
| 6 | Decouple `state.ts` from `SYH_UTILS` for date | `modules/state.ts:25, 100` | Move `getTodayDateString()` into state or pass as dependency |

---

## 🟢 **Priority: LOW — Technical Debt**

| # | Task | File/Location | Description |
|---|------|---------------|-------------|
| 7 | Continue TypeScript migration | `modules/*.ts` | Convert remaining 15 JS modules to TS gradually |
| 8 | Replace jQuery with native DOM API | `modules/*.ts` | Where feasible (95% coverage per audit decision) |
| 9 | Refactor `timerOffTextResult` getter pattern | `modules/config.ts:49-51` | Consider lazy i18n evaluation pattern consistency |
| 10 | Make `utils.ts` storage dependency explicit | `modules/utils.ts:292` | Pass storage adapter via init() instead of external assignment |

---

## ✅ **Completed (This Audit Cycle)**

- [x] Full independent codebase audit via `repomix-output.xml`
- [x] Security review: XSS, permissions, CSP, clipboard API
- [x] Architecture review: modules, storage, state, UI separation
- [x] Performance review: observers, lazy loading, polling removal
- [x] Quality review: lint, tests, TypeScript, i18n
- [x] Generated audit report: `2026-07-28_Nemotron_AUDIT.md`

---

## 📌 **Notes**

- All tasks derived from fresh analysis of `repomix-output.xml` — no prior audit documents referenced
- Tasks 1-6 are actionable fixes with clear locations
- Tasks 7-10 are ongoing modernization efforts
- Next audit should verify completion of Tasks 1-6