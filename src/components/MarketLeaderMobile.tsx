import {
  Flag, Mail, Rocket, Target, TrendingUp, Trophy, Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from './ui/Card';
import { useTenders } from '../context/TenderContext';
import { buildPowerActions } from '../lib/powerEngine';
import { computeFunnel, computeMarketLeaderMetrics } from '../services/analyticsEngine';
import { sendDailyDigest } from '../services/digestService';
import { hasUsedQuotes } from '../pages/QuotePage';
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
        <span className="text-white text-[10px]">{current.toLocaleString('de-DE')}{unit} / {target.toLocaleString('de-DE')}{unit}</span>
      </div>
      <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function MarketLeaderMobile() {
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
    <div className="p-4 space-y-4 pb-24">
      <header>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          Marktführer-Plan
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">12 Monate · {yearPct}% vergangen</p>
      </header>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
        <button
          type="button"
          onClick={async () => setDigestMsg((await sendDailyDigest(allTenders)).message)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-sky-500/40 text-xs text-sky-300 min-h-[44px]"
        >
          <Mail className="w-4 h-4" /> Digest
        </button>
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className="shrink-0 px-3 py-2.5 rounded-xl border border-dark-500 text-xs text-slate-300 min-h-[44px]"
        >
          Ziele {editing ? 'schließen' : 'anpassen'}
        </button>
      </div>
      {digestMsg && <p className="text-xs text-slate-500">{digestMsg}</p>}

      {editing && (
        <Card>
          <CardContent className="py-4 space-y-3">
            {[
              { key: 'annualRevenueTarget' as const, label: 'Umsatzziel (€/Jahr)' },
              { key: 'winRateTarget' as const, label: 'Win-Rate Ziel (%)' },
              { key: 'monthlyBidsTarget' as const, label: 'Angebote/Monat' },
              { key: 'dachShareTarget' as const, label: 'DACH-Anteil (%)' },
            ].map(({ key, label }) => (
              <label key={key} className="text-xs text-slate-400 block">
                {label}
                <input
                  type="number"
                  value={goals[key]}
                  onChange={(e) => save({ [key]: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-white text-sm min-h-[44px]"
                />
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link to="/command" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 min-h-[88px]">
          <p className="text-[10px] text-slate-500">Umsatz vs. Ziel</p>
          <p className="text-2xl font-bold text-amber-400">{metrics.revenueVsTarget}%</p>
        </Link>
        <Link to="/workflow" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 min-h-[88px]">
          <p className="text-[10px] text-slate-500">Win-Rate</p>
          <p className="text-2xl font-bold text-emerald-400">{metrics.winRate}%</p>
        </Link>
        <Link to="/tenders?pipeline=1" className="rounded-2xl border border-dark-500/60 bg-dark-700/50 p-4 min-h-[88px]">
          <p className="text-[10px] text-slate-500">Pipeline</p>
          <p className="text-2xl font-bold text-white">{(metrics.pipelineValue / 1e6).toFixed(1)}M €</p>
        </Link>
        <Link to="/tenders?region=DACH" className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 min-h-[88px]">
          <p className="text-[10px] text-slate-500">DACH-Anteil</p>
          <p className="text-2xl font-bold text-sky-400">{metrics.dachShare}%</p>
        </Link>
      </div>

      <details open className="group">
        <summary className="flex items-center gap-2 p-3 rounded-xl bg-dark-700/50 border border-dark-500/50 cursor-pointer min-h-[44px] list-none">
          <Target className="w-4 h-4 text-pht-400" />
          <span className="text-sm font-semibold text-white flex-1">Jahresziele</span>
          <span className="text-xs text-slate-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <Card className="mt-2">
          <CardContent className="py-4 space-y-3">
            <ProgressBar label="Umsatz" current={metrics.wonRevenue} target={goals.annualRevenueTarget} unit=" €" color="bg-amber-500" />
            <ProgressBar label="Win-Rate" current={metrics.winRate} target={goals.winRateTarget} unit="%" color="bg-emerald-500" />
            <ProgressBar label="Angebote/Monat" current={metrics.monthlyBidsRate} target={goals.monthlyBidsTarget} unit="" color="bg-pht-500" />
            <ProgressBar label="DACH-Markt" current={metrics.dachShare} target={goals.dachShareTarget} unit="%" color="bg-sky-500" />
          </CardContent>
        </Card>
      </details>

      <details className="group">
        <summary className="flex items-center gap-2 p-3 rounded-xl bg-dark-700/50 border border-dark-500/50 cursor-pointer min-h-[44px] list-none">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-white flex-1">Sales-Funnel</span>
          <span className="text-xs text-slate-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <Card className="mt-2">
          <CardContent className="py-4 space-y-2">
            {funnel.map((step) => (
              <Link key={step.stage} to={`/workflow?stage=${encodeURIComponent(step.stage)}`} className="block rounded-lg p-2 -m-2 min-h-[44px]">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-slate-400">{step.stage}</span>
                  <span className="text-white">{step.count}</span>
                </div>
                <div className="h-1.5 bg-dark-600 rounded-full overflow-hidden">
                  <div className="h-full bg-pht-500" style={{ width: `${(step.count / maxFunnel) * 100}%` }} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </details>

      {QUARTERLY_MILESTONES.map((q) => {
        const done = q.items.filter((i) => i.autoCheck(milestoneCtx)).length;
        return (
          <details key={q.quarter} className="group">
            <summary className="flex items-center gap-2 p-3 rounded-xl bg-dark-700/50 border border-dark-500/50 cursor-pointer min-h-[44px] list-none">
              <span className="text-sm font-semibold text-white flex-1">{q.quarter}</span>
              <span className="text-xs text-pht-400">{done}/{q.items.length}</span>
              <span className="text-xs text-slate-500 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <Card className="mt-2">
              <CardContent className="py-3 space-y-2">
                <p className="text-xs text-slate-500 mb-2">{q.title}</p>
                {q.items.map((item) => {
                  const ok = item.autoCheck(milestoneCtx);
                  return (
                    <div key={item.id} className={`flex items-center gap-2 text-xs min-h-[32px] ${ok ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <span>{ok ? '✓' : '○'}</span>
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </details>
        );
      })}

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-red-400" /> Diese Woche
            </h2>
            <Link to="/command" className="text-xs text-pht-400 min-h-[44px] flex items-center">Command →</Link>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">Lädt…</p>
          ) : topActions.length === 0 ? (
            <p className="text-sm text-slate-500">Scan starten für Chancen.</p>
          ) : (
            topActions.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => openTender(a.tenderId)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-dark-500/50 mb-2 min-h-[52px] text-left active:scale-[0.99]"
              >
                <span className="text-sm font-bold text-amber-400 w-8">{a.winPriority}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white line-clamp-2">{a.title}</p>
                  <p className="text-xs text-pht-300">{a.action}</p>
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        {[
          { to: '/quote', label: 'Angebotsrechner', icon: Rocket },
          { to: '/alerts', label: 'Alert-Regeln', icon: Flag },
          { to: '/analytics', label: 'Analytics', icon: TrendingUp },
          { to: '/workflow', label: 'Workflow', icon: Target },
        ].map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="p-3 rounded-xl border border-dark-500/50 bg-dark-700/30 text-center min-h-[72px] flex flex-col items-center justify-center active:scale-[0.97]">
            <Icon className="w-5 h-5 text-pht-400 mb-1" />
            <span className="text-[10px] text-white font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
