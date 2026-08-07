■ Metrics: dead files 1.0% (1 of 96) · dead exports 0.0% (0 of 348) · MI 89.0 (good) · 4 churn hotspots
  96 files analyzed
  92 entry points detected (70 plugin, 22 package.json)
  12 refactoring targets — start with modules/event_comments.ts (untested risk)
Tip: run `fallow explain <issue label>`; spaces and hyphens both work, e.g. `fallow explain unused files`.

Next: fallow dupes --trace dup:01d08471  (see sibling locations and an extract-function suggestion)


── Dead Code ──────────────────────────────────────

── Unused Code ─────────────────────────────────────

● Unused files (1)
  test_parsers.js
  Files not reachable from any entry point — https://docs.fallow.tools/explanations/dead-code#unused-files

✗ 1 file (1.00s)

── Duplication ────────────────────────────────────
note: skipped 24 files matching default duplicates ignores (use --explain-skipped for the list)
note: module wiring excluded from clone detection (--no-ignore-imports to include it)

● Duplicates (7 clone groups)

     47 lines  2 instances  dup:726bdf31
    modules/stats_exporter.ts:368-389
    modules/stats_exporter.ts:392-438

     44 lines  2 instances  dup:0a389c03
    test_parsers.js:319-348
    test_parsers.js:357-400

     15 lines  2 instances  dup:ae481b7b
    modules/sheet_state_service.ts:133-147
    modules/sheet_state_service.ts:190-204

     15 lines  2 instances  dup:56791f04
    popup/popup_init.ts:75-89
    popup/popup_telegram.ts:17-31

     14 lines  2 instances  dup:01d08471
    youtube/studio/studio_styles.css:554-567
    youtube/youtube_styles.css:129-142

     12 lines  2 instances  dup:c60ade04
    modules/comment_service.ts:90-100
    modules/comment_service.ts:115-126

      7 lines  2 instances  dup:2b2e1dd3
    modules/sheet_state_service.ts:217-223
    popup/popup_telegram.ts:243-249

  Identical code blocks detected via suffix-array analysis — https://docs.fallow.tools/explanations/duplication#clone-groups

✗ 268 lines (1.6%) duplicated across 8 files (0.07s)

── Complexity ─────────────────────────────────────

■ Metrics: 20,766 LOC · dead files 1.0% · dead exports 0.0% · avg cyclomatic 2.6 · p90 cyclomatic 6 · maintainability 89.0 (good) · 4 churn hotspots (since 6 months)

  Parameters:    93% low · 6% medium · 1% high · 0% very high  (0-2 / 3-4 / 5-6 / >=7 params)  

