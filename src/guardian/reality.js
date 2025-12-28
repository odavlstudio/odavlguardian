const fs = require('fs');
const path = require('path');
const { executeAttempt } = require('./attempt');
const { MarketReporter } = require('./market-reporter');
const { getDefaultAttemptIds, getAttemptDefinition, registerAttempt } = require('./attempt-registry');
const { GuardianFlowExecutor, validateFlowDefinition } = require('./flow-executor');
const { getDefaultFlowIds, getFlowDefinition } = require('./flow-registry');
const { GuardianBrowser } = require('./browser');
const { GuardianCrawler } = require('./crawler');
const { SnapshotBuilder, saveSnapshot, loadSnapshot } = require('./snapshot');
const { DiscoveryEngine } = require('./discovery-engine');
const { buildAutoAttempts } = require('./auto-attempt-builder');
const { baselineExists, loadBaseline, saveBaselineAtomic, createBaselineFromSnapshot, compareSnapshots } = require('./baseline-storage');
const { analyzeMarketImpact, determineExitCodeFromEscalation } = require('./market-criticality');
const { parsePolicyOption } = require('./preset-loader');
const { evaluatePolicy, loadPolicy } = require('./policy');
const { aggregateIntelligence } = require('./breakage-intelligence');
const { writeEnhancedHtml } = require('./enhanced-html-reporter');
const { analyzePatterns, loadRecentRunsForSite } = require('./pattern-analyzer');
const crypto = require('crypto');
const {
  formatVerdictStatus,
  formatConfidence,
  formatVerdictWhy,
  formatKeyFindings,
  formatLimits,
  formatPatternSummary,
  formatPatternFocus,
  formatConfidenceDrivers,
  formatFocusSummary,
  formatDeltaInsight,
  // Stage V / Step 5.2: Silence Discipline helpers
  shouldRenderFocusSummary,
  shouldRenderDeltaInsight,
  shouldRenderPatterns,
  shouldRenderConfidenceDrivers
} = require('./text-formatters');
const { sendWebhooks, getWebhookUrl, buildWebhookPayload } = require('./webhook');
const { findContactOnPage, formatDetectionForReport } = require('./semantic-contact-finder');
const { formatRunSummary } = require('./run-summary');
const { isCiMode } = require('./ci-mode');
const { formatCiSummary, deriveBaselineVerdict } = require('./ci-output');
const { toCanonicalVerdict, mapExitCodeFromCanonical } = require('./verdicts');
// Phase 7.1: Performance modes
const { getTimeoutProfile } = require('./timeout-profiles');
const { validateAttemptFilter, filterAttempts, filterFlows } = require('./attempts-filter');
// Phase 7.2: Parallel execution
const { executeParallel, validateParallel } = require('./parallel-executor');
// Phase 7.3: Browser reuse
const { BrowserPool } = require('./browser-pool');
// Phase 7.4: Smart skips
const { checkPrerequisites } = require('./prerequisite-checker');
// Wave 1: Run artifacts naming and metadata
const { makeRunDirName, makeSiteSlug, writeMetaJson, readMetaJson } = require('./run-artifacts');
// Wave 2: Latest pointers
const { updateLatestGlobal, updateLatestBySite } = require('./run-latest');
// Wave 3: Smart attempt selection
const { inspectSite, detectProfile } = require('./site-introspection');
const { filterAttempts: filterAttemptsByRelevance, summarizeIntrospection } = require('./attempt-relevance');
// Stage II: Golden path
const { isFirstRun, markFirstRunComplete, applyFirstRunProfile } = require('./first-run-profile');
const { applyLocalConfig } = require('./config-loader');

function applySafeDefaults(config, warn) {
  const updated = { ...config };
  if (!Array.isArray(updated.attempts) || updated.attempts.length === 0) {
    if (warn) warn('No attempts provided; using curated defaults.');
    updated.attempts = getDefaultAttemptIds();
  }
  if (!Array.isArray(updated.flows) || updated.flows.length === 0) {
    if (warn) warn('No flows provided; using curated defaults.');
    updated.flows = getDefaultFlowIds();
  }
  return updated;
}

const EXECUTED_OUTCOMES = new Set(['SUCCESS', 'FAILURE', 'FRICTION', 'DISCOVERY_FAILED']);
const isExecutedAttempt = (attemptResult) => attemptResult && EXECUTED_OUTCOMES.has(attemptResult.outcome);
const SKIP_CODES = {
  DISABLED_BY_PRESET: 'DISABLED_BY_PRESET',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  ENGINE_MISSING: 'ENGINE_MISSING',
  USER_FILTERED: 'USER_FILTERED',
  PREREQ: 'PREREQUISITE_FAILED'
};

// Removed compact decision packet writer for Level 1 singleton decision schema

