import {
  Crown, Download, Globe2, RefreshCw, Star, Target, TrendingUp, Zap,
} from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CommandKpiCard } from '../components/CommandKpiCard';
import { useTenders } from '../context/TenderContext';
import { buildPowerActions, computeWinPriority } from '../lib/powerEngine';
import { exportTendersCsv } from '../services/exportTenders';
import { coverageStats, mergeCountryCoverage } from '../data/countryCoverage';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, CardHeader } from '../components/ui/Card';

const urgencyVariant = {
  critical: 'danger' as const,
  high: 'warning' as const,
  medium: 'muted' as const,
  low: 'muted' as const,
};

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function CommandCenterPage() {
  const {
    allTenders, loading, refreshTenders, openTender, toggleWatchlist, addToWorkflow, dataSource,
  } = useTenders();
  const [searchParams] = useSearchParams();
  const urgentOnly = searchParams.get('urgent') === '1';

  const actions = useMemo(() => buildPowerActions(allTenders), [allTenders]);
  const visibleActions = urgentOnly
    ? actions.filter((a) => a.urgency === 'critical' || a.urgency === 'high')
    : actions;
  const topActions = visibleActions.slice(0, 15);

  const mustWin = useMemo(
    () => allTenders.filter((t) => computeWinPriority(t) >= 75 && t.scoreRecommendation === 'GO'),
    [allTenders],
  );

  const pipelineTenders = useMemo(
    () => allTenders.filter((t) => t.scoreRecommendation !== 'NO-GO' && t.status !== 'Verloren'),
    [allTenders],
  );

  const pipelineValue = pipelineTenders.reduce((s, t) => s + t.estimatedValue, 0);

  const won = allTenders.filter((t) => t.status === 'Gewonnen');
  const lost = allTenders.filter((t) => t.status === 'Verloren');
  const winRate = won.length + lost.length > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;

  const urgentTenders = useMemo(() => {
    const ids = new Set(
      actions.filter((a) => a.urgency === 'critical' || a.urgency === 'high').map((a) => a.tenderId),
    );
    return allTenders.filter((t) => ids.has(t.id));
  }, [actions, allTenders]);

  const urgentCount = urgentTenders.length;

  const coverageGapCount = useMemo(() => {
    const merged = mergeCountryCoverage(allTenders);
    return coverageStats(merged).gaps;
  }, [allTenders]);

  useEffect(() => {
    const focus = searchParams.get('focus');
    if (focus === 'must-win') scrollToId('must-win');
    if (focus === 'actions') scrollToId('top-actions');
  }, [searchParams]);

  const pipelineSummary = {
    subject: `PHT Pipeline – ${(pipelineValue / 1e6).toFixed(1)}M €`,
    body: `Pipeline-Übersicht PHT Command Center\n\n` +
      `Deals: ${pipelineTenders.length}\n` +
      `Geschätzter Wert: ${(pipelineValue / 1e6).toFixed(1)} Mio. €\n` +
      `Must-Win: ${mustWin.length}\n` +
      `Sofort-Aktionen: ${urgentCount}\n\n` +
      `Top 10 nach Wert:\n` +
      pipelineTenders
        .sort((a, b) => b.estimatedValue - a.estimatedValue)
        .slice(0, 10)
        .map((t, i) => `${i + 1}. ${t.title} – ${t.revenuePotential} (${t.deadline})`)
        .join('\n'),
  };

  const winRateSummary = {
    subject: `PHT Win-Rate – ${winRate}%`,
    body: `Win-Rate Report\n\nGewonnen: ${won.length}\nVerloren: ${lost.length}\nWin-Rate: ${winRate}%\n\n` +
      (won.length > 0
        ? `Gewonnene Deals:\n${won.map((t) => `• ${t.title}`).join('\n')}`
        : 'Noch keine gewonnenen Deals im Workflow erfasst.'),
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Crown className="w-7 h-7 text-amber-400" />
            Command Center
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Win-Priorität · Sofort-Aktionen · Marktführer-Modus · {dataSource ?? 'lädt…'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            to="/coverage?status=gap"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-sm text-red-300 hover:bg-red-500/10"
          >
            <Globe2 className="w-4 h-4" />
            {coverageGapCount} Länder-Lücken
          </Link>
          <button
            type="button"
            onClick={() => exportTendersCsv(allTenders)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dark-500 text-sm text-slate-300 hover:bg-dark-700"
          >
            <Download className="w-4 h-4" /> CSV Export
          </button>
          <button
            type="button"
            onClick={() => refreshTenders()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pht-600 text-white text-sm font-medium hover:bg-pht-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Scan
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <CommandKpiCard
          label="Must-Win (≥75)"
          value={mustWin.length}
          valueClass="text-amber-400"
          onSelect={() => scrollToId('must-win')}
          tenders={mustWin}
        />
        <CommandKpiCard
          label="Pipeline-Wert"
          value={`${(pipelineValue / 1e6).toFixed(1)}M €`}
          to="/tenders?pipeline=1"
          tenders={pipelineTenders.slice(0, 20)}
          summaryEmail={pipelineSummary}
        />
        <CommandKpiCard
          label="Win-Rate"
          value={`${winRate}%`}
          subtext={`${won.length}G / ${lost.length}V`}
          valueClass="text-emerald-400"
          to="/workflow"
          summaryEmail={winRateSummary}
        />
        <CommandKpiCard
          label="Sofort-Aktionen"
          value={urgentCount}
          valueClass="text-red-400"
          to="/command?urgent=1&focus=actions"
          tenders={urgentTenders}
        />
      </div>

      <div id="top-actions">
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-pht-400" />
            Top-Aktionen (Win-Priorität)
            {urgentOnly && <Badge variant="danger">nur dringend</Badge>}
          </h2>
          <div className="flex items-center gap-3">
            {urgentOnly && (
              <Link to="/command" className="text-xs text-slate-500 hover:text-white">Alle anzeigen</Link>
            )}
            <Link to="/workflow" className="text-xs text-pht-400 hover:text-pht-300">Workflow →</Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {topActions.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">Keine Aktionen – Daten aktualisieren oder Filter prüfen.</p>
          ) : (
            topActions.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-dark-500/50 hover:border-pht-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-dark-600 flex flex-col items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-pht-400">{a.winPriority}</span>
                  <span className="text-[8px] text-slate-600">WIN</span>
                </div>
                <button type="button" onClick={() => openTender(a.tenderId)} className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-white truncate">{a.title}</p>
                  <p className="text-xs text-slate-500">{a.country} · {a.revenue} · {a.daysLeft}T · Score {a.score}</p>
                  <p className="text-xs text-pht-300 mt-0.5">{a.action}</p>
                </button>
                <div className="flex flex-col gap-1 shrink-0">
                  <Badge variant={urgencyVariant[a.urgency]}>{a.urgency}</Badge>
                  <button type="button" onClick={() => addToWorkflow(a.tenderId)} className="text-[10px] text-slate-500 hover:text-pht-400">+ Workflow</button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div id="must-win">
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-red-400" /> Must-Win Deals</h2></CardHeader>
          <CardContent className="space-y-2">
            {mustWin.length === 0 ? (
              <p className="text-sm text-slate-500">Keine Must-Win Deals aktuell.</p>
            ) : (
              mustWin.slice(0, 8).map((t) => (
                <button key={t.id} type="button" onClick={() => openTender(t.id)}
                  className="w-full text-left p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/40">
                  <p className="text-sm text-white font-medium line-clamp-1">{t.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{t.revenuePotential} · Win {computeWinPriority(t)}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> Quick Wins</h2>
            <Link to="/tenders?filter=top" className="text-xs text-pht-400 hover:text-pht-300">Alle Top-Chancen →</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {allTenders
              .filter((t) => t.score >= 70 && t.category === 'C' && t.scoreRecommendation === 'GO')
              .sort((a, b) => b.estimatedValue - a.estimatedValue)
              .slice(0, 8)
              .map((t) => (
                <div key={t.id} className="flex items-center gap-2 p-3 rounded-lg border border-dark-500/40">
                  <button type="button" onClick={() => openTender(t.id)} className="flex-1 min-w-0 text-left">
                    <p className="text-sm text-white truncate">{t.title}</p>
                    <p className="text-xs text-slate-500">{t.revenuePotential}</p>
                  </button>
                  <button type="button" onClick={() => toggleWatchlist(t.id)} className="p-1 text-amber-400">
                    <Star className={`w-4 h-4 ${t.watchlist ? 'fill-current' : ''}`} />
                  </button>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