● High complexity functions (136)
  CRAP scores are estimated from export references; run `fallow health --coverage <coverage-final.json>` for exact scores.
  modules/ui_shared_utils.ts
    :91 renderSharedEmptyState HIGH
          21 cyclomatic   39 cognitive   59 lines
  modules/parsers.ts
    :103 parseEmojiNumberedQuestions HIGH
          18 cyclomatic   27 cognitive   55 lines
          88.0 CRAP
  tests/anti_afk.test.js
    :50 matches HIGH
          17 cyclomatic   16 cognitive   24 lines
          79.4 CRAP
  tests/studio_integration.test.js
    :187 querySelector HIGH
          17 cyclomatic   16 cognitive   19 lines
          79.4 CRAP
  modules/event_comments.ts
    :71 handleSyhButtonMouseUp HIGH
          16 cyclomatic    9 cognitive   31 lines
          71.3 CRAP
  modules/ui_comments.ts
    :75 addStarredTabControls HIGH
          15 cyclomatic   26 cognitive   47 lines
  options/options.ts
    :146 saveSettings HIGH
          15 cyclomatic    5 cognitive   41 lines
          63.6 CRAP
  modules/banner_creator.ts
    :221 createSingleBanner CRITICAL
          15 cyclomatic   10 cognitive   38 lines
         240.0 CRAP
  modules/ui_core.ts
    :111 getCheckboxTextKey HIGH
          15 cyclomatic   10 cognitive   17 lines
          63.6 CRAP
  modules/event_banners.ts
    :50 <arrow> CRITICAL
          14 cyclomatic    9 cognitive   17 lines
         210.0 CRAP
  modules/banner_creator.ts
    :31 detectBlockCategory CRITICAL
          14 cyclomatic   12 cognitive   17 lines
         210.0 CRAP
  modules/telegram_parser.ts
    :335 collectTelegramSheetStateFromDOM HIGH
          14 cyclomatic    7 cognitive   27 lines
          56.3 CRAP
  modules/comment_injector.ts
    :65 handleAction
          13 cyclomatic   17 cognitive   85 lines
          49.5 CRAP
  modules/event_comments.ts
    :103 applyCommentActionState
          13 cyclomatic   16 cognitive   42 lines
          49.5 CRAP
  modules/fuzzy_match.ts
    :41 fuzzyIncludes
          13 cyclomatic   20 cognitive   28 lines
  options/options.ts
    :109 populateFormElements
          13 cyclomatic   13 cognitive   27 lines
          49.5 CRAP
  modules/ui_banners.ts
    :81 injectSearchAndFilterContainer
          13 cyclomatic   12 cognitive   42 lines
          49.5 CRAP
  modules/comment_assistant.ts
    :38 init
          13 cyclomatic    6 cognitive   17 lines
          49.5 CRAP
  modules/anti_afk.ts
    :63 checkAndClickAntiAfk
          12 cyclomatic   16 cognitive   42 lines
  modules/event_comments.ts
    :280 <arrow>
          12 cyclomatic   18 cognitive   20 lines
          43.1 CRAP
    :335 <anonymous> HIGH
          12 cyclomatic   26 cognitive   28 lines
          43.1 CRAP
  tests/css_lint.test.js
    :14 checkCssFile
          12 cyclomatic   18 cognitive   32 lines
          43.1 CRAP
  popup/popup_prayers.ts
    :201 renderPrayers CRITICAL
          12 cyclomatic   14 cognitive   94 lines
         156.0 CRAP
  modules/stats_tracker.ts
    :60 detectBrandAndSabbathSchool
          12 cyclomatic   13 cognitive   26 lines
          43.1 CRAP
  modules/stats_exporter.ts
    :336 calculatePhaseStats
          12 cyclomatic    5 cognitive   31 lines
          43.1 CRAP
  modules/event_comments.ts
    :261 <arrow>
          12 cyclomatic   14 cognitive   16 lines
          43.1 CRAP
  modules/ui_comments.ts
    :337 <arrow>
          12 cyclomatic    9 cognitive   29 lines
          43.1 CRAP
  modules/sheet_state_service.ts
    :130 loadSheetState
          12 cyclomatic   11 cognitive   44 lines
          43.1 CRAP
  modules/stats_tracker.ts
    :141 checkSabbathSchoolBrandMismatch
          11 cyclomatic   16 cognitive   25 lines
          37.1 CRAP
  modules/telegram_parser.ts
    :394 createLineByLineHeaderItem
          11 cyclomatic   19 cognitive   20 lines
          37.1 CRAP
  tests/popup_dom.test.js
    :72 <arrow>
          11 cyclomatic   17 cognitive   27 lines
          37.1 CRAP
  youtube/studio/studio_selectors.ts
    :96 getVideoLinkHref
          11 cyclomatic   17 cognitive   15 lines
  modules/stats_tracker.ts
    :336 getBrandFromLocalStorage
          11 cyclomatic   15 cognitive   22 lines
          37.1 CRAP
  modules/anti_afk.ts
    :159 checkOptionsAndRun
          11 cyclomatic    8 cognitive   50 lines
          37.1 CRAP
  youtube/studio/studio_selectors.ts
    :129 <arrow>
          11 cyclomatic   15 cognitive   19 lines
          37.1 CRAP
  modules/event_banners.ts
    :153 handleMarkBannerCategoryAction CRITICAL
          11 cyclomatic    5 cognitive   20 lines
         132.0 CRAP
    :212 handleBannerMouseUp CRITICAL
          11 cyclomatic    9 cognitive   36 lines
         132.0 CRAP
  modules/ui_banners.ts
    :176 <arrow>
          11 cyclomatic   12 cognitive   25 lines
          37.1 CRAP
  tests/studio_integration.test.js
    :234 querySelector
          11 cyclomatic   10 cognitive   20 lines
          37.1 CRAP
  modules/telegram_parser.ts
    :286 <arrow>
          11 cyclomatic   11 cognitive   30 lines
          37.1 CRAP
  youtube/studio/studio_adapter.ts
    :60 <arrow>
          11 cyclomatic    9 cognitive   23 lines
          37.1 CRAP
    :467 toggleZIndexStack
          11 cyclomatic   12 cognitive   13 lines
          37.1 CRAP
  popup/popup_init.ts
    :208 restoreSheetLog CRITICAL
          10 cyclomatic   16 cognitive   26 lines
         110.0 CRAP
  background/service-worker.ts
    :197 <arrow>
          10 cyclomatic   11 cognitive   26 lines
          31.6 CRAP
  popup/popup_init.ts
    :496 <arrow> CRITICAL
          10 cyclomatic    9 cognitive  104 lines
         110.0 CRAP
  modules/stats_tracker.ts
    :267 <arrow>
          10 cyclomatic    9 cognitive   43 lines
          31.6 CRAP
  youtube/studio/studio_header_counters.ts
    :29 formatCategoryLabel
          10 cyclomatic    9 cognitive   10 lines
          31.6 CRAP
  modules/stats_exporter.ts
    :248 renderChart
          10 cyclomatic    9 cognitive   32 lines
          31.6 CRAP
    :460 generatePresentationHtml
          10 cyclomatic    9 cognitive   69 lines
          31.6 CRAP
  modules/banner_creator.ts
    :49 parseBlock CRITICAL
          10 cyclomatic   12 cognitive   28 lines
         110.0 CRAP
  youtube/studio/studio_content.ts
    :81 <arrow> CRITICAL
          10 cyclomatic    9 cognitive   27 lines
         110.0 CRAP
  modules/event_comments.ts
    :368 <anonymous>
          10 cyclomatic   13 cognitive   18 lines
          31.6 CRAP
    :391 <anonymous>
          10 cyclomatic   13 cognitive   27 lines
          31.6 CRAP
  modules/ui_comments.ts
    :144 <arrow>
          10 cyclomatic    8 cognitive   59 lines
          31.6 CRAP
  tests/studio_integration.test.js
    :545 querySelector
          10 cyclomatic    9 cognitive   21 lines
          31.6 CRAP
  youtube/youtube_content.ts
    :92 initYouTubeModule CRITICAL
          10 cyclomatic    9 cognitive   42 lines
         110.0 CRAP
  youtube/studio/studio_adapter.ts
    :264 afterAction
          10 cyclomatic    8 cognitive   27 lines
          31.6 CRAP
    :314 getEffectiveCheckboxState
          10 cyclomatic    6 cognitive   14 lines
          31.6 CRAP
  popup/popup_prayers.ts
    :36 <anonymous> HIGH
           9 cyclomatic    7 cognitive   30 lines
          90.0 CRAP
  youtube/studio/studio_events.ts
    :42 hasVideoMetadata HIGH
           9 cyclomatic    5 cognitive   15 lines
          90.0 CRAP
  popup/popup_init.ts
    :390 <arrow> HIGH
           9 cyclomatic    8 cognitive   10 lines
          90.0 CRAP
    :446 clearSheetState HIGH
           9 cyclomatic   13 cognitive   43 lines
          90.0 CRAP
    :704 <arrow> HIGH
           9 cyclomatic    4 cognitive    6 lines
          90.0 CRAP
  main.ts
    :128 init HIGH
           9 cyclomatic    5 cognitive   46 lines
          90.0 CRAP
  modules/event_banners.ts
    :136 handleCopyBannerAction HIGH
           9 cyclomatic    4 cognitive   16 lines
          90.0 CRAP
  youtube/studio/studio_content.ts
    :276 processVisibleComments HIGH
           9 cyclomatic    6 cognitive   24 lines
          90.0 CRAP
    :301 updateHeaderCounters HIGH
           9 cyclomatic    7 cognitive   16 lines
          90.0 CRAP
  youtube/youtube_content.ts
    :150 handleStorageChange HIGH
           9 cyclomatic    7 cognitive   20 lines
          90.0 CRAP
  popup/popup_init.ts
    :350 restoreTextareaSizesUI HIGH
           8 cyclomatic   16 cognitive   12 lines
          72.0 CRAP
    :381 <arrow> HIGH
           8 cyclomatic    7 cognitive   20 lines
          72.0 CRAP
    :697 <arrow> HIGH
           8 cyclomatic    4 cognitive   18 lines
          72.0 CRAP
  main.ts
    :101 <arrow> HIGH
           8 cyclomatic    8 cognitive   21 lines
          72.0 CRAP
  modules/event_banners.ts
    :174 handleBannerContextMenu HIGH
           8 cyclomatic    6 cognitive   22 lines
          72.0 CRAP
    :249 handleSingleBannerCheckboxChange HIGH
           8 cyclomatic    3 cognitive   10 lines
          72.0 CRAP
  popup/popup_telegram.ts
    :528 processTelegramData HIGH
           8 cyclomatic    4 cognitive   56 lines
          72.0 CRAP
  popup/popup_init.ts
    :182 restoreSheetStats HIGH
           7 cyclomatic    8 cognitive   10 lines
          56.0 CRAP
    :288 restoreSheetDividerPos HIGH
           7 cyclomatic    8 cognitive    9 lines
          56.0 CRAP
    :363 restoreTranslitStateUI HIGH
           7 cyclomatic    8 cognitive   13 lines
          56.0 CRAP
  main.ts
    :38 setupDomRegistration HIGH
           7 cyclomatic    6 cognitive   40 lines
          56.0 CRAP
    :79 handleUnstarCommentMessage HIGH
           7 cyclomatic    9 cognitive   15 lines
          56.0 CRAP
  modules/event_banners.ts
    :314 init HIGH
           7 cyclomatic    7 cognitive    7 lines
          56.0 CRAP
  tests/ts_loader.js
    :4 resolve HIGH
           7 cyclomatic   12 cognitive   18 lines
          56.0 CRAP
  modules/banner_creator.ts
    :78 parseRawTextToBanners HIGH
           7 cyclomatic   10 cognitive   33 lines
          56.0 CRAP
  youtube/studio/studio_content.ts
    :206 <arrow> HIGH
           7 cyclomatic    6 cognitive   22 lines
          56.0 CRAP
    :232 stopModule HIGH
           7 cyclomatic    6 cognitive   34 lines
          56.0 CRAP
  modules/video_copier.ts
    :15 isFreshVideoCard HIGH
           7 cyclomatic    8 cognitive   26 lines
          56.0 CRAP
  modules/right_tabs_compact.ts
    :30 loadState
           6 cyclomatic    6 cognitive   22 lines
          42.0 CRAP
    :58 processTabButton
           6 cyclomatic    6 cognitive   38 lines
          42.0 CRAP
  popup/popup_prayers.ts
    :331 <anonymous>
           6 cyclomatic    4 cognitive   25 lines
          42.0 CRAP
    :438 <anonymous>
           6 cyclomatic    5 cognitive   32 lines
          42.0 CRAP
    :475 <anonymous>
           6 cyclomatic    5 cognitive   12 lines
          42.0 CRAP
  youtube/studio/studio_events.ts
    :98 bindStudioCommentEvents
           6 cyclomatic    5 cognitive   32 lines
          42.0 CRAP
  popup/popup_init.ts
    :139 restoreDbState
           6 cyclomatic    7 cognitive    9 lines
          42.0 CRAP
    :330 restoreActiveSubtabUI
           6 cyclomatic    7 cognitive   19 lines
          42.0 CRAP
    :670 <anonymous>
           6 cyclomatic    6 cognitive   16 lines
          42.0 CRAP
    :734 <anonymous>
           6 cyclomatic    5 cognitive   17 lines
          42.0 CRAP
  main.ts
    :164 <arrow>
           6 cyclomatic    4 cognitive    7 lines
          42.0 CRAP
  modules/event_banners.ts
    :106 <arrow>
           6 cyclomatic    3 cognitive    5 lines
          42.0 CRAP
    :113 handleDeleteSelectedBannersAction
           6 cyclomatic    6 cognitive   22 lines
          42.0 CRAP
    :204 isAllowedBannerAction
           6 cyclomatic    2 cognitive    7 lines
          42.0 CRAP
  test_parsers.js
    :9 jQueryMock
           6 cyclomatic    3 cognitive   24 lines
          42.0 CRAP
  modules/banner_creator.ts
    :112 executeBannerCreationLoop
           6 cyclomatic    8 cognitive   27 lines
          42.0 CRAP
    :155 processAndCreateBanners
           6 cyclomatic    5 cognitive   34 lines
          42.0 CRAP
  youtube/youtube_content.ts
    :33 processYTComment
           6 cyclomatic    5 cognitive   28 lines
          42.0 CRAP
    :135 handleOptionsChange
           6 cyclomatic    6 cognitive   14 lines
          42.0 CRAP
  popup/popup_telegram.ts
    :151 <anonymous>
           6 cyclomatic    5 cognitive   23 lines
          42.0 CRAP
    :323 ensureNewYTRow
           6 cyclomatic    7 cognitive   23 lines
          42.0 CRAP
    :372 renderTelegramFinalResult
           6 cyclomatic    5 cognitive   49 lines
          42.0 CRAP
    :612 <anonymous>
           6 cyclomatic    5 cognitive   15 lines
          42.0 CRAP
  modules/video_copier.ts
    :354 downloadSingleFreshVideo
           6 cyclomatic    7 cognitive   31 lines
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
    :34 checkRoomWarning
           5 cyclomatic    2 cognitive   34 lines
          30.0 CRAP
    :89 buildAuthorHeader
           5 cyclomatic    4 cognitive   77 lines
          30.0 CRAP
    :506 <anonymous>
           5 cyclomatic    5 cognitive   37 lines
          30.0 CRAP
  youtube/studio/studio_events.ts
    :58 setupVideoMetadataObserver
           5 cyclomatic    4 cognitive   39 lines
          30.0 CRAP
    :134 cleanupRecycledStudioElement
           5 cyclomatic    4 cognitive   18 lines
          30.0 CRAP
    :174 applyStudioCommentIntegrations
           5 cyclomatic    3 cognitive   26 lines
          30.0 CRAP
  popup/popup_init.ts
    :235 resolveDeletedLogCount
           5 cyclomatic    4 cognitive    8 lines
          30.0 CRAP
    :261 resolveCleanedLogCount
           5 cyclomatic    4 cognitive    9 lines
          30.0 CRAP
    :310 restoreActiveTabUI
           5 cyclomatic    6 cognitive   19 lines
          30.0 CRAP
    :773 <arrow>
           5 cyclomatic    2 cognitive   20 lines
          30.0 CRAP
  main.ts
    :20 <arrow>
           5 cyclomatic    3 cognitive  158 lines
          30.0 CRAP
  youtube/studio/studio_content.ts
    :115 loadStorageData
           5 cyclomatic    4 cognitive   38 lines
          30.0 CRAP
    :167 startModule
           5 cyclomatic    4 cognitive   64 lines
          30.0 CRAP
  popup/popup_telegram.ts
    :43 updateOldInputStats
           5 cyclomatic    5 cognitive   22 lines
          30.0 CRAP
    :117 <anonymous>
           5 cyclomatic    5 cognitive   29 lines
          30.0 CRAP
    :232 updateStatsBarSection
           5 cyclomatic    2 cognitive   43 lines
          30.0 CRAP
    :299 ensureStatsBarRows
           5 cyclomatic    3 cognitive   23 lines
          30.0 CRAP
    :347 updateTelegramStatsUI
           5 cyclomatic    4 cognitive   24 lines
          30.0 CRAP
  modules/video_copier.ts
    :121 injectModalButton
           5 cyclomatic    5 cognitive   52 lines
          30.0 CRAP
    :194 appendButtonsToCard
           5 cyclomatic    4 cognitive   43 lines
          30.0 CRAP
  Functions exceeding cyclomatic, cognitive, or CRAP thresholds (https://docs.fallow.tools/explanations/health#complexity-metrics)
  To suppress: // fallow-ignore-next-line complexity

● File health scores (83 files) · sorted by triage concern

   84.0    modules\banner_creator.ts                       risk
            262 LOC    3 fan-in    4 fan-out    0% dead  0.32 density  240.0 risk

   81.0    modules\event_banners.ts                        risk
            340 LOC    1 fan-in    8 fan-out    0% dead  0.34 density  210.0 risk

   83.8    popup\popup_prayers.ts                          risk
            551 LOC    2 fan-in    6 fan-out    0% dead  0.28 density  156.0 risk

   81.4    youtube\studio\studio_content.ts                risk
            363 LOC    0 fan-in   14 fan-out    0% dead  0.26 density  110.0 risk

   83.2    popup\popup_init.ts                             risk
            831 LOC    1 fan-in    5 fan-out    0% dead  0.32 density  110.0 risk

   84.9    youtube\youtube_content.ts                      risk
            184 LOC    0 fan-in    8 fan-out    0% dead  0.21 density  110.0 risk

   79.5    main.ts                                         risk
            178 LOC    0 fan-in   18 fan-out    0% dead  0.29 density  90.0 risk

   86.0    youtube\studio\studio_events.ts                 risk
            200 LOC    1 fan-in    7 fan-out    0% dead  0.19 density  90.0 risk

   89.3    modules\parsers.ts                              risk
            240 LOC    7 fan-in    2 fan-out    0% dead  0.21 density  88.0 risk

   79.4    tests\studio_integration.test.js                risk
            615 LOC    0 fan-in    9 fan-out    0% dead  0.38 density  79.4 risk

  ... and 73 more files (--format json for full list)

  Sorted by triage concern: the larger of low-MI concern and CRAP risk. The risk / structure tag marks which one placed each file. MI reflects complexity, coupling, and dead code; risk reflects untested complexity (CRAP) and can diverge from MI. Risk: low <15, moderate 15-30, high >=30. CRAP estimated from export references (85% direct, 40% indirect, 0% untested). Run `fallow health --coverage <coverage-final.json>` for exact scores. https://docs.fallow.tools/explanations/health#file-health-scores

● Hotspots (59 files, since 6 months)

   70.3 ▼  popup\popup_init.ts
          25 commits   2570 churn  0.32 density   1 fan-in  ▼ cooling

   65.3 ▲  modules\storage.ts
          25 commits   1087 churn  0.30 density  27 fan-in  ▲ accelerating

   59.5 ▲  modules\event_comments.ts
          20 commits   1142 churn  0.34 density   2 fan-in  ▲ accelerating

   57.9 ▼  popup\popup_telegram.ts
          30 commits   3173 churn  0.22 density   3 fan-in  ▼ cooling

   46.7 ▼  popup\popup_prayers.ts
          19 commits   1990 churn  0.28 density   2 fan-in  ▼ cooling

   45.4 ▼  youtube\studio\studio_content.ts
          20 commits    576 churn  0.26 density   0 fan-in  ▼ cooling

   44.6 ▲  modules\stats_tracker.ts
          17 commits    925 churn  0.30 density   2 fan-in  ▲ accelerating

   43.7 ▲  options\options.ts
          14 commits    731 churn  0.36 density   2 fan-in  ▲ accelerating

   40.5 ▲  main.ts
          16 commits    771 churn  0.29 density   0 fan-in  ▲ accelerating

   39.8 ▼  youtube\studio\studio_events.ts
          24 commits   1503 churn  0.19 density   1 fan-in  ▼ cooling

   36.3 ▲  modules\anti_afk.ts
          15 commits    688 churn  0.28 density   2 fan-in  ▲ accelerating

   33.4 ▲  modules\banner_creator.ts
          12 commits    629 churn  0.32 density   3 fan-in  ▲ accelerating

   33.4 ▲  modules\ui_core.ts
          12 commits    525 churn  0.32 density   4 fan-in  ▲ accelerating

   31.6 ▲  modules\comment_assistant.ts
          11 commits    480 churn  0.33 density   6 fan-in  ▲ accelerating

   30.2 ─  youtube\studio\studio_adapter.ts
          11 commits    654 churn  0.31 density   2 fan-in  ─ stable

   29.8 ▲  modules\event_banners.ts
          10 commits   1373 churn  0.34 density   1 fan-in  ▲ accelerating

   29.0 ▲  modules\ui_banners.ts
          11 commits    967 churn  0.30 density   3 fan-in  ▲ accelerating

   29.0 ▲  modules\ui_comments.ts
          11 commits   1035 churn  0.30 density   2 fan-in  ▲ accelerating

   28.9 ▲  background\service-worker.ts
           9 commits    355 churn  0.37 density   1 fan-in  ▲ accelerating

   28.1 ▲  modules\utils.ts
          12 commits    458 churn  0.27 density  13 fan-in  ▲ accelerating

   24.3 ▼  youtube\studio\studio_selectors.ts
           8 commits    229 churn  0.35 density   5 fan-in  ▼ cooling

   23.6 ▼  modules\channel_config.ts
          10 commits    325 churn  0.27 density  12 fan-in  ▼ cooling

   20.9 ▲  modules\stats_exporter.ts
          12 commits    890 churn  0.20 density   2 fan-in  ▲ accelerating

   20.2 ─  youtube\youtube_content.ts
          11 commits    393 churn  0.21 density   0 fan-in  ─ stable

   20.1 ▲  modules\parsers.ts
          11 commits    341 churn  0.21 density   7 fan-in  ▲ accelerating

   19.9 ─  modules\telegram_parser.ts
           9 commits   1852 churn  0.25 density   4 fan-in  ─ stable

   18.1 ▼  youtube\studio\studio_ui.ts
          13 commits    492 churn  0.16 density   1 fan-in  ▼ cooling

   17.0 ─  tests\studio_integration.test.js [test]
           5 commits    616 churn  0.38 density   0 fan-in  ─ stable

   17.0 ▲  youtube\yt_adapter.ts
           8 commits    351 churn  0.24 density   2 fan-in  ▲ accelerating

   14.6 ▲  modules\video_copier.ts
           8 commits    635 churn  0.21 density   1 fan-in  ▲ accelerating

   14.5 ▲  modules\config.ts
          13 commits    224 churn  0.13 density  16 fan-in  ▲ accelerating

   14.1 ─  youtube\yt_channel_gate.ts
           7 commits    121 churn  0.23 density   2 fan-in  ─ stable

   13.3 ▼  modules\event_bus.ts
           9 commits     95 churn  0.17 density   6 fan-in  ▼ cooling

   13.2 ▲  modules\state.ts
           7 commits    224 churn  0.22 density   7 fan-in  ▲ accelerating

   13.0 ▲  modules\comment_service.ts
           7 commits    435 churn  0.21 density  17 fan-in  ▲ accelerating

   12.5 ▲  youtube\studio\studio_video_map.ts
           9 commits    251 churn  0.16 density   2 fan-in  ▲ accelerating

   12.0 ▼  modules\sheet_state_service.ts
           8 commits    711 churn  0.17 density   3 fan-in  ▼ cooling

   12.0 ▲  modules\sheets.ts
           6 commits    162 churn  0.23 density  13 fan-in  ▲ accelerating

   10.9 ▲  youtube\yt_events.ts
           9 commits    533 churn  0.14 density   1 fan-in  ▲ accelerating

   10.5 ▼  tests\storage.test.js [test]
           5 commits    254 churn  0.24 density   0 fan-in  ▼ cooling

    9.3 ─  youtube\studio\studio_header_counters.ts
           4 commits    197 churn  0.26 density   2 fan-in  ─ stable

    9.1 ─  tests\state.test.js [test]
           6 commits    281 churn  0.18 density   0 fan-in  ─ stable

    8.8 ▼  modules\retention_service.ts
           5 commits    308 churn  0.20 density   6 fan-in  ▼ cooling

    8.4 ▲  modules\comment_injector.ts
           5 commits    260 churn  0.19 density   3 fan-in  ▲ accelerating

    7.8 ▲  modules\i18n.ts
           4 commits     33 churn  0.23 density   3 fan-in  ▲ accelerating

    7.5 ▼  tests\utils.test.js [test]
           5 commits    142 churn  0.18 density   0 fan-in  ▼ cooling

    6.1 ▲  test_parsers.js
          11 commits    639 churn  0.07 density   0 fan-in  ▲ accelerating

    6.1 ▼  youtube\studio\studio_channel.ts
           5 commits     67 churn  0.14 density   2 fan-in  ▼ cooling

    6.1 ▲  youtube\studio\studio_comment_key.ts
           5 commits    144 churn  0.14 density   2 fan-in  ▲ accelerating

    6.0 ▼  popup\popup_translit.ts
           4 commits     88 churn  0.17 density   1 fan-in  ▼ cooling

    6.0 ▲  modules\comment_platform_adapter.ts
           4 commits    104 churn  0.17 density   3 fan-in  ▲ accelerating

    5.8 ▼  modules\dom_observer.ts
           3 commits    380 churn  0.22 density   5 fan-in  ▼ cooling

    5.6 ▼  tests\popup_dom.test.js [test]
           5 commits    140 churn  0.13 density   0 fan-in  ▼ cooling

    4.7 ▲  youtube\yt_ui.ts
           3 commits    229 churn  0.18 density   2 fan-in  ▲ accelerating

    4.5 ▲  youtube\studio\studio_category_matcher.ts
           4 commits     68 churn  0.13 density   3 fan-in  ▲ accelerating

    3.7 ▼  tests\comment_service.test.js [test]
           3 commits    138 churn  0.14 density   0 fan-in  ▼ cooling

    2.8 ▼  tests\comment_assistant.test.js [test]
           3 commits     71 churn  0.11 density   0 fan-in  ▼ cooling

    2.7 ▲  tests\sheet_state_service.test.js [test]
           5 commits    104 churn  0.06 density   0 fan-in  ▲ accelerating

    1.3 ▼  tests\telegram_parser.test.js [test]
           3 commits    170 churn  0.05 density   0 fan-in  ▼ cooling

  24 files excluded (< 3 commits)

  Files with high churn and high complexity: https://docs.fallow.tools/explanations/health#hotspot-metrics

● Refactoring targets (12)
  10 medium · 2 high
    score = quick-win ROI (higher = better) · pri = absolute priority

   18.7  pri:37.4    modules\event_comments.ts
         untested risk · effort:medium · confidence:high  7 complex functions lack test coverage path, add tests before modifying
         importers: main.ts (SYH_EVENT_COMMENTS_PLUGIN); tests\event_comments.test.js (SYH_EVENT_COMMENTS, formatCopyPayload, getPrayerIcon, stripLeadingAt)

   15.8  pri:31.5    modules\ui_core.ts
         high impact · effort:medium · confidence:medium  Split high-impact file (204 LOC), 4 dependents amplify every change
         importers: main.ts (SYH_UI); modules\event_banners.ts (SYH_UI, SyhUi); modules\event_comments.ts (SYH_UI, SyhUi); tests\ui_state.test.js (SYH_UI)

   14.8  pri:29.6    options\options.ts
         untested risk · effort:medium · confidence:high  2 complex functions lack test coverage path, add tests before modifying
         importers: options\options.html (side effect); tests\options_config.test.js (OptionsController, validateImportedConfig)

   14.6  pri:29.2    youtube\studio\studio_adapter.ts
         untested risk · effort:medium · confidence:high  4 complex functions lack test coverage path, add tests before modifying
         importers: tests\studio_integration.test.js (StudioCommentAdapter, retroactiveUpdateVideoComments); youtube\studio\studio_events.ts (StudioCommentAdapter, StudioEventCaches, retroactiveUpdateVideoComments, side effect, side effect)

   13.9  pri:27.7    modules\event_banners.ts
         untested risk · effort:medium · confidence:high  10 complex functions lack test coverage path, add tests before modifying
         importers: main.ts (SYH_EVENT_BANNERS_PLUGIN)

   13.0  pri:25.9    modules\banner_creator.ts
         high impact · effort:medium · confidence:medium  Split high-impact file (262 LOC), 3 dependents amplify every change
         importers: main.ts (SYH_BANNER_CREATOR); modules\event_banners.ts (SYH_BANNER_CREATOR, SyhBannerCreator); test_parsers.js (SYH_BANNER_CREATOR)

   12.9  pri:25.8    modules\comment_assistant.ts
         high impact · effort:medium · confidence:medium  Split high-impact file (221 LOC), 6 dependents amplify every change
         importers: main.ts (SYH_COMMENT_ASSISTANT); modules\event_comments.ts (SYH_COMMENT_ASSISTANT); tests\comment_assistant.test.js (SYH_COMMENT_ASSISTANT); youtube\studio\studio_content.ts (SYH_COMMENT_ASSISTANT); youtube\studio\studio_events.ts (SYH_COMMENT_ASSISTANT)

   11.3  pri:33.9    popup\popup_init.ts
         untested risk · effort:high · confidence:high  19 complex functions lack test coverage path, add tests before modifying
         importers: popup\popup.html (side effect)
         clones: popup\popup_telegram.ts:17-31 dup:56791f04

   11.2  pri:22.3    youtube\studio\studio_selectors.ts
         high impact · effort:medium · confidence:medium  Split high-impact file (158 LOC), 5 dependents amplify every change
         importers: youtube\studio\studio_adapter.ts (getAuthorNameText, getCommentText, getVideoLinkHref, getVideoTitleText); youtube\studio\studio_channel.ts (getChannelNameElement); youtube\studio\studio_content.ts (STUDIO_SELECTORS, getCommentHeaderElement, getCommentHeaderLabelElement, getCommentThreads); youtube\studio\studio_events.ts (STUDIO_SELECTORS); youtube\studio\studio_ui.ts (getMetadataElement, getToolbarElement)

    8.6  pri:25.7    tests\studio_integration.test.js
         untested risk · effort:high · confidence:high  3 complex functions lack test coverage path, add tests before modifying

  ... and 2 more targets (--format json for full list)

  Prioritized refactoring recommendations based on complexity, churn, and coupling signals: https://docs.fallow.tools/explanations/health#refactoring-targets

✗ 136 above threshold · 1612 analyzed · maintainability 89.0 (good) (0.16s)

Failed: dead-code (1 issues), dupes (7 clone groups), health (136 above threshold): start with modules/event_comments.ts
Setup: `fallow init --agents` writes an agent guide; `fallow hooks install --target agent` adds a commit gate (hide this hint: `fallow init --decline`).