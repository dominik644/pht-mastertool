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
import { searchGlobalTenders } from '../lib/globalTenderSearch';
import { scoreGlobalTenders } from '../lib/phtScoring';
import { adaptGlobalTenders, mergeTenderState } from '../lib/tenderAdapter';
import { getAllReminders } from '../services/reminders';
import { loadTenders, saveTenders } from '../services/storage';
import { createHistoryEntry, getSuggestedAction, groupTendersByStatus } from '../services/workflow';
import { loadWorkflowHistory, saveWorkflowHistory } from '../services/workflowStorage';
import type { Category, DashboardStats, PipelineStatus, Tender } from '../types/tender';
import type { WorkflowHistoryEntry } from '../types/workflow';

const AUTO_REFRESH_MS = 6 * 60 * 60 * 1000;

interface TenderContextValue {
  tenders: Tender[];
  allTenders: Tender[];
  reminders: ReturnType<typeof getAllReminders>;
  stats: DashboardStats;
  workflowHistory: WorkflowHistoryEntry[];
  workflowCounts: Record<PipelineStatus, number>;
  loading: boolean;
  error: string | null;
  dataSource: string | null;
  tedSource: string | null;
  apiWarning: string | null;
  lastFetched: Date | null;
  regions: string[];
  searchQuery: string;
  countryFilter: string;
  regionFilter: string;
  scoreFilter: number;
  categoryFilter: Category | 'all';
  setSearchQuery: (q: string) => void;
  setCountryFilter: (c: string) => void;
  setRegionFilter: (r: string) => void;
  setScoreFilter: (s: number) => void;
  setCategoryFilter: (c: Category | 'all') => void;
  refreshTenders: () => Promise<void>;
  updateTender: (id: string, updates: Partial<Tender>) => void;
  toggleWatchlist: (id: string) => void;
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
  const [allTenders, setAllTenders] = useState<Tender[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string | null>(null);
  const [tedSource, setTedSource] = useState<string | null>(null);
  const [apiWarning, setApiWarning] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [workflowHistory, setWorkflowHistory] = useState<WorkflowHistoryEntry[]>(() =>
    loadWorkflowHistory(),
  );
  const savedRef = useRef<Tender[]>(loadTenders([]));

  const refreshTenders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchGlobalTenders();
      const scored = scoreGlobalTenders(result.tenders);
      const analyzed = adaptGlobalTenders(scored);
      const merged = mergeTenderState(analyzed, savedRef.current);
      setAllTenders(merged);
      savedRef.current = merged;
      setRegions(result.regions);
      setDataSource(result.source);
      setTedSource(result.tedSource ?? null);
      setIsDemo(result.isDemo ?? false);
      setApiWarning(result.isDemo ? (result.error ?? 'Demo-Modus aktiv') : (result.error ?? null));
      setLastFetched(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Globale Suche fehlgeschlagen');
      setApiWarning(null);
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

  const tenders = useMemo(() => {
    let result = allTenders;
    if (regionFilter !== 'all') result = result.filter((t) => t.region === regionFilter);
    if (countryFilter !== 'all') result = result.filter((t) => t.country.toLowerCase().includes(countryFilter.toLowerCase()));
    if (categoryFilter !== 'all') result = result.filter((t) => t.category === categoryFilter);
    if (scoreFilter > 0) result = result.filter((t) => t.score >= scoreFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.country.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          String(t.estimatedValue).includes(q.replace(/\D/g, '')),
      );
    }
    return result.sort((a, b) => b.score - a.score);
  }, [allTenders, regionFilter, countryFilter, categoryFilter, scoreFilter, searchQuery]);

  const updateTender = useCallback((id: string, updates: Partial<Tender>) => {
    setAllTenders((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const toggleWatchlist = useCallback((id: string) => {
    setAllTenders((prev) => prev.map((t) => (t.id === id ? { ...t, watchlist: !t.watchlist } : t)));
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

  const reminders = useMemo(() => getAllReminders(allTenders), [allTenders]);
  const workflowTenders = useMemo(() => allTenders.filter((t) => t.scoreRecommendation !== 'NO-GO'), [allTenders]);

  const workflowCounts = useMemo(() => {
    const grouped = groupTendersByStatus(workflowTenders);
    return Object.fromEntries(Object.entries(grouped).map(([k, v]) => [k, v.length])) as Record<PipelineStatus, number>;
  }, [workflowTenders]);

  const stats = useMemo((): DashboardStats => {
    const today = new Date().toISOString().slice(0, 10);
    const goTenders = allTenders.filter((t) => t.scoreRecommendation === 'GO');
    const topChances = goTenders.filter((t) => t.category === 'C').sort((a, b) => b.score - a.score).slice(0, 5);

    const profileDistribution: Record<string, number> = {};
    for (const t of allTenders) {
      const p = t.productMatch.profiles?.[0]?.name ?? 'Sonstige';
      profileDistribution[p] = (profileDistribution[p] ?? 0) + 1;
    }

    return {
      total: allTenders.length,
      newCount: allTenders.filter((t) => t.status === 'Neu').length,
      categoryA: allTenders.filter((t) => t.category === 'A').length,
      categoryB: allTenders.filter((t) => t.category === 'B').length,
      categoryC: allTenders.filter((t) => t.category === 'C').length,
      goCount: allTenders.filter((t) => t.scoreRecommendation === 'GO').length,
      noGoCount: allTenders.filter((t) => t.scoreRecommendation === 'NO-GO').length,
      pruefenCount: allTenders.filter((t) => t.scoreRecommendation === 'PRÜFEN').length,
      highScoreCount: allTenders.filter((t) => t.score >= 60).length,
      watchlistCount: allTenders.filter((t) => t.watchlist).length,
      deadlinesUnder14: allTenders.filter((t) => {
        const days = differenceInDays(parseISO(t.deadline), new Date());
        return days >= 0 && days <= 14 && t.scoreRecommendation !== 'NO-GO';
      }).length,
      newTodayCount: allTenders.filter((t) => t.publicationDate === today).length,
      topChances,
      workflowActive: workflowTenders.filter((t) => t.status !== 'Gewonnen' && t.status !== 'Verloren').length,
      workflowCounts,
      regions,
      profileDistribution,
    };
  }, [allTenders, workflowTenders, workflowCounts, regions]);

  const selectedTender = useMemo(
    () => allTenders.find((t) => t.id === selectedTenderId) ?? null,
    [allTenders, selectedTenderId],
  );

  const openTender = useCallback((id: string) => setSelectedTenderId(id), []);
  const closeTender = useCallback(() => setSelectedTenderId(null), []);

  return (
    <TenderContext.Provider
      value={{
        tenders, allTenders, reminders, stats, workflowHistory, workflowCounts,
        loading, error, dataSource, tedSource, apiWarning, isDemo, lastFetched, regions,
        searchQuery, countryFilter, regionFilter, scoreFilter, categoryFilter,
        setSearchQuery, setCountryFilter, setRegionFilter, setScoreFilter, setCategoryFilter,
        refreshTenders, updateTender, toggleWatchlist, setStatus, moveToStage, addToWorkflow,
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
