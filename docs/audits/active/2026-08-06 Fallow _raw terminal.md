ded checkbox) 0.6-2026.01.11> npx fallow
Need to install the following packages:
fallow@3.14.0
Ok to proceed? (y) y

                                                                                  
■ Metrics: dead files 2.2% (2 of 90) · dead exports 0.0% (0 of 281) · MI 88.6 (good) · 4 churn hotspots · 1 circular dependency
  90 files analyzed
  84 entry points detected (65 plugin, 19 package.json)
  20 refactoring targets — start with modules/event_comments.ts (complexity)
Tip: run `fallow explain <issue label>`; spaces and hyphens both work, e.g. `fallow explain unused files`.

Next: fallow dupes --trace dup:01d08471  (see sibling locations and an extract-function suggestion)


── Dead Code ──────────────────────────────────────

── Unused Code ─────────────────────────────────────

● Unused files (2)
  test_parsers.js
  utils.ts
  Files not reachable from any entry point — https://docs.fallow.tools/explanations/dead-code#unused-files

── Structure ─────────────────────────────────────

● Circular dependencies (1)
  modules\event_banners.ts
    → modules\ui_core.ts → modules\ui_banners.ts → modules\event_banners.ts       

  Import cycles that can cause initialization failures and prevent tree-shaking — https://docs.fallow.tools/explanations/dead-code#circular-dependencies

✗ 2 files · 1 circular dependency (0.22s)

── Duplication ────────────────────────────────────
note: skipped 18 files matching default duplicates ignores (use --explain-skipped for the list)
note: module wiring excluded from clone detection (--no-ignore-imports to include it)

● Duplicates (22 clone groups)

     44 lines  2 instances  dup:0a389c03
    test_parsers.js:319-348
    test_parsers.js:357-400

     37 lines  2 instances  dup:f3a28a4c
    modules/ui_banners.ts:261-297
    modules/ui_comments.ts:421-457

     27 lines  2 instances  dup:6d3c7bf6
    popup/popup_init.ts:72-89
    popup/popup_telegram.ts:1-27

     23 lines  2 instances  dup:34042b11
    youtube/yt_adapter.ts:42-60
    youtube/yt_channel_gate.ts:21-43

     22 lines  2 instances  dup:f0975d58
    modules/video_copier.ts:162-183
    modules/video_copier.ts:333-352

     17 lines  2 instances  dup:ab7f1533
    youtube/yt_adapter.ts:33-45
    youtube/yt_channel_gate.ts:10-26

     15 lines  2 instances  dup:7bd1ae38
    modules/event_banners.ts:285-299
    modules/ui_comments.ts:246-260

     15 lines  2 instances  dup:ae481b7b
    modules/sheet_state_service.ts:177-191
    modules/sheet_state_service.ts:234-248

     15 lines  2 instances  dup:65f941fa
    modules/stats_tracker.ts:192-206
    modules/stats_tracker.ts:218-223

     15 lines  2 instances  dup:fee7cf67
    modules/ui_banners.ts:248-262
    modules/ui_comments.ts:408-422

  ... and 12 more clone groups
  Identical code blocks detected via suffix-array analysis — https://docs.fallow.tools/explanations/duplication#clone-groups

● Clone families (4 with multiple groups)

  2 groups, 22 lines across modules/stats_tracker.ts
    → Extract shared function (7 lines) from stats_tracker.ts, stats_tracker.ts   
    → Extract shared function (15 lines) from stats_tracker.ts, stats_tracker.ts  

  2 groups, 20 lines across modules/storage.ts
    → Extract shared function (12 lines) from storage.ts, storage.ts
    → Extract shared function (8 lines) from storage.ts, storage.ts

  4 groups, 75 lines across modules/ui_banners.ts, modules/ui_comments.ts
    → Extract 4 shared clone groups (75 lines) from ui_banners.ts, ui_comments.ts into modules

  2 groups, 40 lines across youtube/yt_adapter.ts, youtube/yt_channel_gate.ts     
    → Extract shared function (17 lines) from yt_adapter.ts, yt_channel_gate.ts   
    → Extract shared function (23 lines) from yt_adapter.ts, yt_channel_gate.ts   

  Groups of related clones across the same files — https://docs.fallow.tools/explanations/duplication#clone-families

✗ 591 lines (3.7%) duplicated across 19 files (0.09s)

── Complexity ─────────────────────────────────────

■ Metrics: 18,943 LOC · dead files 2.2% · dead exports 0.0% · avg cyclomatic 3.0 · p90 cyclomatic 7 · maintainability 88.6 (good) · 4 churn hotspots (since 6 months) · 1 circular dep

  Function size: 75% low · 13% medium · 8% high · 4% very high  (1-15 / 16-30 / 31-60 / >60 LOC)

● Large functions (10 shown, 54 total)
  popup\popup_init.ts
    :96 initPopup  612 lines
  tests\studio_integration.test.js
    :36 <arrow>  418 lines
  modules\event_comments.ts
    :87 bindEvents  278 lines
  popup\popup_prayers.ts
    :31 renderPrayers  231 lines
    :263 initPopupPrayersListeners  226 lines
  modules\telegram_parser.ts
    :73 parseAndFilterOldList  212 lines
  modules\event_banners.ts
    :46 bindEvents  189 lines
  popup\popup_init.ts
    :143 <anonymous>  189 lines
  tests\storage.test.js
    :20 <arrow>  180 lines
  popup\popup_telegram.ts
    :311 processTelegramData  179 lines
  Functions exceeding 60 lines of code (very high risk): https://docs.fallow.tools/explanations/health#unit-size
  use --top 54 to see all

