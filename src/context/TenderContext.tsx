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
import { searchGlobalTenders } from '../lib/globalTenderSearch';
import { shouldAutoWatchlist } from '../lib/powerEngine';
import { tenderMatchesPHT } from '../lib/phtMatch';
import { processTendersFromSource, reprocessStoredTenders } from '../lib/tenderPipeline';
import { getAllReminders } from '../services/reminders';
import { loadTenders, saveTenders } from '../services/storage';
import { fetchTendersFromDb } from '../services/tenderDb';
import { isMobileDevice } from '../lib/isMobileDevice';
import type { GlobalSearchResult } from '../lib/globalTenderSearch';
import { createHistoryEntry, getSuggestedAction, groupTendersByStatus } from '../services/workflow';
import { loadWorkflowHistory, saveWorkflowHistory } from '../services/workflowStorage';
import type { Category, DashboardStats, PipelineStatus, Tender } from '../types/tender';
import type { WorkflowHistoryEntry } from '../types/workflow';

const AUTO_REFRESH_MS = 60 * 60 * 1000;
const LIVE_SEARCH_TIMEOUT_MS = 50_000;
const MOBILE_LIVE_SEARCH_TIMEOUT_MS = 35_000;
const DEMO_ID_PREFIXES = ['demo-', 'dach-', 'af-', 'me-', 'ted-fallback-'];

function withoutDemoTenders(tenders: Tender[]): Tender[] {
  return tenders.filter((t) => !DEMO_ID_PREFIXES.some((p) => t.id.startsWith(p)));
}

