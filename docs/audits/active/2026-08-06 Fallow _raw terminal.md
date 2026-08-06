modules/comment_service.ts:115-126

     10 lines  2 instances  dup:fc617d0e
    popup/popup_prayers.ts:169-178
    popup/popup_prayers.ts:195-204

      9 lines  2 instances  dup:d14376c1
    modules/banner_creator.ts:91-99
    modules/telegram_parser.ts:370-378

  ... and 2 more clone groups
  Identical code blocks detected via suffix-array analysis — https://docs.fallow.tools/explanations/duplication#clone-groups

● Clone families (1 with multiple groups)

  2 groups, 18 lines across modules/stats_tracker.ts
    → Extract shared function (13 lines) from stats_tracker.ts, stats_tracker.ts
    → Extract shared function (5 lines) from stats_tracker.ts, stats_tracker.ts

  Groups of related clones across the same files — https://docs.fallow.tools/explanations/duplication#clone-families

✗ 376 lines (2.2%) duplicated across 13 files (0.06s)

── Complexity ─────────────────────────────────────

■ Metrics: 20,789 LOC · dead files 1.0% · dead exports 0.0% · avg cyclomatic 2.7 · p90 cyclomatic 6 · maintainability 88.9 (good) · 4 churn hotspots (since 6 months)

  Parameters:    93% low · 6% medium · 1% high · 0% very high  (0-2 / 3-4 / 5-6 / >=7 params)

