import {
  BarChart3, GitBranch, Globe2, Newspaper, Target, TrendingUp, Trophy,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GoalProgressBar } from '../components/GoalProgressBar';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { CardSkeleton } from '../components/ui/LoadingSkeleton';
import { useTenders } from '../context/TenderContext';
import { useViewMode } from '../context/ViewModeContext';
import { computePipelineMetrics, loadPipelineEntries } from '../services/salesPipelineStorage';
import { REVENUE_GOAL_EUR } from '../types/salesPipeline';
import { withFilteredNewsPayload } from '../lib/newsLeadFilters';

interface NewsLeadsData {
  leadCount: number;
  leads: { isMegaExpansion?: boolean }[];
}

function CssBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-medium">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-dark-600 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ExecutiveDashboardPage() {
  const { isMobileView } = useViewMode();
  const { visibleTenders, loading, stats } = useTenders();
  const [pipelineMetrics, setPipelineMetrics] = useState(() => computePipelineMetrics());
  const [newsCount, setNewsCount] = useState(0);
  const [megaCount, setMegaCount] = useState(0);

  const refreshPipeline = useCallback(() => {
    setPipelineMetrics(computePipelineMetrics(loadPipelineEntries()));
  }, []);

  useEffect(() => {
    refreshPipeline();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'pht_sales_pipeline') refreshPipeline();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refreshPipeline]);

  useEffect(() => {
    fetch('/data/leads/news-leads.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: NewsLeadsData | null) => {
        const filtered = data ? withFilteredNewsPayload(data) : null;
        if (filtered) {
          setNewsCount(filtered.leadCount ?? filtered.leads?.length ?? 0);
          setMegaCount(filtered.leads?.filter((l: { isMegaExpansion?: boolean }) => l.isMegaExpansion).length ?? 0);
        }
      })
      .catch(() => {});
  }, []);

  const weekAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }, []);

  const tendersThisWeek = useMemo(
    () => visibleTenders.filter((t) => !t.publicationDate || t.publicationDate >= weekAgo).length,
    [visibleTenders, weekAgo],
  );

  const wonTenders = visibleTenders.filter((t) => t.status === 'Gewonnen');
  const lostTenders = visibleTenders.filter((t) => t.status === 'Verloren');
  const workflowWinRate = wonTenders.length + lostTenders.length > 0
    ? Math.round((wonTenders.length / (wonTenders.length + lostTenders.length)) * 100)
    : 0;

  const goalProgress = pipelineMetrics.wonValue + pipelineMetrics.weightedForecast;

  return (
    <div className={`${isMobileView ? 'p-4' : 'p-6 lg:p-8'} max-w-7xl mx-auto`}>
      <header className={`${isMobileView ? 'mb-5' : 'mb-8'}`}>
        <h1 className={`${isMobileView ? 'text-xl' : 'text-2xl'} font-bold text-white flex items-center gap-2`}>
          <BarChart3 className="w-7 h-7 text-pht-400" />
          Executive Dashboard
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Pipeline · Forecast · Ziel 1 Mio. € · Ausschreibungen &amp; News-Leads
        </p>
      </header>

      {loading && visibleTenders.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <>
          <Card className="mb-6">
            <CardContent className="py-5">
              <GoalProgressBar
                current={goalProgress}
                goal={REVENUE_GOAL_EUR}
                label="Fortschritt zum 1-Mio.-€-Umsatzziel"
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-slate-500 flex items-center gap-1"><GitBranch className="w-3.5 h-3.5" /> Pipeline (aktiv)</p>
                <p className="text-2xl font-bold text-white mt-1">{(pipelineMetrics.pipelineValue / 1000).toFixed(0)}k €</p>
                <p className="text-xs text-slate-600">{pipelineMetrics.activeDeals} Deals</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-slate-500 flex items-center gap-1"><Target className="w-3.5 h-3.5" /> Gewichteter Forecast</p>
                <p className="text-2xl font-bold text-pht-300 mt-1">{(pipelineMetrics.weightedForecast / 1000).toFixed(0)}k €</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-slate-500 flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> Win-Rate</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{pipelineMetrics.winRate || workflowWinRate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-slate-500 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> GO-Chancen</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.highScoreCount}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-white">Aktivität diese Woche</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <CssBar label="Neue Ausschreibungen" value={tendersThisWeek} max={Math.max(tendersThisWeek, 20)} color="bg-sky-500" />
                <CssBar label="GO-Empfehlungen gesamt" value={stats.goCount} max={Math.max(stats.goCount, 30)} color="bg-emerald-500" />
                <CssBar label="News-Leads" value={newsCount} max={Math.max(newsCount, 10)} color="bg-amber-500" />
                <CssBar label="Mega-Expansion News" value={megaCount} max={Math.max(megaCount, 5)} color="bg-violet-500" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-white">Pipeline nach Stage</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                {(['Lead', 'Qualifiziert', 'Angebot', 'Verhandlung', 'Gewonnen'] as const).map((stage) => (
                  <CssBar
                    key={stage}
                    label={stage}
                    value={pipelineMetrics.byStage[stage] ?? 0}
                    max={Math.max(pipelineMetrics.activeDeals, 5)}
                    color="bg-pht-500"
                  />
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/pipeline" className="px-4 py-2 rounded-lg bg-pht-600 text-white text-sm hover:bg-pht-700">Pipeline öffnen</Link>
            <Link to="/command" className="px-4 py-2 rounded-lg border border-dark-500 text-slate-300 text-sm hover:bg-dark-700">Command Center</Link>
            <Link to="/opportunities" className="px-4 py-2 rounded-lg border border-dark-500 text-slate-300 text-sm hover:bg-dark-700 flex items-center gap-1">
              <Globe2 className="w-4 h-4" /> Opportunities
            </Link>
            <Link to="/plan" className="px-4 py-2 rounded-lg border border-dark-500 text-slate-300 text-sm hover:bg-dark-700 flex items-center gap-1">
              <Newspaper className="w-4 h-4" /> Marktführer-Plan
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
