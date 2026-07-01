import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import {
  MIN_DEADLINE_BUFFER_DAYS,
  getMinDeadlineBufferExpiryLabel,
  getBerlinToday,
  isMinDeadlineBufferActive,
  isSubmissionDeadlineTooSoon,
  meetsMinSubmissionLead,
} from '../lib/submissionDeadline';
import { shouldAutoWatchlist } from '../lib/powerEngine';
import {
  AUTO_LOAD_INTERACTION_PAUSE_MS,
  AUTO_LOAD_INTERVAL_MS,
  AUTO_REFRESH_MS,
  DEFAULT_SCORE_FILTER,
  DEFAULT_PORTFOLIO_FILTER,
  IDLE_WORK_TIMEOUT_MS,
  LIVE_SEARCH_TIMEOUT_MS,
  MOBILE_LIVE_SEARCH_TIMEOUT_MS,
  PROGRESSIVE_LIVE_MS,
  PROGRESSIVE_PHASE_GAP_MS,
  PROGRESSIVE_SUPABASE_LIMIT_2,
  PROGRESSIVE_SUPABASE_LIMIT_3,
  PROGRESSIVE_SUPABASE_LIMIT_4,
  PROGRESSIVE_SUPABASE_PHASE2_MS,
  STARTUP_CACHE_PREVIEW_MAX,
  STARTUP_FETCH_DEFER_MS,
  STARTUP_REPROCESS_DEFER_MS,
  STARTUP_STORAGE_BLOCK_MS,
  STARTUP_FETCH_LIMIT,
  STORAGE_SAVE_DEBOUNCE_MS,
  TENDER_PAGE_SIZE,
  UI_AUTO_LOAD_MAX,
  WIN_PROBABILITY_FILTER_MIN,
} from '../lib/performanceConstants';
import {
  allowsLiveProviders,
  isFastMode,
  isProgressiveStartup,
  isServerOnlyMode,
  markCacheSessionWarmed,
  skipCacheOnStartup,
} from '../lib/startupFlags';
import { getAllReminders } from '../services/reminders';
import { loadTendersRaw, loadTendersRawPreview, saveTenders, applyUserExcludedState, addExcludedId, removeExcludedId } from '../services/storage';
import { loadPipelineSourceIds, PIPELINE_CHANGED_EVENT } from '../services/salesPipelineStorage';
import { fetchTendersFromDb } from '../services/tenderDb';
import { useViewMode } from './ViewModeContext';
import type { GlobalSearchResult } from '../lib/globalTenderSearch';
import { WORLDWIDE_PROVIDER_TOTAL } from '../lib/globalTenderSearch';
import { createHistoryEntry, getSuggestedAction, groupTendersByStatus } from '../services/workflow';
import { loadWorkflowHistory, saveWorkflowHistory } from '../services/workflowStorage';
import type { Category, DashboardStats, PipelineStatus, Tender } from '../types/tender';
import type { WorkflowHistoryEntry } from '../types/workflow';
import { meetsPortfolioFilter } from '../lib/portfolioFilter';
import { ErrorBoundary } from '../components/ErrorBoundary';

const DEMO_ID_PREFIXES = ['demo-', 'dach-', 'af-', 'me-', 'ted-fallback-'];

function withoutDemoTenders(tenders: Tender[]): Tender[] {
  return tenders.filter((t) => !DEMO_ID_PREFIXES.some((p) => t.id.startsWith(p)));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(label)), ms);
    }),
  ]);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export interface RefreshTenderOptions {
  /** Page number for Supabase fetch (1-based). */
  page?: number;
  /** Rows per page – default TENDER_PAGE_SIZE. */
  limit?: number;
  /** Allow live multi-provider search when Supabase is empty or preferLive is set. */
  live?: boolean;
  /** Force live search even when Supabase returns data. */
  preferLive?: boolean;
  /** Background expansion – no blocking spinner. */
  background?: boolean;
  /** Merge live results into existing tenders instead of replacing. */
  merge?: boolean;
  /** Append page results instead of replacing (infinite scroll). */
  append?: boolean;
  /** Resume Supabase scan at this raw DB row offset (cursor pagination). */
  cursor?: number;
  /** Replace list even when auto-pagination is in progress (manual refresh). */
  force?: boolean;
}

export interface TenderLoadProgress {
  loaded: number;
  estimated: number;
  phase: 'idle' | 'supabase' | 'live' | 'done';
  providersDone: number;
  providersTotal: number;
}

