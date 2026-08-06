% very high  (1-15 / 16-30 / 31-60 / >60 LOC)      
  Parameters:    94% low · 5% medium · 0% high · 0% very high  (0-2 / 3-4 / 5-6 / >=7 params)

● Large functions (10 shown, 51 total)
  tests\studio_integration.test.js
    :39 <arrow>  484 lines
  tests\storage.test.js
    :20 <arrow>  180 lines
  tests\state.test.js
    :57 <arrow>  163 lines
  test_parsers.js
    :129 testCategoryDetection  158 lines
  main.ts
    :20 <arrow>  157 lines
  modules\stats_tracker.ts
    :49 setupObservers  142 lines
  tests\utils.test.js
    :10 <arrow>  123 lines
  modules\stats_exporter.ts
    :254 exportPresentation  120 lines
  modules\banner_creator.ts
    :46 processAndCreateBanners  118 lines
  youtube\studio\studio_header_counters.ts
    :56 renderStudioHeaderCounters  118 lines
  Functions exceeding 60 lines of code (very high risk): https://docs.fallow.tools/explanations/health#unit-size
  use --top 51 to see all

● High complexity functions (149)
  CRAP scores are estimated from export references; run `fallow health --coverage <coverage-final.json>` for exact scores.
  modules/event_comments.ts
    :313 <anonymous> CRITICAL
          33 cyclomatic   35 cognitive   79 lines  
         1122.0 CRAP
  modules/ui_comments.ts
    :309 <arrow> CRITICAL
          28 cyclomatic   34 cognitive   50 lines  
         197.3 CRAP
  options/options.ts
    :84 <arrow> CRITICAL
          26 cyclomatic   33 cognitive   42 lines  
         702.0 CRAP
  modules/stats_tracker.ts
    :53 injectHeaderButtons CRITICAL
          25 cyclomatic   47 cognitive  115 lines  
         650.0 CRAP
  youtube/yt_adapter.ts
    :30 detectChannelKey CRITICAL
          24 cyclomatic   28 cognitive   44 lines  
         148.4 CRAP
  popup/popup_telegram.ts
    :185 updateCombinedCounters CRITICAL
          23 cyclomatic   31 cognitive   82 lines  
         552.0 CRAP
  modules/telegram_parser.ts
    :302 <arrow> CRITICAL
          22 cyclomatic   47 cognitive   50 lines  
         126.5 CRAP
  modules/ui_banners.ts
    :148 <arrow> CRITICAL
          22 cyclomatic   24 cognitive   40 lines  
         126.5 CRAP
  modules/anti_afk.ts
    :29 checkAndClickAntiAfk HIGH
          21 cyclomatic   27 cognitive   81 lines  
  modules/ui_shared_utils.ts
    :91 renderSharedEmptyState HIGH
          21 cyclomatic   39 cognitive   59 lines  
  modules/banner_creator.ts
    :58 parseBlock CRITICAL
          20 cyclomatic   16 cognitive   36 lines  
         420.0 CRAP
  modules/telegram_parser.ts
    :73 processOldTelegramItem CRITICAL
          20 cyclomatic   24 cognitive   82 lines  
         106.4 CRAP
  modules/banner_creator.ts
    :46 processAndCreateBanners CRITICAL
          19 cyclomatic   25 cognitive  118 lines  
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
    :63 addBannerHeaderControls HIGH
          18 cyclomatic   28 cognitive   61 lines  
  youtube/yt_channel_gate.ts
    :7 isAllowedChannel CRITICAL
          18 cyclomatic   21 cognitive   49 lines  
         342.0 CRAP
  popup/popup_init.ts
    :217 restoreSheetCleanedLog CRITICAL
          17 cyclomatic   24 cognitive   23 lines  
         306.0 CRAP
  tests/anti_afk.test.js
    :50 matches HIGH
          17 cyclomatic   16 cognitive   24 lines  
          79.4 CRAP
  tests/studio_integration.test.js
    :187 querySelector HIGH
          17 cyclomatic   16 cognitive   19 lines  
          79.4 CRAP
  youtube/studio/studio_events.ts
    :89 bindStudioCommentEvents CRITICAL
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
    :212 <arrow> HIGH
          16 cyclomatic   29 cognitive   47 lines  
          71.3 CRAP
  modules/event_banners.ts
    :204 <anonymous> CRITICAL
          16 cyclomatic   10 cognitive   36 lines  
         272.0 CRAP
  modules/banner_creator.ts
    :198 <arrow> CRITICAL
          16 cyclomatic   11 cognitive   44 lines  
         272.0 CRAP
  modules/ui_core.ts
    :122 <arrow> HIGH
          16 cyclomatic   11 cognitive   21 lines  
          71.3 CRAP
  modules/storage.ts
    :371 <arrow> HIGH
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
    :55 <arrow> CRITICAL
          14 cyclomatic    9 cognitive   17 lines  
         210.0 CRAP
  popup/popup_telegram.ts
    :450 saveTelegramSheetState CRITICAL
          14 cyclomatic    7 cognitive   23 lines  
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
  modules/comment_assistant.ts
    :36 init
          13 cyclomatic    6 cognitive   17 lines  
          49.5 CRAP
  modules/event_comments.ts
    :154 <arrow> CRITICAL
          12 cyclomatic   18 cognitive   20 lines  
         156.0 CRAP
    :209 <anonymous> CRITICAL
          12 cyclomatic   26 cognitive   28 lines  
         156.0 CRAP
  tests/css_lint.test.js
    :14 checkCssFile
          12 cyclomatic   18 cognitive   32 lines  
          43.1 CRAP
  modules/event_banners.ts
    :241 <anonymous> CRITICAL
          12 cyclomatic    7 cognitive   25 lines  
         156.0 CRAP
  modules/stats_exporter.ts
    :149 renderChart CRITICAL
          12 cyclomatic   11 cognitive   80 lines  
         156.0 CRAP
  modules/event_comments.ts
    :135 <arrow> CRITICAL
          12 cyclomatic   14 cognitive   16 lines  
         156.0 CRAP
  modules/sheet_state_service.ts
    :130 loadSheetState
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
    :212 renderPrayers CRITICAL
          11 cyclomatic   13 cognitive   70 lines  
         132.0 CRAP
    :346 <anonymous> CRITICAL
          11 cyclomatic   15 cognitive   91 lines  
         132.0 CRAP
  modules/stats_tracker.ts
    :318 getBrandFromLocalStorage CRITICAL
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
    :123 handleMarkBannerCategoryAction CRITICAL   
          11 cyclomatic    5 cognitive   20 lines  
         132.0 CRAP
  tests/studio_integration.test.js
    :234 querySelector
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
    :63 observer CRITICAL
          10 cyclomatic    6 cognitive   14 lines
         110.0 CRAP
  popup/popup_init.ts
    :449 <arrow> CRITICAL
          10 cyclomatic    9 cognitive  104 lines  
         110.0 CRAP
  modules/stats_tracker.ts
    :244 <arrow> CRITICAL
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
    :242 <anonymous> CRITICAL
          10 cyclomatic   13 cognitive   18 lines  
         110.0 CRAP
    :265 <anonymous> CRITICAL
          10 cyclomatic   13 cognitive   27 lines  
         110.0 CRAP
  modules/ui_comments.ts
    :144 <arrow>
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
    :33 <anonymous> HIGH
           9 cyclomatic    7 cognitive   30 lines  
          90.0 CRAP
  popup/popup_init.ts
    :343 <arrow> HIGH
           9 cyclomatic    8 cognitive   10 lines  
          90.0 CRAP
    :399 clearSheetState HIGH
           9 cyclomatic   13 cognitive   43 lines  
          90.0 CRAP
    :657 <arrow> HIGH
           9 cyclomatic    4 cognitive    6 lines  
          90.0 CRAP
  modules/stats_tracker.ts
    :269 <arrow> HIGH
           9 cyclomatic    8 cognitive   22 lines  
          90.0 CRAP
  main.ts
    :80 init HIGH
           9 cyclomatic    5 cognitive   93 lines  
          90.0 CRAP
  modules/event_banners.ts
    :106 handleCopyBannerAction HIGH
           9 cyclomatic    4 cognitive   16 lines  
          90.0 CRAP
  youtube/studio/studio_content.ts
    :280 processVisibleComments HIGH
           9 cyclomatic    6 cognitive   24 lines  
          90.0 CRAP
    :305 updateHeaderCounters HIGH
           9 cyclomatic    7 cognitive   16 lines
          90.0 CRAP
  modules/event_comments.ts
    :73 destroy HIGH
           9 cyclomatic    8 cognitive   35 lines  
          90.0 CRAP
    :397 <anonymous> HIGH
           9 cyclomatic    4 cognitive   12 lines  
          90.0 CRAP
  modules/telegram_parser.ts
    :182 finalizeCurrentItem HIGH
           8 cyclomatic   26 cognitive   29 lines  
  modules/video_copier.ts
    :328 <arrow> HIGH
           8 cyclomatic   16 cognitive   28 lines  
          72.0 CRAP
  popup/popup_init.ts
    :303 restoreTextareaSizesUI HIGH
           8 cyclomatic   16 cognitive   12 lines  
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
    :334 <arrow> HIGH
           8 cyclomatic    7 cognitive   20 lines  
          72.0 CRAP
    :650 <arrow> HIGH
           8 cyclomatic    4 cognitive   18 lines  
          72.0 CRAP
  main.ts
    :127 <arrow> HIGH
           8 cyclomatic    8 cognitive   21 lines  
          72.0 CRAP
  modules/event_banners.ts
    :29 handleDeleteSelectedBannersAction HIGH     
           8 cyclomatic   10 cognitive   76 lines  
          72.0 CRAP
    :174 <anonymous> HIGH
           8 cyclomatic    8 cognitive   22 lines  
          72.0 CRAP
  modules/event_comments.ts
    :65 init HIGH
           8 cyclomatic    9 cognitive    7 lines  
          72.0 CRAP
  youtube/youtube_content.ts
    :111 <arrow> HIGH
           8 cyclomatic    6 cognitive   27 lines  
          72.0 CRAP
  popup/popup_telegram.ts
    :474 processTelegramData HIGH
           8 cyclomatic    4 cognitive   54 lines  
          72.0 CRAP
  options/options.ts
    :63 initEvents HIGH
           7 cyclomatic    6 cognitive   19 lines
          56.0 CRAP
    :225 lines HIGH
           7 cyclomatic    5 cognitive    7 lines  
          56.0 CRAP
  popup/popup_init.ts
    :182 restoreSheetStats HIGH
           7 cyclomatic    8 cognitive   10 lines  
          56.0 CRAP
    :241 restoreSheetDividerPos HIGH
           7 cyclomatic    8 cognitive    9 lines  
          56.0 CRAP
    :316 restoreTranslitStateUI HIGH
           7 cyclomatic    8 cognitive   13 lines  
          56.0 CRAP
  modules/stats_tracker.ts
    :196 <arrow> HIGH
           7 cyclomatic    8 cognitive   13 lines  
          56.0 CRAP
    :222 <arrow> HIGH
           7 cyclomatic    6 cognitive   16 lines  
          56.0 CRAP
    :341 searchBrandNameInObject HIGH
           7 cyclomatic    3 cognitive    4 lines  
          56.0 CRAP
  main.ts
    :38 setupDomRegistration HIGH
           7 cyclomatic    6 cognitive   40 lines  
          56.0 CRAP
  modules/event_banners.ts
    :162 init HIGH
           7 cyclomatic    7 cognitive    7 lines  
          56.0 CRAP
  tests/ts_loader.js
    :4 resolve HIGH
           7 cyclomatic   12 cognitive   18 lines  
          56.0 CRAP
  modules/stats_exporter.ts
    :107 loadChartData HIGH
           7 cyclomatic    5 cognitive   37 lines  
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
  background/service-worker.ts
    :11 <arrow>
           6 cyclomatic    6 cognitive   18 lines  
          42.0 CRAP
  popup/popup_prayers.ts
    :318 <anonymous>
           6 cyclomatic    4 cognitive   25 lines  
          42.0 CRAP
    :442 <anonymous>
           6 cyclomatic    5 cognitive   12 lines  
          42.0 CRAP
  popup/popup_init.ts
    :139 restoreDbState
           6 cyclomatic    7 cognitive    9 lines  
          42.0 CRAP
    :283 restoreActiveSubtabUI
           6 cyclomatic    7 cognitive   19 lines  
          42.0 CRAP
    :623 <anonymous>
           6 cyclomatic    6 cognitive   16 lines  
          42.0 CRAP
    :687 <anonymous>
           6 cyclomatic    5 cognitive   17 lines  
          42.0 CRAP
  modules/event_banners.ts
    :98 <arrow>
           6 cyclomatic    3 cognitive    5 lines  
          42.0 CRAP
  test_parsers.js
    :9 jQueryMock
           6 cyclomatic    3 cognitive   24 lines  
          42.0 CRAP
  modules/event_comments.ts
    :123 bindAutoHealScanner
           6 cyclomatic    3 cognitive   83 lines  
          42.0 CRAP
  youtube/youtube_content.ts
    :33 processYTComment
           6 cyclomatic    5 cognitive   28 lines  
          42.0 CRAP
  popup/popup_telegram.ts
    :135 <anonymous>
           6 cyclomatic    5 cognitive   23 lines  
          42.0 CRAP
    :311 ensureNewYTRow
           6 cyclomatic    7 cognitive   23 lines  
          42.0 CRAP
    :556 <anonymous>
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
    :31 checkRoomWarning
           5 cyclomatic    2 cognitive   34 lines  
          30.0 CRAP
    :86 buildAuthorHeader
           5 cyclomatic    4 cognitive   77 lines  
          30.0 CRAP
    :473 <anonymous>
           5 cyclomatic    5 cognitive   37 lines  
          30.0 CRAP
  youtube/studio/studio_events.ts
    :42 setupVideoMetadataObserver
           5 cyclomatic    4 cognitive   46 lines  
          30.0 CRAP
  popup/popup_init.ts
    :263 restoreActiveTabUI
           5 cyclomatic    6 cognitive   19 lines  
          30.0 CRAP
    :726 <arrow>
           5 cyclomatic    2 cognitive   20 lines  
          30.0 CRAP
  modules/stats_tracker.ts
    :49 setupObservers
           5 cyclomatic    2 cognitive  142 lines  
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
  modules/event_comments.ts
    :125 runAutoHeal
           5 cyclomatic    4 cognitive   50 lines  
          30.0 CRAP
  popup/popup_telegram.ts
    :40 updateOldInputStats
           5 cyclomatic    5 cognitive   22 lines  
          30.0 CRAP
    :335 updateTelegramStatsUI
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