● High complexity functions (147)
  CRAP scores are estimated from export references; run `fallow health --coverage <coverage-final.json>` for exact scores.
  modules/event_comments.ts
    :364 <anonymous> CRITICAL
          28 cyclomatic   25 cognitive   64 lines  
         197.3 CRAP
  options/options.ts
    :21 validateImportedConfig
          24 cyclomatic   20 cognitive   25 lines  
  youtube/yt_adapter.ts
    :30 detectChannelKey CRITICAL
          24 cyclomatic   28 cognitive   44 lines  
         148.4 CRAP
  options/options.ts
    :306 extractImportedItems CRITICAL
          23 cyclomatic   22 cognitive   30 lines  
         137.3 CRAP
  modules/ui_banners.ts
    :159 <arrow> CRITICAL
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
  modules/ui_comments.ts
    :327 <arrow> HIGH
          16 cyclomatic   16 cognitive   41 lines  
          71.3 CRAP
  modules/event_banners.ts
    :204 handleBannerMouseUp CRITICAL
          16 cyclomatic   10 cognitive   39 lines  
         272.0 CRAP
  modules/banner_creator.ts
    :225 <arrow> CRITICAL
          16 cyclomatic   11 cognitive   44 lines  
         272.0 CRAP
  modules/storage.ts
    :385 <arrow> HIGH
          15 cyclomatic   19 cognitive   54 lines  
          63.6 CRAP
  modules/ui_comments.ts
    :75 addStarredTabControls HIGH
          15 cyclomatic   26 cognitive   47 lines  
  options/options.ts
    :146 saveSettings HIGH
          15 cyclomatic    5 cognitive   41 lines  
          63.6 CRAP
  modules/ui_core.ts
    :111 getCheckboxTextKey HIGH
          15 cyclomatic   10 cognitive   17 lines  
          63.6 CRAP
  youtube/youtube_content.ts
    :138 <arrow> CRITICAL
          14 cyclomatic   16 cognitive   33 lines  
         210.0 CRAP
  modules/event_banners.ts
    :50 <arrow> CRITICAL
          14 cyclomatic    9 cognitive   17 lines  
         210.0 CRAP
  modules/banner_creator.ts
    :31 detectBlockCategory CRITICAL
          14 cyclomatic   12 cognitive   17 lines  
         210.0 CRAP
  modules/telegram_parser.ts
    :332 collectTelegramSheetStateFromDOM HIGH     
          14 cyclomatic    7 cognitive   27 lines  
          56.3 CRAP
  modules/comment_injector.ts
    :65 handleAction
          13 cyclomatic   17 cognitive   85 lines  
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
    :59 detectBrandAndSabbathSchool
          12 cyclomatic   13 cognitive   26 lines  
          43.1 CRAP
  modules/stats_exporter.ts
    :336 calculatePhaseStats
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
    :140 checkSabbathSchoolBrandMismatch
          11 cyclomatic   16 cognitive   25 lines  
          37.1 CRAP
  modules/telegram_parser.ts
    :393 createLineByLineHeaderItem
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
    :331 getBrandFromLocalStorage
          11 cyclomatic   15 cognitive   22 lines  
          37.1 CRAP
  modules/anti_afk.ts
    :164 checkOptionsAndRun
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
  modules/stats_exporter.ts
    :445 exportPresentation
          11 cyclomatic   10 cognitive   81 lines  
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
    :207 updateStep3Badges CRITICAL
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
    :486 <arrow> CRITICAL
          10 cyclomatic    9 cognitive  104 lines  
         110.0 CRAP
  modules/stats_tracker.ts
    :261 <arrow>
          10 cyclomatic    9 cognitive   44 lines  
          31.6 CRAP
  youtube/studio/studio_header_counters.ts
    :29 formatCategoryLabel
          10 cyclomatic    9 cognitive   10 lines  
          31.6 CRAP
  youtube/yt_channel_gate.ts
    :9 extractDomChannelInfo CRITICAL
          10 cyclomatic   12 cognitive   32 lines  
         110.0 CRAP
  modules/stats_exporter.ts
    :248 renderChart
          10 cyclomatic    9 cognitive   32 lines  
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
  tests/studio_integration.test.js
    :545 querySelector
          10 cyclomatic    9 cognitive   21 lines  
          31.6 CRAP
  popup/popup_telegram.ts
    :291 ensureStatsBarRows CRITICAL
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
    :380 <arrow> HIGH
           9 cyclomatic    8 cognitive   10 lines  
          90.0 CRAP
    :436 clearSheetState HIGH
           9 cyclomatic   13 cognitive   43 lines  
          90.0 CRAP
    :694 <arrow> HIGH
           9 cyclomatic    4 cognitive    6 lines  
          90.0 CRAP
  modules/event_banners.ts
    :136 handleCopyBannerAction HIGH
           9 cyclomatic    4 cognitive   16 lines  
          90.0 CRAP
  modules/banner_creator.ts
    :78 parseRawTextToBanners HIGH
           9 cyclomatic   12 cognitive   35 lines  
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
    :340 restoreTextareaSizesUI HIGH
           8 cyclomatic   16 cognitive   12 lines  
          72.0 CRAP
    :371 <arrow> HIGH
           8 cyclomatic    7 cognitive   20 lines  
          72.0 CRAP
    :687 <arrow> HIGH
           8 cyclomatic    4 cognitive   18 lines
          72.0 CRAP
  main.ts
    :135 <arrow> HIGH
           8 cyclomatic    8 cognitive   21 lines  
          72.0 CRAP
  modules/event_banners.ts
    :174 handleBannerContextMenu HIGH
           8 cyclomatic    6 cognitive   22 lines  
          72.0 CRAP
    :244 handleSingleBannerCheckboxChange HIGH     
           8 cyclomatic    3 cognitive   10 lines  
          72.0 CRAP
  youtube/youtube_content.ts
    :107 <arrow> HIGH
           8 cyclomatic    6 cognitive   27 lines  
          72.0 CRAP
  popup/popup_telegram.ts
    :528 processTelegramData HIGH
           8 cyclomatic    4 cognitive   56 lines  
          72.0 CRAP
  popup/popup_init.ts
    :182 restoreSheetStats HIGH
           7 cyclomatic    8 cognitive   10 lines  
          56.0 CRAP
    :221 restoreSheetDeletedLog HIGH
           7 cyclomatic    8 cognitive   13 lines  
          56.0 CRAP
    :264 restoreSheetCleanedLog HIGH
           7 cyclomatic    8 cognitive   13 lines  
          56.0 CRAP
    :278 restoreSheetDividerPos HIGH
           7 cyclomatic    8 cognitive    9 lines  
          56.0 CRAP
    :353 restoreTranslitStateUI HIGH
           7 cyclomatic    8 cognitive   13 lines  
          56.0 CRAP
  main.ts
    :38 setupDomRegistration HIGH
           7 cyclomatic    6 cognitive   40 lines  
          56.0 CRAP
    :113 handleUnstarCommentMessage HIGH
           7 cyclomatic    9 cognitive   15 lines  
          56.0 CRAP
    :162 init HIGH
           7 cyclomatic    3 cognitive   22 lines  
          56.0 CRAP
  modules/event_banners.ts
    :309 init HIGH
           7 cyclomatic    7 cognitive    7 lines  
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
    :452 <anonymous>
           6 cyclomatic    5 cognitive   32 lines  
          42.0 CRAP
    :489 <anonymous>
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
    :320 restoreActiveSubtabUI
           6 cyclomatic    7 cognitive   19 lines  
          42.0 CRAP
    :660 <anonymous>
           6 cyclomatic    6 cognitive   16 lines  
          42.0 CRAP
    :724 <anonymous>
           6 cyclomatic    5 cognitive   17 lines  
          42.0 CRAP
  main.ts
    :104 <arrow>
           6 cyclomatic    4 cognitive    7 lines  
          42.0 CRAP
  modules/event_banners.ts
    :106 <arrow>
           6 cyclomatic    3 cognitive    5 lines  
          42.0 CRAP
    :113 handleDeleteSelectedBannersAction
           6 cyclomatic    6 cognitive   22 lines  
          42.0 CRAP
  test_parsers.js
    :9 jQueryMock
           6 cyclomatic    3 cognitive   24 lines  
          42.0 CRAP
  modules/banner_creator.ts
    :114 executeBannerCreationLoop
           6 cyclomatic    8 cognitive   27 lines  
          42.0 CRAP
    :157 processAndCreateBanners
           6 cyclomatic    5 cognitive   34 lines  
          42.0 CRAP
  youtube/youtube_content.ts
    :33 processYTComment
           6 cyclomatic    5 cognitive   28 lines  
          42.0 CRAP
  popup/popup_telegram.ts
    :151 <anonymous>
           6 cyclomatic    5 cognitive   23 lines  
          42.0 CRAP
    :330 ensureNewYTRow
           6 cyclomatic    7 cognitive   23 lines  
          42.0 CRAP
    :379 renderTelegramFinalResult
           6 cyclomatic    5 cognitive   49 lines  
          42.0 CRAP
    :612 <anonymous>
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
    :520 <anonymous>
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
    :193 resolveDeletedLogCount
           5 cyclomatic    4 cognitive    8 lines  
          30.0 CRAP
    :202 applyDeletedLogState
           5 cyclomatic   10 cognitive   18 lines  
          30.0 CRAP
    :235 resolveCleanedLogCount
           5 cyclomatic    4 cognitive    9 lines  
          30.0 CRAP
    :245 applyCleanedLogState
           5 cyclomatic   10 cognitive   18 lines  
          30.0 CRAP
    :300 restoreActiveTabUI
           5 cyclomatic    6 cognitive   19 lines  
          30.0 CRAP
    :763 <arrow>
           5 cyclomatic    2 cognitive   20 lines  
          30.0 CRAP
  main.ts
    :20 <arrow>
           5 cyclomatic    3 cognitive  168 lines  
          30.0 CRAP
  youtube/studio/studio_content.ts
    :127 <arrow>
           5 cyclomatic    4 cognitive   28 lines  
          30.0 CRAP
    :171 startModule
           5 cyclomatic    4 cognitive   64 lines  
          30.0 CRAP
  popup/popup_telegram.ts
    :43 updateOldInputStats
           5 cyclomatic    5 cognitive   22 lines  
          30.0 CRAP
    :117 <anonymous>
           5 cyclomatic    5 cognitive   29 lines  
          30.0 CRAP
    :233 updateStatsBarSection
           5 cyclomatic    2 cognitive   43 lines  
          30.0 CRAP
    :354 updateTelegramStatsUI
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

