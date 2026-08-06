note: module wiring excluded from clone detection (--no-ignore-imports to include it)

● Duplicates (12 clone groups)

     46 lines  2 instances  dup:37430ff9
    modules/stats_exporter.ts:350-370
    modules/stats_exporter.ts:373-418

     44 lines  2 instances  dup:0a389c03
    test_parsers.js:319-348
    test_parsers.js:357-400

     22 lines  2 instances  dup:f0975d58
    modules/video_copier.ts:162-183
    modules/video_copier.ts:333-352

     15 lines  2 instances  dup:ae481b7b
    modules/sheet_state_service.ts:133-147
    modules/sheet_state_service.ts:190-204

     15 lines  2 instances  dup:65f941fa
    modules/stats_tracker.ts:205-219
    modules/stats_tracker.ts:231-236

     15 lines  2 instances  dup:56791f04
    popup/popup_init.ts:75-89
    popup/popup_telegram.ts:15-29

     14 lines  2 instances  dup:01d08471
    youtube/studio/studio_styles.css:554-567       
    youtube/youtube_styles.css:129-142

     12 lines  2 instances  dup:c60ade04
    modules/comment_service.ts:90-100
    modules/comment_service.ts:115-126

     10 lines  2 instances  dup:fc617d0e
    popup/popup_prayers.ts:169-178
    popup/popup_prayers.ts:195-204

      9 lines  2 instances  dup:d14376c1
    modules/banner_creator.ts:91-99
    modules/telegram_parser.ts:328-336

  ... and 2 more clone groups
  Identical code blocks detected via suffix-array analysis — https://docs.fallow.tools/explanations/duplication#clone-groups

● Clone families (1 with multiple groups)

  2 groups, 22 lines across modules/stats_tracker.ts
    → Extract shared function (7 lines) from stats_tracker.ts, stats_tracker.ts
    → Extract shared function (15 lines) from stats_tracker.ts, stats_tracker.ts

  Groups of related clones across the same files — https://docs.fallow.tools/explanations/duplication#clone-families

✗ 375 lines (2.2%) duplicated across 13 files (0.06s)

── Complexity ─────────────────────────────────────

■ Metrics: 20,417 LOC · dead files 1.1% · dead exports 0.0% · avg cyclomatic 2.8 · p90 cyclomatic 7 · maintainability 88.9 (good) · 4 churn hotspots (since 6 months) · 2 circular deps

  Parameters:    93% low · 6% medium · 1% high · 0% very high  (0-2 / 3-4 / 5-6 / >=7 params)