● High complexity functions (142)
  CRAP scores are estimated from export references; run `fallow health --coverage <coverage-final.json>` for exact scores.
  popup/popup_init.ts
    :152 <arrow> CRITICAL
          54 cyclomatic   71 cognitive   89 lines
         2970.0 CRAP
  popup/popup_telegram.ts
    :311 processTelegramData CRITICAL
          43 cyclomatic   41 cognitive  179 lines
         1892.0 CRAP
  modules/event_banners.ts
    :80 <anonymous> CRITICAL
          42 cyclomatic   39 cognitive  126 lines
         423.0 CRAP
  modules/ui_comments.ts
    :274 filterStarredComments CRITICAL
          35 cyclomatic   66 cognitive  163 lines
          39.1 CRAP
  modules/event_comments.ts
    :270 <anonymous> CRITICAL
          33 cyclomatic   36 cognitive   79 lines
         1122.0 CRAP
  modules/ui_banners.ts
    :155 filterBanners CRITICAL
          31 cyclomatic   58 cognitive  122 lines
          34.2 CRAP
  popup/popup_init.ts
    :143 <anonymous> CRITICAL
          31 cyclomatic   47 cognitive  189 lines
         992.0 CRAP
  modules/ui_comments.ts
    :316 <arrow> CRITICAL
          28 cyclomatic   34 cognitive   50 lines
         197.3 CRAP
  options/options.ts
    :84 <arrow> CRITICAL
          26 cyclomatic   33 cognitive   42 lines
         702.0 CRAP
  modules/stats_tracker.ts
    :53 injectHeaderButtons CRITICAL
          25 cyclomatic   47 cognitive  114 lines
         650.0 CRAP
  popup/popup_telegram.ts
    :185 updateCombinedCounters CRITICAL
          23 cyclomatic   31 cognitive   82 lines
         552.0 CRAP
  modules/info_modal.ts
    :139 parseMarkdown CRITICAL
          22 cyclomatic   44 cognitive  114 lines
         506.0 CRAP
  modules/telegram_parser.ts
    :294 <arrow> CRITICAL
          22 cyclomatic   47 cognitive   50 lines
         126.5 CRAP
  modules/ui_banners.ts
    :176 <arrow> CRITICAL
          22 cyclomatic   24 cognitive   40 lines
         126.5 CRAP
  modules/anti_afk.ts
    :29 checkAndClickAntiAfk HIGH
          21 cyclomatic   27 cognitive   81 lines
  modules/banner_creator.ts
    :58 parseBlock CRITICAL
          20 cyclomatic   16 cognitive   36 lines
         106.4 CRAP
  modules/telegram_parser.ts
    :85 processOldItem CRITICAL
          20 cyclomatic   24 cognitive   81 lines
         106.4 CRAP
  modules/banner_creator.ts
    :46 processAndCreateBanners HIGH
          19 cyclomatic   25 cognitive  118 lines
          97.0 CRAP
  popup/popup_prayers.ts
    :31 renderPrayers CRITICAL
          19 cyclomatic   20 cognitive  231 lines
         380.0 CRAP
  modules/parsers.ts
    :95 parseEmojiNumberedQuestions HIGH
          18 cyclomatic   27 cognitive   55 lines
          88.0 CRAP
  modules/retention_service.ts
    :29 runGlobalCleanup HIGH
          18 cyclomatic   24 cognitive   52 lines
          88.0 CRAP
  modules/ui_banners.ts
    :61 addBannerHeaderControls HIGH
          18 cyclomatic   28 cognitive   61 lines
  youtube/yt_channel_gate.ts
    :7 isAllowedChannel CRITICAL
          18 cyclomatic   21 cognitive   49 lines
         342.0 CRAP
  tests/anti_afk.test.js
    :50 matches HIGH
          17 cyclomatic   16 cognitive   24 lines
          79.4 CRAP
  tests/studio_integration.test.js
    :184 querySelector HIGH
          17 cyclomatic   16 cognitive   19 lines
          79.4 CRAP
  youtube/studio/studio_events.ts
    :83 bindStudioCommentEvents CRITICAL
          17 cyclomatic   13 cognitive   65 lines
         306.0 CRAP
  modules/stats_exporter.ts
    :254 exportPresentation CRITICAL
          17 cyclomatic   14 cognitive  120 lines
         306.0 CRAP
  modules/dom_observer.ts
    :67 processMutations CRITICAL
          16 cyclomatic   37 cognitive   31 lines
         272.0 CRAP
  modules/telegram_parser.ts
    :216 <arrow> HIGH
          16 cyclomatic   29 cognitive   47 lines
          71.3 CRAP
  modules/banner_creator.ts
    :198 <arrow> HIGH
          16 cyclomatic   11 cognitive   44 lines
          71.3 CRAP
  modules/ui_core.ts
    :122 <arrow> HIGH
          16 cyclomatic   11 cognitive   21 lines
          71.3 CRAP
  modules/storage.ts
    :368 <arrow> HIGH
          15 cyclomatic   19 cognitive   54 lines
          63.6 CRAP
  modules/ui_comments.ts
    :72 addStarredTabControls HIGH
          15 cyclomatic   26 cognitive   47 lines
  youtube/yt_adapter.ts
    :30 detectChannelKey CRITICAL
          15 cyclomatic   17 cognitive   35 lines
         240.0 CRAP
  options/options.ts
    :128 saveSettings CRITICAL
          15 cyclomatic    5 cognitive   41 lines
         240.0 CRAP
  modules/comment_assistant.ts
    :137 processComment HIGH
          14 cyclomatic   24 cognitive   42 lines
          56.3 CRAP
  youtube/youtube_content.ts
    :142 <arrow> CRITICAL
          14 cyclomatic   16 cognitive   33 lines
         210.0 CRAP
  modules/event_banners.ts
    :125 <arrow> HIGH
          14 cyclomatic    9 cognitive   17 lines
          56.3 CRAP
  main.ts
    :104 <arrow> CRITICAL
          13 cyclomatic   21 cognitive   48 lines
         182.0 CRAP
  modules/comment_injector.ts
    :65 handleAction
          13 cyclomatic   17 cognitive   85 lines
          49.5 CRAP
  modules/fuzzy_match.ts
    :41 fuzzyIncludes
          13 cyclomatic   20 cognitive   28 lines
  modules/event_banners.ts
    :207 <anonymous>
          13 cyclomatic    9 cognitive   27 lines
          49.5 CRAP
  youtube/yt_ui.ts
    :15 extractCommentId CRITICAL
          13 cyclomatic   13 cognitive   38 lines
         182.0 CRAP
  modules/event_comments.ts
    :105 <arrow> CRITICAL
          13 cyclomatic   15 cognitive   16 lines
         182.0 CRAP
  modules/comment_assistant.ts
    :36 init
          13 cyclomatic    6 cognitive   17 lines
          49.5 CRAP
  modules/event_comments.ts
    :124 <arrow> CRITICAL
          12 cyclomatic   18 cognitive   20 lines
         156.0 CRAP
    :177 <anonymous> CRITICAL
          12 cyclomatic   26 cognitive   28 lines
         156.0 CRAP
  tests/css_lint.test.js
    :14 checkCssFile
          12 cyclomatic   18 cognitive   32 lines
          43.1 CRAP
  modules/stats_exporter.ts
    :149 renderChart CRITICAL
          12 cyclomatic   11 cognitive   80 lines
         156.0 CRAP
  modules/sheet_state_service.ts
    :174 loadSheetState
          12 cyclomatic   11 cognitive   44 lines
          43.1 CRAP
  youtube/studio/studio_adapter.ts
    :262 afterAction
          12 cyclomatic   11 cognitive   34 lines
          43.1 CRAP
  tests/popup_dom.test.js
    :72 <arrow>
          11 cyclomatic   17 cognitive   27 lines
          37.1 CRAP
  youtube/studio/studio_selectors.ts
    :96 getVideoLinkHref
          11 cyclomatic   17 cognitive   15 lines
  popup/popup_prayers.ts
    :324 <anonymous> CRITICAL
          11 cyclomatic   15 cognitive   92 lines
         132.0 CRAP
  modules/stats_tracker.ts
    :317 getBrandFromLocalStorage CRITICAL
          11 cyclomatic   15 cognitive   22 lines
         132.0 CRAP
  modules/anti_afk.ts
    :164 checkOptionsAndRun
          11 cyclomatic    8 cognitive   50 lines
          37.1 CRAP
  youtube/studio/studio_selectors.ts
    :129 <arrow>
          11 cyclomatic   15 cognitive   19 lines
          37.1 CRAP
  modules/event_banners.ts
    :270 <anonymous>
          11 cyclomatic   15 cognitive   43 lines
          37.1 CRAP
  modules/event_comments.ts
    :228 <anonymous> CRITICAL
          11 cyclomatic   14 cognitive   27 lines
         132.0 CRAP
  tests/studio_integration.test.js
    :231 querySelector
          11 cyclomatic   10 cognitive   20 lines
          37.1 CRAP
  youtube/studio/studio_adapter.ts
    :60 <arrow>
          11 cyclomatic    9 cognitive   23 lines
          37.1 CRAP
    :472 toggleZIndexStack
          11 cyclomatic   12 cognitive   13 lines
          37.1 CRAP
  modules/video_copier.ts
    :153 <arrow> CRITICAL
          10 cyclomatic   16 cognitive   36 lines
         110.0 CRAP
  background/service-worker.ts
    :86 <arrow> CRITICAL
          10 cyclomatic   11 cognitive   26 lines
         110.0 CRAP
  youtube/studio/studio_events.ts
    :57 observer CRITICAL
          10 cyclomatic    6 cognitive   14 lines
         110.0 CRAP
  popup/popup_init.ts
    :381 <arrow> CRITICAL
          10 cyclomatic    9 cognitive  144 lines
         110.0 CRAP
  modules/stats_tracker.ts
    :243 <arrow> CRITICAL
          10 cyclomatic    9 cognitive   48 lines
         110.0 CRAP
  youtube/studio/studio_header_counters.ts
    :29 formatCategoryLabel
          10 cyclomatic    9 cognitive   10 lines
          31.6 CRAP
  youtube/studio/studio_content.ts
    :81 <arrow> CRITICAL
          10 cyclomatic    9 cognitive   27 lines
         110.0 CRAP
  modules/event_comments.ts
    :208 <anonymous> CRITICAL
          10 cyclomatic   13 cognitive   18 lines
         110.0 CRAP
    :350 <anonymous> CRITICAL
          10 cyclomatic    5 cognitive   14 lines
         110.0 CRAP
  modules/ui_comments.ts
    :141 <arrow>
          10 cyclomatic    8 cognitive   59 lines
          31.6 CRAP
  popup/popup_telegram.ts
    :272 ensureStatsBarRows CRITICAL
          10 cyclomatic    9 cognitive   38 lines
         110.0 CRAP
  youtube/studio/studio_adapter.ts
    :319 getEffectiveCheckboxState
          10 cyclomatic    6 cognitive   14 lines
          31.6 CRAP
  modules/video_copier.ts
    :321 downloadAllFreshVideos HIGH
           9 cyclomatic   16 cognitive   81 lines
          90.0 CRAP
  youtube/studio/studio_adapter.ts
    :108 getCommentContext
           9 cyclomatic   17 cognitive   33 lines
  popup/popup_prayers.ts
    :67 <anonymous> HIGH
           9 cyclomatic    7 cognitive   30 lines
          90.0 CRAP
  popup/popup_init.ts
    :315 <arrow> HIGH
           9 cyclomatic    8 cognitive   10 lines
          90.0 CRAP
    :473 <anonymous> HIGH
           9 cyclomatic   13 cognitive   43 lines
          90.0 CRAP
    :620 <arrow> HIGH
           9 cyclomatic    4 cognitive    6 lines
          90.0 CRAP
  modules/stats_tracker.ts
    :268 <arrow> HIGH
           9 cyclomatic    8 cognitive   22 lines
          90.0 CRAP
  main.ts
    :80 init HIGH
           9 cyclomatic    5 cognitive   93 lines
          90.0 CRAP
  youtube/studio/studio_content.ts
    :280 processVisibleComments HIGH
           9 cyclomatic    6 cognitive   24 lines
          90.0 CRAP
    :305 updateHeaderCounters HIGH
           9 cyclomatic    7 cognitive   16 lines
          90.0 CRAP
  modules/telegram_parser.ts
    :186 finalizeCurrentItem HIGH
           8 cyclomatic   26 cognitive   29 lines
  modules/video_copier.ts
    :328 <arrow> HIGH
           8 cyclomatic   16 cognitive   28 lines
          72.0 CRAP
  options/options.ts
    :182 <arrow> HIGH
           8 cyclomatic    6 cognitive   32 lines
          72.0 CRAP
    :275 validateImportedConfig HIGH
           8 cyclomatic    6 cognitive   11 lines
          72.0 CRAP
    :293 <arrow> HIGH
           8 cyclomatic    5 cognitive   18 lines
          72.0 CRAP
  background/service-worker.ts
    :64 <arrow> HIGH
           8 cyclomatic    8 cognitive   17 lines
          72.0 CRAP
  popup/popup_init.ts
    :306 <arrow> HIGH
           8 cyclomatic    7 cognitive   20 lines
          72.0 CRAP
    :613 <arrow> HIGH
           8 cyclomatic    4 cognitive   18 lines
          72.0 CRAP
  main.ts
    :127 <arrow> HIGH
           8 cyclomatic    8 cognitive   21 lines
          72.0 CRAP
  modules/event_comments.ts
    :59 init HIGH
           8 cyclomatic    9 cognitive    7 lines
          72.0 CRAP
  youtube/youtube_content.ts
    :111 <arrow> HIGH
           8 cyclomatic    6 cognitive   27 lines
          72.0 CRAP
  options/options.ts
    :63 initEvents HIGH
           7 cyclomatic    6 cognitive   19 lines
          56.0 CRAP
    :225 lines HIGH
           7 cyclomatic    5 cognitive    7 lines
          56.0 CRAP
  modules/stats_tracker.ts
    :195 <arrow> HIGH
           7 cyclomatic    8 cognitive   13 lines
          56.0 CRAP
    :221 <arrow> HIGH
           7 cyclomatic    6 cognitive   16 lines
          56.0 CRAP
    :340 searchBrandNameInObject HIGH
           7 cyclomatic    3 cognitive    4 lines
          56.0 CRAP
  main.ts
    :38 setupDomRegistration HIGH
           7 cyclomatic    6 cognitive   40 lines
          56.0 CRAP
  tests/ts_loader.js
    :4 resolve HIGH
           7 cyclomatic   12 cognitive   18 lines
          56.0 CRAP
  modules/stats_exporter.ts
    :107 loadChartData HIGH
           7 cyclomatic    5 cognitive   37 lines
          56.0 CRAP
  modules/info_modal.ts
    :96 loadTabContent HIGH
           7 cyclomatic    5 cognitive   41 lines
          56.0 CRAP
  youtube/studio/studio_content.ts
    :210 <arrow> HIGH
           7 cyclomatic    6 cognitive   22 lines
          56.0 CRAP
    :236 stopModule HIGH
           7 cyclomatic    6 cognitive   34 lines
          56.0 CRAP
  modules/event_comments.ts
    :87 bindEvents HIGH
           7 cyclomatic    4 cognitive  278 lines
          56.0 CRAP
  modules/right_tabs_compact.ts
    :30 loadState
           6 cyclomatic    6 cognitive   22 lines
          42.0 CRAP
    :58 processTabButton
           6 cyclomatic    6 cognitive   38 lines
          42.0 CRAP
  background/service-worker.ts
    :11 <arrow>
           6 cyclomatic    6 cognitive   18 lines
          42.0 CRAP
  popup/popup_prayers.ts
    :298 <anonymous>
           6 cyclomatic    4 cognitive   25 lines
          42.0 CRAP
    :419 <anonymous>
           6 cyclomatic    5 cognitive   12 lines
          42.0 CRAP
  popup/popup_init.ts
    :587 <anonymous>
           6 cyclomatic    6 cognitive   16 lines
          42.0 CRAP
    :648 <anonymous>
           6 cyclomatic    5 cognitive   17 lines
          42.0 CRAP
    :96 initPopup
           6 cyclomatic    5 cognitive  612 lines
          42.0 CRAP
  test_parsers.js
    :9 jQueryMock
           6 cyclomatic    3 cognitive   24 lines
          42.0 CRAP
  youtube/yt_ui.ts
    :57 extractCommentData
           6 cyclomatic    5 cognitive   13 lines
          42.0 CRAP
  youtube/youtube_content.ts
    :33 processYTComment
           6 cyclomatic    5 cognitive   28 lines
          42.0 CRAP
  popup/popup_telegram.ts
    :135 <anonymous>
           6 cyclomatic    5 cognitive   23 lines
          42.0 CRAP
    :518 <anonymous>
           6 cyclomatic    5 cognitive   15 lines
          42.0 CRAP
  modules/right_tabs_compact.ts
    :97 shouldTabBeCollapsed
           5 cyclomatic    4 cognitive   14 lines
          30.0 CRAP
    :142 <arrow>
           5 cyclomatic    5 cognitive    9 lines
          30.0 CRAP
  modules/messaging.ts
    :32 <arrow>
           5 cyclomatic    3 cognitive   19 lines
          30.0 CRAP
    :54 <arrow>
           5 cyclomatic    3 cognitive   25 lines
          30.0 CRAP
    :104 <arrow>
           5 cyclomatic    4 cognitive    9 lines
          30.0 CRAP
    :81 onMessage
           5 cyclomatic    3 cognitive   33 lines
          30.0 CRAP
  popup/popup_prayers.ts
    :450 <anonymous>
           5 cyclomatic    5 cognitive   37 lines
          30.0 CRAP
  youtube/yt_adapter.ts
    :121 applyButtonState
           5 cyclomatic    5 cognitive   21 lines
          30.0 CRAP
    :143 applyCheckboxState
           5 cyclomatic    6 cognitive   13 lines
          30.0 CRAP
  youtube/studio/studio_events.ts
    :37 setupVideoMetadataObserver
           5 cyclomatic    4 cognitive   45 lines
          30.0 CRAP
  popup/popup_init.ts
    :686 <arrow>
           5 cyclomatic    2 cognitive   20 lines
          30.0 CRAP
  modules/stats_tracker.ts
    :49 setupObservers
           5 cyclomatic    2 cognitive  141 lines
          30.0 CRAP
  main.ts
    :20 <arrow>
           5 cyclomatic    3 cognitive  157 lines
          30.0 CRAP
  youtube/yt_ui.ts
    :74 addButtonsToYTComment
           5 cyclomatic    4 cognitive   57 lines
          30.0 CRAP
    :135 restoreButtonState
           5 cyclomatic    5 cognitive   29 lines
          30.0 CRAP
  youtube/studio/studio_content.ts
    :127 <arrow>
           5 cyclomatic    4 cognitive   28 lines
          30.0 CRAP
    :171 startModule
           5 cyclomatic    4 cognitive   64 lines
          30.0 CRAP
  modules/event_comments.ts
    :67 destroy
           5 cyclomatic    4 cognitive   19 lines
          30.0 CRAP
    :95 runAutoHeal
           5 cyclomatic    4 cognitive   50 lines
          30.0 CRAP
  popup/popup_telegram.ts
    :40 updateOldInputStats
           5 cyclomatic    5 cognitive   22 lines
          30.0 CRAP
  modules/video_copier.ts
    :93 injectModalButton
           5 cyclomatic    5 cognitive   52 lines
          30.0 CRAP
    :191 appendButtonsToCard
           5 cyclomatic    4 cognitive   43 lines
          30.0 CRAP
  Functions exceeding cyclomatic, cognitive, or CRAP thresholds (https://docs.fallow.tools/explanations/health#complexity-metrics)
  To suppress: // fallow-ignore-next-line complexity

● File health scores (76 files) · sorted by triage concern

   82.3    popup\popup_init.ts                             risk
            714 LOC    1 fan-in    5 fan-out    0% dead  0.35 density  >999 risk  

   83.5    popup\popup_telegram.ts                         risk
            536 LOC    3 fan-in    6 fan-out    0% dead  0.29 density  >999 risk  

   79.4    modules\event_comments.ts                       risk
            389 LOC    1 fan-in    9 fan-out    0% dead  0.38 density  >999 risk  

   81.7    options\options.ts                              risk
            342 LOC    1 fan-in    5 fan-out    0% dead  0.37 density  702.0 risk 

   82.6    modules\stats_tracker.ts                        risk
            347 LOC    1 fan-in    6 fan-out    0% dead  0.32 density  650.0 risk 

   94.3    modules\info_modal.ts                           risk
            254 LOC    0 fan-in    0 fan-out    0% dead  0.19 density  506.0 risk 

   80.2    modules\event_banners.ts                        risk
            317 LOC    2 fan-in    6 fan-out    0% dead  0.40 density  423.0 risk 

   84.4    popup\popup_prayers.ts                          risk
            489 LOC    2 fan-in    5 fan-out    0% dead  0.28 density  380.0 risk 

   87.9    youtube\yt_channel_gate.ts                      risk
             58 LOC    1 fan-in    1 fan-out    0% dead  0.31 density  342.0 risk 

   84.8    youtube\studio\studio_events.ts                 risk
            148 LOC    1 fan-in    7 fan-out    0% dead  0.23 density  306.0 risk 

  ... and 66 more files (--format json for full list)

  Sorted by triage concern: the larger of low-MI concern and CRAP risk. The risk / structure tag marks which one placed each file. MI reflects complexity, coupling, and dead code; risk reflects untested complexity (CRAP) and can diverge from MI. Risk: low <15, moderate 15-30, high >=30. CRAP estimated from export references (85% direct, 40% indirect, 0% untested). Run `fallow health --coverage <coverage-final.json>` for exact scores. https://docs.fallow.tools/explanations/health#file-health-scores

● Hotspots (59 files, since 6 months)

   72.5 ▼  popup\popup_telegram.ts
          26 commits   2509 churn  0.29 density   3 fan-in  ▼ cooling

   70.8 ▼  popup\popup_init.ts
          21 commits   1719 churn  0.35 density   1 fan-in  ▼ cooling

   65.0 ▲  modules\storage.ts
          22 commits    983 churn  0.31 density  26 fan-in  ▲ accelerating

   54.4 ▲  modules\event_comments.ts
          15 commits    808 churn  0.38 density   1 fan-in  ▲ accelerating        

   47.4 ▼  youtube\studio\studio_content.ts
          19 commits    526 churn  0.26 density   0 fan-in  ▼ cooling

   46.1 ▼  youtube\studio\studio_events.ts
          21 commits   1399 churn  0.23 density   1 fan-in  ▼ cooling

   40.4 ▼  popup\popup_prayers.ts
          15 commits   1388 churn  0.28 density   2 fan-in  ▼ cooling

   40.1 ▲  main.ts
          14 commits    604 churn  0.30 density   0 fan-in  ▲ accelerating        

   39.7 ▲  modules\stats_tracker.ts
          13 commits    674 churn  0.32 density   1 fan-in  ▲ accelerating        

   38.5 ▲  options\options.ts
          11 commits    467 churn  0.37 density   1 fan-in  ▲ accelerating        

   35.9 ▲  modules\anti_afk.ts
          14 commits    633 churn  0.27 density   2 fan-in  ▲ accelerating        

   33.6 ▲  modules\ui_core.ts
          11 commits    486 churn  0.32 density   4 fan-in  ▲ accelerating        

   32.3 ▲  modules\banner_creator.ts
          10 commits    334 churn  0.34 density   3 fan-in  ▲ accelerating        

   30.2 ─  youtube\studio\studio_adapter.ts
          10 commits    613 churn  0.31 density   2 fan-in  ─ stable

   30.0 ▲  modules\comment_assistant.ts
           9 commits    382 churn  0.35 density   6 fan-in  ▲ accelerating        

   29.3 ▲  modules\utils.ts
          11 commits    447 churn  0.28 density  13 fan-in  ▲ accelerating        

   26.7 ▼  youtube\studio\studio_selectors.ts
           8 commits    229 churn  0.35 density   5 fan-in  ▼ cooling

   25.4 ▲  modules\ui_comments.ts
           7 commits    781 churn  0.38 density   2 fan-in  ▲ accelerating        

   22.8 ▲  modules\event_banners.ts
           6 commits    694 churn  0.40 density   2 fan-in  ▲ accelerating        

   22.2 ▲  modules\ui_banners.ts
           6 commits    519 churn  0.39 density   2 fan-in  ▲ accelerating        

   21.4 ▼  modules\channel_config.ts
           8 commits    289 churn  0.28 density  12 fan-in  ▼ cooling

   21.2 ▲  background\service-worker.ts
           7 commits    180 churn  0.32 density   0 fan-in  ▲ accelerating        

   20.1 ▲  modules\parsers.ts
          10 commits    333 churn  0.21 density   7 fan-in  ▲ accelerating        

   18.9 ▼  youtube\studio\studio_ui.ts
          11 commits    408 churn  0.18 density   1 fan-in  ▼ cooling

   17.5 ▲  youtube\youtube_content.ts
           8 commits    293 churn  0.23 density   0 fan-in  ▲ accelerating        

   16.6 ▲  modules\stats_exporter.ts
           8 commits    558 churn  0.22 density   1 fan-in  ▲ accelerating        

   16.0 ▲  modules\config.ts
          13 commits    224 churn  0.13 density  15 fan-in  ▲ accelerating        

   14.6 ─  youtube\yt_adapter.ts
           6 commits    285 churn  0.25 density   1 fan-in  ─ stable

   14.5 ▲  modules\state.ts
           7 commits    224 churn  0.22 density   8 fan-in  ▲ accelerating        

   14.0 ▲  modules\video_copier.ts
           7 commits    476 churn  0.21 density   1 fan-in  ▲ accelerating        

   13.9 ▲  modules\telegram_parser.ts
           5 commits   1074 churn  0.29 density   4 fan-in  ▲ accelerating        

   13.7 ▲  youtube\studio\studio_video_map.ts
           9 commits    251 churn  0.16 density   2 fan-in  ▲ accelerating        

   13.2 ▲  modules\sheets.ts
           6 commits    162 churn  0.23 density  12 fan-in  ▲ accelerating        

   13.0 ▼  modules\event_bus.ts
           8 commits     91 churn  0.17 density   6 fan-in  ▼ cooling

   12.0 ▲  youtube\yt_events.ts
           9 commits    533 churn  0.14 density   1 fan-in  ▲ accelerating        

   11.8 ▲  youtube\yt_channel_gate.ts
           4 commits     67 churn  0.31 density   1 fan-in  ▲ accelerating        

   11.2 ▼  tests\studio_integration.test.js [test]
           3 commits    455 churn  0.38 density   0 fan-in  ▼ cooling

   10.8 ▼  modules\sheet_state_service.ts
           7 commits    437 churn  0.16 density   2 fan-in  ▼ cooling

   10.2 ─  modules\comment_service.ts
           5 commits    406 churn  0.21 density  14 fan-in  ─ stable

   10.0 ─  tests\state.test.js [test]
           6 commits    281 churn  0.18 density   0 fan-in  ─ stable

    9.3 ▲  modules\comment_injector.ts
           5 commits    260 churn  0.19 density   3 fan-in  ▲ accelerating        

    9.0 ▲  modules\info_modal.ts
           5 commits    337 churn  0.19 density   0 fan-in  ▲ accelerating        

    8.6 ▲  modules\i18n.ts
           4 commits     33 churn  0.23 density   3 fan-in  ▲ accelerating

    8.3 ▲  modules\retention_service.ts
           3 commits    217 churn  0.29 density   5 fan-in  ▲ accelerating        

    8.3 ▼  tests\utils.test.js [test]
           5 commits    142 churn  0.18 density   0 fan-in  ▼ cooling

    7.7 ▼  youtube\studio\studio_header_counters.ts
           3 commits    181 churn  0.26 density   2 fan-in  ▼ cooling

    7.7 ▼  tests\storage.test.js [test]
           4 commits    203 churn  0.20 density   0 fan-in  ▼ cooling

    6.7 ▲  test_parsers.js
          11 commits    639 churn  0.07 density   0 fan-in  ▲ accelerating        

    6.7 ▼  youtube\studio\studio_channel.ts
           5 commits     67 churn  0.14 density   2 fan-in  ▼ cooling

    6.7 ▲  youtube\studio\studio_comment_key.ts
           5 commits    144 churn  0.14 density   2 fan-in  ▲ accelerating

    6.7 ▲  modules\comment_platform_adapter.ts
           4 commits    104 churn  0.17 density   3 fan-in  ▲ accelerating        

    6.1 ▼  tests\popup_dom.test.js [test]
           5 commits    140 churn  0.13 density   0 fan-in  ▼ cooling

    5.1 ▲  youtube\yt_ui.ts
           3 commits    229 churn  0.18 density   2 fan-in  ▲ accelerating        

    5.0 ▲  youtube\studio\studio_category_matcher.ts
           4 commits     68 churn  0.13 density   3 fan-in  ▲ accelerating        

    4.3 ▼  popup\popup_translit.ts
           3 commits     77 churn  0.15 density   1 fan-in  ▼ cooling

    4.1 ▼  tests\comment_service.test.js [test]
           3 commits    138 churn  0.14 density   0 fan-in  ▼ cooling

    3.1 ▼  tests\comment_assistant.test.js [test]
           3 commits     71 churn  0.11 density   0 fan-in  ▼ cooling

    2.9 ▲  tests\sheet_state_service.test.js [test]
           5 commits    104 churn  0.06 density   0 fan-in  ▲ accelerating        

    1.4 ▼  tests\telegram_parser.test.js [test]
           3 commits    170 churn  0.05 density   0 fan-in  ▼ cooling

  17 files excluded (< 3 commits)

  Files with high churn and high complexity: https://docs.fallow.tools/explanations/health#hotspot-metrics

● Refactoring targets (20)
  17 medium · 3 high
    score = quick-win ROI (higher = better) · pri = absolute priority

   18.1  pri:36.2    modules\event_comments.ts
         complexity · effort:medium · confidence:high  Extract <anonymous> (cognitive: 36) in 389-LOC file into smaller functions
         importers: main.ts (SYH_EVENT_COMMENTS_PLUGIN)
         clones: modules\event_banners.ts:75-82 dup:5b35a9da

   15.8  pri:31.5    modules\ui_core.ts
         high impact · effort:medium · confidence:medium  Split high-impact file (201 LOC), 4 dependents amplify every change
         importers: main.ts (SYH_UI); modules\event_banners.ts (SYH_UI, SyhUi); modules\event_comments.ts (SYH_UI, SyhUi); tests\ui_state.test.js (SYH_UI)

   14.6  pri:29.2    youtube\studio\studio_adapter.ts
         untested risk · effort:medium · confidence:high  4 complex functions lack test coverage path, add tests before modifying
         importers: tests\studio_integration.test.js (StudioCommentAdapter); youtube\studio\studio_events.ts (StudioCommentAdapter, StudioEventCaches, retroactiveUpdateVideoComments, side effect, side effect)

   13.9  pri:41.7    modules\storage.ts
         high impact · effort:high · confidence:medium  Split high-impact file (426 LOC), 26 dependents amplify every change
         importers: background\service-worker.ts (STORAGE_KEYS, migrateStorageIfNeeded); modules\anti_afk.ts (STORAGE_KEYS, SYH_STORAGE); modules\comment_service.ts (STORAGE_KEYS, SYH_STORAGE, getSheetCollectedStorageKey); modules\retention_service.ts (STORAGE_KEYS, SYH_STORAGE); modules\right_tabs_compact.ts (STORAGE_KEYS, SYH_STORAGE, StoredOptions)
         clones: modules\storage.ts:231-238 dup:268f5ad3; modules\storage.ts:251-262 dup:84e7ee46; modules\storage.ts:291-298 dup:268f5ad3; modules\storage.ts:315-326 dup:84e7ee46

   13.9  pri:27.8    modules\ui_comments.ts
         complexity · effort:medium · confidence:high  Extract filterStarredComments (cognitive: 66) and <arrow> (cognitive: 34) in 458-LOC file into smaller functions
         importers: main.ts (side effect); modules\ui_core.ts (addButtonsToComment, addStarredTabControls, addStarredTabCopyButton, applySavedLabels, bindStarredControls, filterStarredComments, scrollToActiveComment, updateCommentVisuals)        
         clones: modules\event_banners.ts:285-299 dup:7bd1ae38; modules\ui_banners.ts:241-248 dup:ee263b69; modules\ui_banners.ts:248-262 dup:fee7cf67; modules\ui_banners.ts:261-297 dup:f3a28a4c; modules\ui_banners.ts:282-296 dup:8f34750e        

   13.7  pri:27.4    options\options.ts
         complexity · effort:medium · confidence:high  Extract <arrow> (cognitive: 33) in 342-LOC file into smaller functions
         importers: options\options.html (side effect)

   13.7  pri:27.3    modules\stats_tracker.ts
         complexity · effort:medium · confidence:high  Extract injectHeaderButtons (cognitive: 47) in 347-LOC file into smaller functions
         importers: main.ts (SYH_STATS_TRACKER)
         clones: modules\stats_tracker.ts:192-206 dup:65f941fa; modules\stats_tracker.ts:218-223 dup:65f941fa; modules\stats_tracker.ts:219-224 dup:0864b2b7; modules\stats_tracker.ts:266-272 dup:0864b2b7

   13.4  pri:26.7    modules\event_banners.ts
         complexity · effort:medium · confidence:high  Extract <anonymous> (cognitive: 39) in 317-LOC file into smaller functions
         importers: main.ts (SYH_EVENT_BANNERS_PLUGIN); modules\ui_banners.ts (SYH_EVENT_BANNERS)
         clones: modules\event_comments.ts:265-272 dup:5b35a9da; modules\ui_comments.ts:246-260 dup:7bd1ae38

   13.1  pri:26.2    modules\banner_creator.ts
         high impact · effort:medium · confidence:medium  Split high-impact file (247 LOC), 3 dependents amplify every change
         importers: main.ts (SYH_BANNER_CREATOR); modules\event_banners.ts (SYH_BANNER_CREATOR, SyhBannerCreator); test_parsers.js (SYH_BANNER_CREATOR)
         clones: modules\telegram_parser.ts:268-274 dup:102cd7a5

   13.1  pri:26.2    modules\ui_banners.ts
         complexity · effort:medium · confidence:high  Extract filterBanners (cognitive: 58) in 298-LOC file into smaller functions
         importers: main.ts (side effect); modules\ui_core.ts (addBannerHeaderControls, addButtonsToBanner, applySavedBannerLabels, filterBanners, scrollToActiveBanner, updateBannerVisuals, updateMasterCheckboxState)
         clones: modules\ui_comments.ts:401-408 dup:ee263b69; modules\ui_comments.ts:408-422 dup:fee7cf67; modules\ui_comments.ts:421-457 dup:f3a28a4c; modules\ui_comments.ts:442-456 dup:8f34750e

  ... and 10 more targets (--format json for full list)

  Prioritized refactoring recommendations based on complexity, churn, and coupling signals: https://docs.fallow.tools/explanations/health#refactoring-targets       

✗ 142 above threshold · 1322 analyzed · maintainability 88.6 (good) (0.79s)       

Failed: dead-code (3 issues), dupes (22 clone groups), health (142 above threshold): start with modules/event_comments.ts
Setup: `fallow init --agents` writes an agent guide; `fallow hooks install --target agent` adds a commit gate (hide this hint: `fallow init --decline`).
PS D:\Chrome Extension\Время перемен. Chrome Extension\streamyars-copy-buttons (added checkbox) 0.6-2026.01.11>