● File health scores (76 files) · sorted by triage concern

   80.0    modules\event_comments.ts               
        risk
            435 LOC    1 fan-in    9 fan-out    0% dead  0.36 density  >999 risk

   81.7    options\options.ts                      
        risk
            342 LOC    1 fan-in    5 fan-out    0% dead  0.37 density  702.0 risk

   82.6    modules\stats_tracker.ts                
        risk
            348 LOC    1 fan-in    6 fan-out    0% dead  0.32 density  650.0 risk

   84.1    popup\popup_telegram.ts                 
        risk
            574 LOC    3 fan-in    6 fan-out    0% dead  0.27 density  552.0 risk

   83.4    modules\banner_creator.ts               
        risk
            247 LOC    3 fan-in    4 fan-out    0% dead  0.34 density  420.0 risk

   87.9    youtube\yt_channel_gate.ts              
        risk
             58 LOC    1 fan-in    1 fan-out    0% dead  0.31 density  342.0 risk

   82.3    popup\popup_init.ts                     
        risk
            784 LOC    1 fan-in    5 fan-out    0% dead  0.35 density  306.0 risk

   85.1    youtube\studio\studio_events.ts         
        risk
            154 LOC    1 fan-in    7 fan-out    0% dead  0.22 density  306.0 risk

   89.0    modules\stats_exporter.ts               
        risk
            377 LOC    1 fan-in    2 fan-out    0% dead  0.22 density  306.0 risk

   79.5    modules\event_banners.ts                
        risk
            274 LOC    1 fan-in    8 fan-out    0% dead  0.39 density  272.0 risk

  ... and 66 more files (--format json for full list)

  Sorted by triage concern: the larger of low-MI concern and CRAP risk. The risk / structure tag marks which one placed each file. MI reflects complexity, coupling, and dead code; risk reflects untested complexity (CRAP) and can diverge from MI. Risk: low <15, moderate 15-30, high >=30. CRAP estimated from export references (85% direct, 40% indirect, 0% untested). Run `fallow health --coverage <coverage-final.json>` for exact scores. https://docs.fallow.tools/explanations/health#file-health-scores        