● High complexity functions (139)
  CRAP scores are estimated from export references; run `fallow health --coverage <coverage-final.json>` for exact scores.
  modules/event_comments.ts
    :364 <anonymous> CRITICAL
          28 cyclomatic   25 cognitive   64 lines  
         197.3 CRAP
  modules/ui_comments.ts
    :309 <arrow> CRITICAL
          28 cyclomatic   34 cognitive   50 lines  
         197.3 CRAP
  options/options.ts
    :110 <arrow> CRITICAL
          26 cyclomatic   33 cognitive   42 lines  
         172.0 CRAP
    :320 <arrow> CRITICAL
          26 cyclomatic   34 cognitive   42 lines  
         172.0 CRAP
    :21 validateImportedConfig
          24 cyclomatic   20 cognitive   25 lines  
  youtube/yt_adapter.ts
    :30 detectChannelKey CRITICAL
          24 cyclomatic   28 cognitive   44 lines  
         148.4 CRAP
  modules/ui_banners.ts
    :162 <arrow> CRITICAL
          22 cyclomatic   24 cognitive   40 lines  
         126.5 CRAP
  background/service-worker.ts
    :29 updateExtensionBadge
          21 cyclomatic   23 cognitive   57 lines  
  modules/anti_afk.ts
    :29 checkAndClickAntiAfk HIGH
          21 cyclomatic   27 cognitive   81 lines  
  modules/ui_shared_utils.ts
    :91 renderSharedEmptyState HIGH
          21 cyclomatic   39 cognitive   59 lines  
  modules/parsers.ts
    :95 parseEmojiNumberedQuestions HIGH
          18 cyclomatic   27 cognitive   55 lines  
          88.0 CRAP
  modules/retention_service.ts
    :64 runGlobalCleanup HIGH
          18 cyclomatic   24 cognitive   55 lines  
          88.0 CRAP
  tests/anti_afk.test.js
    :50 matches HIGH
          17 cyclomatic   16 cognitive   24 lines  
          79.4 CRAP
  tests/studio_integration.test.js
    :187 querySelector HIGH
          17 cyclomatic   16 cognitive   19 lines  
          79.4 CRAP
  modules/event_banners.ts
    :204 handleBannerMouseUp HIGH
          16 cyclomatic   10 cognitive   39 lines  
          71.3 CRAP
  modules/banner_creator.ts
    :225 <arrow> HIGH
          16 cyclomatic   11 cognitive   44 lines  
          71.3 CRAP
  modules/ui_core.ts
    :122 <arrow> HIGH
          16 cyclomatic   11 cognitive   21 lines  
          71.3 CRAP
  modules/storage.ts
    :385 <arrow> HIGH
          15 cyclomatic   19 cognitive   54 lines  
          63.6 CRAP
  modules/ui_comments.ts
    :75 addStarredTabControls HIGH
          15 cyclomatic   26 cognitive   47 lines  
  popup/popup_init.ts
    :193 restoreSheetDeletedLog CRITICAL
          15 cyclomatic   20 cognitive   23 lines  
         240.0 CRAP
  options/options.ts
    :154 saveSettings HIGH
          15 cyclomatic    5 cognitive   41 lines  
          63.6 CRAP
  modules/ui_banners.ts
    :82 injectSearchAndFilterContainer HIGH        
          15 cyclomatic   14 cognitive   44 lines  
          63.6 CRAP
  youtube/youtube_content.ts
    :138 <arrow> CRITICAL
          14 cyclomatic   16 cognitive   33 lines  
         210.0 CRAP
  youtube/yt_channel_gate.ts
    :4 extractDomChannelInfo CRITICAL
          14 cyclomatic   16 cognitive   38 lines  
         210.0 CRAP
  modules/event_banners.ts
    :50 <arrow> HIGH
          14 cyclomatic    9 cognitive   17 lines  
          56.3 CRAP
  modules/banner_creator.ts
    :31 detectBlockCategory HIGH
          14 cyclomatic   12 cognitive   17 lines  
          56.3 CRAP
  popup/popup_telegram.ts
    :529 collectTelegramSheetStateFromDOM CRITICAL 
          14 cyclomatic    7 cognitive   26 lines  
         210.0 CRAP
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
  modules/stats_exporter.ts
    :425 exportPresentation
          13 cyclomatic   11 cognitive   80 lines  
          49.5 CRAP
  modules/comment_assistant.ts
    :38 init
          13 cyclomatic    6 cognitive   17 lines  
          49.5 CRAP
  modules/event_comments.ts
    :205 <arrow>
          12 cyclomatic   18 cognitive   20 lines  
          43.1 CRAP
    :260 <anonymous> HIGH
          12 cyclomatic   26 cognitive   28 lines  
          43.1 CRAP
  tests/css_lint.test.js
    :14 checkCssFile
          12 cyclomatic   18 cognitive   32 lines
          43.1 CRAP
  popup/popup_prayers.ts
    :215 renderPrayers CRITICAL
          12 cyclomatic   14 cognitive   94 lines  
         156.0 CRAP
  modules/stats_tracker.ts
    :53 detectBrandAndSabbathSchool CRITICAL       
          12 cyclomatic   13 cognitive   26 lines  
         156.0 CRAP
  modules/stats_exporter.ts
    :318 calculatePhaseStats
          12 cyclomatic    5 cognitive   31 lines  
          43.1 CRAP
  modules/event_comments.ts
    :186 <arrow>
          12 cyclomatic   14 cognitive   16 lines  
          43.1 CRAP
  modules/sheet_state_service.ts
    :130 loadSheetState
          12 cyclomatic   11 cognitive   44 lines  
          43.1 CRAP
  modules/telegram_parser.ts
    :82 extractAuthorFromLines
          12 cyclomatic   12 cognitive   38 lines  
          43.1 CRAP
  youtube/studio/studio_adapter.ts
    :262 afterAction
          12 cyclomatic   11 cognitive   34 lines  
          43.1 CRAP
  modules/stats_tracker.ts
    :134 checkSabbathSchoolBrandMismatch CRITICAL  
          11 cyclomatic   16 cognitive   25 lines  
         132.0 CRAP
  modules/telegram_parser.ts
    :351 createLineByLineHeaderItem
          11 cyclomatic   19 cognitive   20 lines  
          37.1 CRAP
  tests/popup_dom.test.js
    :72 <arrow>
          11 cyclomatic   17 cognitive   27 lines  
          37.1 CRAP
  youtube/studio/studio_selectors.ts
    :96 getVideoLinkHref
          11 cyclomatic   17 cognitive   15 lines  
  popup/popup_prayers.ts
    :373 <anonymous> CRITICAL
          11 cyclomatic   15 cognitive   91 lines  
         132.0 CRAP
  modules/stats_tracker.ts
    :330 getBrandFromLocalStorage CRITICAL
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
    :153 handleMarkBannerCategoryAction
          11 cyclomatic    5 cognitive   20 lines  
          37.1 CRAP
  tests/studio_integration.test.js
    :234 querySelector
          11 cyclomatic   10 cognitive   20 lines  
          37.1 CRAP
  modules/telegram_parser.ts
    :283 <arrow>
          11 cyclomatic   11 cognitive   30 lines  
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
  popup/popup_telegram.ts
    :205 updateStep3Badges CRITICAL
          10 cyclomatic   18 cognitive   25 lines  
         110.0 CRAP
  background/service-worker.ts
    :190 <arrow>
          10 cyclomatic   11 cognitive   26 lines  
          31.6 CRAP
  youtube/studio/studio_events.ts
    :63 observer CRITICAL
          10 cyclomatic    6 cognitive   14 lines  
         110.0 CRAP
  popup/popup_init.ts
    :468 <arrow> CRITICAL
          10 cyclomatic    9 cognitive  104 lines  
         110.0 CRAP
  modules/stats_tracker.ts
    :256 <arrow> CRITICAL
          10 cyclomatic    9 cognitive   48 lines  
         110.0 CRAP
  youtube/studio/studio_header_counters.ts
    :29 formatCategoryLabel
          10 cyclomatic    9 cognitive   10 lines  
          31.6 CRAP
  modules/stats_exporter.ts
    :241 renderChart
          10 cyclomatic    9 cognitive   32 lines  
          31.6 CRAP
  modules/banner_creator.ts
    :49 parseBlock
          10 cyclomatic   12 cognitive   28 lines  
          31.6 CRAP
  youtube/studio/studio_content.ts
    :81 <arrow> CRITICAL
          10 cyclomatic    9 cognitive   27 lines  
         110.0 CRAP
  modules/event_comments.ts
    :293 <anonymous>
          10 cyclomatic   13 cognitive   18 lines  
          31.6 CRAP
    :316 <anonymous>
          10 cyclomatic   13 cognitive   27 lines  
          31.6 CRAP
  modules/ui_comments.ts
    :144 <arrow>
          10 cyclomatic    8 cognitive   59 lines  
          31.6 CRAP
  popup/popup_telegram.ts
    :289 ensureStatsBarRows CRITICAL
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
    :36 <anonymous> HIGH
           9 cyclomatic    7 cognitive   30 lines  
          90.0 CRAP
  popup/popup_init.ts
    :362 <arrow> HIGH
           9 cyclomatic    8 cognitive   10 lines  
          90.0 CRAP
    :418 clearSheetState HIGH
           9 cyclomatic   13 cognitive   43 lines  
          90.0 CRAP
    :676 <arrow> HIGH
           9 cyclomatic    4 cognitive    6 lines  
          90.0 CRAP
  modules/stats_tracker.ts
    :281 <arrow> HIGH
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
  modules/video_copier.ts
    :328 <arrow> HIGH
           8 cyclomatic   16 cognitive   28 lines  
          72.0 CRAP
  popup/popup_init.ts
    :322 restoreTextareaSizesUI HIGH
           8 cyclomatic   16 cognitive   12 lines  
          72.0 CRAP
    :353 <arrow> HIGH
           8 cyclomatic    7 cognitive   20 lines  
          72.0 CRAP
    :669 <arrow> HIGH
           8 cyclomatic    4 cognitive   18 lines  
          72.0 CRAP
  main.ts
    :127 <arrow> HIGH
           8 cyclomatic    8 cognitive   21 lines  
          72.0 CRAP
  youtube/youtube_content.ts
    :107 <arrow> HIGH
           8 cyclomatic    6 cognitive   27 lines  
          72.0 CRAP
  popup/popup_telegram.ts
    :567 processTelegramData HIGH
           8 cyclomatic    4 cognitive   56 lines  
          72.0 CRAP
  popup/popup_init.ts
    :182 restoreSheetStats HIGH
           7 cyclomatic    8 cognitive   10 lines  
          56.0 CRAP
    :246 restoreSheetCleanedLog HIGH
           7 cyclomatic    8 cognitive   13 lines  
          56.0 CRAP
    :260 restoreSheetDividerPos HIGH
           7 cyclomatic    8 cognitive    9 lines  
          56.0 CRAP
    :335 restoreTranslitStateUI HIGH
           7 cyclomatic    8 cognitive   13 lines  
          56.0 CRAP
  modules/stats_tracker.ts
    :208 <arrow> HIGH
           7 cyclomatic    8 cognitive   13 lines  
          56.0 CRAP
    :234 <arrow> HIGH
           7 cyclomatic    6 cognitive   16 lines  
          56.0 CRAP
    :353 searchBrandNameInObject HIGH
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
  youtube/studio/studio_content.ts
    :210 <arrow> HIGH
           7 cyclomatic    6 cognitive   22 lines  
          56.0 CRAP
    :236 stopModule HIGH
           7 cyclomatic    6 cognitive   34 lines  
          56.0 CRAP
  modules/right_tabs_compact.ts
    :30 loadState
           6 cyclomatic    6 cognitive   22 lines  
          42.0 CRAP
    :58 processTabButton
           6 cyclomatic    6 cognitive   38 lines  
          42.0 CRAP
  popup/popup_prayers.ts
    :345 <anonymous>
           6 cyclomatic    4 cognitive   25 lines  
          42.0 CRAP
    :469 <anonymous>
           6 cyclomatic    5 cognitive   12 lines  
          42.0 CRAP
  youtube/studio/studio_events.ts
    :89 bindStudioCommentEvents
           6 cyclomatic    5 cognitive   32 lines  
          42.0 CRAP
  popup/popup_init.ts
    :139 restoreDbState
           6 cyclomatic    7 cognitive    9 lines  
          42.0 CRAP
    :302 restoreActiveSubtabUI
           6 cyclomatic    7 cognitive   19 lines  
          42.0 CRAP
    :642 <anonymous>
           6 cyclomatic    6 cognitive   16 lines  
          42.0 CRAP
    :706 <anonymous>
           6 cyclomatic    5 cognitive   17 lines  
          42.0 CRAP
  test_parsers.js
    :9 jQueryMock
           6 cyclomatic    3 cognitive   24 lines  
          42.0 CRAP
  youtube/youtube_content.ts
    :33 processYTComment
           6 cyclomatic    5 cognitive   28 lines  
          42.0 CRAP
  popup/popup_telegram.ts
    :149 <anonymous>
           6 cyclomatic    5 cognitive   23 lines  
          42.0 CRAP
    :328 ensureNewYTRow
           6 cyclomatic    7 cognitive   23 lines  
          42.0 CRAP
    :377 renderTelegramFinalResult
           6 cyclomatic    5 cognitive   49 lines  
          42.0 CRAP
    :651 <anonymous>
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
    :34 checkRoomWarning
           5 cyclomatic    2 cognitive   34 lines  
          30.0 CRAP
    :89 buildAuthorHeader
           5 cyclomatic    4 cognitive   77 lines  
          30.0 CRAP
    :500 <anonymous>
           5 cyclomatic    5 cognitive   37 lines  
          30.0 CRAP
  youtube/studio/studio_events.ts
    :42 setupVideoMetadataObserver
           5 cyclomatic    4 cognitive   46 lines  
          30.0 CRAP
    :125 cleanupRecycledStudioElement
           5 cyclomatic    4 cognitive   18 lines  
          30.0 CRAP
    :165 applyStudioCommentIntegrations
           5 cyclomatic    3 cognitive   26 lines  
          30.0 CRAP
  popup/popup_init.ts
    :217 resolveCleanedLogCount
           5 cyclomatic    4 cognitive    9 lines  
          30.0 CRAP
    :227 applyCleanedLogState
           5 cyclomatic   10 cognitive   18 lines  
          30.0 CRAP
    :282 restoreActiveTabUI
           5 cyclomatic    6 cognitive   19 lines  
          30.0 CRAP
    :745 <arrow>
           5 cyclomatic    2 cognitive   20 lines  
          30.0 CRAP
  modules/stats_tracker.ts
    :49 setupObservers
           5 cyclomatic    2 cognitive  154 lines  
          30.0 CRAP
  main.ts
    :20 <arrow>
           5 cyclomatic    3 cognitive  157 lines  
          30.0 CRAP
  youtube/studio/studio_content.ts
    :127 <arrow>
           5 cyclomatic    4 cognitive   28 lines  
          30.0 CRAP
    :171 startModule
           5 cyclomatic    4 cognitive   64 lines  
          30.0 CRAP
  popup/popup_telegram.ts
    :41 updateOldInputStats
           5 cyclomatic    5 cognitive   22 lines  
          30.0 CRAP
    :115 <anonymous>
           5 cyclomatic    5 cognitive   29 lines  
          30.0 CRAP
    :231 updateStatsBarSection
           5 cyclomatic    2 cognitive   43 lines  
          30.0 CRAP
    :352 updateTelegramStatsUI
           5 cyclomatic    4 cognitive   24 lines  
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