async function executeReality(config) {
  const baseWarn = (...args) => console.warn(...args);
  const firstRunMode = isFirstRun();
  // Apply first-run profile if needed (conservative defaults)
  const profiledConfig = firstRunMode ? applyFirstRunProfile(config) : config;
  const safeConfig = applySafeDefaults(profiledConfig, baseWarn);
  const runSignals = [];

  const {
    baseUrl,
    attempts = getDefaultAttemptIds(),
    artifactsDir = './.odavlguardian',
    headful = false,
    enableTrace = true,
    enableScreenshots = true,
    enableCrawl = true,
    enableDiscovery = false,
    enableAutoAttempts = false,
    maxPages = 25,
    maxDepth = 3,
    timeout = 20000,
    storageDir = '.odavl-guardian',
    toolVersion = '0.2.0-phase2',
    policy = null,
    webhook = null,
    includeUniversal = false,
    autoAttemptOptions = {},
    enableFlows = true,
    flows = getDefaultFlowIds(),
    flowOptions = {},
    // Phase 7.1: Performance modes
    timeoutProfile = 'default',
    failFast = false,
    fast = false,
    attemptsFilter = null,
    // Phase 7.2: Parallel execution
    parallel = 1
  } = safeConfig;

  // Phase 7.1: Validate and apply attempts filter
  let validation = null;
  if (attemptsFilter) {
    validation = validateAttemptFilter(attemptsFilter);
    if (!validation.valid) {
      console.error(`Error: ${validation.error}`);
      if (validation.hint) console.error(`Hint:  ${validation.hint}`);
      process.exit(2);
    }
  }

  // Phase 7.2: Validate parallel value
  const parallelValidation = validateParallel(parallel);
  if (!parallelValidation.valid) {
    console.error(`Error: ${parallelValidation.error}`);
    if (parallelValidation.hint) console.error(`Hint:  ${parallelValidation.hint}`);
    process.exit(2);
  }
  const validatedParallel = parallelValidation.parallel || 1;

  // Phase 7.1: Filter attempts and flows
  let filteredAttempts = attempts;
  let filteredFlows = flows;
  if (attemptsFilter && validation && validation.valid && validation.ids.length > 0) {
    const beforeFilter = Array.isArray(filteredAttempts) ? filteredAttempts.slice() : [];
    filteredAttempts = filterAttempts(attempts, validation.ids);
    filteredFlows = filterFlows(flows, validation.ids);
    const removed = beforeFilter.filter(id => !filteredAttempts.includes(id));
    userFilteredAttempts.push(...removed.map(id => ({ attemptId: id, reason: 'Filtered by --attempts' })));
    if (filteredAttempts.length === 0 && filteredFlows.length === 0) {
      console.error('Error: No matching attempts or flows found after filtering');
      console.error(`Hint:  Check your --attempts filter: ${attemptsFilter}`);
      process.exit(2);
    }
  }

  const requestedAttempts = Array.isArray(filteredAttempts) ? filteredAttempts.slice() : [];
  const disabledByPreset = new Set((config.disabledAttempts || []).map(id => String(id)));
  const enabledRequestedAttempts = requestedAttempts.filter(id => !disabledByPreset.has(String(id)));
  const presetDisabledAttempts = requestedAttempts.filter(id => disabledByPreset.has(String(id)));
  const userFilteredAttempts = [];
  const missingAttempts = [];

  // Phase 7.1: Resolve timeout profile
  const timeoutProfileConfig = getTimeoutProfile(timeoutProfile);
  const resolvedTimeout = timeout || timeoutProfileConfig.default;

  // Validate baseUrl
  try {
    new URL(baseUrl);
  } catch (e) {
    throw new Error(`Invalid URL: ${baseUrl}`);
  }

  // Wave 1: Generate human-readable run directory name
  const startTime = new Date();
  const siteSlug = makeSiteSlug(baseUrl);
  // Use 'default' if no policy specified, otherwise extract preset name
  let policyName = (() => {
    if (!policy) return 'default';
    if (typeof policy === 'string') {
      return policy.startsWith('preset:') ? policy.replace('preset:', '') : policy;
    }
    if (typeof policy === 'object' && policy.id) return policy.id;
    return 'custom';
  })();
  // Result will be determined at the end; use placeholder for now
  let runDirName = makeRunDirName({
    timestamp: startTime,
    url: baseUrl,
    policy: policyName,
    result: 'PENDING'
  });
  let runDir = path.join(artifactsDir, runDirName);
  fs.mkdirSync(runDir, { recursive: true });
  const runId = runDirName;
  const ciMode = isCiMode();

  // Print positioning message based on policy
  const isPolicyProtect = policy && ((typeof policy === 'string' && (policy === 'preset:startup' || policy.includes('startup'))) || (typeof policy === 'object' && policy.id === 'startup'));
  if (!ciMode) {
    if (isPolicyProtect) {
      console.log('\nPROTECT MODE: Full market reality test (slower, deeper)');
    } else {
      console.log('\nREALITY MODE: Full market reality snapshot');
    }
  } else {
    if (isPolicyProtect) {
      console.log('PROTECT MODE: Full market reality test');
    } else {
      console.log('REALITY MODE: Full market reality snapshot');
    }
  }

  // Phase 7.1: Print mode info
  if (!ciMode) {
    const modeLines = [];
    if (fast) modeLines.push('MODE: fast');
    if (failFast) modeLines.push('FAIL-FAST: enabled');
    if (timeoutProfile !== 'default') modeLines.push(`TIMEOUT: ${timeoutProfile}`);
    if (attemptsFilter) modeLines.push(`ATTEMPTS: ${attemptsFilter}`);
    if (modeLines.length > 0) {
      console.log(`\n⚡ ${modeLines.join(' | ')}`);
    }
  }

  if (ciMode) {
    console.log(`\nCI RUN: Market Reality Snapshot`);
    console.log(`Base URL: ${baseUrl}`);
    console.log(`Attempts: ${filteredAttempts.join(', ')}`);
    console.log(`Run Dir: ${runDir}`);
  } else if (firstRunMode) {
    // Simplified output for first run
    console.log(`\n🚀 Guardian First Run`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🧪 Scanning: ${baseUrl}`);
  } else {
    console.log(`\n🧪 Market Reality Snapshot v1`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📍 Base URL: ${baseUrl}`);
    console.log(`🎯 Attempts: ${filteredAttempts.join(', ')}`);
    console.log(`📁 Run Dir: ${runDir}`);
  }

  // Initialize snapshot builder
  const snapshotBuilder = new SnapshotBuilder(baseUrl, runId, toolVersion);
  snapshotBuilder.setArtifactDir(runDir);

  let crawlResult = null;
  let discoveryResult = null;
  let pageLanguage = 'unknown';
  let contactDetectionResult = null;
  let siteIntrospection = null;
  let siteProfile = 'unknown';

  // Optional: Crawl to discover URLs (lightweight, first N pages)
  if (enableCrawl) {
    console.log(`\n🔍 Crawling for discovered URLs...`);
    const browser = new GuardianBrowser();
    try {
      await browser.launch(resolvedTimeout);
      await browser.page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: resolvedTimeout });

      // Wave 3: Site introspection for smart attempt selection
      try {
        console.log(`\n🔬 Inspecting site capabilities...`);
        siteIntrospection = await inspectSite(browser.page);
        siteProfile = detectProfile(siteIntrospection);
        const summary = summarizeIntrospection(siteIntrospection);
        console.log(`✅ Site profile: ${siteProfile}`);
        console.log(`   ${summary}`);
      } catch (introspectionErr) {
        console.warn(`⚠️  Site introspection failed (non-critical): ${introspectionErr.message}`);
        // Default to empty introspection if it fails
        siteIntrospection = {
          hasLogin: false,
          hasSignup: false,
          hasCheckout: false,
          hasNewsletter: false,
          hasContactForm: false,
          hasLanguageSwitch: false
        };
        siteProfile = 'unknown';
      }

      // Wave 1.1: Detect page language and contact
      try {
        contactDetectionResult = await findContactOnPage(browser.page, baseUrl);
        pageLanguage = contactDetectionResult.language;
        console.log(`\n${formatDetectionForReport(contactDetectionResult)}\n`);
      } catch (detectionErr) {
        // Language detection non-critical
        console.warn(`⚠️  Language/contact detection failed: ${detectionErr.message}`);
      }

      const crawler = new GuardianCrawler(baseUrl, maxPages, maxDepth);
      crawlResult = await crawler.crawl(browser);
      console.log(`✅ Crawl complete: discovered ${crawlResult.totalDiscovered}, visited ${crawlResult.totalVisited}`);
      snapshotBuilder.addCrawlResults(crawlResult);
      await browser.close();
    } catch (crawlErr) {
      console.log(`⚠️  Crawl failed (non-critical): ${crawlErr.message}`);
      runSignals.push({ id: 'crawl_failed', severity: 'high', type: 'coverage', description: `Crawl failed: ${crawlErr.message}` });
      // Continue anyway - crawl is optional
    }
  }

  // Wave 3: If crawl was disabled but introspection wasn't done, do it now
  if (!enableCrawl && !siteIntrospection) {
    console.log(`\n🔬 Inspecting site capabilities...`);
    const browser = new GuardianBrowser();
    try {
      await browser.launch(resolvedTimeout);
      await browser.page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: resolvedTimeout });
      
      siteIntrospection = await inspectSite(browser.page);
      siteProfile = detectProfile(siteIntrospection);
      const summary = summarizeIntrospection(siteIntrospection);
      console.log(`✅ Site profile: ${siteProfile}`);
      console.log(`   ${summary}`);
      
      await browser.close();
    } catch (introspectionErr) {
      console.warn(`⚠️  Site introspection failed (non-critical): ${introspectionErr.message}`);
      siteIntrospection = {
        hasLogin: false,
        hasSignup: false,
        hasCheckout: false,
        hasNewsletter: false,
        hasContactForm: false,
        hasLanguageSwitch: false
      };
      siteProfile = 'unknown';
    }
  }

  // Optional: Discovery Engine (Phase 4) — deterministic safe exploration
  if (enableDiscovery) {
    console.log(`\n🔎 Running discovery engine...`);
    const browser = new GuardianBrowser();
    try {
      await browser.launch(resolvedTimeout);
      const engine = new DiscoveryEngine({
        baseUrl,
        maxPages,
        timeout: resolvedTimeout,
        executeInteractions: false,
        browser,
      });
      discoveryResult = await engine.discover(browser.page);
      snapshotBuilder.setDiscoveryResults(discoveryResult);
      console.log(`✅ Discovery complete: visited ${discoveryResult.pagesVisitedCount}, interactions ${discoveryResult.interactionsDiscovered}`);
      await browser.close();
    } catch (discErr) {
      console.log(`⚠️  Discovery failed (non-critical): ${discErr.message}`);
      runSignals.push({ id: 'discovery_failed', severity: 'high', type: 'discovery', description: `Discovery failed: ${discErr.message}` });
    }
  }

  // Phase 2: Generate auto-attempts from discovered interactions
  let autoAttempts = [];
  if (enableAutoAttempts && discoveryResult && discoveryResult.interactionsDiscovered > 0) {
    console.log(`\n🤖 Generating auto-attempts from discoveries...`);
    try {
      // Get discovered interactions (stored in engine instance)
      const discoveredInteractions = discoveryResult.interactions || [];
      
      // Build auto-attempts with safety filters
      const autoAttemptOptions = {
        minConfidence: config.autoAttemptOptions?.minConfidence || 60,
        maxAttempts: config.autoAttemptOptions?.maxAttempts || 10,
        excludeRisky: true,
        includeClasses: config.autoAttemptOptions?.includeClasses || ['NAVIGATION', 'ACTION', 'SUBMISSION', 'TOGGLE']
      };

      autoAttempts = buildAutoAttempts(discoveredInteractions, autoAttemptOptions);
      
      // Register auto-attempts dynamically
      for (const autoAttempt of autoAttempts) {
        registerAttempt(autoAttempt);
      }

      console.log(`✅ Generated ${autoAttempts.length} auto-attempts`);
    } catch (autoErr) {
      console.log(`⚠️  Auto-attempt generation failed (non-critical): ${autoErr.message}`);
    }
  }

  const attemptResults = [];
  const flowResults = [];

  // Determine attempts to run (manual + auto-generated)
  let attemptsToRun = enabledRequestedAttempts.slice();
  
  // Phase 2: Add auto-generated attempts
  if (enableAutoAttempts && autoAttempts.length > 0) {
    const autoAttemptIds = autoAttempts.map(a => a.attemptId);
    attemptsToRun.push(...autoAttemptIds);
    console.log(`➕ Added ${autoAttemptIds.length} auto-generated attempts`);
  }

  if (includeUniversal && !attemptsToRun.includes('universal_reality') && !disabledByPreset.has('universal_reality')) {
    attemptsToRun.push('universal_reality');
  }
  // If discovery enabled and site is simple (few interactions), add universal pack
  if (enableDiscovery && discoveryResult && !attemptsToRun.includes('universal_reality') && !disabledByPreset.has('universal_reality')) {
    const simpleSite = (discoveryResult.interactionsDiscovered || 0) === 0 || (discoveryResult.pagesVisitedCount || 0) <= 1;
    if (simpleSite) {
      attemptsToRun.push('universal_reality');
      console.log(`➕ Added Universal Reality Pack (simple site detected)`);
    }
  }

  // Phase 7.1: Apply attempts filter
  if (attemptsFilter && validation && validation.valid && validation.ids.length > 0) {
    attemptsToRun = filterAttempts(attemptsToRun, validation.ids);
  }

  // Wave 3: Apply smart attempt selection based on introspection
  let attemptsSkipped = [];
  if (siteIntrospection) {
    const attemptObjects = attemptsToRun.map(id => ({ id }));
    const relevanceResult = filterAttemptsByRelevance(attemptObjects, siteIntrospection);
    attemptsToRun = relevanceResult.toRun.map(a => a.id);
    attemptsSkipped = relevanceResult.toSkip;
    
    if (attemptsSkipped.length > 0 && !ciMode) {
      console.log(`\n⊘ Skipping ${attemptsSkipped.length} irrelevant attempt(s):`);
      for (const skip of attemptsSkipped) {
        console.log(`    • ${skip.attempt}: ${skip.reason}`);
      }
    }
  }

  // Phase 7.2: Print parallel mode if enabled
  if (!ciMode && validatedParallel > 1) {
    console.log(`\n⚡ PARALLEL: ${validatedParallel} concurrent attempts`);
  }

  // Phase 7.3: Initialize browser pool (single browser per run)
  const browserPool = new BrowserPool();
  const browserOptions = {
    headless: !headful,
    args: !headful ? [] : [],
    timeout: resolvedTimeout
  };
  
  try {
    await browserPool.launch(browserOptions);
    if (!ciMode) {
      console.log(`🌐 Browser pool ready (reuse enabled)`);
    }
  } catch (err) {
    throw new Error(`Failed to launch browser pool: ${err.message}`);
  }

  // Execute all registered attempts (with optional parallelism)
  console.log(`\n🎬 Executing attempts...`);
  
  // Shared state for fail-fast coordination
  let shouldStopScheduling = false;
  
  // Phase 7.2: Execute attempts with bounded parallelism
  // Phase 7.3: Pass browser pool to attempts
  // Phase 7.4: Check applicability before executing
  const attemptResults_parallel = await executeParallel(
    attemptsToRun,
    async (attemptId) => {
      const attemptDef = getAttemptDefinition(attemptId);
      if (!attemptDef) {
        missingAttempts.push(attemptId);
        return {
          attemptId,
          attemptName: attemptId,
          goal: 'Unknown',
          riskCategory: 'UNKNOWN',
          source: 'manual',
          outcome: 'SKIPPED',
          skipReason: 'Attempt not registered',
          skipReasonCode: SKIP_CODES.ENGINE_MISSING,
          exitCode: 0,
          steps: [],
          friction: null,
          error: null
        };
      }

      if (!ciMode) {
        console.log(`  • ${attemptDef.name}...`);
      }

      const attemptArtifactsDir = path.join(runDir, attemptId);
      
      // Phase 7.3: Create isolated context for this attempt
      const { context, page } = await browserPool.createContext({
        timeout: resolvedTimeout
      });

      let result;
      try {
        // Navigate to site to check prerequisites and applicability
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: resolvedTimeout });
        
        // Phase 7.4: Check prerequisites before executing attempt
        const prereqCheck = await checkPrerequisites(page, attemptId, 2000);
        
        if (!prereqCheck.canProceed) {
          // Skip attempt - prerequisites not met
          if (!ciMode) {
            console.log(`    ⊘ Skipped: ${prereqCheck.reason}`);
          }
          
          result = {
            outcome: 'SKIPPED',
              skipReason: prereqCheck.reason,
              skipReasonCode: SKIP_CODES.PREREQ,
            exitCode: 0,
            steps: [],
            friction: null,
            error: null
          };
        } else {
          // Check if this attempt is applicable to the site
          const { AttemptEngine } = require('./attempt-engine');
          const engine = new AttemptEngine({ attemptId, timeout: resolvedTimeout });
          const applicabilityCheck = await engine.checkAttemptApplicability(page, attemptId);
          
          if (!applicabilityCheck.applicable && applicabilityCheck.confidence < 0.3) {
            // Attempt not applicable - features not present
            if (!ciMode) {
              console.log(`    ⊘ Not applicable: ${applicabilityCheck.reason}`);
            }
            
            result = {
              outcome: 'NOT_APPLICABLE',
              skipReason: applicabilityCheck.reason,
              skipReasonCode: SKIP_CODES.NOT_APPLICABLE,
              discoverySignals: applicabilityCheck.discoverySignals,
              exitCode: 0,
              steps: [],
              friction: null,
              error: null
            };
          } else if (!applicabilityCheck.applicable && applicabilityCheck.confidence >= 0.3 && applicabilityCheck.confidence < 0.6) {
            // Features possibly present but discovery uncertain - try to execute anyway
            // Mark as DISCOVERY_FAILED if it fails
            result = await executeAttempt({
              baseUrl,
              attemptId,
              artifactsDir: attemptArtifactsDir,
              headful,
              enableTrace,
              enableScreenshots,
              quiet: ciMode,
              timeout: resolvedTimeout,
              browserContext: context,
              browserPage: page
            });
            
            // If execution failed due to element not found, reclassify as DISCOVERY_FAILED
            if (result.outcome === 'FAILURE' && result.error && /element|selector|locator/i.test(result.error)) {
              result.outcome = 'DISCOVERY_FAILED';
              result.skipReason = `Element discovery failed: ${result.error}`;
              result.discoverySignals = applicabilityCheck.discoverySignals;
            }
          } else {
            // Applicable or high confidence - execute normally
            result = await executeAttempt({
              baseUrl,
              attemptId,
              artifactsDir: attemptArtifactsDir,
              headful,
              enableTrace,
              enableScreenshots,
              quiet: ciMode,
              timeout: resolvedTimeout,
              // Phase 7.3: Pass context from pool
              browserContext: context,
              browserPage: page
            });
          }
        }
      } finally {
        // Phase 7.3: Cleanup context after attempt
        await browserPool.closeContext(context);
      }

      const attemptResult = {
        attemptId,
        attemptName: attemptDef.name,
        goal: attemptDef.goal,
        riskCategory: attemptDef.riskCategory || 'UNKNOWN',
        source: attemptDef.source || 'manual',
        ...result
      };

      // Phase 7.1: Fail-fast logic (stop on FAILURE, not FRICTION or SKIPPED)
      if (failFast && attemptResult.outcome === 'FAILURE') {
        shouldStopScheduling = true;
        if (!ciMode) {
          console.log(`\n⚡ FAIL-FAST: stopping after failure: ${attemptDef.name}`);
        }
      }

      return attemptResult;
    },
    validatedParallel,
    { shouldStop: () => shouldStopScheduling }
  );

  // Collect results in order
  for (const result of attemptResults_parallel) {
    if (result) {
      attemptResults.push(result);
    }
  }

  // Add explicit SKIPPED entries for attempts filtered out before execution
  for (const skip of attemptsSkipped) {
    const def = getAttemptDefinition(skip.attempt) || {};
    attemptResults.push({
      attemptId: skip.attempt,
      attemptName: def.name || skip.attempt,
      goal: def.goal,
      riskCategory: def.riskCategory || 'UNKNOWN',
      source: def.source || 'manual',
      outcome: 'SKIPPED',
      skipReason: skip.reason || 'Skipped before execution',
      skipReasonCode: skip.reasonCode || SKIP_CODES.USER_FILTERED,
      exitCode: 0,
      steps: [],
      friction: null,
      error: null
    });
  }

  // Add explicit SKIPPED entries for attempts disabled by preset (kept for auditability)
  for (const disabledId of presetDisabledAttempts) {
    const def = getAttemptDefinition(disabledId) || {};
    attemptResults.push({
      attemptId: disabledId,
      attemptName: def.name || disabledId,
      goal: def.goal,
      riskCategory: def.riskCategory || 'UNKNOWN',
      source: def.source || 'manual',
      outcome: 'SKIPPED',
      skipReason: 'Disabled by preset',
      skipReasonCode: SKIP_CODES.DISABLED_BY_PRESET,
      exitCode: 0,
      steps: [],
      friction: null,
      error: null,
      disabledByPreset: true
    });
  }

  // Add explicit SKIPPED for user-filtered attempts that were removed before scheduling
  for (const uf of userFilteredAttempts) {
    const def = getAttemptDefinition(uf.attemptId) || {};
    attemptResults.push({
      attemptId: uf.attemptId,
      attemptName: def.name || uf.attemptId,
      goal: def.goal,
      riskCategory: def.riskCategory || 'UNKNOWN',
      source: def.source || 'manual',
      outcome: 'SKIPPED',
      skipReason: uf.reason,
      skipReasonCode: SKIP_CODES.USER_FILTERED,
      exitCode: 0,
      steps: [],
      friction: null,
      error: null,
      userFiltered: true
    });
  }

  // Preserve requested ordering for downstream artifacts
  const attemptOrder = new Map(requestedAttempts.map((id, idx) => [id, idx]));
  attemptResults.sort((a, b) => (attemptOrder.get(a.attemptId) ?? 999) - (attemptOrder.get(b.attemptId) ?? 999));

  // Normalize execution metadata
  for (const result of attemptResults) {
    result.executed = isExecutedAttempt(result);
  }

  // Phase 3: Execute intent flows (deterministic, curated)
  if (enableFlows) {
    console.log(`\n🎯 Executing intent flows...`);
    const flowExecutor = new GuardianFlowExecutor({
      timeout: resolvedTimeout,
      screenshotOnStep: enableScreenshots,
      baseUrl,
      quiet: ciMode,
      ...flowOptions
    });
    const browser = new GuardianBrowser();

    try {
      await browser.launch(resolvedTimeout);
      // Phase 7.1: Apply flows filter
      let flowsToRun = Array.isArray(filteredFlows) && filteredFlows.length ? filteredFlows : getDefaultFlowIds();
      
      for (const flowId of flowsToRun) {
        const flowDef = getFlowDefinition(flowId);
        if (!flowDef) {
          console.warn(`⚠️  Flow ${flowId} not found, skipping`);
          continue;
        }

        const validation = validateFlowDefinition(flowDef);
        if (!validation.ok) {
          const reason = validation.reason || 'Flow misconfigured';
          const flowResult = {
            flowId,
            flowName: flowDef.name,
            riskCategory: flowDef.riskCategory || 'TRUST/UX',
            description: flowDef.description,
            outcome: 'FAILURE',
            stepsExecuted: 0,
            stepsTotal: Array.isArray(flowDef.steps) ? flowDef.steps.length : 0,
            failedStep: 0,
            error: reason,
            screenshots: [],
            failureReasons: [reason],
            source: 'flow'
          };
          flowResults.push(flowResult);
          
          // Phase 7.1: Fail-fast on flow failure
          if (failFast && flowResult.outcome === 'FAILURE') {
            console.log(`\n⚡ FAIL-FAST: stopping after first failure: ${flowDef.name}`);
            break;
          }
          continue;
        }

        console.log(`  • ${flowDef.name}...`);
        const flowArtifactsDir = path.join(runDir, 'flows', flowId);
        fs.mkdirSync(flowArtifactsDir, { recursive: true });

        let flowResult;
        try {
          flowResult = await flowExecutor.executeFlow(browser.page, flowDef, flowArtifactsDir, baseUrl);
        } catch (flowErr) {
          console.warn(`⚠️  Flow ${flowDef.name} crashed: ${flowErr.message}`);
          flowResult = {
            flowId,
            flowName: flowDef.name,
            riskCategory: flowDef.riskCategory || 'TRUST/UX',
            description: flowDef.description,
            outcome: 'FAILURE',
            stepsExecuted: 0,
            stepsTotal: flowDef.steps.length,
            durationMs: 0,
            failedStep: null,
            error: flowErr.message,
            screenshots: [],
            failureReasons: [`flow crashed: ${flowErr.message}`]
          };
        }

        const resultWithMetadata = {
          flowId,
          flowName: flowDef.name,
          riskCategory: flowDef.riskCategory || 'TRUST/UX',
          description: flowDef.description,
          outcome: flowResult.outcome || (flowResult.success ? 'SUCCESS' : 'FAILURE'),
          stepsExecuted: flowResult.stepsExecuted,
          stepsTotal: flowResult.stepsTotal,
          durationMs: flowResult.durationMs,
          failedStep: flowResult.failedStep,
          error: flowResult.error,
          screenshots: flowResult.screenshots,
          failureReasons: flowResult.failureReasons || [],
          source: 'flow',
          successEval: flowResult.successEval ? {
            status: flowResult.successEval.status,
            confidence: flowResult.successEval.confidence,
            reasons: (flowResult.successEval.reasons || []).slice(0, 3),
            evidence: flowResult.successEval.evidence || {}
          } : null
        };
        
        flowResults.push(resultWithMetadata);

        // Phase 7.1: Fail-fast logic for flows (stop on FAILURE, not FRICTION)
        if (failFast && resultWithMetadata.outcome === 'FAILURE') {
          console.log(`\n⚡ FAIL-FAST: stopping after first failure: ${flowDef.name}`);
          break;
        }
      }
    } catch (flowErr) {
      console.warn(`⚠️  Flow execution failed (non-critical): ${flowErr.message}`);
    } finally {
      await browser.close().catch(() => {});
    }
  }

  // Flow summary logging
  if (flowResults.length > 0 && !ciMode) {
    const successCount = flowResults.filter(f => (f.outcome || f.success === true ? f.outcome === 'SUCCESS' || f.success === true : false)).length;
    const frictionCount = flowResults.filter(f => f.outcome === 'FRICTION').length;
    const failureCount = flowResults.filter(f => f.outcome === 'FAILURE' || f.success === false).length;
    console.log(`\nRun completed: ${flowResults.length} flows (${successCount} successes, ${frictionCount} frictions, ${failureCount} failures)`);
    const troubled = flowResults.filter(f => f.outcome === 'FRICTION' || f.outcome === 'FAILURE');
    troubled.forEach(f => {
      const reason = (f.failureReasons && f.failureReasons[0]) || (f.error) || (f.successEval && f.successEval.reasons && f.successEval.reasons[0]) || 'no reason captured';
      console.log(` - ${f.flowName}: ${reason}`);
    });
  }

  // Ensure artifacts exist for skipped attempts so totals remain canonical and inspectable
  for (const result of attemptResults) {
    if (!isExecutedAttempt(result)) {
      const attemptDir = path.join(runDir, result.attemptId);
      const attemptRunDir = path.join(attemptDir, 'attempt-skipped');
      fs.mkdirSync(path.join(attemptRunDir, 'attempt-screenshots'), { recursive: true });

      const skipSummary = {
        attemptId: result.attemptId,
        outcome: 'SKIPPED',
        reason: result.skipReason || 'Not executed'
      };

      const jsonPath = path.join(attemptRunDir, 'attempt-report.json');
      const htmlPath = path.join(attemptRunDir, 'attempt-report.html');
      fs.writeFileSync(jsonPath, JSON.stringify(skipSummary, null, 2));
      fs.writeFileSync(htmlPath, `<html><body><h1>${result.attemptName || result.attemptId}</h1><p>Skipped: ${skipSummary.reason}</p></body></html>`);

      result.reportJsonPath = result.reportJsonPath || jsonPath;
      result.reportHtmlPath = result.reportHtmlPath || htmlPath;
    }
  }

  // Generate market report (existing flow)
  const reporter = new MarketReporter();
  const report = reporter.createReport({
    runId,
    baseUrl,
    attemptsRun: requestedAttempts,
    results: attemptResults.map(r => ({
      attemptId: r.attemptId,
      attemptName: r.attemptName,
      goal: r.goal,
      outcome: r.outcome,
      exitCode: r.exitCode,
      totalDurationMs: r.attemptResult ? r.attemptResult.totalDurationMs : null,
      friction: r.friction,
      steps: r.steps,
      reportJsonPath: r.reportJsonPath,
      reportHtmlPath: r.reportHtmlPath
    })),
    flows: flowResults
  });

  const jsonPath = reporter.saveJsonReport(report, runDir);
  const html = reporter.generateHtmlReport(report);
  const htmlPath = reporter.saveHtmlReport(html, runDir);

  // Add market report paths to snapshot
  snapshotBuilder.addMarketResults(
    {
      attemptResults,
      marketJsonPath: jsonPath,
      marketHtmlPath: htmlPath,
      flowResults
    },
    runDir
  );

  // Phase 2: Compute market risk summary
  const riskSummary = computeMarketRiskSummary(attemptResults);
  snapshotBuilder.snapshot.riskSummary = riskSummary;

  // Handle baseline: load existing or auto-create
  console.log(`\n📊 Baseline check...`);
  let baselineCreated = false;
  let baselineSnapshot = null;
  let diffResult = null;

  if (baselineExists(baseUrl, storageDir)) {
    console.log(`✅ Baseline found`);
    baselineSnapshot = loadBaseline(baseUrl, storageDir);
    snapshotBuilder.setBaseline({
      baselineFound: true,
      baselineCreatedThisRun: false,
      baselinePath: path.join(storageDir, 'baselines', require('./baseline-storage').urlToSlug(baseUrl), 'baseline.json')
    });

    // Compare current against baseline
    diffResult = compareSnapshots(baselineSnapshot, snapshotBuilder.getSnapshot());
    snapshotBuilder.addDiff(diffResult);

    if (diffResult.regressions && Object.keys(diffResult.regressions).length > 0) {
      console.log(`⚠️  Regressions detected: ${Object.keys(diffResult.regressions).join(', ')}`);
    }
    if (diffResult.improvements && Object.keys(diffResult.improvements).length > 0) {
      console.log(`✨ Improvements: ${Object.keys(diffResult.improvements).join(', ')}`);
    }
  } else {
    // Auto-create baseline on first run
    console.log(`💾 Baseline not found - creating auto-baseline...`);
    const newBaseline = createBaselineFromSnapshot(snapshotBuilder.getSnapshot());
    await saveBaselineAtomic(baseUrl, newBaseline, storageDir);
    baselineCreated = true;
    baselineSnapshot = newBaseline;

    snapshotBuilder.setBaseline({
      baselineFound: false,
      baselineCreatedThisRun: true,
      baselineCreatedAt: new Date().toISOString(),
      baselinePath: path.join(storageDir, 'baselines', require('./baseline-storage').urlToSlug(baseUrl), 'baseline.json')
    });

    console.log(`✅ Baseline created`);
  }

  // Analyze market impact (Phase 3)
  console.log(`\n📊 Analyzing market criticality...`);
  const currentSnapshot = snapshotBuilder.getSnapshot();
  const marketImpact = analyzeMarketImpact(
    [
      ...currentSnapshot.attempts,
      ...(flowResults.map(f => ({
        attemptId: f.flowId,
        outcome: f.outcome,
        riskCategory: f.riskCategory,
        validators: [],
        friction: { signals: [] },
        pageUrl: baseUrl
      })) || [])
    ],
    baseUrl
  );
  snapshotBuilder.setMarketImpactSummary(marketImpact);
  console.log(`✅ Market impact analyzed: ${marketImpact.highestSeverity} severity`);

  // Phase 4: Add breakage intelligence (deterministic failure analysis)
  const intelligence = aggregateIntelligence(attemptResults, flowResults);
  snapshotBuilder.addIntelligence(intelligence);
  if (intelligence.escalationSignals.length > 0) {
    console.log(`🚨 Escalation signals: ${intelligence.escalationSignals.slice(0, 3).join('; ')}`);
  }

  // Save snapshot itself
  console.log(`\n💾 Saving snapshot...`);
  const snapshotPath = path.join(runDir, 'snapshot.json');
  await saveSnapshot(snapshotBuilder.getSnapshot(), snapshotPath);
  console.log(`✅ Snapshot saved: snapshot.json`);

  // Phase 6: Generate enhanced HTML report
  try {
    const enhancedHtmlPath = writeEnhancedHtml(snapshotBuilder.getSnapshot(), runDir);
    console.log(`✅ Enhanced HTML report: ${path.basename(enhancedHtmlPath)}`);
  } catch (htmlErr) {
    console.warn(`⚠️  Enhanced HTML report failed (non-critical): ${htmlErr.message}`);
  }

  // Phase 7.3: Cleanup browser pool
  await browserPool.close();

  // Wave 4: Honest results & near-success
  // Calculate attempt statistics and coverage
  const disabledAttemptResults = attemptResults.filter(a => a.disabledByPreset);
  const eligibleAttempts = attemptResults.filter(a => !a.disabledByPreset);
  const executedAttempts = eligibleAttempts.filter(isExecutedAttempt);
  const skippedAttempts = eligibleAttempts.filter(a => !isExecutedAttempt(a));
  const skippedNotApplicable = eligibleAttempts.filter(a => a.skipReasonCode === SKIP_CODES.NOT_APPLICABLE);
  const skippedMissing = eligibleAttempts.filter(a => a.skipReasonCode === SKIP_CODES.ENGINE_MISSING);
  const skippedUserFiltered = eligibleAttempts.filter(a => a.skipReasonCode === SKIP_CODES.USER_FILTERED || a.userFiltered);
  const skippedDisabledByPreset = disabledAttemptResults;
  const attemptStats = {
    total: eligibleAttempts.length,
    executed: executedAttempts.length,
    executedCount: executedAttempts.length,
    enabledPlannedCount: enabledRequestedAttempts.length,
    disabledPlannedCount: disabledAttemptResults.length,
    successful: executedAttempts.filter(a => a.outcome === 'SUCCESS').length,
    failed: executedAttempts.filter(a => a.outcome === 'FAILURE').length,
    skipped: skippedAttempts.length,
    skippedDetails: skippedAttempts.map(a => ({ attempt: a.attemptId, reason: a.skipReason || 'Not executed', code: a.skipReasonCode })),
    disabled: disabledAttemptResults.length,
    disabledDetails: disabledAttemptResults.map(a => ({ attempt: a.attemptId, reason: a.skipReason || 'Disabled by preset', code: SKIP_CODES.DISABLED_BY_PRESET })),
    userFiltered: skippedUserFiltered.length,
    skippedDisabledByPreset: skippedDisabledByPreset.length,
    skippedNotApplicable: skippedNotApplicable.length,
    skippedMissing: skippedMissing.length,
    skippedUserFiltered: skippedUserFiltered.length
  };

  const nearSuccessDetails = [];
  for (const a of attemptResults) {
    if (a.outcome === 'FAILURE') {
      const errMsg = typeof a.error === 'string' ? a.error : '';
      const noFailedSteps = Array.isArray(a.steps) ? a.steps.every(s => s.status !== 'failed') : true;
      if (noFailedSteps && errMsg.includes('Success conditions not met')) {
        nearSuccessDetails.push({ attempt: a.attemptId, reason: 'Submit succeeded but no confirmation text detected' });
      }
    }
  }
  attemptStats.nearSuccess = nearSuccessDetails.length;
  attemptStats.nearSuccessDetails = nearSuccessDetails;

  // Coverage and evidence signals
  const coverageDenominator = attemptStats.total;
  const coverageNumerator = attemptStats.executed + skippedNotApplicable.length;
  const coverageGaps = Math.max(coverageDenominator - coverageNumerator, 0);
  const coverageSignal = {
    gaps: coverageGaps,
    executed: attemptStats.executed,
    total: coverageDenominator,
    details: attemptStats.skippedDetails,
    disabled: attemptStats.disabledDetails,
    skippedDisabledByPreset: skippedDisabledByPreset.map(a => ({ attempt: a.attemptId, reason: a.skipReason || 'Disabled by preset', code: SKIP_CODES.DISABLED_BY_PRESET })),
    skippedNotApplicable: skippedNotApplicable.map(a => ({ attempt: a.attemptId, reason: a.skipReason })),
    skippedMissing: skippedMissing.map(a => ({ attempt: a.attemptId, reason: a.skipReason })),
    skippedUserFiltered: skippedUserFiltered.map(a => ({ attempt: a.attemptId, reason: a.skipReason })),
    counts: {
      executedCount: attemptStats.executed,
      enabledPlannedCount: attemptStats.enabledPlannedCount,
      disabledPlannedCount: attemptStats.disabledPlannedCount,
      skippedDisabledByPreset: skippedDisabledByPreset.length,
      skippedUserFiltered: skippedUserFiltered.length,
      skippedNotApplicable: skippedNotApplicable.length,
      skippedMissing: skippedMissing.length
    }
  };

  const evidenceMetrics = {
    completeness: coverageDenominator > 0 ? coverageNumerator / coverageDenominator : 0,
    integrity: 0,
    hashedFiles: 0,
    totalFiles: 0,
    screenshotsEnabled: enableScreenshots,
    tracesEnabled: enableTrace
  };

  // Build signals used by policy (single source of verdict truth)
  const policySignals = {
    coverage: coverageSignal,
    marketImpact,
    flows: flowResults,
    baseline: { baselineCreated, baselineSnapshot, diffResult },
    attempts: attemptResults,
    crawlIssues: runSignals.filter(s => s.type === 'coverage'),
    discoveryIssues: runSignals.filter(s => s.type === 'discovery'),
    evidence: {
      metrics: evidenceMetrics,
      missingScreenshots: !enableScreenshots,
      missingTraces: !enableTrace
    },
    runtimeSignals: runSignals
  };

  // Resolve policy (strict failure on invalid)
  let policyEval = null;
  let policyObj = null;
  let presetId = policyName; // Preserve preset ID for naming (e.g., 'startup')
  let policyHash = null;
  let policySource = 'default';
  try {
    if (policy && typeof policy === 'string' && fs.existsSync(policy)) {
      policySource = path.resolve(policy);
    } else if (policy) {
      policySource = typeof policy === 'string' ? `inline:${policy}` : `preset:${config.preset || policyName}`;
    } else {
      policySource = 'default';
    }
    policyObj = policy
      ? (typeof policy === 'object' ? policy : parsePolicyOption(policy))
      : loadPolicy();
    policyName = policyObj?.name || policyObj?.id || policyName || (policy ? policy : 'default');
    policyHash = crypto.createHash('sha256').update(JSON.stringify(policyObj)).digest('hex');
  } catch (policyLoadErr) {
    console.error(`Error: ${policyLoadErr.message}`);
    process.exit(2);
  }

  // First pass policy evaluation (before manifest integrity)
  policyEval = evaluatePolicy(snapshotBuilder.getSnapshot(), policyObj, policySignals);
  console.log(`\n🛡️  Evaluating policy... (${policyName})`);
  console.log(`Policy evaluation result: exitCode=${policyEval.exitCode}, passed=${policyEval.passed}`);
  if (policyEval.reasons && policyEval.reasons.length > 0) {
    policyEval.reasons.slice(0, 3).forEach(r => console.log(`  • ${r}`));
  }

  const resolvedConfig = {
    presetId: config.preset || presetId,
    policySource,
    policyId: policyObj?.id || policyObj?.name || policyName,
    policyHash,
    mediaRequirements: {
      requireScreenshots: !!(policyObj?.evidence?.requireScreenshots),
      requireTraces: !!(policyObj?.evidence?.requireTraces),
      minCompleteness: policyObj?.evidence?.minCompleteness,
      minIntegrity: policyObj?.evidence?.minIntegrity
    },
    attemptPlan: {
      enabled: enabledRequestedAttempts,
      disabled: Array.from(disabledByPreset),
      userFiltered: userFilteredAttempts.map(u => u.attemptId),
      missing: missingAttempts
    },
    coverage: {
      total: coverageSignal.total,
      executed: coverageSignal.executed,
      executedCount: attemptStats.executed,
      enabledPlannedCount: attemptStats.enabledPlannedCount,
      disabledPlannedCount: attemptStats.disabledPlannedCount,
      skippedNotApplicable: coverageSignal.skippedNotApplicable?.length || 0,
      skippedMissing: coverageSignal.skippedMissing?.length || 0,
      skippedUserFiltered: coverageSignal.skippedUserFiltered?.length || 0,
      skippedDisabledByPreset: coverageSignal.skippedDisabledByPreset?.length || 0,
      disabled: coverageSignal.disabled?.length || 0
    },
    evidenceMetrics
  };

  // Calculate actual duration from start time
  const endTime = new Date();
  const actualDurationMs = endTime.getTime() - startTime.getTime();

  // Rename run directory to status placeholder for auditability
  let exitCode = policyEval.exitCode;
  const runResultPreManifest = 'PENDING';
  const priorRunDir = runDir;
  const finalRunDirName = makeRunDirName({ timestamp: startTime, url: baseUrl, policy: presetId, result: runResultPreManifest });
  const finalRunDir = path.join(artifactsDir, finalRunDirName);
  if (finalRunDir !== runDir) {
    fs.renameSync(runDir, finalRunDir);
    runDir = finalRunDir;
    runDirName = finalRunDirName;
  }
  // Rebase attempt artifact paths after rename
  for (const attempt of attemptResults) {
    if (attempt.attemptJsonPath) {
      attempt.attemptJsonPath = attempt.attemptJsonPath.replace(priorRunDir, runDir);
    }
    if (attempt.stepsLogPath) {
      attempt.stepsLogPath = attempt.stepsLogPath.replace(priorRunDir, runDir);
    }
    if (attempt.reportJsonPath) {
      attempt.reportJsonPath = attempt.reportJsonPath.replace(priorRunDir, runDir);
    }
    if (attempt.reportHtmlPath) {
      attempt.reportHtmlPath = attempt.reportHtmlPath.replace(priorRunDir, runDir);
    }
  }
  const snapshotPathFinal = path.join(runDir, 'snapshot.json');
  const marketJsonPathFinal = path.join(runDir, path.basename(jsonPath));
  const marketHtmlPathFinal = path.join(runDir, path.basename(htmlPath));

  // Build decision artifact and summary (first pass)
  const initialDecision = computeFinalVerdict({
    marketImpact,
    policyEval,
    baseline: { baselineCreated, baselineSnapshot, diffResult },
    flows: flowResults,
    attempts: attemptResults
  });
  const initialExplanation = buildRealityExplanation({
    finalDecision: initialDecision,
    attemptStats,
    marketImpact,
    policyEval,
    baseline: { baselineCreated, baselineSnapshot, diffResult },
    flows: flowResults,
    attempts: attemptResults,
    coverage: coverageSignal
  });

  const decisionPath = writeDecisionArtifact({
    runDir,
    runId,
    baseUrl,
    policyName,
    preset: config.preset || policyName,
    finalDecision: initialDecision,
    attemptStats,
    marketImpact,
    policyEval,
    baseline: { baselineCreated, baselineSnapshot, diffResult },
    flows: flowResults,
    resolved: resolvedConfig,
    attempts: attemptResults,
    coverage: coverageSignal,
    explanation: initialExplanation
  });

  const summaryPath = writeRunSummary(runDir, initialDecision, attemptStats, marketImpact, policyEval, initialExplanation);

  // Build integrity manifest over all artifacts and update evidence metrics
  try {
    const manifestInfo = writeIntegrityManifest(runDir);
    evidenceMetrics.hashedFiles = manifestInfo.hashedFiles;
    evidenceMetrics.totalFiles = manifestInfo.totalFiles;
    evidenceMetrics.integrity = manifestInfo.totalFiles > 0 ? manifestInfo.hashedFiles / manifestInfo.totalFiles : 0;
  } catch (manifestErr) {
    console.warn(`⚠️  Failed to write integrity manifest: ${manifestErr.message}`);
    evidenceMetrics.integrity = 0;
    runSignals.push({ id: 'manifest_failed', severity: 'medium', type: 'evidence', description: `Manifest generation failed: ${manifestErr.message}` });
  }

  // Re-run policy evaluation with final evidence metrics
  policyEval = evaluatePolicy(snapshotBuilder.getSnapshot(), policyObj, policySignals);
  const finalDecision = computeFinalVerdict({
    marketImpact,
    policyEval,
    baseline: { baselineCreated, baselineSnapshot, diffResult },
    flows: flowResults,
    attempts: attemptResults
  });
  const finalExplanation = buildRealityExplanation({
    finalDecision,
    attemptStats,
    marketImpact,
    policyEval,
    baseline: { baselineCreated, baselineSnapshot, diffResult },
    flows: flowResults,
    attempts: attemptResults,
    coverage: coverageSignal
  });
  exitCode = finalDecision.exitCode;

  // Rewrite decision + summary with final verdict
  const decisionPathFinal = writeDecisionArtifact({
    runDir,
    runId,
    baseUrl,
    policyName,
    preset: config.preset || policyName,
    finalDecision,
    attemptStats,
    marketImpact,
    policyEval,
    baseline: { baselineCreated, baselineSnapshot, diffResult },
    flows: flowResults,
    resolved: resolvedConfig,
    attempts: attemptResults,
    coverage: coverageSignal,
    explanation: finalExplanation
  });
  const summaryPathFinal = writeRunSummary(runDir, finalDecision, attemptStats, marketImpact, policyEval, finalExplanation);

  const runResult = finalDecision.finalVerdict;

  // Persist policy evaluation and meta into snapshot
  try {
    const snap = snapshotBuilder.getSnapshot();
    snap.policyEvaluation = policyEval;
    snap.policyName = policyName;
    snap.meta.policyHash = policyHash;
    snap.meta.preset = config.preset || presetId;
    snap.meta.evidenceMetrics = evidenceMetrics;
    snap.meta.coverage = coverageSignal;
    snap.meta.resolved = resolvedConfig;
    snap.resolved = resolvedConfig;
    snap.meta.result = finalDecision.finalVerdict;
    snap.meta.attemptsSummary = {
      executed: attemptStats.executed,
      successful: attemptStats.successful,
      failed: attemptStats.failed,
      skipped: attemptStats.skipped,
      disabled: attemptStats.disabled,
      nearSuccess: attemptStats.nearSuccess,
      nearSuccessDetails: attemptStats.nearSuccessDetails
    };
    snap.evidenceMetrics = { ...evidenceMetrics, coverage: coverageSignal };
    snap.coverage = coverageSignal;
    await saveSnapshot(snap, snapshotPathFinal);
    // Minimal attestation: sha256(policyHash + snapshotHash + manifestHash + runId)
    const snapshotHash = hashFile(snapshotPathFinal);
    let manifestHash = null;
    try { manifestHash = hashFile(path.join(runDir, 'manifest.json')); } catch {}
    const attestationHash = crypto.createHash('sha256').update(`${policyHash}|${snapshotHash}|${manifestHash || 'none'}|${runId}`).digest('hex');
    snap.meta.attestation = { hash: attestationHash, policyHash, snapshotHash, manifestHash, runId };
    await saveSnapshot(snap, snapshotPathFinal);

    // Rewrite decision to include attestation and auditor-grade summary
    writeDecisionArtifact({
      runDir,
      runId,
      baseUrl,
      policyName,
      preset: config.preset || policyName,
      finalDecision,
      attemptStats,
      marketImpact,
      policyEval,
      baseline: { baselineCreated, baselineSnapshot, diffResult },
      flows: flowResults,
      resolved: resolvedConfig,
      attestation: snap.meta.attestation,
      audit: {
        executedAttempts: (snapshotBuilder.getSnapshot()?.attempts || []).filter(a => a.executed).map(a => a.attemptId),
        notTested: {
          disabledByPreset: (attemptStats.disabledDetails || []).map(d => d.attempt),
          userFiltered: (snap.coverage?.skippedUserFiltered || []).map(s => s.attempt),
          notApplicable: (snap.coverage?.skippedNotApplicable || []).map(s => s.attempt),
          missing: (snap.coverage?.skippedMissing || []).map(s => s.attempt)
        }
      },
      attempts: attemptResults,
      coverage: coverageSignal,
      explanation: finalExplanation
    });
  } catch (_) {}

  // Persist META.json
  let metaData;
  try {
    metaData = {
      runDir,
      url: baseUrl,
      siteSlug,
      policy: policyName,
      policyHash,
      preset: config.preset || presetId,
      result: runResult,
      durationMs: actualDurationMs,
      profile: siteProfile,
      attempts: attemptStats,
      evidence: evidenceMetrics,
      decisionPath: decisionPathFinal || decisionPath,
      summaryPath: summaryPathFinal || summaryPath
    };
    writeMetaJson(metaData);
    if (process.env.GUARDIAN_DEBUG) {
      console.log(`\n💾 META.json written successfully`);
    }
  } catch (metaErr) {
    console.warn(`⚠️  Failed to write META.json: ${metaErr.message}`);
    exitCode = 1;
  }

  // Phase 5/6: Send webhook notifications
  if (webhook) {
    try {
      const webhookUrl = getWebhookUrl('GUARDIAN_WEBHOOK_URL', webhook);
      if (webhookUrl) {
        console.log(`\n📡 Sending webhook notifications...`);
        const payload = buildWebhookPayload(
          snapshotBuilder.getSnapshot(),
          policyEval,
          { snapshotPath, marketJsonPath: jsonPath, marketHtmlPath: htmlPath }
        );
        const urls = webhookUrl.split(',').map(u => u.trim());
        await sendWebhooks(urls, payload);
        console.log(`✅ Webhook notifications sent`);
      }
    } catch (webhookErr) {
      console.warn(`⚠️  Webhook notification failed (non-critical): ${webhookErr.message}`);
    }
  }

  // Wave 2: Update latest pointers with finalized metadata
  try {
    const metaContent = readMetaJson(runDir);
    updateLatestGlobal(runDir, runDirName, metaContent, artifactsDir);
    updateLatestBySite(runDir, runDirName, metaContent, artifactsDir);
    if (process.env.GUARDIAN_DEBUG) {
      console.log(`✅ Latest pointers updated`);
    }
  } catch (latestErr) {
    console.warn(`⚠️  Failed to update latest pointers: ${latestErr.message}`);
  }

  return {
    exitCode,
    report,
    runDir,
    snapshotPath: snapshotPathFinal,
    marketJsonPath: marketJsonPathFinal,
    marketHtmlPath: marketHtmlPathFinal,
    attemptResults,
    flowResults,
    baselineCreated,
    diffResult,
    snapshot: snapshotBuilder.getSnapshot(),
    policyEval,
    resolved: resolvedConfig,
    finalDecision,
    explanation: finalExplanation,
    coverage: coverageSignal
  };
}