● File health scores (83 files) · sorted by triage concern

   81.0    modules\event_banners.ts                
        risk
            335 LOC    1 fan-in    8 fan-out    0% dead  0.34 density  272.0 risk

   83.7    modules\banner_creator.ts               
        risk
            274 LOC    3 fan-in    4 fan-out    0% dead  0.33 density  272.0 risk

   84.9    youtube\youtube_content.ts              
        risk
            182 LOC    0 fan-in    8 fan-out    0% dead  0.21 density  210.0 risk

   80.3    modules\event_comments.ts               
        risk
            473 LOC    2 fan-in    9 fan-out    0% dead  0.35 density  197.3 risk

   84.1    popup\popup_prayers.ts                  
        risk
            565 LOC    2 fan-in    6 fan-out    0% dead  0.27 density  156.0 risk

   83.5    youtube\yt_adapter.ts                   
        risk
            206 LOC    2 fan-in    5 fan-out    0% dead  0.31 density  148.4 risk

   80.8    options\options.ts                      
        risk
            393 LOC    2 fan-in    5 fan-out    0% dead  0.40 density  137.3 risk

   83.2    modules\ui_banners.ts                   
        risk
            336 LOC    3 fan-in    6 fan-out    0% dead  0.30 density  126.5 risk

   81.4    youtube\studio\studio_content.ts        
        risk
            367 LOC    0 fan-in   14 fan-out    0% dead  0.26 density  110.0 risk

   82.6    popup\popup_init.ts                     
        risk
            821 LOC    1 fan-in    5 fan-out    0% dead  0.34 density  110.0 risk

  ... and 73 more files (--format json for full list)

  Sorted by triage concern: the larger of low-MI concern and CRAP risk. The risk / structure tag marks which one placed each file. MI reflects complexity, coupling, and dead code; risk reflects untested complexity (CRAP) and can diverge from MI. Risk: low <15, moderate 15-30, high >=30. CRAP estimated from export references (85% direct, 40% indirect, 0% untested). Run `fallow health --coverage <coverage-final.json>` for exact scores. https://docs.fallow.tools/explanations/health#file-health-scores        