● File health scores (82 files) · sorted by triage concern

   82.6    popup\popup_init.ts                     
        risk
            803 LOC    1 fan-in    5 fan-out    0% dead  0.34 density  240.0 risk

   84.5    popup\popup_telegram.ts                 
        risk
            669 LOC    3 fan-in    7 fan-out    0% dead  0.24 density  210.0 risk

   84.9    youtube\youtube_content.ts              
        risk
            182 LOC    0 fan-in    8 fan-out    0% dead  0.21 density  210.0 risk

   88.5    youtube\yt_channel_gate.ts              
        risk
             63 LOC    1 fan-in    1 fan-out    0% dead  0.29 density  210.0 risk

   80.6    modules\event_comments.ts               
        risk
            471 LOC    2 fan-in    9 fan-out    0% dead  0.34 density  197.3 risk

   82.7    modules\ui_comments.ts                  
        risk
            451 LOC    2 fan-in    7 fan-out    0% dead  0.30 density  197.3 risk

   79.2    main.ts                                 
        risk
            177 LOC    0 fan-in   18 fan-out    0% dead  0.30 density  182.0 risk

   80.2    options\options.ts                      
        risk
            395 LOC    2 fan-in    5 fan-out    0% dead  0.42 density  172.0 risk

   82.9    modules\stats_tracker.ts                
        risk
            360 LOC    1 fan-in    6 fan-out    0% dead  0.31 density  156.0 risk

   84.1    popup\popup_prayers.ts                  
        risk
            545 LOC    2 fan-in    6 fan-out    0% dead  0.27 density  156.0 risk

  ... and 72 more files (--format json for full list)

  Sorted by triage concern: the larger of low-MI concern and CRAP risk. The risk / structure tag marks which one placed each file. MI reflects complexity, coupling, and dead code; risk reflects untested complexity (CRAP) and can diverge from MI. Risk: low <15, moderate 15-30, high >=30. CRAP estimated from export references (85% direct, 40% indirect, 0% untested). Run `fallow health --coverage <coverage-final.json>` for exact scores. https://docs.fallow.tools/explanations/health#file-health-scores        

