import { Download, ExternalLink, RefreshCw, Search, Star } from 'lucide-react';
import { exportTendersCsv } from '../services/exportTenders';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTenders } from '../context/TenderContext';
import type { GoNoGo, ScoreRecommendation } from '../types/tender';
import { Badge } from './ui/Badge';
import { Card, CardContent } from './ui/Card';

const recVariant = { GO: 'success' as const, 'PRÜFEN': 'warning' as const, 'NO-GO': 'danger' as const };
const catVariant = { A: 'muted' as const, B: 'warning' as const, C: 'danger' as const };

export function TenderList() {
  const {
    tenders, allTenders, toggleWatchlist, loading, error, dataSource, lastFetched,
    searchQuery, setSearchQuery, countryFilter, setCountryFilter,
    regionFilter, setRegionFilter, scoreFilter, setScoreFilter,
    categoryFilter, setCategoryFilter, regions, refreshTenders, tedSource, apiWarning, openTender,
  } = useTenders();

  const [searchParams] = useSearchParams();
  const [goFilter, setGoFilter] = useState<GoNoGo | 'all'>('all');
  const [recoFilter, setRecoFilter] = useState<ScoreRecommendation | 'all'>('all');

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
  const [refreshing, setRefreshing] = useState(false);
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

  const handleRefresh = async () => { setRefreshing(true); await refreshTenders(); setRefreshing(false); };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Globale Ausschreibungssuche</h1>
          <p className="text-slate-400 mt-1 text-sm">
            {loading ? 'Lade TED API…' : `${filtered.length} Treffer`} · {dataSource ?? '—'}
            {tedSource === 'ted-api' ? ' · Live TED' : tedSource === 'ted-error' ? ' · TED nicht erreichbar' : ''}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            Weltweit (PHT-Filter) · ohne USA &amp; Asien
            {lastFetched && ` · Aktualisiert: ${lastFetched.toLocaleString('de-DE')}`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={() => exportTendersCsv(filtered)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dark-500 text-sm text-slate-300 hover:bg-dark-700">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={handleRefresh} disabled={loading || refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-pht-600 text-white text-sm font-medium hover:bg-pht-700 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${refreshing || loading ? 'animate-spin' : ''}`} /> Neue Suche starten
          </button>
        </div>
      </header>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>}
      {apiWarning && !error && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">
          {apiWarning}
        </div>
      )}

      <div className="flex flex-col gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" placeholder="Land, Keyword oder Budget (z.B. 100k)…" value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-dark-500 bg-dark-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pht-500/30" />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-dark-500 bg-dark-700 text-sm text-slate-300">
            <option value="all">Alle Regionen</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-dark-500 bg-dark-700 text-sm text-slate-300">
            <option value="all">Alle Länder</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
            className="px-3 py-2 rounded-lg border border-dark-500 bg-dark-700 text-sm text-slate-300">
            <option value="all">Alle Kategorien</option>
            <option value="A">A (0–10k)</option>
            <option value="B">B (10–50k)</option>
            <option value="C">C (&gt;50k)</option>
          </select>
          <select value={scoreFilter} onChange={(e) => setScoreFilter(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-dark-500 bg-dark-700 text-sm text-slate-300">
            <option value={0}>Alle Scores</option>
            <option value={40}>Score ≥ 40</option>
            <option value={60}>Score ≥ 60</option>
            <option value={70}>Score ≥ 70 (GO)</option>
          </select>
          <select value={goFilter} onChange={(e) => setGoFilter(e.target.value as GoNoGo | 'all')}
            className="px-3 py-2 rounded-lg border border-dark-500 bg-dark-700 text-sm text-slate-300">
            <option value="all">Alle Bewertungen</option>
            <option value="GO">GO</option>
            <option value="NO-GO">NO-GO</option>
          </select>
        </div>
      </div>

      {loading && allTenders.length === 0 ? (
        <div className="text-center py-16"><RefreshCw className="w-8 h-8 text-pht-500 animate-spin mx-auto mb-3" /><p className="text-slate-500">Globale Daten werden geladen…</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <Card key={t.id}>
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <button onClick={() => toggleWatchlist(t.id)} className={`mt-1 p-1 rounded ${t.watchlist ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}>
                    <Star className={`w-5 h-5 ${t.watchlist ? 'fill-current' : ''}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <button type="button" onClick={() => openTender(t.id)} className="text-left"><h3 className="font-medium text-white hover:text-pht-400 transition-colors">{t.title}</h3></button>
                        <p className="text-sm text-slate-500 mt-1">{t.country} · {t.region} · {t.sourcePlatform} · {t.revenuePotential}</p>
                        <p className="text-xs text-slate-600 mt-1">Deadline {t.deadline} · {t.productMatch.main}</p>
                        <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-pht-400 hover:text-pht-300 mt-2">
                          <ExternalLink className="w-3 h-3" /> {t.sourcePlatform}
                        </a>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge variant="score">{t.score}/100</Badge>
                        <Badge variant={recVariant[t.scoreRecommendation]}>{t.scoreRecommendation}</Badge>
                        <Badge variant={catVariant[t.category]}>{t.category}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-slate-400 font-medium">
                {allTenders.length === 0 ? 'Keine Live-Ausschreibungen geladen' : 'Keine passenden Ausschreibungen gefunden'}
              </p>
              <p className="text-sm text-slate-600 mt-2">
                {allTenders.length === 0
                  ? 'APIs prüfen oder „Neue Suche starten“ klicken.'
                  : 'Filter anpassen oder Daten aktualisieren.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