async function runRealityCLI(config) {
  try {
    // Stage II: Environment guard (before any other work)
    const { checkEnvironment, failWithEnvironmentError } = require('./env-guard');
    const envCheck = checkEnvironment();
    if (!envCheck.allOk) {
      failWithEnvironmentError(envCheck.issues);
      return; // Exit path, but just in case
    }

    const { config: effectiveConfig, report: configReport } = applyLocalConfig(config);

    console.log('\nConfig:');
    console.log(`- source: ${configReport.source}`);
    if (configReport.path) {
      console.log(`- path: ${configReport.path}`);
    }
    console.log('- effective:');
    console.log(`  - crawl.maxPages: ${configReport.effective.crawl.maxPages}`);
    console.log(`  - crawl.maxDepth: ${configReport.effective.crawl.maxDepth}`);
    console.log(`  - timeouts.navigationMs: ${configReport.effective.timeouts.navigationMs}`);
    console.log(`  - output.dir: ${configReport.effective.output.dir}`);

    const cfg = effectiveConfig;

    if (cfg.watch) {
      const { startWatchMode } = require('./watch-runner');
      const watchResult = await startWatchMode(cfg);
      if (watchResult && watchResult.watchStarted === false && typeof watchResult.exitCode === 'number') {
        process.exit(watchResult.exitCode);
      }
      // When watch is active, do not exit; watcher owns lifecycle
      return;
    }

    const result = await executeReality(cfg);

    // Mark first run as complete
    if (isFirstRun()) {
      markFirstRunComplete();
    }

    // Phase 6: Print enhanced CLI summary
    const ciMode = isCiMode();
    if (!ciMode) {
      const resolved = result.resolved || {};
      console.log(`\nResolved configuration:`);
      console.log(`  Preset: ${resolved.presetId || 'unknown'}`);
      console.log(`  Policy: ${resolved.policyId || 'unknown'} (source: ${resolved.policySource || 'n/a'}, hash: ${resolved.policyHash || 'n/a'})`);
      if (resolved.mediaRequirements) {
        console.log(`  Media requirements: screenshots=${resolved.mediaRequirements.requireScreenshots}, traces=${resolved.mediaRequirements.requireTraces}`);
      }
      if (resolved.attemptPlan) {
        console.log(`  Attempt plan: enabled=${(resolved.attemptPlan.enabled || []).length}, disabled=${(resolved.attemptPlan.disabled || []).length}, userFiltered=${(resolved.attemptPlan.userFiltered || []).length}, missing=${(resolved.attemptPlan.missing || []).length}`);
      }
      if (resolved.coverage) {
        console.log(`  Attempt outcomes: executed=${resolved.coverage.executedCount ?? resolved.coverage.executed}, disabled=${resolved.coverage.disabledPlannedCount ?? 0}, skippedDisabledByPreset=${resolved.coverage.skippedDisabledByPreset ?? 0}, skippedUserFiltered=${resolved.coverage.skippedUserFiltered ?? 0}, skippedNotApplicable=${resolved.coverage.skippedNotApplicable ?? 0}, skippedMissing=${resolved.coverage.skippedMissing ?? 0}`);
      }
    }
    if (ciMode) {
      const ciSummary = formatCiSummary({
        flowResults: result.flowResults || [],
        diffResult: result.diffResult || null,
        baselineCreated: result.baselineCreated || false,
        exitCode: result.exitCode,
        maxReasons: 5
      });
      console.log(ciSummary);
    } else {
      // Strict CLI summary: traceable, factual only
      const snap = result.snapshot || {};
      const meta = snap.meta || {};
      const coverage = snap.coverage || result.coverage || {};
      const counts = coverage.counts || {};
      const evidence = snap.evidenceMetrics || {};
      const resolved = snap.resolved || {};
      const finalDecision = result.finalDecision || {};
      const explanation = result.explanation || buildRealityExplanation({
        finalDecision,
        attemptStats: snap.meta?.attemptsSummary || {},
        marketImpact: snap.marketImpact || {},
        policyEval: result.policyEval,
        baseline: { diffResult: result.diffResult },
        flows: result.flowResults,
        attempts: result.attemptResults,
        coverage
      });
      const sections = explanation.sections || {};
      const verdictSection = sections['Final Verdict'] || {};
      console.log('\n' + '━'.repeat(70));
      console.log('🛡️  Guardian Reality Summary');
      console.log('━'.repeat(70) + '\n');
      console.log(`Target: ${meta.url || 'unknown'}`);
      console.log(`Run ID: ${meta.runId || 'unknown'}\n`);
      console.log(`Verdict: ${meta.result || finalDecision.finalVerdict || 'unknown'}`);
      console.log(`Exit Code: ${result.exitCode}`);
      if (verdictSection.explanation) console.log(`Reason: ${verdictSection.explanation}`);
      if (verdictSection.whyNot && verdictSection.whyNot.length > 0) {
        console.log(`Why not alternatives: ${verdictSection.whyNot.join(' ')}`);
      }
      const planned = coverage.total ?? (resolved.coverage?.total);
      const executed = counts.executedCount ?? (resolved.coverage?.executedCount) ?? coverage.executed;
      console.log(`Executed / Planned: ${executed} / ${planned}`);
      const completeness = evidence.completeness ?? resolved.evidenceMetrics?.completeness;
      const integrity = evidence.integrity ?? resolved.evidenceMetrics?.integrity;
      console.log(`Coverage Completeness: ${typeof completeness === 'number' ? completeness.toFixed(4) : completeness}`);
      console.log(`Evidence Integrity: ${typeof integrity === 'number' ? integrity.toFixed(4) : integrity}`);
      if (meta.attestation?.hash) console.log(`Attestation: ${meta.attestation.hash}`);
      const executedAttempts = (snap.attempts || []).filter(a => a.executed).map(a => a.attemptId);
      console.log('\nAudit Summary:');
      console.log(`  Tested (${executedAttempts.length}): ${executedAttempts.join(', ') || 'none'}`);
      const skippedDisabled = (coverage.skippedDisabledByPreset || []).map(s => s.attempt);
      const skippedUserFiltered = (coverage.skippedUserFiltered || []).map(s => s.attempt);
      const skippedNotApplicable = (coverage.skippedNotApplicable || []).map(s => s.attempt);
      const skippedMissing = (coverage.skippedMissing || []).map(s => s.attempt);
      console.log(`  Not Tested — DisabledByPreset (${skippedDisabled.length}): ${skippedDisabled.join(', ') || 'none'}`);
      console.log(`  Not Tested — UserFiltered (${skippedUserFiltered.length}): ${skippedUserFiltered.join(', ') || 'none'}`);
      console.log(`  Not Tested — NotApplicable (${skippedNotApplicable.length}): ${skippedNotApplicable.join(', ') || 'none'}`);
      console.log(`  Not Tested — Missing (${skippedMissing.length}): ${skippedMissing.join(', ') || 'none'}`);
      if (sections['What Guardian Observed']) {
        console.log('\nWhat Guardian Observed:');
        sections['What Guardian Observed'].details.forEach(d => console.log(`  • ${d}`));
      }
      if (sections['What Guardian Could Not Confirm']) {
        console.log('\nWhat Guardian Could Not Confirm:');
        sections['What Guardian Could Not Confirm'].details.forEach(d => console.log(`  • ${d}`));
      }
      if (sections['Evidence Summary']) {
        console.log('\nEvidence Summary:');
        sections['Evidence Summary'].details.forEach(d => console.log(`  • ${d}`));
      }
      if (sections['Limits of This Run']) {
        console.log('\nLimits of This Run:');
        sections['Limits of This Run'].details.forEach(d => console.log(`  • ${d}`));
      }
      const reportBase = result.runDir || (configReport?.effective?.output?.dir ? path.join(configReport.effective.output.dir, meta.runId || '') : `artifacts/${meta.runId || ''}`);
      console.log(`\n📁 Full report: ${reportBase}\n`);
      console.log('━'.repeat(70));
    }

    process.exit(result.exitCode);
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    if (process.env.GUARDIAN_DEBUG) {
      if (err.stack) console.error(err.stack);
    } else if (err.stack) {
      const stackLine = (err.stack.split('\n')[1] || '').trim();
      if (stackLine) console.error(`   at ${stackLine}`);
      console.error('   (Set GUARDIAN_DEBUG=1 for full stack)');
    }
    process.exit(1);
  }
}