interface TenderContextValue {
  tenders: Tender[];
  allTenders: Tender[];
  visibleTenders: Tender[];
  reminders: ReturnType<typeof getAllReminders>;
  stats: DashboardStats;
  workflowHistory: WorkflowHistoryEntry[];
  workflowCounts: Record<PipelineStatus, number>;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  totalCount: number;
  expandingSources: boolean;
  loadProgress: TenderLoadProgress | null;
  error: string | null;
  dataSource: string | null;
  providerCount: number | null;
  bulkFreshnessLabel: string | null;
  bulkStale: boolean;
  tedSource: string | null;
  apiWarning: string | null;
  supabaseSkipped: boolean;
  lastFetched: Date | null;
  regions: string[];
  searchQuery: string;
  countryFilter: string;
  regionFilter: string;
  sourcePlatformFilter: string;
  scoreFilter: number;
  categoryFilter: Category | 'all';
  portfolioFilter: boolean;
  winProbabilityFilter: boolean;
  setPortfolioFilter: (enabled: boolean) => void;
  setWinProbabilityFilter: (enabled: boolean) => void;
  setSearchQuery: (q: string) => void;
  setCountryFilter: (c: string) => void;
  setRegionFilter: (r: string) => void;
  setSourcePlatformFilter: (p: string) => void;
  setScoreFilter: (s: number) => void;
  setCategoryFilter: (c: Category | 'all') => void;
  refreshTenders: (options?: RefreshTenderOptions) => Promise<void>;
  loadMoreTenders: () => Promise<void>;
  startFullWorldSearch: () => Promise<void>;
  fastMode: boolean;
  autoLoadEnabled: boolean;
  setAutoLoadEnabled: (enabled: boolean) => void;
  autoLoadCapReached: boolean;
  loadMoreManually: () => Promise<void>;
  updateTender: (id: string, updates: Partial<Tender>) => void;
  toggleWatchlist: (id: string) => void;
  excludeTender: (id: string) => void;
  restoreTender: (id: string) => void;
  showExcluded: boolean;
  setShowExcluded: (show: boolean) => void;
  excludedCount: number;
  showPipeline: boolean;
  setShowPipeline: (show: boolean) => void;
  pipelineCount: number;
  pipelineOnlyTenders: Tender[];
  minLeadDaysFilter: boolean;
  setMinLeadDaysFilter: (enabled: boolean) => void;
  hiddenByLeadDaysCount: number;
  minDeadlineBufferActive: boolean;
  minDeadlineBufferExpiryLabel: string;
  setStatus: (id: string, status: PipelineStatus) => void;
  moveToStage: (id: string, status: PipelineStatus, note?: string) => void;
  addToWorkflow: (id: string) => void;
  isDemo: boolean;
  selectedTenderId: string | null;
  openTender: (id: string) => void;
  closeTender: () => void;
  selectedTender: Tender | null;
}

const TenderContext = createContext<TenderContextValue | null>(null);