● Hotspots (59 files, since 6 months)

   70.5 ▼  popup\popup_init.ts
          24 commits   2440 churn  0.34 density   1 fan-in  ▼ cooling

   61.6 ▲  modules\storage.ts
          24 commits   1050 churn  0.30 density  27 fan-in  ▲ accelerating

   57.5 ▼  popup\popup_telegram.ts
          29 commits   3067 churn  0.23 density   3 fan-in  ▼ cooling

   57.1 ▲  modules\event_comments.ts
          19 commits   1004 churn  0.35 density   2 fan-in  ▲ accelerating

   44.3 ▲  options\options.ts
          13 commits    684 churn  0.40 density   2 fan-in  ▲ accelerating

   42.5 ▲  modules\stats_tracker.ts
          16 commits    908 churn  0.31 density   2 fan-in  ▲ accelerating

   42.4 ▼  youtube\studio\studio_content.ts        
          19 commits    526 churn  0.26 density   0 fan-in  ▼ cooling

   42.0 ▼  popup\popup_prayers.ts
          18 commits   1932 churn  0.27 density   2 fan-in  ▼ cooling

   38.5 ▲  main.ts
          15 commits    703 churn  0.30 density   0 fan-in  ▲ accelerating

   37.4 ▼  youtube\studio\studio_events.ts
          23 commits   1478 churn  0.19 density   1 fan-in  ▼ cooling

   32.9 ▲  modules\ui_core.ts
          12 commits    525 churn  0.32 density   4 fan-in  ▲ accelerating

   32.1 ▲  modules\anti_afk.ts
          14 commits    633 churn  0.27 density   2 fan-in  ▲ accelerating

   31.0 ▲  modules\banner_creator.ts
          11 commits    539 churn  0.33 density   3 fan-in  ▲ accelerating

   29.9 ▲  modules\comment_assistant.ts
          10 commits    458 churn  0.35 density   6 fan-in  ▲ accelerating

   27.0 ─  youtube\studio\studio_adapter.ts        
          10 commits    613 churn  0.31 density   2 fan-in  ─ stable

   26.3 ▲  modules\event_banners.ts
           9 commits   1360 churn  0.34 density   1 fan-in  ▲ accelerating

   26.2 ▲  modules\utils.ts
          11 commits    447 churn  0.28 density  13 fan-in  ▲ accelerating

   25.8 ▲  modules\ui_banners.ts
          10 commits    927 churn  0.30 density   3 fan-in  ▲ accelerating

   25.8 ▲  modules\ui_comments.ts
          10 commits   1003 churn  0.30 density   2 fan-in  ▲ accelerating

   25.2 ▲  background\service-worker.ts
           8 commits    288 churn  0.37 density   1 fan-in  ▲ accelerating

   23.9 ▼  youtube\studio\studio_selectors.ts      
           8 commits    229 churn  0.35 density   5 fan-in  ▼ cooling

   23.1 ▼  modules\channel_config.ts
           9 commits    306 churn  0.30 density  12 fan-in  ▼ cooling

   19.5 ▼  youtube\studio\studio_ui.ts
          12 commits    423 churn  0.19 density   1 fan-in  ▼ cooling

   18.9 ─  youtube\yt_adapter.ts
           7 commits    311 churn  0.31 density   2 fan-in  ─ stable

   18.0 ▼  modules\telegram_parser.ts
           8 commits   1833 churn  0.26 density   4 fan-in  ▼ cooling

   17.9 ▲  modules\parsers.ts
          10 commits    333 churn  0.21 density   7 fan-in  ▲ accelerating

   17.1 ▲  modules\stats_exporter.ts
          10 commits    844 churn  0.20 density   2 fan-in  ▲ accelerating

   16.7 ─  tests\studio_integration.test.js [test] 
           5 commits    616 churn  0.38 density   0 fan-in  ─ stable

   16.2 ▼  youtube\youtube_content.ts
           9 commits    305 churn  0.21 density   0 fan-in  ▼ cooling

   14.3 ▲  modules\config.ts
          13 commits    224 churn  0.13 density  15 fan-in  ▲ accelerating

   13.1 ▼  modules\event_bus.ts
           9 commits     95 churn  0.17 density   6 fan-in  ▼ cooling

   13.0 ▲  modules\state.ts
           7 commits    224 churn  0.22 density   7 fan-in  ▲ accelerating

   12.8 ▲  modules\comment_service.ts
           7 commits    435 churn  0.21 density  17 fan-in  ▲ accelerating

   12.5 ▲  modules\video_copier.ts
           7 commits    476 churn  0.21 density   1 fan-in  ▲ accelerating

   12.3 ▲  youtube\studio\studio_video_map.ts      
           9 commits    251 churn  0.16 density   2 fan-in  ▲ accelerating

   11.9 ▼  youtube\yt_channel_gate.ts
           6 commits    117 churn  0.23 density   1 fan-in  ▼ cooling

   11.8 ▼  modules\sheet_state_service.ts
           8 commits    711 churn  0.17 density   3 fan-in  ▼ cooling

   11.8 ▲  modules\sheets.ts
           6 commits    162 churn  0.23 density  13 fan-in  ▲ accelerating

   10.8 ▲  youtube\yt_events.ts
           9 commits    533 churn  0.14 density   1 fan-in  ▲ accelerating

   10.3 ▼  tests\storage.test.js [test]
           5 commits    254 churn  0.24 density   0 fan-in  ▼ cooling

    9.0 ─  tests\state.test.js [test]
           6 commits    281 churn  0.18 density   0 fan-in  ─ stable

    8.3 ▲  modules\comment_injector.ts
           5 commits    260 churn  0.19 density   3 fan-in  ▲ accelerating

    8.0 ▼  modules\retention_service.ts
           4 commits    257 churn  0.23 density   6 fan-in  ▼ cooling

    7.7 ▲  modules\i18n.ts
           4 commits     33 churn  0.23 density   3 fan-in  ▲ accelerating

    7.4 ▼  tests\utils.test.js [test]
           5 commits    142 churn  0.18 density   0 fan-in  ▼ cooling

    6.8 ▼  youtube\studio\studio_header_counters.ts
           3 commits    181 churn  0.26 density   2 fan-in  ▼ cooling

    6.0 ▲  test_parsers.js
          11 commits    639 churn  0.07 density   0 fan-in  ▲ accelerating

    6.0 ▼  youtube\studio\studio_channel.ts        
           5 commits     67 churn  0.14 density   2 fan-in  ▼ cooling

    6.0 ▲  youtube\studio\studio_comment_key.ts    
           5 commits    144 churn  0.14 density   2 fan-in  ▲ accelerating

    5.9 ▲  modules\comment_platform_adapter.ts     
           4 commits    104 churn  0.17 density   3 fan-in  ▲ accelerating

    5.7 ▼  modules\dom_observer.ts
           3 commits    380 churn  0.22 density   5 fan-in  ▼ cooling

    5.5 ▼  tests\popup_dom.test.js [test]
           5 commits    140 churn  0.13 density   0 fan-in  ▼ cooling

    4.6 ▲  youtube\yt_ui.ts
           3 commits    229 churn  0.18 density   2 fan-in  ▲ accelerating

    4.4 ▲  youtube\studio\studio_category_matcher.ts
           4 commits     68 churn  0.13 density   3 fan-in  ▲ accelerating

    3.8 ▼  popup\popup_translit.ts
           3 commits     77 churn  0.15 density   1 fan-in  ▼ cooling

    3.6 ▼  tests\comment_service.test.js [test]    
           3 commits    138 churn  0.14 density   0 fan-in  ▼ cooling

    2.8 ▼  tests\comment_assistant.test.js [test]  
           3 commits     71 churn  0.11 density   0 fan-in  ▼ cooling

    2.6 ▲  tests\sheet_state_service.test.js [test]
           5 commits    104 churn  0.06 density   0 fan-in  ▲ accelerating

    1.3 ▼  tests\telegram_parser.test.js [test]    
           3 commits    170 churn  0.05 density   0 fan-in  ▼ cooling

  24 files excluded (< 3 commits)

  Files with high churn and high complexity: https://docs.fallow.tools/explanations/health#hotspot-metrics