● Hotspots (58 files, since 6 months)

   66.1 ▼  popup\popup_init.ts
          22 commits   2341 churn  0.34 density   1 fan-in  ▼ cooling

   60.3 ▲  modules\storage.ts
          23 commits   1036 churn  0.30 density  27 fan-in  ▲ accelerating

   57.1 ▼  popup\popup_telegram.ts
          27 commits   2679 churn  0.24 density   3 fan-in  ▼ cooling

   50.7 ▲  modules\event_comments.ts
          17 commits    910 churn  0.34 density   2 fan-in  ▲ accelerating

   43.4 ▼  youtube\studio\studio_content.ts        
          19 commits    526 churn  0.26 density   0 fan-in  ▼ cooling

   40.1 ▲  options\options.ts
          11 commits    467 churn  0.42 density   2 fan-in  ▲ accelerating

   38.1 ▼  popup\popup_prayers.ts
          16 commits   1735 churn  0.27 density   2 fan-in  ▼ cooling

   38.0 ▲  modules\stats_tracker.ts
          14 commits    681 churn  0.31 density   1 fan-in  ▲ accelerating

   36.8 ▲  main.ts
          14 commits    604 churn  0.30 density   0 fan-in  ▲ accelerating

   36.6 ▼  youtube\studio\studio_events.ts
          22 commits   1415 churn  0.19 density   1 fan-in  ▼ cooling

   32.9 ▲  modules\anti_afk.ts
          14 commits    633 churn  0.27 density   2 fan-in  ▲ accelerating

   30.8 ▲  modules\ui_core.ts
          11 commits    486 churn  0.32 density   4 fan-in  ▲ accelerating

   28.8 ▲  modules\banner_creator.ts
          10 commits    334 churn  0.33 density   3 fan-in  ▲ accelerating

   27.6 ─  youtube\studio\studio_adapter.ts        
          10 commits    613 churn  0.31 density   2 fan-in  ─ stable

   27.5 ▲  modules\comment_assistant.ts
           9 commits    382 churn  0.35 density   6 fan-in  ▲ accelerating

   26.9 ▲  modules\utils.ts
          11 commits    447 churn  0.28 density  13 fan-in  ▲ accelerating

   24.4 ▼  youtube\studio\studio_selectors.ts      
           8 commits    229 churn  0.35 density   5 fan-in  ▼ cooling

   23.9 ▲  modules\event_banners.ts
           8 commits    999 churn  0.34 density   2 fan-in  ▲ accelerating

   23.8 ▲  modules\ui_comments.ts
           9 commits    970 churn  0.30 density   2 fan-in  ▲ accelerating

   23.7 ▼  modules\channel_config.ts
           9 commits    306 churn  0.30 density  12 fan-in  ▼ cooling

   22.4 ▲  background\service-worker.ts
           7 commits    180 churn  0.37 density   1 fan-in  ▲ accelerating

   21.1 ▲  modules\ui_banners.ts
           8 commits    735 churn  0.30 density   3 fan-in  ▲ accelerating

   20.0 ▼  youtube\studio\studio_ui.ts
          12 commits    423 churn  0.19 density   1 fan-in  ▼ cooling

   19.3 ─  youtube\yt_adapter.ts
           7 commits    311 churn  0.31 density   2 fan-in  ─ stable

   18.4 ▲  modules\parsers.ts
          10 commits    333 churn  0.21 density   7 fan-in  ▲ accelerating

   14.7 ▲  youtube\youtube_content.ts
           8 commits    293 churn  0.21 density   0 fan-in  ▲ accelerating

   14.6 ▲  modules\stats_exporter.ts
           8 commits    558 churn  0.21 density   2 fan-in  ▲ accelerating

   14.6 ▲  modules\config.ts
          13 commits    224 churn  0.13 density  15 fan-in  ▲ accelerating

   13.7 ─  tests\studio_integration.test.js [test] 
           4 commits    524 churn  0.38 density   0 fan-in  ─ stable

   13.5 ▼  modules\event_bus.ts
           9 commits     95 churn  0.17 density   6 fan-in  ▼ cooling

   13.3 ▲  modules\state.ts
           7 commits    224 churn  0.22 density   7 fan-in  ▲ accelerating

   13.2 ▼  modules\telegram_parser.ts
           6 commits   1404 churn  0.25 density   4 fan-in  ▼ cooling

   13.1 ▲  modules\comment_service.ts
           7 commits    435 churn  0.21 density  17 fan-in  ▲ accelerating

   12.8 ▲  modules\video_copier.ts
           7 commits    476 churn  0.21 density   1 fan-in  ▲ accelerating

   12.6 ▲  youtube\studio\studio_video_map.ts      
           9 commits    251 churn  0.16 density   2 fan-in  ▲ accelerating

   12.1 ▼  modules\sheet_state_service.ts
           8 commits    711 churn  0.17 density   3 fan-in  ▼ cooling

   12.0 ▲  modules\sheets.ts
           6 commits    162 churn  0.23 density  13 fan-in  ▲ accelerating

   11.0 ▲  youtube\yt_events.ts
           9 commits    533 churn  0.14 density   1 fan-in  ▲ accelerating

   10.1 ▲  youtube\yt_channel_gate.ts
           4 commits     67 churn  0.29 density   1 fan-in  ▲ accelerating

    9.2 ─  tests\state.test.js [test]
           6 commits    281 churn  0.18 density   0 fan-in  ─ stable

    8.5 ▲  modules\comment_injector.ts
           5 commits    260 churn  0.19 density   3 fan-in  ▲ accelerating

    8.4 ▼  tests\storage.test.js [test]
           4 commits    203 churn  0.24 density   0 fan-in  ▼ cooling

    7.9 ▲  modules\i18n.ts
           4 commits     33 churn  0.23 density   3 fan-in  ▲ accelerating

    7.6 ▼  tests\utils.test.js [test]
           5 commits    142 churn  0.18 density   0 fan-in  ▼ cooling

    7.0 ▼  youtube\studio\studio_header_counters.ts
           3 commits    181 churn  0.26 density   2 fan-in  ▼ cooling

    6.1 ▲  modules\retention_service.ts
           3 commits    217 churn  0.23 density   6 fan-in  ▲ accelerating

    6.1 ▲  test_parsers.js
          11 commits    639 churn  0.07 density   0 fan-in  ▲ accelerating

    6.1 ▼  youtube\studio\studio_channel.ts        
           5 commits     67 churn  0.14 density   2 fan-in  ▼ cooling

    6.1 ▲  youtube\studio\studio_comment_key.ts    
           5 commits    144 churn  0.14 density   2 fan-in  ▲ accelerating

    6.1 ▲  modules\comment_platform_adapter.ts     
           4 commits    104 churn  0.17 density   3 fan-in  ▲ accelerating

    5.6 ▼  tests\popup_dom.test.js [test]
           5 commits    140 churn  0.13 density   0 fan-in  ▼ cooling

    4.7 ▲  youtube\yt_ui.ts
           3 commits    229 churn  0.18 density   2 fan-in  ▲ accelerating

    4.5 ▲  youtube\studio\studio_category_matcher.ts
           4 commits     68 churn  0.13 density   3 fan-in  ▲ accelerating

    3.9 ▼  popup\popup_translit.ts
           3 commits     77 churn  0.15 density   1 fan-in  ▼ cooling

    3.7 ▼  tests\comment_service.test.js [test]    
           3 commits    138 churn  0.14 density   0 fan-in  ▼ cooling

    2.9 ▼  tests\comment_assistant.test.js [test]  
           3 commits     71 churn  0.11 density   0 fan-in  ▼ cooling

    2.7 ▲  tests\sheet_state_service.test.js [test]
           5 commits    104 churn  0.06 density   0 fan-in  ▲ accelerating

    1.3 ▼  tests\telegram_parser.test.js [test]    
           3 commits    170 churn  0.05 density   0 fan-in  ▼ cooling

  18 files excluded (< 3 commits)

  Files with high churn and high complexity: https://docs.fallow.tools/explanations/health#hotspot-metrics