/**
 * Phase 2: Compute market risk summary from attempt results
 * Deterministic scoring based on attempt outcomes and risk categories
 */
function computeMarketRiskSummary(attemptResults) {
  const summary = {
    totalSoftFailures: 0,
    totalFriction: 0,
    totalFailures: 0,
    failuresByCategory: {},
    softFailuresByAttempt: {},
    topRisks: []
  };

  // Categorize failures
  for (const attempt of attemptResults) {
    const category = attempt.riskCategory || 'UNKNOWN';
    if (!summary.failuresByCategory[category]) {
      summary.failuresByCategory[category] = { failures: 0, friction: 0, softFailures: 0 };
    }

    // Count outcomes
    if (attempt.outcome === 'FAILURE') {
      summary.totalFailures++;
      summary.failuresByCategory[category].failures++;
    } else if (attempt.outcome === 'FRICTION') {
      summary.totalFriction++;
      summary.failuresByCategory[category].friction++;
    }

    // Count soft failures (Phase 2)
    if (attempt.softFailureCount > 0) {
      summary.totalSoftFailures += attempt.softFailureCount;
      summary.failuresByCategory[category].softFailures += attempt.softFailureCount;
      summary.softFailuresByAttempt[attempt.attemptId] = attempt.softFailureCount;
    }
  }

  // Build top risks (sorted by severity)
  const riskList = [];
  for (const [category, counts] of Object.entries(summary.failuresByCategory)) {
    if (counts.failures > 0 || counts.friction > 0 || counts.softFailures > 0) {
      riskList.push({
        category,
        severity: counts.failures > 0 ? 'CRITICAL' : 'MEDIUM',
        failures: counts.failures,
        frictionCount: counts.friction,
        softFailures: counts.softFailures
      });
    }
  }

  summary.topRisks = riskList.sort((a, b) => {
    // CRITICAL before MEDIUM
    if (a.severity !== b.severity) {
      return a.severity === 'CRITICAL' ? -1 : 1;
    }
    // Then by failure count
    return (b.failures + b.softFailures) - (a.failures + a.softFailures);
  });

  return summary;
}

