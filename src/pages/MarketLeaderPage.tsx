import {
  Flag, Mail, Rocket, Target, TrendingUp, Trophy, Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { useTenders } from '../context/TenderContext';
import { buildPowerActions } from '../lib/powerEngine';
import { computeFunnel, computeMarketLeaderMetrics } from '../services/analyticsEngine';
import { sendDailyDigest } from '../services/digestService';
import { hasUsedQuotes } from './QuotePage';
import {
  loadGoals, saveGoals, QUARTERLY_MILESTONES, yearProgressPct, type MarketLeaderGoals,
} from '../services/marketLeaderGoals';
import { loadAlertRules } from '../services/alertRules';

function ProgressBar({ label, current, target, unit, color }: {
  label: string; current: number; target: number; unit: string; color: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-white">{current.toLocaleString('de-DE')}{unit} / {target.toLocaleString('de-DE')}{unit} ({pct}%)</span>
      </div>
      <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function MarketLeaderPage() {
  const { allTenders, stats, loading, openTender } = useTenders();
  const [goals, setGoals] = useState<MarketLeaderGoals>(loadGoals);
  const [digestMsg, setDigestMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const metrics = useMemo(() => computeMarketLeaderMetrics(allTenders), [allTenders]);
  const funnel = useMemo(() => computeFunnel(allTenders), [allTenders]);
  const maxFunnel = Math.max(...funnel.map((f) => f.count), 1);
  const topActions = useMemo(() => buildPowerActions(allTenders).slice(0, 5), [allTenders]);

  const dachCount = allTenders.filter((t) => t.region === 'DACH').length;
  const milestoneCtx = {
    tenderCount: allTenders.length,
    goCount: stats.goCount,
    wonCount: metrics.wonCount,
    workflowActive: stats.workflowActive,
    dachCount,
    hasAlertRules: loadAlertRules().some((r) => r.enabled),
    hasQuotes: hasUsedQuotes(),
  };

  const yearPct = yearProgressPct(goals.startDate);

  const save = (patch: Partial<MarketLeaderGoals>) => {
    const next = { ...goals, ...patch };
    setGoals(next);
    saveGoals(next);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-400" />
            Marktführer 12-Monats-Plan
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Roadmap · KPIs · Quartals-Meilensteine · {yearPct}% des Jahres vergangen
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => setDigestMsg((await sendDailyDigest(allTenders)).message)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-sky-500/40 text-sm text-sky-300 hover:bg-sky-500/10"
          >
            <Mail className="w-4 h-4" /> Tages-Digest senden
          </button>
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="px-4 py-2 rounded-lg border border-dark-500 text-sm text-slate-300 hover:bg-dark-700"
          >
            Ziele anpassen
          </button>
        </div>
      </header>

      {digestMsg && <p className="text-xs text-slate-500 mb-4">{digestMsg}</p>}

      {editing && (
        <Card className="mb-6">
          <CardContent className="py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="text-xs text-slate-400">
              Umsatzziel (€/Jahr)
              <input type="number" value={goals.annualRevenueTarget} onChange={(e) => save({ annualRevenueTarget: Number(e.target.value) })}
                className="mt-1 w-full px-2 py-1.5 rounded border border-dark-500 bg-dark-700 text-white text-sm" />
            </label>
            <label className="text-xs text-slate-400">
              Win-Rate Ziel (%)
              <input type="number" value={goals.winRateTarget} onChange={(e) => save({ winRateTarget: Number(e.target.value) })}
                className="mt-1 w-full px-2 py-1.5 rounded border border-dark-500 bg-dark-700 text-white text-sm" />
            </label>
            <label className="text-xs text-slate-400">
              Angebote/Monat Ziel
              <input type="number" value={goals.monthlyBidsTarget} onChange={(e) => save({ monthlyBidsTarget: Number(e.target.value) })}
                className="mt-1 w-full px-2 py-1.5 rounded border border-dark-500 bg-dark-700 text-white text-sm" />
            </label>
            <label className="text-xs text-slate-400">
              DACH-Anteil Ziel (%)
              <input type="number" value={goals.dachShareTarget} onChange={(e) => save({ dachShareTarget: Number(e.target.value) })}
                className="mt-1 w-full px-2 py-1.5 rounded border border-dark-500 bg-dark-700 text-white text-sm" />
            </label>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link to="/command" className="block">
          <Card className="h-full hover:border-amber-500/40 transition-colors">
            <CardContent className="py-4">
              <p className="text-xs text-slate-500">Umsatz vs. Ziel</p>
              <p className="text-2xl font-bold text-amber-400">{metrics.revenueVsTarget}%</p>
              <p className="text-[10px] text-slate-600">{(metrics.wonRevenue / 1e6).toFixed(2)}M € gewonnen</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/workflow" className="block">
          <Card className="h-full hover:border-emerald-500/40 transition-colors">
            <CardContent className="py-4">
              <p className="text-xs text-slate-500">Win-Rate</p>
              <p className="text-2xl font-bold text-emerald-400">{metrics.winRate}%</p>
              <p className="text-[10px] text-slate-600">{metrics.wonCount}G / {metrics.lostCount}V</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/tenders?pipeline=1" className="block">
          <Card className="h-full hover:border-pht-500/40 transition-colors">
            <CardContent className="py-4">
              <p className="text-xs text-slate-500">Pipeline</p>
              <p className="text-2xl font-bold text-white">{(metrics.pipelineValue / 1e6).toFixed(1)}M €</p>
              <p className="text-[10px] text-slate-600">{metrics.submittedCount} abgegeben</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/tenders?region=DACH" className="block">
          <Card className="h-full hover:border-sky-500/40 transition-colors">
            <CardContent className="py-4">
              <p className="text-xs text-slate-500">DACH-Anteil</p>
              <p className="text-2xl font-bold text-sky-400">{metrics.dachShare}%</p>
              <p className="text-[10px] text-slate-600">Ziel {goals.dachShareTarget}%</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-white flex items-center gap-2"><Target className="w-4 h-4 text-pht-400" /> Jahresziele</h2></CardHeader>
          <CardContent className="space-y-4">
            <ProgressBar label="Umsatz" current={metrics.wonRevenue} target={goals.annualRevenueTarget} unit=" €" color="bg-amber-500" />
            <ProgressBar label="Win-Rate" current={metrics.winRate} target={goals.winRateTarget} unit="%" color="bg-emerald-500" />
            <ProgressBar label="Angebote/Monat" current={metrics.monthlyBidsRate} target={goals.monthlyBidsTarget} unit="" color="bg-pht-500" />
            <ProgressBar label="DACH-Markt" current={metrics.dachShare} target={goals.dachShareTarget} unit="%" color="bg-sky-500" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-white flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> Sales-Funnel</h2></CardHeader>
          <CardContent className="space-y-2">
            {funnel.map((step) => (
              <Link key={step.stage} to={`/workflow?stage=${encodeURIComponent(step.stage)}`} className="block rounded-lg p-1 -m-1 hover:bg-dark-600/40 transition-colors">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-slate-400">{step.stage}</span>
                  <span className="text-white">{step.count} · {(step.value / 1e6).toFixed(1)}M €</span>
                </div>
                <div className="h-1.5 bg-dark-600 rounded-full overflow-hidden">
                  <div className="h-full bg-pht-500" style={{ width: `${(step.count / maxFunnel) * 100}%` }} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {QUARTERLY_MILESTONES.map((q) => {
          const done = q.items.filter((i) => i.autoCheck(milestoneCtx)).length;
          return (
            <Card key={q.quarter}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-semibold text-white">{q.quarter}</h2>
                  <span className="text-xs text-pht-400">{done}/{q.items.length}</span>
                </div>
                <p className="text-xs text-slate-500">{q.title}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {q.items.map((item) => {
                  const ok = item.autoCheck(milestoneCtx);
                  return (
                    <div key={item.id} className={`flex items-center gap-2 text-xs ${ok ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <span>{ok ? '✓' : '○'}</span>
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-red-400" /> Diese Woche priorisieren</h2>
          <Link to="/command" className="text-xs text-pht-400">Command Center →</Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-sm text-slate-500">Lädt…</p>
          ) : topActions.length === 0 ? (
            <p className="text-sm text-slate-500">Scan starten für neue Chancen.</p>
          ) : (
            topActions.map((a) => (
              <button key={a.id} type="button" onClick={() => openTender(a.tenderId)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-dark-500/50 hover:border-pht-500/30 hover:bg-dark-600/30 transition-colors text-left">
                <span className="text-sm font-bold text-amber-400 w-8">{a.winPriority}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{a.title}</p>
                  <p className="text-xs text-pht-300">{a.action}</p>
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/quote', label: 'Angebotsrechner', icon: Rocket },
          { to: '/alerts', label: 'Alert-Regeln', icon: Flag },
          { to: '/analytics', label: 'Analytics', icon: TrendingUp },
          { to: '/workflow', label: 'Workflow', icon: Target },
        ].map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="p-4 rounded-xl border border-dark-500/50 bg-dark-700/30 hover:border-pht-500/30 text-center transition-colors">
            <Icon className="w-5 h-5 text-pht-400 mx-auto mb-2" />
            <span className="text-xs text-white font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