● Refactoring targets (15)
  13 medium · 2 high
    score = quick-win ROI (higher = better) · pri = absolute priority

   17.6  pri:35.2    modules\event_comments.ts     
         untested risk · effort:medium · confidence:high  6 complex functions lack test coverage path, add tests before modifying
         importers: main.ts (SYH_EVENT_COMMENTS_PLUGIN); tests\event_comments.test.js (formatCopyPayload, getPrayerIcon, stripLeadingAt)

   15.4  pri:30.8    modules\ui_core.ts
         high impact · effort:medium · confidence:medium  Split high-impact file (201 LOC), 4 dependents amplify every change
         importers: main.ts (SYH_UI); modules\event_banners.ts (SYH_UI, SyhUi); modules\event_comments.ts (SYH_UI, SyhUi); tests\ui_state.test.js (SYH_UI)

   15.3  pri:30.5    options\options.ts
         complexity · effort:medium · confidence:high  Extract <arrow> (cognitive: 34) and <arrow> (cognitive: 33) in 395-LOC file into smaller functions
         importers: options\options.html (side effect); tests\options_config.test.js (validateImportedConfig)

   14.3  pri:28.5    youtube\studio\studio_adapter.ts
         untested risk · effort:medium · confidence:high  4 complex functions lack test coverage path, add tests before modifying
         importers: tests\studio_integration.test.js (StudioCommentAdapter); youtube\studio\studio_events.ts (StudioCommentAdapter, StudioEventCaches, retroactiveUpdateVideoComments, side effect, side effect)

   13.7  pri:27.4    modules\event_banners.ts      
         untested risk · effort:medium · confidence:high  3 complex functions lack test coverage path, add tests before modifying
         importers: main.ts (SYH_EVENT_BANNERS_PLUGIN); modules\ui_banners.ts (SYH_EVENT_BANNERS)     

   13.3  pri:26.6    modules\stats_tracker.ts      
         untested risk · effort:medium · confidence:high  9 complex functions lack test coverage path, add tests before modifying
         importers: main.ts (SYH_STATS_TRACKER)    
         clones: modules\stats_tracker.ts:205-219 dup:65f941fa; modules\stats_tracker.ts:231-236 dup:65f941fa; modules\stats_tracker.ts:232-237 dup:0864b2b7; modules\stats_tracker.ts:279-285 dup:0864b2b7 

   12.8  pri:25.5    modules\ui_banners.ts
         circular dependency · effort:medium · confidence:high  Break import cycle to reduce change cascade risk
         importers: main.ts (side effect); modules\event_banners.ts (bindBannersFilterControls); modules\ui_core.ts (addBannerHeaderControls, addButtonsToBanner, applySavedBannerLabels, filterBanners, scrollToActiveBanner, updateBannerVisuals, updateMasterCheckboxState)

   12.7  pri:25.4    modules\comment_assistant.ts  
         high impact · effort:medium · confidence:medium  Split high-impact file (211 LOC), 6 dependents amplify every change
         importers: main.ts (SYH_COMMENT_ASSISTANT); modules\event_comments.ts (SYH_COMMENT_ASSISTANT); tests\comment_assistant.test.js (SYH_COMMENT_ASSISTANT); youtube\studio\studio_content.ts (SYH_COMMENT_ASSISTANT); youtube\studio\studio_events.ts (SYH_COMMENT_ASSISTANT)

   12.5  pri:25.0    modules\banner_creator.ts     
         high impact · effort:medium · confidence:medium  Split high-impact file (274 LOC), 3 dependents amplify every change
         importers: main.ts (SYH_BANNER_CREATOR); modules\event_banners.ts (SYH_BANNER_CREATOR, SyhBannerCreator); test_parsers.js (SYH_BANNER_CREATOR)  
         clones: modules\telegram_parser.ts:328-336 dup:d14376c1

   12.5  pri:25.0    modules\ui_comments.ts        
         complexity · effort:medium · confidence:high  Extract <arrow> (cognitive: 34) in 451-LOC file into smaller functions
         importers: main.ts (side effect); modules\ui_core.ts (addButtonsToComment, addStarredTabControls, addStarredTabCopyButton, applySavedLabels, bindStarredControls, filterStarredComments, scrollToActiveComment, updateCommentVisuals)

  ... and 5 more targets (--format json for full list)

  Prioritized refactoring recommendations based on complexity, churn, and coupling signals: https://docs.fallow.tools/explanations/health#refactoring-targets

✗ 139 above threshold · 1522 analyzed · maintainability 88.9 (good) (0.35s)

Failed: dead-code (3 issues), dupes (12 clone groups), health (139 above threshold): start with modules/event_comments.ts
Setup: `fallow init --agents` writes an agent guide; `fallow hooks install --target agent` adds a commit gate (hide this hint: `fallow init --decline`). 
PS D:\Chrome Extension\Время перемен. Chrome Extension\streamyars-copy-buttons (added checkbox) 0.6-2026.01.11>