function computeFlowExitCode(flowResults) {
  if (!Array.isArray(flowResults) || flowResults.length === 0) return 0;
  const hasFailure = flowResults.some(f => f.outcome === 'FAILURE' || f.success === false);
  if (hasFailure) return 2;
  const hasFriction = flowResults.some(f => f.outcome === 'FRICTION');
  if (hasFriction) return 1;
  return 0;
}

function computeFinalVerdict({ marketImpact, policyEval, baseline, flows, attempts }) {
  const reasons = [];

  const executedAttempts = Array.isArray(attempts)
    ? attempts.filter(a => a.executed)
    : [];
  const successfulAttempts = executedAttempts.filter(a => a.outcome === 'SUCCESS');
  const failedAttempts = executedAttempts.filter(a => a.outcome === 'FAILURE');
  const frictionAttempts = executedAttempts.filter(a => a.outcome === 'FRICTION');

  const flowList = Array.isArray(flows) ? flows : [];
  const failedFlows = flowList.filter(f => f.outcome === 'FAILURE' || f.success === false);
  const frictionFlows = flowList.filter(f => f.outcome === 'FRICTION');
  const observedFlows = successfulAttempts.map(a => a.attemptId || a.id || 'unknown');

  // Observation summary always first
  if (executedAttempts.length > 0) {
    reasons.push({ code: 'OBSERVED', message: `Observed ${executedAttempts.length} attempted flow(s); successful=${successfulAttempts.length}, failed=${failedAttempts.length}, friction=${frictionAttempts.length}.` });
  }

  // Baseline regressions
  const diff = baseline?.diffResult || baseline?.diff;
  if (diff && diff.regressions && Object.keys(diff.regressions).length > 0) {
    const regressionAttempts = Object.keys(diff.regressions);
    reasons.push({ code: 'BASELINE_REGRESSION', message: `Baseline regressions detected for: ${regressionAttempts.join(', ')}.` });
  }

  // Policy evaluation evidence
  if (policyEval) {
    if (!policyEval.passed && policyEval.summary) {
      reasons.push({ code: 'POLICY', message: policyEval.summary });
    } else if (!policyEval.passed) {
      reasons.push({ code: 'POLICY', message: 'Policy conditions not satisfied; evidence insufficient.' });
    }
  }

  // Market impact evidence
  if (marketImpact && marketImpact.highestSeverity) {
    reasons.push({ code: 'MARKET_IMPACT', message: `Market impact severity observed: ${marketImpact.highestSeverity}.` });
  }

  // Flow/attempt failures
  if (failedAttempts.length > 0) {
    reasons.push({ code: 'CRITICAL_FLOW_FAILURE', message: `Critical flows failed: ${failedAttempts.map(a => a.attemptId || a.id || 'unknown').join(', ')}.` });
  }
  if (failedFlows.length > 0) {
    reasons.push({ code: 'FLOW_FAILURE', message: `Flow executions failed: ${failedFlows.map(f => f.flowId || f.flowName || 'unknown').join(', ')}.` });
  }
  if (frictionAttempts.length > 0 || frictionFlows.length > 0) {
    const frictionIds = [
      ...frictionAttempts.map(a => a.attemptId || a.id || 'unknown'),
      ...frictionFlows.map(f => f.flowId || f.flowName || 'unknown')
    ];
    reasons.push({ code: 'FLOW_FRICTION', message: `Flows with friction: ${frictionIds.join(', ')}.` });
  }

  // Determine verdict
  let internalVerdict;
  let finalVerdict;
  let exitCode;

  if (executedAttempts.length === 0 && flowList.length === 0) {
    internalVerdict = 'INSUFFICIENT_DATA';
    reasons.unshift({ code: 'NO_OBSERVATIONS', message: 'No meaningful flows executed; only static or configuration checks available.' });
  } else if (failedAttempts.length === 0 && failedFlows.length === 0 && frictionAttempts.length === 0 && frictionFlows.length === 0 && (!policyEval || policyEval.passed)) {
    internalVerdict = 'OBSERVED';
    if (observedFlows.length > 0) {
      reasons.push({ code: 'OBSERVED_FLOWS', message: `Observed end-to-end flows: ${observedFlows.join(', ')}.` });
    }
    reasons.push({ code: 'SCOPE', message: 'Verdict based solely on executed flows; no claim about business readiness beyond observed actions.' });
  } else {
    internalVerdict = 'PARTIAL';
    if (observedFlows.length > 0) {
      reasons.push({ code: 'PARTIAL_SCOPE', message: `Some flows observed (${observedFlows.join(', ')}), but at least one flow failed or could not be confirmed.` });
    } else {
      reasons.push({ code: 'PARTIAL_SCOPE', message: 'Flows were attempted but outcomes include failures or friction; observations are incomplete.' });
    }
  }

  // Ensure deterministic ordering: sort by code then message
  const orderedReasons = reasons
    .filter(r => r && r.code && r.message)
    .sort((a, b) => a.code.localeCompare(b.code) || a.message.localeCompare(b.message));

  finalVerdict = toCanonicalVerdict(internalVerdict);
  exitCode = mapExitCodeFromCanonical(finalVerdict);
  return { finalVerdict, exitCode, reasons: orderedReasons };
}