● Hotspots (58 files, since 6 months)

   72.7 ▼  popup\popup_init.ts
          21 commits   1719 churn  0.35 density   1 fan-in  ▼ cooling

   69.2 ▼  popup\popup_telegram.ts
          26 commits   2509 churn  0.27 density   3 fan-in  ▼ cooling

   66.7 ▲  modules\storage.ts
          22 commits    983 churn  0.31 density  27 fan-in  ▲ accelerating

   56.5 ▲  modules\event_comments.ts
          16 commits    820 churn  0.36 density   1 fan-in  ▲ accelerating

   48.6 ▼  youtube\studio\studio_content.ts        
          19 commits    526 churn  0.26 density   0 fan-in  ▼ cooling

   47.5 ▼  youtube\studio\studio_events.ts
          22 commits   1415 churn  0.22 density   1 fan-in  ▼ cooling

   41.4 ▼  popup\popup_prayers.ts
          15 commits   1388 churn  0.28 density   2 fan-in  ▼ cooling

   41.2 ▲  main.ts
          14 commits    604 churn  0.30 density   0 fan-in  ▲ accelerating

   40.7 ▲  modules\stats_tracker.ts
          13 commits    674 churn  0.32 density   1 fan-in  ▲ accelerating

   39.5 ▲  options\options.ts
          11 commits    467 churn  0.37 density   1 fan-in  ▲ accelerating

   36.8 ▲  modules\anti_afk.ts
          14 commits    633 churn  0.27 density   2 fan-in  ▲ accelerating

   34.5 ▲  modules\ui_core.ts
          11 commits    486 churn  0.32 density   4 fan-in  ▲ accelerating

   33.2 ▲  modules\banner_creator.ts
          10 commits    334 churn  0.34 density   3 fan-in  ▲ accelerating

   30.9 ─  youtube\studio\studio_adapter.ts        
          10 commits    613 churn  0.31 density   2 fan-in  ─ stable

   30.8 ▲  modules\comment_assistant.ts
           9 commits    382 churn  0.35 density   6 fan-in  ▲ accelerating

   30.1 ▲  modules\utils.ts
          11 commits    447 churn  0.28 density  13 fan-in  ▲ accelerating

   27.4 ▼  youtube\studio\studio_selectors.ts
           8 commits    229 churn  0.35 density   5 fan-in  ▼ cooling

   26.7 ▲  modules\event_banners.ts
           7 commits    699 churn  0.39 density   1 fan-in  ▲ accelerating

   26.5 ▼  modules\channel_config.ts
           9 commits    306 churn  0.30 density  12 fan-in  ▼ cooling

   23.6 ▲  modules\ui_comments.ts
           8 commits    785 churn  0.30 density   2 fan-in  ▲ accelerating

   22.4 ▼  youtube\studio\studio_ui.ts
          12 commits    423 churn  0.19 density   1 fan-in  ▼ cooling

   21.7 ─  youtube\yt_adapter.ts
           7 commits    311 churn  0.31 density   2 fan-in  ─ stable

   21.7 ▲  background\service-worker.ts
           7 commits    180 churn  0.32 density   0 fan-in  ▲ accelerating

   21.3 ▲  modules\ui_banners.ts
           7 commits    524 churn  0.31 density   3 fan-in  ▲ accelerating

   20.6 ▲  modules\parsers.ts
          10 commits    333 churn  0.21 density   7 fan-in  ▲ accelerating

   18.0 ▲  youtube\youtube_content.ts
           8 commits    293 churn  0.23 density   0 fan-in  ▲ accelerating

   17.1 ▲  modules\stats_exporter.ts
           8 commits    558 churn  0.22 density   1 fan-in  ▲ accelerating

   16.4 ▲  modules\config.ts
          13 commits    224 churn  0.13 density  15 fan-in  ▲ accelerating

   15.3 ─  tests\studio_integration.test.js [test] 
           4 commits    524 churn  0.38 density   0 fan-in  ─ stable

   15.1 ▼  modules\event_bus.ts
           9 commits     95 churn  0.17 density   6 fan-in  ▼ cooling

   14.9 ▲  modules\state.ts
           7 commits    224 churn  0.22 density   7 fan-in  ▲ accelerating

   14.7 ▲  modules\comment_service.ts
           7 commits    435 churn  0.21 density  17 fan-in  ▲ accelerating

   14.3 ▲  modules\telegram_parser.ts
           5 commits   1074 churn  0.29 density   4 fan-in  ▲ accelerating

   14.3 ▲  modules\video_copier.ts
           7 commits    476 churn  0.21 density   1 fan-in  ▲ accelerating

   14.1 ▲  youtube\studio\studio_video_map.ts      
           9 commits    251 churn  0.16 density   2 fan-in  ▲ accelerating

   13.5 ▼  modules\sheet_state_service.ts
           8 commits    711 churn  0.17 density   3 fan-in  ▼ cooling

   13.5 ▲  modules\sheets.ts
           6 commits    162 churn  0.23 density  12 fan-in  ▲ accelerating

   12.3 ▲  youtube\yt_events.ts
           9 commits    533 churn  0.14 density   1 fan-in  ▲ accelerating

   12.1 ▲  youtube\yt_channel_gate.ts
           4 commits     67 churn  0.31 density   1 fan-in  ▲ accelerating

   10.3 ─  tests\state.test.js [test]
           6 commits    281 churn  0.18 density   0 fan-in  ─ stable

    9.5 ▲  modules\comment_injector.ts
           5 commits    260 churn  0.19 density   3 fan-in  ▲ accelerating

    8.8 ▲  modules\i18n.ts
           4 commits     33 churn  0.23 density   3 fan-in  ▲ accelerating

    8.6 ▲  modules\retention_service.ts
           3 commits    217 churn  0.29 density   5 fan-in  ▲ accelerating

    8.5 ▼  tests\utils.test.js [test]
           5 commits    142 churn  0.18 density   0 fan-in  ▼ cooling

    7.9 ▼  youtube\studio\studio_header_counters.ts
           3 commits    181 churn  0.26 density   2 fan-in  ▼ cooling

    7.9 ▼  tests\storage.test.js [test]
           4 commits    203 churn  0.20 density   0 fan-in  ▼ cooling

    6.9 ▲  test_parsers.js
          11 commits    639 churn  0.07 density   0 fan-in  ▲ accelerating

    6.9 ▼  youtube\studio\studio_channel.ts        
           5 commits     67 churn  0.14 density   2 fan-in  ▼ cooling

    6.8 ▲  youtube\studio\studio_comment_key.ts    
           5 commits    144 churn  0.14 density   2 fan-in  ▲ accelerating

    6.8 ▲  modules\comment_platform_adapter.ts     
           4 commits    104 churn  0.17 density   3 fan-in  ▲ accelerating

    6.3 ▼  tests\popup_dom.test.js [test]
           5 commits    140 churn  0.13 density   0 fan-in  ▼ cooling

    5.3 ▲  youtube\yt_ui.ts
           3 commits    229 churn  0.18 density   2 fan-in  ▲ accelerating

    5.1 ▲  youtube\studio\studio_category_matcher.ts
           4 commits     68 churn  0.13 density   3 fan-in  ▲ accelerating

    4.4 ▼  popup\popup_translit.ts
           3 commits     77 churn  0.15 density   1 fan-in  ▼ cooling

    4.2 ▼  tests\comment_service.test.js [test]    
           3 commits    138 churn  0.14 density   0 fan-in  ▼ cooling

    3.2 ▼  tests\comment_assistant.test.js [test]  
           3 commits     71 churn  0.11 density   0 fan-in  ▼ cooling

    3.0 ▲  tests\sheet_state_service.test.js [test]
           5 commits    104 churn  0.06 density   0 fan-in  ▲ accelerating

    1.5 ▼  tests\telegram_parser.test.js [test]    
           3 commits    170 churn  0.05 density   0 fan-in  ▼ cooling

  17 files excluded (< 3 commits)

  Files with high churn and high complexity: https://docs.fallow.tools/explanations/health#hotspot-metrics