● Refactoring targets (13)
  11 medium · 2 high
    score = quick-win ROI (higher = better) · pri = absolute priority

   18.6  pri:37.1    modules\event_comments.ts     
         untested risk · effort:medium · confidence:high  6 complex functions lack test coverage path, add tests before modifying
         importers: main.ts (SYH_EVENT_COMMENTS_PLUGIN); tests\event_comments.test.js (SYH_EVENT_COMMENTS, formatCopyPayload, getPrayerIcon, stripLeadingAt)

   15.7  pri:31.3    modules\ui_core.ts
         high impact · effort:medium · confidence:medium  Split high-impact file (204 LOC), 4 dependents amplify every change
         importers: main.ts (SYH_UI); modules\event_banners.ts (SYH_UI, SyhUi); modules\event_comments.ts (SYH_UI, SyhUi); tests\ui_state.test.js (SYH_UI)

   15.5  pri:30.9    options\options.ts
         untested risk · effort:medium · confidence:high  3 complex functions lack test coverage path, add tests before modifying
         importers: options\options.html (side effect); tests\options_config.test.js (OptionsController, validateImportedConfig)

   14.5  pri:28.9    modules\stats_tracker.ts      
         untested risk · effort:medium · confidence:high  4 complex functions lack test coverage path, add tests before modifying
         importers: main.ts (SYH_STATS_TRACKER); tests\stats_tracker.test.js (SYH_STATS_TRACKER)      
         clones: modules\stats_tracker.ts:211-215 dup:96dda87d; modules\stats_tracker.ts:237-241 dup:96dda87d; modules\stats_tracker.ts:238-250 dup:d2527e08; modules\stats_tracker.ts:284-292 dup:d2527e08 

   14.2  pri:28.4    youtube\studio\studio_adapter.ts
         untested risk · effort:medium · confidence:high  4 complex functions lack test coverage path, add tests before modifying
         importers: tests\studio_integration.test.js (StudioCommentAdapter, retroactiveUpdateVideoComments); youtube\studio\studio_events.ts (StudioCommentAdapter, StudioEventCaches, retroactiveUpdateVideoComments, side effect, side effect)

   13.4  pri:26.8    modules\event_banners.ts      
         untested risk · effort:medium · confidence:high  9 complex functions lack test coverage path, add tests before modifying
         importers: main.ts (SYH_EVENT_BANNERS_PLUGIN)

   13.0  pri:26.0    modules\comment_assistant.ts  
         high impact · effort:medium · confidence:medium  Split high-impact file (211 LOC), 6 dependents amplify every change
         importers: main.ts (SYH_COMMENT_ASSISTANT); modules\event_comments.ts (SYH_COMMENT_ASSISTANT); tests\comment_assistant.test.js (SYH_COMMENT_ASSISTANT); youtube\studio\studio_content.ts (SYH_COMMENT_ASSISTANT); youtube\studio\studio_events.ts (SYH_COMMENT_ASSISTANT)

   12.8  pri:25.6    modules\banner_creator.ts     
         high impact · effort:medium · confidence:medium  Split high-impact file (274 LOC), 3 dependents amplify every change
         importers: main.ts (SYH_BANNER_CREATOR); modules\event_banners.ts (SYH_BANNER_CREATOR, SyhBannerCreator); test_parsers.js (SYH_BANNER_CREATOR)  
         clones: modules\telegram_parser.ts:370-378 dup:d14376c1

   11.5  pri:34.5    popup\popup_init.ts
         untested risk · effort:high · confidence:high  22 complex functions lack test coverage path, add tests before modifying
         importers: popup\popup.html (side effect) 
         clones: popup\popup_telegram.ts:17-31 dup:56791f04

   11.1  pri:22.2    youtube\studio\studio_selectors.ts
         high impact · effort:medium · confidence:medium  Split high-impact file (158 LOC), 5 dependents amplify every change
         importers: youtube\studio\studio_adapter.ts (getAuthorNameText, getCommentText, getVideoLinkHref, getVideoTitleText); youtube\studio\studio_channel.ts (getChannelNameElement); youtube\studio\studio_content.ts (STUDIO_SELECTORS, getCommentHeaderElement, getCommentHeaderLabelElement, getCommentThreads); youtube\studio\studio_events.ts (STUDIO_SELECTORS); youtube\studio\studio_ui.ts (getMetadataElement, getToolbarElement)

  ... and 3 more targets (--format json for full list)

  Prioritized refactoring recommendations based on complexity, churn, and coupling signals: https://docs.fallow.tools/explanations/health#refactoring-targets

✗ 147 above threshold · 1590 analyzed · maintainability 88.9 (good) (0.45s)

Failed: dead-code (1 issues), dupes (12 clone groups), health (147 above threshold): start with modules/event_comments.ts
Setup: `fallow init --agents` writes an agent guide; `fallow hooks install --target agent` adds a commit gate (hide this hint: `fallow init --decline`)