function hashFile(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

function writeIntegrityManifest(runDir) {
  const manifest = {
    generatedAt: new Date().toISOString(),
    files: []
  };

  const allFiles = [];

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        allFiles.push(full);
      }
    }
  };

  walk(runDir);

  for (const target of allFiles) {
    if (fs.existsSync(target)) {
      manifest.files.push({
        path: path.relative(runDir, target),
        sha256: hashFile(target)
      });
    }
  }

  const manifestPath = path.join(runDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return {
    manifestPath,
    hashedFiles: manifest.files.length,
    totalFiles: allFiles.length
  };
}

function buildRealityExplanation({ finalDecision = {}, attemptStats = {}, marketImpact = {}, policyEval = {}, baseline = {}, flows = [], attempts = [], coverage = {} }) {
  const verdict = finalDecision.finalVerdict || 'UNKNOWN';
  const exitCode = typeof finalDecision.exitCode === 'number' ? finalDecision.exitCode : 1;

  const executedAttempts = (attempts || []).filter(isExecutedAttempt);
  const successes = executedAttempts.filter(a => a.outcome === 'SUCCESS');
  const failures = executedAttempts.filter(a => a.outcome === 'FAILURE');
  const frictions = executedAttempts.filter(a => a.outcome === 'FRICTION');

  const flowList = Array.isArray(flows) ? flows : [];
  const flowFailures = flowList.filter(f => f.outcome === 'FAILURE' || f.success === false);
  const flowFrictions = flowList.filter(f => f.outcome === 'FRICTION');
  const flowSuccesses = flowList.filter(f => f.outcome === 'SUCCESS' || f.success === true);

  const observedDetails = [];
  if (executedAttempts.length > 0) {
    const attemptSummary = executedAttempts
      .map(a => `${a.attemptId || a.id || 'unknown'} (${a.outcome || 'unknown'})`)
      .sort();
    observedDetails.push(`Executed ${executedAttempts.length} attempt(s): ${attemptSummary.join(', ')}.`);
  } else {
    observedDetails.push('No user journeys executed; evidence limited to crawl/policy signals.');
  }
  if (flowSuccesses.length > 0) {
    const successFlows = flowSuccesses
      .map(f => f.flowId || f.flowName || 'unknown')
      .sort();
    observedDetails.push(`Successful flows: ${successFlows.join(', ')}.`);
  }

  const couldNotConfirm = [];
  if (failures.length > 0) {
    const failureAttempts = failures
      .map(a => `${a.attemptId || a.id || 'unknown'} (${a.error ? String(a.error).split('\n')[0] : a.outcome})`)
      .sort();
    couldNotConfirm.push(`Failures detected in: ${failureAttempts.join(', ')}.`);
  }
  if (frictions.length > 0) {
    const frictionAttempts = frictions.map(a => a.attemptId || a.id || 'unknown').sort();
    couldNotConfirm.push(`Friction observed in: ${frictionAttempts.join(', ')}.`);
  }
  if (flowFailures.length > 0) {
    const ff = flowFailures.map(f => f.flowId || f.flowName || 'unknown').sort();
    couldNotConfirm.push(`Flow failures: ${ff.join(', ')}.`);
  }
  if (flowFrictions.length > 0) {
    const ff = flowFrictions.map(f => f.flowId || f.flowName || 'unknown').sort();
    couldNotConfirm.push(`Flow friction: ${ff.join(', ')}.`);
  }
  if (policyEval && policyEval.passed === false) {
    const reason = policyEval.summary || 'Policy conditions not satisfied.';
    couldNotConfirm.push(`Policy check failed: ${reason}`);
  }
  const diff = baseline?.diffResult || baseline?.diff;
  if (diff && diff.regressions && Object.keys(diff.regressions).length > 0) {
    const regressionAttempts = Object.keys(diff.regressions).sort();
    couldNotConfirm.push(`Baseline regressions: ${regressionAttempts.join(', ')}.`);
  }
  if (coverage && typeof coverage.gaps === 'number' && coverage.gaps > 0) {
    couldNotConfirm.push(`Coverage gaps: ${coverage.gaps} planned attempt(s) not observed.`);
  }
  if (couldNotConfirm.length === 0) {
    couldNotConfirm.push('No outstanding gaps; all planned evidence confirmed for observed scope.');
  }

  const evidenceSummary = [];
  const executedCount = attemptStats.executed ?? executedAttempts.length;
  const totalPlanned = attemptStats.total ?? attemptStats.enabledPlannedCount ?? executedAttempts.length;
  evidenceSummary.push(`Attempt outcomes: executed=${executedCount}, success=${attemptStats.successful ?? successes.length}, failed=${attemptStats.failed ?? failures.length}, skipped=${attemptStats.skipped ?? 0}.`);
  evidenceSummary.push(`Flow outcomes: success=${flowSuccesses.length}, failures=${flowFailures.length}, friction=${flowFrictions.length}.`);
  if (marketImpact && marketImpact.highestSeverity) {
    evidenceSummary.push(`Market severity observed: ${marketImpact.highestSeverity}.`);
  } else {
    evidenceSummary.push('Market severity not reported.');
  }
  if (policyEval && typeof policyEval.passed === 'boolean') {
    evidenceSummary.push(`Policy evaluation: ${policyEval.passed ? 'passed' : 'failed'} (exit ${policyEval.exitCode ?? 'unknown'}).`);
  } else {
    evidenceSummary.push('Policy evaluation: not run.');
  }
  if (diff && diff.regressions) {
    const regressions = Object.keys(diff.regressions);
    evidenceSummary.push(`Baseline regressions: ${regressions.length > 0 ? regressions.join(', ') : 'none'}.`);
  } else {
    evidenceSummary.push('Baseline comparison: none or no regressions detected.');
  }

  const limits = [];
  const gaps = coverage && typeof coverage.gaps === 'number' ? coverage.gaps : Math.max((totalPlanned || 0) - (executedCount || 0), 0);
  limits.push(`Coverage: ${executedCount}/${totalPlanned || 0} attempts executed; gaps=${gaps}.`);
  if (attemptStats.disabled) {
    limits.push(`Disabled by preset: ${attemptStats.disabled} attempt(s).`);
  }
  if (attemptStats.skippedUserFiltered) {
    limits.push(`User-filtered skips: ${attemptStats.skippedUserFiltered}.`);
  }
  if (attemptStats.skippedNotApplicable) {
    limits.push(`Not-applicable skips: ${attemptStats.skippedNotApplicable}.`);
  }
  if (attemptStats.skippedMissing) {
    limits.push(`Missing engine skips: ${attemptStats.skippedMissing}.`);
  }
  if (limits.length === 0) {
    limits.push('No additional limits detected beyond observed attempts.');
  }

  let whyThisVerdict;
  const whyNotList = [];
  if (verdict === 'OBSERVED') {
    whyThisVerdict = 'All executed attempts succeeded; no failures, friction, or policy blockers detected.';
    whyNotList.push('Not PARTIAL because no failures, friction, or policy shortfalls remain.');
    whyNotList.push(`Not INSUFFICIENT_DATA because ${executedCount} attempt(s) executed with complete evidence.`);
  } else if (verdict === 'PARTIAL') {
    const partialDrivers = [];
    if (failures.length > 0) partialDrivers.push(`${failures.length} failed attempt(s)`);
    if (frictions.length > 0) partialDrivers.push(`${frictions.length} friction attempt(s)`);
    if (flowFailures.length > 0) partialDrivers.push(`${flowFailures.length} failed flow(s)`);
    if (policyEval && policyEval.passed === false) partialDrivers.push('policy not satisfied');
    whyThisVerdict = partialDrivers.length > 0
      ? `Evidence is mixed: ${partialDrivers.join('; ')}.`
      : 'Evidence incomplete or mixed; not all planned signals confirmed.';
    whyNotList.push('Not OBSERVED because at least one failure, friction, or policy issue remains.');
    whyNotList.push(`Not INSUFFICIENT_DATA because ${executedCount} attempt(s) executed and produced evidence.`);
  } else if (verdict === 'INSUFFICIENT_DATA') {
    whyThisVerdict = 'No meaningful user flows were executed; evidence is insufficient to claim readiness.';
    whyNotList.push('Not OBSERVED because no successful flows were confirmed.');
    whyNotList.push('Not PARTIAL because there was no executable evidence to partially support readiness.');
  } else {
    whyThisVerdict = 'Verdict unavailable; using conservative interpretation of observed evidence.';
    whyNotList.push('Alternative verdicts not evaluated due to unknown state.');
  }

  const finalVerdictSection = {
    verdict,
    exitCode,
    explanation: whyThisVerdict,
    whyNot: whyNotList,
    reasons: (finalDecision.reasons || []).map(r => `${r.code}: ${r.message}`)
  };

  const sections = {
    'Final Verdict': finalVerdictSection,
    'What Guardian Observed': {
      summary: observedDetails[0],
      details: observedDetails
    },
    'What Guardian Could Not Confirm': {
      summary: couldNotConfirm[0],
      details: couldNotConfirm
    },
    'Evidence Summary': {
      summary: evidenceSummary[0],
      details: evidenceSummary
    },
    'Limits of This Run': {
      summary: limits[0],
      details: limits
    }
  };

  return { verdict: finalVerdictSection, sections };
}