function loadCachedTenders(): Tender[] {
  return reprocessStoredTenders(withoutDemoTenders(loadTenders([])));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(label)), ms);
    }),
  ]);
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
  setSearchQuery: (q: string) => void;
  setCountryFilter: (c: string) => void;
  setRegionFilter: (r: string) => void;
  setSourcePlatformFilter: (p: string) => void;
  setScoreFilter: (s: number) => void;
  setCategoryFilter: (c: Category | 'all') => void;
  refreshTenders: () => Promise<void>;
  updateTender: (id: string, updates: Partial<Tender>) => void;
  toggleWatchlist: (id: string) => void;
  excludeTender: (id: string) => void;
  restoreTender: (id: string) => void;
  showExcluded: boolean;
  setShowExcluded: (show: boolean) => void;
  excludedCount: number;
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
  const cachedOnMount = loadCachedTenders();
  const [allTenders, setAllTenders] = useState<Tender[]>(cachedOnMount);
  const [regions, setRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(cachedOnMount.length === 0);
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
  const [scoreFilter, setScoreFilter] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [showExcluded, setShowExcluded] = useState(false);
  const minDeadlineBufferActive = useMemo(() => isMinDeadlineBufferActive(), []);
  const minDeadlineBufferExpiryLabel = useMemo(() => getMinDeadlineBufferExpiryLabel(), []);
  const [minLeadDaysFilter, setMinLeadDaysFilter] = useState(minDeadlineBufferActive);
  const [workflowHistory, setWorkflowHistory] = useState<WorkflowHistoryEntry[]>(() =>
    loadWorkflowHistory(),
  );
  const savedRef = useRef<Tender[]>(cachedOnMount);

  const refreshTenders = useCallback(async () => {
    const hasCache = savedRef.current.length > 0;
    if (!hasCache) setLoading(true);
    setError(null);
    try {
      const dbResult = await fetchTendersFromDb();
      const usingSupabase = dbResult.kind === 'ok';
      setSupabaseSkipped(dbResult.kind === 'skipped');

      const mobile = isMobileDevice();
      const searchTimeout = mobile ? MOBILE_LIVE_SEARCH_TIMEOUT_MS : LIVE_SEARCH_TIMEOUT_MS;
      const result: GlobalSearchResult = usingSupabase
        ? dbResult.data
        : await withTimeout(
            searchGlobalTenders({ mobile }),
            searchTimeout,
            'Live-Suche Zeitüberschreitung – Teilergebnisse aus Cache',
          );

      const scored = processTendersFromSource(result.tenders, withoutDemoTenders(savedRef.current));
      const merged = scored.map((t) => (shouldAutoWatchlist(t) ? { ...t, watchlist: true } : t));
      setAllTenders(merged);
      savedRef.current = merged;
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
      setApiWarning(demoWarning ?? supabaseHint);
      setLastFetched(new Date());
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
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshTenders(); }, [refreshTenders]);
  useEffect(() => {
    const interval = setInterval(refreshTenders, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [refreshTenders]);
  useEffect(() => { saveTenders(allTenders); savedRef.current = allTenders; }, [allTenders]);
  useEffect(() => { saveWorkflowHistory(workflowHistory); }, [workflowHistory]);

  const activeTenders = useMemo(
    () => allTenders.filter((t) => !t.excluded && tenderMatchesPHT(t)),
    [allTenders],
  );

  const effectiveLeadDaysFilter = minDeadlineBufferActive && minLeadDaysFilter;

  const hiddenByLeadDaysCount = useMemo(
    () => (effectiveLeadDaysFilter
      ? activeTenders.filter((t) => isSubmissionDeadlineTooSoon(t)).length
      : 0),
    [activeTenders, effectiveLeadDaysFilter],
  );

  const visibleTenders = useMemo(() => {
    if (!effectiveLeadDaysFilter) return activeTenders;
    return activeTenders.filter((t) => meetsMinSubmissionLead(t));
  }, [activeTenders, effectiveLeadDaysFilter]);

  const tenders = useMemo(() => {
    let result = showExcluded ? allTenders : visibleTenders;
    if (regionFilter !== 'all') result = result.filter((t) => t.region === regionFilter);
    if (countryFilter !== 'all') result = result.filter((t) => t.country.toLowerCase().includes(countryFilter.toLowerCase()));
    if (sourcePlatformFilter !== 'all') {
      result = result.filter((t) => t.sourcePlatform === sourcePlatformFilter);
    }
    if (categoryFilter !== 'all') result = result.filter((t) => t.category === categoryFilter);
    if (scoreFilter > 0) result = result.filter((t) => t.score >= scoreFilter);
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
    return result.sort((a, b) => b.score - a.score);
  }, [allTenders, visibleTenders, showExcluded, regionFilter, countryFilter, sourcePlatformFilter, categoryFilter, scoreFilter, searchQuery]);

  const excludedCount = useMemo(
    () => allTenders.filter((t) => t.excluded).length,
    [allTenders],
  );

  const updateTender = useCallback((id: string, updates: Partial<Tender>) => {
    setAllTenders((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const toggleWatchlist = useCallback((id: string) => {
    setAllTenders((prev) => prev.map((t) => (t.id === id ? { ...t, watchlist: !t.watchlist } : t)));
  }, []);

  const excludeTender = useCallback((id: string) => {
    setAllTenders((prev) => prev.map((t) => (t.id === id ? { ...t, excluded: true, watchlist: false } : t)));
  }, []);

  const restoreTender = useCallback((id: string) => {
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
    const topChances = goTenders.filter((t) => t.category === 'C').sort((a, b) => b.score - a.score).slice(0, 5);

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

  return (
    <TenderContext.Provider
      value={{
        tenders, allTenders, visibleTenders, reminders, stats, workflowHistory, workflowCounts,
        loading, error, dataSource, providerCount, bulkFreshnessLabel, bulkStale, tedSource, apiWarning, supabaseSkipped, isDemo, lastFetched, regions,
        searchQuery, countryFilter, regionFilter, sourcePlatformFilter, scoreFilter, categoryFilter,
        setSearchQuery, setCountryFilter, setRegionFilter, setSourcePlatformFilter, setScoreFilter, setCategoryFilter,
        refreshTenders, updateTender, toggleWatchlist, excludeTender, restoreTender,
        showExcluded, setShowExcluded, excludedCount,
        minLeadDaysFilter, setMinLeadDaysFilter, hiddenByLeadDaysCount,
        minDeadlineBufferActive, minDeadlineBufferExpiryLabel,
        setStatus, moveToStage, addToWorkflow,
        selectedTenderId, openTender, closeTender, selectedTender,
      }}
    >
      {children}
    </TenderContext.Provider>
  );
}

export function useTenders() {
  const ctx = useContext(TenderContext);
  if (!ctx) throw new Error('useTenders must be used within TenderProvider');
  return ctx;
}