● Refactoring targets (20)
  16 medium · 4 high
    score = quick-win ROI (higher = better) · pri = absolute priority

   18.1  pri:36.1    modules\event_comments.ts     
         complexity · effort:medium · confidence:high  Extract <anonymous> (cognitive: 35) in 435-LOC file into smaller functions
         importers: main.ts (SYH_EVENT_COMMENTS_PLUGIN)

   15.9  pri:31.7    modules\ui_core.ts
         high impact · effort:medium · confidence:medium  Split high-impact file (201 LOC), 4 dependents amplify every change
         importers: main.ts (SYH_UI); modules\event_banners.ts (SYH_UI, SyhUi); modules\event_comments.ts (SYH_UI, SyhUi); tests\ui_state.test.js (SYH_UI)

   14.7  pri:29.3    youtube\studio\studio_adapter.ts
         untested risk · effort:medium · confidence:high  4 complex functions lack test coverage path, add tests before modifying
         importers: tests\studio_integration.test.js (StudioCommentAdapter); youtube\studio\studio_events.ts (StudioCommentAdapter, StudioEventCaches, retroactiveUpdateVideoComments, side effect, side effect)

   14.2  pri:28.4    modules\event_banners.ts      
         untested risk · effort:medium · confidence:high  9 complex functions lack test coverage path, add tests before modifying
         importers: main.ts (SYH_EVENT_BANNERS_PLUGIN)

   14.0  pri:42.1    modules\storage.ts
         high impact · effort:high · confidence:medium  Split high-impact file (429 LOC), 27 dependents amplify every change
         importers: background\service-worker.ts (STORAGE_KEYS, migrateStorageIfNeeded); modules\anti_afk.ts (STORAGE_KEYS, SYH_STORAGE); modules\channel_config.ts (STORAGE_KEYS, SYH_STORAGE); modules\comment_service.ts (STORAGE_KEYS, SYH_STORAGE, getSheetCollectedStorageKey); modules\retention_service.ts (STORAGE_KEYS, SYH_STORAGE)

   13.9  pri:27.7    options\options.ts
         complexity · effort:medium · confidence:high  Extract <arrow> (cognitive: 33) in 342-LOC file into smaller functions
         importers: options\options.html (side effect)

   13.8  pri:27.6    modules\stats_tracker.ts      
         complexity · effort:medium · confidence:high  Extract injectHeaderButtons (cognitive: 47) in 348-LOC file into smaller functions
         importers: main.ts (SYH_STATS_TRACKER)    
         clones: modules\stats_tracker.ts:193-207 dup:65f941fa; modules\stats_tracker.ts:219-224 dup:65f941fa; modules\stats_tracker.ts:220-225 dup:0864b2b7; modules\stats_tracker.ts:267-273 dup:0864b2b7 

   13.2  pri:26.4    modules\banner_creator.ts     
         high impact · effort:medium · confidence:medium  Split high-impact file (247 LOC), 3 dependents amplify every change
         importers: main.ts (SYH_BANNER_CREATOR); modules\event_banners.ts (SYH_BANNER_CREATOR, SyhBannerCreator); test_parsers.js (SYH_BANNER_CREATOR)  
         clones: modules\telegram_parser.ts:276-282 dup:102cd7a5

   13.1  pri:26.2    modules\comment_assistant.ts  
         high impact · effort:medium · confidence:medium  Split high-impact file (195 LOC), 6 dependents amplify every change
         importers: main.ts (SYH_COMMENT_ASSISTANT); modules\event_comments.ts (SYH_COMMENT_ASSISTANT); tests\comment_assistant.test.js (SYH_COMMENT_ASSISTANT); youtube\studio\studio_content.ts (SYH_COMMENT_ASSISTANT); youtube\studio\studio_events.ts (SYH_COMMENT_ASSISTANT)

   12.5  pri:25.0    modules\ui_comments.ts        
         complexity · effort:medium · confidence:high  Extract <arrow> (cognitive: 34) in 451-LOC file into smaller functions
         importers: main.ts (side effect); modules\ui_core.ts (addButtonsToComment, addStarredTabControls, addStarredTabCopyButton, applySavedLabels, bindStarredControls, filterStarredComments, scrollToActiveComment, updateCommentVisuals)
         clones: modules\ui_banners.ts:259-275 dup:e79eba61

  ... and 10 more targets (--format json for full list)

  Prioritized refactoring recommendations based on complexity, churn, and coupling signals: https://docs.fallow.tools/explanations/health#refactoring-targets

✗ 149 above threshold · 1389 analyzed · maintainability 88.5 (good) (0.15s)

Failed: dead-code (1 issues), dupes (13 clone groups), health (149 above threshold): start with modules/event_comments.ts
Setup: `fallow init --agents` writes an agent guide; `fallow hooks install --target agent` adds a commit gate (hide this hint: `fallow init --decline`). 
PS D:\Chrome Extension\Время перемен. Chrome Extension\streamyars-copy-buttons (added checkbox) 0.6-2026.01.11>