function writeDecisionArtifact({ runDir, runId, baseUrl, policyName, preset, finalDecision, attemptStats, marketImpact, policyEval, baseline, flows, resolved, attestation, audit, attempts = [], coverage = {}, explanation }) {
  const structuredExplanation = explanation || buildRealityExplanation({ finalDecision, attemptStats, marketImpact, policyEval, baseline, flows, attempts, coverage });
  const safePolicyEval = policyEval || { passed: true, exitCode: 0, summary: 'Policy evaluation not run.' };
  const diff = baseline?.diffResult || baseline?.diff || {};
  const auditSummary = audit ? {
    tested: Array.isArray(audit.executedAttempts) ? audit.executedAttempts : [],
    notTested: {
      disabledByPreset: audit.notTested?.disabledByPreset || [],
      userFiltered: audit.notTested?.userFiltered || [],
      notApplicable: audit.notTested?.notApplicable || [],
      missing: audit.notTested?.missing || []
    }
  } : {
    tested: [],
    notTested: { disabledByPreset: [], userFiltered: [], notApplicable: [], missing: [] }
  };

  const decision = {
    runId,
    url: baseUrl,
    timestamp: new Date().toISOString(),
    preset: preset || 'default',
    policyName: policyName || 'unknown',
    finalVerdict: finalDecision.finalVerdict,
    exitCode: finalDecision.exitCode,
    reasons: finalDecision.reasons,
    resolved: resolved || {},
    attestation: attestation || {},
    counts: {
      attemptsExecuted: attemptStats.executed || 0,
      successful: attemptStats.successful || 0,
      failed: attemptStats.failed || 0,
      skipped: attemptStats.skipped || 0,
      nearSuccess: attemptStats.nearSuccess || 0
    },
    inputs: {
      policy: safePolicyEval,
      baseline: diff,
      market: marketImpact || {},
      flows: {
        total: Array.isArray(flows) ? flows.length : 0,
        failures: Array.isArray(flows) ? flows.filter(f => f.outcome === 'FAILURE' || f.success === false).length : 0,
        frictions: Array.isArray(flows) ? flows.filter(f => f.outcome === 'FRICTION').length : 0
      }
    },
    coverage: {
      total: coverage.total || attemptStats.enabledPlannedCount || attemptStats.total || 0,
      executed: coverage.executed || attemptStats.executed || 0,
      gaps: coverage.gaps ?? Math.max((attemptStats.total || 0) - (attemptStats.executed || 0), 0),
      skipped: coverage.details || attemptStats.skippedDetails || [],
      disabled: coverage.disabled || attemptStats.disabledDetails || []
    },
    auditSummary,
    sections: structuredExplanation.sections,
    explanation: structuredExplanation.verdict
  };

  const decisionPath = path.join(runDir, 'decision.json');
  fs.writeFileSync(decisionPath, JSON.stringify(decision, null, 2));
  return decisionPath;
}