export function TenderProvider({ children }: { children: ReactNode }) {
  const skipCache = skipCacheOnStartup();
  const progressive = isProgressiveStartup();
  const { isMobileView } = useViewMode();
  const [allTenders, setAllTenders] = useState<Tender[]>([]);
  const [recoveryKey, setRecoveryKey] = useState(0);
  const [regions, setRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(!skipCache);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [expandingSources, setExpandingSources] = useState(false);
  const [loadProgress, setLoadProgress] = useState<TenderLoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string | null>(null);
  const [providerCount, setProviderCount] = useState<number | null>(null);
  const [bulkFreshnessLabel, setBulkFreshnessLabel] = useState<string | null>(null);
  const [bulkStale, setBulkStale] = useState(false);
  const [tedSource, setTedSource] = useState<string | null>(null);
  const [apiWarning, setApiWarning] = useState<string | null>(null);
  const [supabaseSkipped, setSupabaseSkipped] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [sourcePlatformFilter, setSourcePlatformFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState(DEFAULT_SCORE_FILTER);
  const [portfolioFilter, setPortfolioFilter] = useState(DEFAULT_PORTFOLIO_FILTER);
  const [winProbabilityFilter, setWinProbabilityFilter] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [showExcluded, setShowExcluded] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [pipelineTenderIds, setPipelineTenderIds] = useState(() => loadPipelineSourceIds('tender'));
  const minDeadlineBufferActive = useMemo(() => isMinDeadlineBufferActive(), []);
  const minDeadlineBufferExpiryLabel = useMemo(() => getMinDeadlineBufferExpiryLabel(), []);
  const [minLeadDaysFilter, setMinLeadDaysFilter] = useState(minDeadlineBufferActive);
  const [workflowHistory, setWorkflowHistory] = useState<WorkflowHistoryEntry[]>([]);
  const [fastMode, setFastMode] = useState(() => isFastMode());
  const [autoLoadEnabled, setAutoLoadEnabled] = useState(true);
  const savedRef = useRef<Tender[]>([]);
  const reprocessStartedRef = useRef(false);
  const mountStartedRef = useRef(false);
  const initialFetchDoneRef = useRef(false);
  const currentPageRef = useRef(0);
  const dbCursorRef = useRef(0);
  const estimatedTotalRef = useRef(0);
  const lastInteractionRef = useRef(0);
  const autoLoadActiveRef = useRef(false);
  const hasMoreRef = useRef(hasMore);
  const loadingMoreRef = useRef(loadingMore);
  const loadingRef = useRef(loading);
  const expandingSourcesRef = useRef(expandingSources);
  const allTendersLenRef = useRef(allTenders.length);
  const totalCountRef = useRef(totalCount);
  const loadMoreRef = useRef<() => Promise<void>>(async () => {});
  const refreshTendersRef = useRef<(options?: RefreshTenderOptions) => Promise<void>>(async () => {});
  const appendStallCountRef = useRef(0);
  const startupFetchScheduledRef = useRef(false);
  const updateProgressRef = useRef<
    (loaded: number, phase: TenderLoadProgress['phase'], opts?: { estimated?: number }) => void
  >(() => {});
  const loadProgressPhaseRef = useRef(loadProgress?.phase);

  const updateLoadProgress = useCallback((
    loaded: number,
    phase: TenderLoadProgress['phase'],
    opts?: { estimated?: number; providersDone?: number; providersTotal?: number },
  ) => {
    if (opts?.estimated != null) {
      estimatedTotalRef.current = Math.max(estimatedTotalRef.current, opts.estimated);
    }
    setLoadProgress({
      loaded,
      estimated: Math.max(loaded, opts?.estimated ?? estimatedTotalRef.current),
      phase,
      providersDone: opts?.providersDone ?? 0,
      providersTotal: opts?.providersTotal ?? (isMobileView ? 14 : WORLDWIDE_PROVIDER_TOTAL),
    });
  }, [isMobileView]);

  // Phase 1: optional cache preview – skipped on first session (nocache default).
  useEffect(() => {
    if (mountStartedRef.current) return;
    mountStartedRef.current = true;

    if (skipCache) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const previewTimer = window.setTimeout(() => {
      if (cancelled) return;
      const preview = applyUserExcludedState(withoutDemoTenders(loadTendersRawPreview(STARTUP_CACHE_PREVIEW_MAX, [])));
      if (preview.length > 0) {
        setAllTenders(preview);
        savedRef.current = preview;
      }
      setLoading(false);
      try {
        setWorkflowHistory(loadWorkflowHistory());
      } catch {
        /* ignore */
      }
    }, STARTUP_STORAGE_BLOCK_MS);

    return () => {
      cancelled = true;
      clearTimeout(previewTimer);
    };
  }, [skipCache]);

  useEffect(() => {
    const refresh = () => setPipelineTenderIds(loadPipelineSourceIds('tender'));
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'pht_sales_pipeline') refresh();
    };
    window.addEventListener(PIPELINE_CHANGED_EVENT, refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(PIPELINE_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Phase 2: deferred full cache + chunked reprocess – skipped in progressive mode.
  useEffect(() => {
    if (skipCache || progressive || reprocessStartedRef.current) return;
    reprocessStartedRef.current = true;

    let cancelled = false;
    const reprocessTimer = window.setTimeout(() => {
      if (cancelled) return;
      const full = applyUserExcludedState(withoutDemoTenders(loadTendersRaw([])));
      if (full.length === 0) return;

      if (full.length > savedRef.current.length) {
        setAllTenders(full);
        savedRef.current = full;
      }

      void import('../lib/tenderPipeline').then(({ reprocessStoredTendersChunked }) => {
        if (cancelled) return;
        let lastProgressAt = 0;
        void reprocessStoredTendersChunked(full, (chunk) => {
          if (cancelled) return;
          const now = Date.now();
          if (now - lastProgressAt < 500 && chunk.length < full.length) return;
          lastProgressAt = now;
          setAllTenders(chunk);
          savedRef.current = chunk;
        }).then((final) => {
          if (cancelled) return;
          setAllTenders(final);
          savedRef.current = final;
        });
      });
    }, STARTUP_REPROCESS_DEFER_MS);

    return () => {
      cancelled = true;
      clearTimeout(reprocessTimer);
    };
  }, [skipCache, progressive]);

  const refreshTenders = useCallback(async (options: RefreshTenderOptions = {}) => {
    const {
      page: pageOpt,
      limit,
      live = allowsLiveProviders(),
      preferLive = false,
      background = false,
      merge = false,
      append = false,
      cursor: cursorOpt,
      force = false,
    } = options;
    if (!append && !force && !background && hasMoreRef.current && allTendersLenRef.current > 0) {
      return;
    }
    const isInitial = !initialFetchDoneRef.current;
    const hasCache = savedRef.current.length > 0;
    const wantsLive = preferLive || live;
    const useDbFastPath = fastMode && !preferLive && !wantsLive;
    const page = pageOpt ?? (append ? currentPageRef.current + 1 : 1);
    const pageSize = limit ?? (append ? TENDER_PAGE_SIZE : STARTUP_FETCH_LIMIT);
    const dbCursor = cursorOpt ?? (append ? dbCursorRef.current : 0);
    if (!append) {
      dbCursorRef.current = 0;
      currentPageRef.current = 0;
      appendStallCountRef.current = 0;
    }
    if (append) {
      if (!hasMoreRef.current || loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else if (!hasCache && isInitial && !background) {
      setLoading(true);
    }
    if (background) setExpandingSources(true);
    setError(null);
    const prevMergedLen = append ? withoutDemoTenders(savedRef.current).length : 0;
    let appendWarning: string | null = null;
    try {
      const dbResult = await fetchTendersFromDb({ page, limit: pageSize, cursor: dbCursor });
      if (dbResult.kind === 'error') {
        throw new Error(dbResult.message);
      }
      const usingSupabase = dbResult.kind === 'ok';
      setSupabaseSkipped(dbResult.kind === 'skipped');

      let result: GlobalSearchResult;
      if (usingSupabase && !preferLive) {
        result = dbResult.data;
        const nextHasMore = result.hasMore ?? false;
        setHasMore(nextHasMore);
        hasMoreRef.current = nextHasMore;
        currentPageRef.current = result.page ?? page;
        if (result.cursor != null && Number.isFinite(result.cursor)) {
          dbCursorRef.current = result.cursor;
        }
        if (!nextHasMore) {
          appendStallCountRef.current = 0;
        }
        if (import.meta.env.DEV) {
          console.debug('[tenders] page', result.page ?? page, {
            rows: result.tenders.length,
            total: result.total,
            cursor: result.cursor,
            hasMore: nextHasMore,
            append,
          });
        }
      } else if (!wantsLive) {
        if (usingSupabase) {
          result = dbResult.data;
        } else if (isServerOnlyMode()) {
          throw new Error('Supabase nicht konfiguriert – Server-Modus aktiv.');
        } else if (background) {
          return;
        } else {
          throw new Error('Supabase nicht verfügbar.');
        }
      } else {
        const { searchGlobalTenders } = await import('../lib/globalTenderSearch');
        const mobileProviders = isMobileView;
        const searchTimeout = mobileProviders ? MOBILE_LIVE_SEARCH_TIMEOUT_MS : LIVE_SEARCH_TIMEOUT_MS;
        result = await withTimeout(
          searchGlobalTenders({ mobile: mobileProviders }),
          searchTimeout,
          'Live-Suche Zeitüberschreitung – Teilergebnisse aus Cache',
        );
        setHasMore(false);
        hasMoreRef.current = false;
        setTotalCount(result.total ?? result.tenders.length);
        currentPageRef.current = 1;
      }

      const baseSaved = merge || append ? withoutDemoTenders(savedRef.current) : [];
      let merged: Tender[];

      if (useDbFastPath && usingSupabase && !preferLive) {
        const { processTendersFromDbFast } = await import('../lib/tenderPipeline');
        const processed = processTendersFromDbFast(result.tenders, baseSaved);
        if (append) {
          const existingIds = new Set(baseSaved.map((t) => t.id));
          const newOnes = processed.filter((t) => !existingIds.has(t.id));
          merged = [...baseSaved, ...newOnes];
        } else {
          merged = processTendersFromDbFast(
            result.tenders,
            merge ? baseSaved : withoutDemoTenders(savedRef.current),
          );
        }
      } else {
        const { processTendersFromSourceAsync } = await import('../lib/tenderPipeline');
        const scored = await processTendersFromSourceAsync(
          result.tenders,
          merge || append ? baseSaved : withoutDemoTenders(savedRef.current),
        );
        merged = append
          ? (() => {
              const existingIds = new Set(baseSaved.map((t) => t.id));
              const newOnes = scored.filter((t) => !existingIds.has(t.id));
              return [...baseSaved, ...newOnes];
            })()
          : scored;
      }

      merged = applyUserExcludedState(merged.map((t) => (shouldAutoWatchlist(t) ? { ...t, watchlist: true } : t)));
      setAllTenders(merged);
      savedRef.current = merged;

      if (append) {
        const added = merged.length - prevMergedLen;
        const cursorAdvanced = (result.cursor ?? dbCursor) > dbCursor;
        if (added === 0 && (result.hasMore ?? false) && !cursorAdvanced) {
          appendStallCountRef.current += 1;
          if (appendStallCountRef.current >= 2) {
            hasMoreRef.current = false;
            setHasMore(false);
            appendWarning = 'Nachladen unterbrochen (kein Fortschritt) – bitte „Aktualisieren“ klicken.';
          } else {
            appendWarning = 'Seite ohne neue Treffer – versuche erneut…';
          }
        } else if (added > 0) {
          appendStallCountRef.current = 0;
        }
      }

      if (!hasMoreRef.current && usingSupabase && !preferLive) {
        estimatedTotalRef.current = merged.length;
        setTotalCount(merged.length);
      } else if (usingSupabase && !preferLive && (result.hasMore ?? false)) {
        setTotalCount(0);
      }
      setRegions(result.regions);
      setDataSource(result.source);
      setProviderCount(result.providerCount ?? null);
      setBulkFreshnessLabel(result.bulkFreshnessLabel ?? null);
      setBulkStale(result.bulkStale ?? false);
      setTedSource(result.tedSource ?? null);
      setIsDemo(result.isDemo ?? false);
      const demoWarning = result.isDemo ? (result.error ?? 'Keine Live-Daten von den APIs') : (result.error ?? null);
      const supabaseHint = dbResult.kind === 'skipped'
        ? 'Zentrale DB optional: Supabase in Vercel/.env.local einrichten (siehe Länder-Abdeckung → Supabase).'
        : null;
      setApiWarning(appendWarning ?? demoWarning ?? supabaseHint);
      setLastFetched(new Date());
      markCacheSessionWarmed();
      initialFetchDoneRef.current = true;

      if (background || pageSize != null) {
        const progressEstimated = (result.hasMore ?? false)
          ? Math.max(merged.length + pageSize, merged.length + 1)
          : merged.length;
        updateLoadProgress(merged.length, preferLive || live ? 'live' : 'supabase', {
          estimated: progressEstimated,
          providersDone: result.providerCount ?? 0,
          providersTotal: result.providersTotal ?? (isMobileView ? 14 : WORLDWIDE_PROVIDER_TOTAL),
        });
        if (
          !preferLive
          && !live
          && usingSupabase
          && !(result.hasMore ?? false)
          && merged.length > 0
        ) {
          updateLoadProgress(merged.length, 'done', { estimated: progressEstimated });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Globale Suche fehlgeschlagen';
      setError(msg);
      if (savedRef.current.length > 0) {
        setAllTenders(savedRef.current);
        setApiWarning(msg);
      } else {
        setApiWarning(null);
      }
    } finally {
      if (append) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      } else if (!background) {
        setLoading(false);
      }
      if (background) setExpandingSources(false);
    }
  }, [fastMode, isMobileView, updateLoadProgress]);

  const loadMoreTenders = useCallback(async () => {
    if (!hasMoreRef.current || loadingMoreRef.current) return;
    await refreshTenders({ append: true, live: false, cursor: dbCursorRef.current });
  }, [refreshTenders]);

  hasMoreRef.current = hasMore;
  loadingMoreRef.current = loadingMore;
  loadingRef.current = loading;
  expandingSourcesRef.current = expandingSources;
  allTendersLenRef.current = allTenders.length;
  totalCountRef.current = totalCount;
  loadMoreRef.current = loadMoreTenders;
  refreshTendersRef.current = refreshTenders;
  updateProgressRef.current = updateLoadProgress;
  loadProgressPhaseRef.current = loadProgress?.phase;

  // Pause auto-load while the user scrolls, clicks, or types.
  useEffect(() => {
    const markInteraction = () => {
      lastInteractionRef.current = Date.now();
    };
    const opts: AddEventListenerOptions = { passive: true, capture: true };
    window.addEventListener('scroll', markInteraction, opts);
    window.addEventListener('pointerdown', markInteraction, opts);
    window.addEventListener('keydown', markInteraction, opts);
    window.addEventListener('touchstart', markInteraction, opts);
    window.addEventListener('wheel', markInteraction, opts);
    return () => {
      window.removeEventListener('scroll', markInteraction, opts);
      window.removeEventListener('pointerdown', markInteraction, opts);
      window.removeEventListener('keydown', markInteraction, opts);
      window.removeEventListener('touchstart', markInteraction, opts);
      window.removeEventListener('wheel', markInteraction, opts);
    };
  }, []);

  const waitForIdle = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => resolve(), { timeout: IDLE_WORK_TIMEOUT_MS });
      } else {
        setTimeout(resolve, 0);
      }
    });
  }, []);

  // Schnellmodus: fetch next page every 2s until all rows are loaded.
  useEffect(() => {
    if (!fastMode || progressive || !autoLoadEnabled) return undefined;

    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | undefined;

    const scheduleNext = (delayMs = AUTO_LOAD_INTERVAL_MS) => {
      if (cancelled) return;
      timerId = window.setTimeout(() => {
        void tick();
      }, delayMs);
    };

    const markDoneIfComplete = () => {
      if (
        !hasMoreRef.current
        && !loadingMoreRef.current
        && allTendersLenRef.current > 0
        && loadProgressPhaseRef.current !== 'done'
      ) {
        const est = totalCountRef.current > 0 ? totalCountRef.current : allTendersLenRef.current;
        updateProgressRef.current(allTendersLenRef.current, 'done', { estimated: est });
      }
    };

    const tick = async () => {
      if (cancelled) return;

      if (loadingRef.current || expandingSourcesRef.current) {
        scheduleNext();
        return;
      }

      if (allTendersLenRef.current === 0) {
        scheduleNext();
        return;
      }

      if (allTendersLenRef.current >= UI_AUTO_LOAD_MAX) {
        autoLoadActiveRef.current = false;
        return;
      }

      if (!hasMoreRef.current) {
        autoLoadActiveRef.current = false;
        markDoneIfComplete();
        return;
      }

      if (loadingMoreRef.current) {
        scheduleNext();
        return;
      }

      const sinceInteraction = Date.now() - lastInteractionRef.current;
      if (sinceInteraction < AUTO_LOAD_INTERACTION_PAUSE_MS) {
        scheduleNext(AUTO_LOAD_INTERACTION_PAUSE_MS - sinceInteraction);
        return;
      }

      autoLoadActiveRef.current = true;
      await waitForIdle();
      if (cancelled || !hasMoreRef.current || loadingMoreRef.current || loadingRef.current) {
        scheduleNext();
        return;
      }

      await loadMoreRef.current();
      if (cancelled) return;
      scheduleNext();
    };

    scheduleNext(AUTO_LOAD_INTERVAL_MS);

    return () => {
      cancelled = true;
      autoLoadActiveRef.current = false;
      if (timerId != null) clearTimeout(timerId);
    };
  }, [fastMode, progressive, autoLoadEnabled, waitForIdle]);

  const expandLiveProvidersIncremental = useCallback(async (options?: { force?: boolean }) => {
    if (!options?.force && !allowsLiveProviders()) return;
    setExpandingSources(true);
    setError(null);
    const mobileProviders = isMobileView;
    const providersTotal = mobileProviders ? 14 : WORLDWIDE_PROVIDER_TOTAL;

    try {
      const { searchGlobalTendersIncremental } = await import('../lib/globalTenderSearch');
      const { processTendersFromSourceAsync } = await import('../lib/tenderPipeline');

      const final = await searchGlobalTendersIncremental({
        mobile: mobileProviders,
        batchSize: 2,
        onProgress: async (partial) => {
          const existing = withoutDemoTenders(savedRef.current);
          const existingIds = new Set(existing.map((t) => t.id));
          const newRaws = partial.tenders.filter((r) => !existingIds.has(r.id));
          let merged = existing;
          if (newRaws.length > 0) {
            const scored = await processTendersFromSourceAsync(newRaws, existing);
            merged = scored.map((t) => (shouldAutoWatchlist(t) ? { ...t, watchlist: true } : t));
          }
          setAllTenders(merged);
          savedRef.current = merged;
          setRegions(partial.regions);
          setDataSource(partial.source);
          setProviderCount(partial.providerCount ?? null);
          setBulkFreshnessLabel(partial.bulkFreshnessLabel ?? null);
          setBulkStale(partial.bulkStale ?? false);
          setTedSource(partial.tedSource ?? null);
          setIsDemo(partial.isDemo ?? false);
          estimatedTotalRef.current = Math.max(estimatedTotalRef.current, merged.length);
          updateLoadProgress(merged.length, 'live', {
            estimated: estimatedTotalRef.current,
            providersDone: partial.providerCount ?? 0,
            providersTotal: partial.providersTotal ?? providersTotal,
          });
        },
      });

      setLastFetched(new Date());
      markCacheSessionWarmed();
      updateLoadProgress(savedRef.current.length, 'done', {
        estimated: savedRef.current.length,
        providersDone: final.providerCount ?? 0,
        providersTotal: final.providersTotal ?? providersTotal,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Live-Erweiterung fehlgeschlagen';
      setApiWarning(msg);
      if (savedRef.current.length > 0) {
        setAllTenders(savedRef.current);
      }
    } finally {
      setExpandingSources(false);
    }
  }, [isMobileView, updateLoadProgress]);

  const startFullWorldSearch = useCallback(async () => {
    setFastMode(false);
    setError(null);
    updateLoadProgress(0, 'live', {
      estimated: estimatedTotalRef.current,
      providersDone: 0,
      providersTotal: isMobileView ? 14 : WORLDWIDE_PROVIDER_TOTAL,
    });
    await expandLiveProvidersIncremental({ force: true });
  }, [expandLiveProvidersIncremental, isMobileView, updateLoadProgress]);

  // Startup: paginated Supabase fetch (Schnellmodus) or legacy progressive pipeline.
  // Runs once on mount — must not depend on refreshTenders (hasMore/loadingMore would re-fetch page 1).
  useEffect(() => {
    if (startupFetchScheduledRef.current) return undefined;
    startupFetchScheduledRef.current = true;

    if (!progressive) {
      const timer = window.setTimeout(() => {
        updateProgressRef.current(0, 'supabase', { estimated: STARTUP_FETCH_LIMIT });
        void refreshTendersRef.current({ page: 1, limit: STARTUP_FETCH_LIMIT, live: false, cursor: 0 });
      }, STARTUP_FETCH_DEFER_MS);
      return () => clearTimeout(timer);
    }

    let cancelled = false;
    const startedAt = Date.now();

    void (async () => {
      await delay(STARTUP_FETCH_DEFER_MS);
      if (cancelled) return;
      updateProgressRef.current(0, 'supabase', { estimated: TENDER_PAGE_SIZE });
      await refreshTendersRef.current({ page: 1, limit: TENDER_PAGE_SIZE, live: false });

      const waitPhase2 = Math.max(0, PROGRESSIVE_SUPABASE_PHASE2_MS - (Date.now() - startedAt));
      await delay(waitPhase2);
      if (cancelled) return;
      await refreshTendersRef.current({ limit: PROGRESSIVE_SUPABASE_LIMIT_2, live: false, background: true });

      await delay(PROGRESSIVE_PHASE_GAP_MS);
      if (cancelled) return;
      await refreshTendersRef.current({ limit: PROGRESSIVE_SUPABASE_LIMIT_3, live: false, background: true });

      await delay(PROGRESSIVE_PHASE_GAP_MS);
      if (cancelled) return;
      await refreshTendersRef.current({ limit: PROGRESSIVE_SUPABASE_LIMIT_4, live: false, background: true });

      if (!allowsLiveProviders()) return;
      const waitLive = Math.max(0, PROGRESSIVE_LIVE_MS - (Date.now() - startedAt));
      await delay(waitLive);
      if (cancelled) return;
      await expandLiveProvidersIncremental();
    })();

    return () => {
      cancelled = true;
    };
  }, [progressive, expandLiveProvidersIncremental]);

  useEffect(() => {
    const interval = setInterval(() => {
      void refreshTendersRef.current({ live: false, page: 1, limit: TENDER_PAGE_SIZE });
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setWorkflowHistory(loadWorkflowHistory());
      } catch {
        /* ignore */
      }
    }, STARTUP_STORAGE_BLOCK_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (skipCache && allTenders.length === 0) return;
    const timer = setTimeout(() => {
      saveTenders(allTenders);
      savedRef.current = allTenders;
    }, STORAGE_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [allTenders, skipCache]);

  useEffect(() => { saveWorkflowHistory(workflowHistory); }, [workflowHistory]);

  const autoLoadCapReached = allTenders.length >= UI_AUTO_LOAD_MAX && hasMore;

  const loadMoreManually = useCallback(async () => {
    if (!hasMoreRef.current || loadingMoreRef.current) return;
    await refreshTenders({ append: true, live: false, cursor: dbCursorRef.current });
  }, [refreshTenders]);

  const activeTenders = useMemo(
    () => allTenders.filter((t) => !t.excluded),
    [allTenders],
  );

  const effectiveLeadDaysFilter = minDeadlineBufferActive && minLeadDaysFilter;

  const hiddenByLeadDaysCount = useMemo(
    () => (effectiveLeadDaysFilter
      ? activeTenders.filter((t) => isSubmissionDeadlineTooSoon(t)).length
      : 0),
    [activeTenders, effectiveLeadDaysFilter],
  );

  const leadFilteredTenders = useMemo(() => {
    if (!effectiveLeadDaysFilter) return activeTenders;
    return activeTenders.filter((t) => meetsMinSubmissionLead(t));
  }, [activeTenders, effectiveLeadDaysFilter]);

  const pipelineOnlyTenders = useMemo(
    () => leadFilteredTenders.filter((t) => pipelineTenderIds.has(t.id)),
    [leadFilteredTenders, pipelineTenderIds],
  );

  const visibleTenders = useMemo(() => {
    if (showPipeline) return leadFilteredTenders;
    return leadFilteredTenders.filter((t) => !pipelineTenderIds.has(t.id));
  }, [leadFilteredTenders, showPipeline, pipelineTenderIds]);

  const tenders = useMemo(() => {
    let result = showExcluded ? allTenders : visibleTenders;
    if (showExcluded && !showPipeline) {
      result = result.filter((t) => !pipelineTenderIds.has(t.id));
    }
    if (regionFilter !== 'all') result = result.filter((t) => t.region === regionFilter);
    if (countryFilter !== 'all') result = result.filter((t) => t.country.toLowerCase().includes(countryFilter.toLowerCase()));
    if (sourcePlatformFilter !== 'all') {
      result = result.filter((t) => t.sourcePlatform === sourcePlatformFilter);
    }
    if (categoryFilter !== 'all') result = result.filter((t) => t.category === categoryFilter);
    if (scoreFilter > 0) result = result.filter((t) => t.score >= scoreFilter);
    if (portfolioFilter) result = result.filter(meetsPortfolioFilter);
    if (winProbabilityFilter) {
      result = result.filter((t) => (t.winProbability ?? 0) >= WIN_PROBABILITY_FILTER_MIN);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.country.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.productMatch.profiles?.some((p) => p.name.toLowerCase().includes(q)) ||
          String(t.estimatedValue).includes(q.replace(/\D/g, '')),
      );
    }
    return result.sort((a, b) =>
      (b.overallOpportunityScore ?? b.score) - (a.overallOpportunityScore ?? a.score),
    );
  }, [allTenders, visibleTenders, showExcluded, showPipeline, pipelineTenderIds, regionFilter, countryFilter, sourcePlatformFilter, categoryFilter, scoreFilter, portfolioFilter, winProbabilityFilter, searchQuery]);

  const excludedCount = useMemo(
    () => allTenders.filter((t) => t.excluded).length,
    [allTenders],
  );

  const pipelineCount = pipelineOnlyTenders.length;

  const updateTender = useCallback((id: string, updates: Partial<Tender>) => {
    setAllTenders((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const toggleWatchlist = useCallback((id: string) => {
    setAllTenders((prev) => prev.map((t) => (t.id === id ? { ...t, watchlist: !t.watchlist } : t)));
  }, []);

  const excludeTender = useCallback((id: string) => {
    addExcludedId(id);
    setAllTenders((prev) => prev.map((t) => (t.id === id ? { ...t, excluded: true, watchlist: false } : t)));
  }, []);

  const restoreTender = useCallback((id: string) => {
    removeExcludedId(id);
    setAllTenders((prev) => prev.map((t) => (t.id === id ? { ...t, excluded: false } : t)));
  }, []);

  const moveToStage = useCallback((id: string, status: PipelineStatus, note?: string) => {
    setAllTenders((prev) => {
      const tender = prev.find((t) => t.id === id);
      if (!tender || tender.status === status) return prev;
      setWorkflowHistory((h) => [createHistoryEntry(tender, tender.status, status, note), ...h]);
      return prev.map((t) =>
        t.id === id ? { ...t, status, watchlist: true, nextAction: getSuggestedAction(status) } : t,
      );
    });
  }, []);

  const setStatus = useCallback((id: string, status: PipelineStatus) => moveToStage(id, status), [moveToStage]);

  const addToWorkflow = useCallback((id: string) => {
    const tender = allTenders.find((t) => t.id === id);
    if (!tender) return;
    moveToStage(id, tender.status === 'Neu' ? 'Prüfen' : tender.status);
  }, [allTenders, moveToStage]);

  const reminders = useMemo(() => getAllReminders(visibleTenders), [visibleTenders]);
  const workflowTenders = useMemo(
    () => visibleTenders.filter((t) => t.scoreRecommendation !== 'NO-GO'),
    [visibleTenders],
  );

  const workflowCounts = useMemo(() => {
    const grouped = groupTendersByStatus(workflowTenders);
    return Object.fromEntries(Object.entries(grouped).map(([k, v]) => [k, v.length])) as Record<PipelineStatus, number>;
  }, [workflowTenders]);

  const stats = useMemo((): DashboardStats => {
    const today = getBerlinToday();
    const goTenders = visibleTenders.filter((t) => t.scoreRecommendation === 'GO');
    const topChances = goTenders
      .filter((t) => t.category === 'C')
      .sort((a, b) => (b.overallOpportunityScore ?? b.score) - (a.overallOpportunityScore ?? a.score))
      .slice(0, 5);

    const profileDistribution: Record<string, number> = {};
    for (const t of visibleTenders) {
      const p = t.productMatch.profiles?.[0]?.name ?? 'Sonstige';
      profileDistribution[p] = (profileDistribution[p] ?? 0) + 1;
    }

    return {
      total: visibleTenders.length,
      newCount: visibleTenders.filter((t) => t.status === 'Neu').length,
      categoryA: visibleTenders.filter((t) => t.category === 'A').length,
      categoryB: visibleTenders.filter((t) => t.category === 'B').length,
      categoryC: visibleTenders.filter((t) => t.category === 'C').length,
      goCount: visibleTenders.filter((t) => t.scoreRecommendation === 'GO').length,
      noGoCount: visibleTenders.filter((t) => t.scoreRecommendation === 'NO-GO').length,
      pruefenCount: visibleTenders.filter((t) => t.scoreRecommendation === 'PRÜFEN').length,
      highScoreCount: visibleTenders.filter((t) => t.score >= 70).length,
      watchlistCount: visibleTenders.filter((t) => t.watchlist).length,
      deadlinesUnder14: activeTenders.filter((t) => {
        const days = differenceInDays(parseISO(t.deadline), parseISO(today));
        return days >= 0 && days < MIN_DEADLINE_BUFFER_DAYS && t.scoreRecommendation !== 'NO-GO';
      }).length,
      hiddenByLeadDays: hiddenByLeadDaysCount,
      newTodayCount: visibleTenders.filter((t) => t.publicationDate === today).length,
      topChances,
      workflowActive: workflowTenders.filter((t) => t.status !== 'Gewonnen' && t.status !== 'Verloren').length,
      workflowCounts,
      regions,
      profileDistribution,
    };
  }, [visibleTenders, activeTenders, hiddenByLeadDaysCount, workflowTenders, workflowCounts, regions]);

  const selectedTender = useMemo(
    () => allTenders.find((t) => t.id === selectedTenderId) ?? null,
    [allTenders, selectedTenderId],
  );

  const openTender = useCallback((id: string) => setSelectedTenderId(id), []);
  const closeTender = useCallback(() => setSelectedTenderId(null), []);

  const handleProviderRecovery = useCallback(() => {
    reprocessStartedRef.current = false;
    setAllTenders(savedRef.current);
    setError(null);
    setRecoveryKey((k) => k + 1);
  }, []);

  return (
    <TenderContext.Provider
      value={{
        tenders, allTenders, visibleTenders, reminders, stats, workflowHistory, workflowCounts,
        loading, loadingMore, hasMore, totalCount, expandingSources, loadProgress, error, dataSource, providerCount, bulkFreshnessLabel, bulkStale, tedSource, apiWarning, supabaseSkipped, isDemo, lastFetched, regions,
        searchQuery, countryFilter, regionFilter, sourcePlatformFilter, scoreFilter, categoryFilter, portfolioFilter, winProbabilityFilter,
        setSearchQuery, setCountryFilter, setRegionFilter, setSourcePlatformFilter, setScoreFilter, setCategoryFilter, setPortfolioFilter, setWinProbabilityFilter,
        refreshTenders, loadMoreTenders, startFullWorldSearch, fastMode,
        autoLoadEnabled, setAutoLoadEnabled,
        autoLoadCapReached, loadMoreManually,
        updateTender, toggleWatchlist, excludeTender, restoreTender,
        showExcluded, setShowExcluded, excludedCount,
        showPipeline, setShowPipeline, pipelineCount, pipelineOnlyTenders,
        minLeadDaysFilter, setMinLeadDaysFilter, hiddenByLeadDaysCount,
        minDeadlineBufferActive, minDeadlineBufferExpiryLabel,
        setStatus, moveToStage, addToWorkflow,
        selectedTenderId, openTender, closeTender, selectedTender,
      }}
    >
      <ErrorBoundary key={recoveryKey} onReset={handleProviderRecovery} resetLabel="Ansicht wiederherstellen">
        {children}
      </ErrorBoundary>
    </TenderContext.Provider>
  );
}

export function useTenders() {
  const ctx = useContext(TenderContext);
  if (!ctx) throw new Error('useTenders must be used within TenderProvider');
  return ctx;
}
