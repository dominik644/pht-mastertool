import { Download, ExternalLink, Filter, RefreshCw, Search, Star, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTenders } from '../context/TenderContext';
import type { GoNoGo, ScoreRecommendation } from '../types/tender';
import { exportTendersCsv } from '../services/exportTenders';
import { Badge } from './ui/Badge';

const recVariant = { GO: 'success' as const, 'PRÜFEN': 'warning' as const, 'NO-GO': 'danger' as const };
const catVariant = { A: 'muted' as const, B: 'warning' as const, C: 'danger' as const };

const quickFilters = [
  { label: 'Alle', score: 0, reco: 'all' as const },
  { label: 'GO ≥70', score: 70, reco: 'GO' as const },
  { label: 'Prüfen', score: 0, reco: 'PRÜFEN' as const },
  { label: 'Kat. C', score: 0, reco: 'all' as const, category: 'C' as const },
];

export function TenderListMobile() {
  const {
    tenders, allTenders, toggleWatchlist, loading, error, dataSource, lastFetched,
    searchQuery, setSearchQuery, countryFilter, setCountryFilter,
    regionFilter, setRegionFilter, scoreFilter, setScoreFilter,
    categoryFilter, setCategoryFilter, regions, refreshTenders, tedSource, apiWarning, openTender,
  } = useTenders();

  const [searchParams] = useSearchParams();
  const [goFilter, setGoFilter] = useState<GoNoGo | 'all'>('all');
  const [recoFilter, setRecoFilter] = useState<ScoreRecommendation | 'all'>('all');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const score = searchParams.get('score');
    if (score) setScoreFilter(Number(score));
    const reco = searchParams.get('reco');
    if (reco === 'GO' || reco === 'PRÜFEN' || reco === 'NO-GO') setRecoFilter(reco);
    const cat = searchParams.get('category');
    if (cat === 'A' || cat === 'B' || cat === 'C') setCategoryFilter(cat);
    const region = searchParams.get('region');
    if (region) setRegionFilter(region);
    const q = searchParams.get('q');
    if (q) setSearchQuery(q);
  }, [searchParams, setScoreFilter, setCategoryFilter, setRegionFilter, setSearchQuery]);

  const isTopFilter = searchParams.get('filter') === 'top';
  const isNewFilter = searchParams.get('filter') === 'new';
  const isPipelineFilter = searchParams.get('pipeline') === '1';
  const today = new Date().toISOString().slice(0, 10);
  const countries = useMemo(() => [...new Set(allTenders.map((t) => t.country))].sort(), [allTenders]);

  const filtered = useMemo(() => {
    let result = tenders;
    if (isTopFilter) result = result.filter((t) => t.category === 'C' && t.scoreRecommendation === 'GO');
    if (isNewFilter) result = result.filter((t) => t.publicationDate >= today || t.status === 'Neu');
    if (isPipelineFilter) result = result.filter((t) => t.scoreRecommendation !== 'NO-GO' && t.status !== 'Verloren');
    if (goFilter !== 'all') result = result.filter((t) => t.goNoGo === goFilter);
    if (recoFilter !== 'all') result = result.filter((t) => t.scoreRecommendation === recoFilter);
    return result;
  }, [tenders, goFilter, recoFilter, isTopFilter, isNewFilter, isPipelineFilter, today]);

  const activeFilterCount = [
    regionFilter !== 'all',
    countryFilter !== 'all',
    categoryFilter !== 'all',
    scoreFilter > 0,
    goFilter !== 'all',
    recoFilter !== 'all',
  ].filter(Boolean).length;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshTenders();
    setRefreshing(false);
  };

  const applyQuickFilter = (qf: typeof quickFilters[number]) => {
    if ('category' in qf && qf.category) {
      setCategoryFilter(qf.category);
      setScoreFilter(0);
      setRecoFilter('all');
    } else if (qf.reco !== 'all') {
      setRecoFilter(qf.reco);
      setScoreFilter(qf.score);
    } else {
      setScoreFilter(qf.score);
      setRecoFilter('all');
      setCategoryFilter('all');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="text-xl font-bold text-white">Ausschreibungen</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {loading ? 'Lade…' : `${filtered.length} Treffer`} · {dataSource ?? '—'}
          {tedSource === 'ted-api' ? ' · Live' : ''}
        </p>
      </header>

      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>}
      {apiWarning && !error && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">{apiWarning}</div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="search"
            placeholder="Suchen…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-dark-500 bg-dark-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pht-500/30 min-h-[44px]"
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterSheetOpen(true)}
          className={`relative flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border ${
            activeFilterCount > 0 ? 'border-pht-500/50 bg-pht-600/10 text-pht-400' : 'border-dark-500 bg-dark-700 text-slate-400'
          }`}
          aria-label="Filter öffnen"
        >
          <Filter className="w-5 h-5" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pht-600 text-[10px] text-white flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl bg-pht-600 text-white disabled:opacity-50"
          aria-label="Aktualisieren"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing || loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 sticky top-0 z-10 py-1 bg-dark-900/95 backdrop-blur-sm">
        {quickFilters.map((qf) => {
          const isActive =
            (qf.label === 'Alle' && scoreFilter === 0 && recoFilter === 'all' && categoryFilter === 'all') ||
            (qf.label === 'GO ≥70' && scoreFilter === 70) ||
            (qf.label === 'Prüfen' && recoFilter === 'PRÜFEN') ||
            (qf.label === 'Kat. C' && categoryFilter === 'C');
          return (
            <button
              key={qf.label}
              type="button"
              onClick={() => applyQuickFilter(qf)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium min-h-[36px] border transition-colors ${
                isActive
                  ? 'bg-pht-600/20 border-pht-500/40 text-pht-400'
                  : 'bg-dark-700 border-dark-500 text-slate-400'
              }`}
            >
              {qf.label}
            </button>
          );
        })}
      </div>

      {loading && allTenders.length === 0 ? (
        <div className="text-center py-16">
          <RefreshCw className="w-8 h-8 text-pht-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Daten werden geladen…</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <article
              key={t.id}
              className="rounded-2xl border border-dark-500/60 bg-dark-700/40 overflow-hidden active:scale-[0.99] transition-transform"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleWatchlist(t.id)}
                    className={`p-2 -m-1 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center ${
                      t.watchlist ? 'text-amber-400' : 'text-slate-600'
                    }`}
                    aria-label={t.watchlist ? 'Von Watchlist entfernen' : 'Zur Watchlist'}
                  >
                    <Star className={`w-5 h-5 ${t.watchlist ? 'fill-current' : ''}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <button type="button" onClick={() => openTender(t.id)} className="text-left w-full">
                      <h3 className="font-medium text-white text-sm leading-snug line-clamp-2">{t.title}</h3>
                    </button>
                    <p className="text-xs text-slate-500 mt-1.5">{t.country} · {t.region}</p>
                    <p className="text-xs text-slate-600 mt-0.5">Deadline {t.deadline} · {t.revenuePotential}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      <Badge variant="score">{t.score}</Badge>
                      <Badge variant={recVariant[t.scoreRecommendation]}>{t.scoreRecommendation}</Badge>
                      <Badge variant={catVariant[t.category]}>Kat. {t.category}</Badge>
                    </div>
                  </div>
                </div>
                <a
                  href={t.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-pht-400 mt-3 min-h-[44px]"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> {t.sourcePlatform}
                </a>
              </div>
            </article>
          ))}
          {filtered.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-slate-400 font-medium text-sm">Keine Treffer gefunden</p>
              <p className="text-xs text-slate-600 mt-2">Filter anpassen oder Daten aktualisieren.</p>
            </div>
          )}
        </div>
      )}

      {lastFetched && (
        <p className="text-[10px] text-slate-600 text-center pb-2">
          Aktualisiert: {lastFetched.toLocaleString('de-DE')}
        </p>
      )}

      {filterSheetOpen && (
        <div className="fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-black/60" onClick={() => setFilterSheetOpen(false)} />
          <div
            className="absolute bottom-0 inset-x-0 max-h-[80vh] bg-dark-800 rounded-t-2xl border-t border-dark-500/60 flex flex-col"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-dark-500/50">
              <h2 className="text-sm font-semibold text-white">Filter</h2>
              <button type="button" onClick={() => setFilterSheetOpen(false)} className="p-2 text-slate-400 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4">
              <label className="block">
                <span className="text-xs text-slate-500 mb-1.5 block">Region</span>
                <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-dark-500 bg-dark-700 text-sm text-slate-300 min-h-[44px]">
                  <option value="all">Alle Regionen</option>
                  {regions.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-slate-500 mb-1.5 block">Land</span>
                <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-dark-500 bg-dark-700 text-sm text-slate-300 min-h-[44px]">
                  <option value="all">Alle Länder</option>
                  {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-slate-500 mb-1.5 block">Kategorie</span>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
                  className="w-full px-3 py-3 rounded-xl border border-dark-500 bg-dark-700 text-sm text-slate-300 min-h-[44px]">
                  <option value="all">Alle Kategorien</option>
                  <option value="A">A (0–10k)</option>
                  <option value="B">B (10–50k)</option>
                  <option value="C">C (&gt;50k)</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-slate-500 mb-1.5 block">Mindest-Score</span>
                <select value={scoreFilter} onChange={(e) => setScoreFilter(Number(e.target.value))}
                  className="w-full px-3 py-3 rounded-xl border border-dark-500 bg-dark-700 text-sm text-slate-300 min-h-[44px]">
                  <option value={0}>Alle Scores</option>
                  <option value={40}>Score ≥ 40</option>
                  <option value={60}>Score ≥ 60</option>
                  <option value={70}>Score ≥ 70 (GO)</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-slate-500 mb-1.5 block">Bewertung</span>
                <select value={goFilter} onChange={(e) => setGoFilter(e.target.value as GoNoGo | 'all')}
                  className="w-full px-3 py-3 rounded-xl border border-dark-500 bg-dark-700 text-sm text-slate-300 min-h-[44px]">
                  <option value="all">Alle Bewertungen</option>
                  <option value="GO">GO</option>
                  <option value="NO-GO">NO-GO</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-slate-500 mb-1.5 block">Empfehlung</span>
                <select value={recoFilter} onChange={(e) => setRecoFilter(e.target.value as ScoreRecommendation | 'all')}
                  className="w-full px-3 py-3 rounded-xl border border-dark-500 bg-dark-700 text-sm text-slate-300 min-h-[44px]">
                  <option value="all">Alle</option>
                  <option value="GO">GO</option>
                  <option value="PRÜFEN">PRÜFEN</option>
                  <option value="NO-GO">NO-GO</option>
                </select>
              </label>
            </div>
            <div className="p-4 border-t border-dark-500/50 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setRegionFilter('all');
                  setCountryFilter('all');
                  setCategoryFilter('all');
                  setScoreFilter(0);
                  setGoFilter('all');
                  setRecoFilter('all');
                }}
                className="flex-1 py-3 rounded-xl border border-dark-500 text-sm text-slate-400 min-h-[44px]"
              >
                Zurücksetzen
              </button>
              <button
                type="button"
                onClick={() => setFilterSheetOpen(false)}
                className="flex-1 py-3 rounded-xl bg-pht-600 text-white text-sm font-medium min-h-[44px]"
              >
                Anwenden
              </button>
            </div>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <button
          type="button"
          onClick={() => exportTendersCsv(filtered)}
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 z-30 flex items-center gap-2 px-4 py-3 rounded-full bg-dark-700 border border-dark-500 text-xs text-slate-300 shadow-lg min-h-[44px]"
        >
          <Download className="w-4 h-4" /> CSV
        </button>
      )}
    </div>
  );
}