function writeRunSummary(runDir, finalDecision, attemptStats, marketImpact, policyEval, explanation) {
  const structuredExplanation = explanation || buildRealityExplanation({ finalDecision, attemptStats, marketImpact, policyEval });
  const sections = structuredExplanation.sections;

  const lines = [];
  lines.push(`Final Verdict: ${finalDecision.finalVerdict} (exit ${finalDecision.exitCode})`);
  lines.push(`Why this verdict: ${sections['Final Verdict'].explanation}`);
  if (sections['Final Verdict'].whyNot && sections['Final Verdict'].whyNot.length > 0) {
    lines.push(`Why not alternatives: ${sections['Final Verdict'].whyNot.join(' ')}`);
  }
  lines.push('');
  lines.push('What Guardian Observed:');
  sections['What Guardian Observed'].details.forEach(d => lines.push(`- ${d}`));
  lines.push('');
  lines.push('What Guardian Could Not Confirm:');
  sections['What Guardian Could Not Confirm'].details.forEach(d => lines.push(`- ${d}`));
  lines.push('');
  lines.push('Evidence Summary:');
  sections['Evidence Summary'].details.forEach(d => lines.push(`- ${d}`));
  lines.push('');
  lines.push('Limits of This Run:');
  sections['Limits of This Run'].details.forEach(d => lines.push(`- ${d}`));

  const summaryPath = path.join(runDir, 'summary.txt');
  fs.writeFileSync(summaryPath, lines.join('\n'));
  // Also emit a markdown version for consistency with report discovery
  try {
    const mdLines = [];
    mdLines.push(`# Guardian Reality Summary`);
    mdLines.push('');

    mdLines.push(`## Final Verdict`);
    mdLines.push(`- Verdict: ${finalDecision.finalVerdict} (exit ${finalDecision.exitCode})`);
    mdLines.push(`- Why this verdict: ${sections['Final Verdict'].explanation}`);
    if (sections['Final Verdict'].whyNot && sections['Final Verdict'].whyNot.length > 0) {
      sections['Final Verdict'].whyNot.forEach(reason => mdLines.push(`- ${reason}`));
    }
    if (sections['Final Verdict'].reasons && sections['Final Verdict'].reasons.length > 0) {
      mdLines.push(`- Evidence reasons: ${sections['Final Verdict'].reasons.join(' ')}`);
    }

    mdLines.push('');
    mdLines.push(`## What Guardian Observed`);
    sections['What Guardian Observed'].details.forEach(d => mdLines.push(`- ${d}`));

    mdLines.push('');
    mdLines.push(`## What Guardian Could Not Confirm`);
    sections['What Guardian Could Not Confirm'].details.forEach(d => mdLines.push(`- ${d}`));

    mdLines.push('');
    mdLines.push(`## Evidence Summary`);
    sections['Evidence Summary'].details.forEach(d => mdLines.push(`- ${d}`));

    mdLines.push('');
    mdLines.push(`## Limits of This Run`);
    sections['Limits of This Run'].details.forEach(d => mdLines.push(`- ${d}`));

    const summaryMdPath = path.join(runDir, 'summary.md');
    fs.writeFileSync(summaryMdPath, mdLines.join('\n'));
  } catch (_) {}
  return summaryPath;
}

module.exports = { executeReality, runRealityCLI, computeFlowExitCode, applySafeDefaults, writeDecisionArtifact, computeFinalVerdict };