import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useTenders } from '../context/TenderContext';
import {
  competitorStats, computeFunnel, computeMarketLeaderMetrics, lossReasonStats,
} from '../services/analyticsEngine';
import { Card, CardContent } from './ui/Card';

function Bar({ label, value, max, color, suffix = '', to }: {
  label: string; value: number; max: number; color: string; suffix?: string; to?: string;
}) {
  const inner = (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-white">{value}{suffix}</span>
      </div>
      <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </div>
    </div>
  );
  if (to) {
    return (
      <Link to={to} className="block rounded-lg p-2 -m-2 active:bg-dark-600/40 min-h-[44px]">
        {inner}
      </Link>
    );
  }
  return inner;
}

function KpiTile({ label, value, valueClass, to }: {
  label: string; value: string | number; valueClass?: string; to: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-dark-500/60 bg-dark-700/50 p-4 active:scale-[0.97] transition-transform min-h-[88px]"
    >
      <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueClass ?? 'text-white'}`}>{value}</p>
    </Link>
  );
}

export function AnalyticsMobile() {
  const { stats, allTenders, loading, workflowHistory } = useTenders();
  const maxRegion = Math.max(...stats.regions.map((r) => allTenders.filter((t) => t.region === r).length), 1);

  const metrics = useMemo(() => computeMarketLeaderMetrics(allTenders), [allTenders]);
  const funnel = useMemo(() => computeFunnel(allTenders), [allTenders]);
  const maxFunnel = Math.max(...funnel.map((f) => f.count), 1);
  const losses = useMemo(() => lossReasonStats(allTenders), [allTenders]);
  const competitors = useMemo(() => competitorStats(allTenders), [allTenders]);
  const workflowMoves7d = workflowHistory.filter((h) => Date.now() - new Date(h.timestamp).getTime() < 7 * 86400000).length;

  const scoreBuckets = [
    { label: '0–39', count: allTenders.filter((t) => t.score < 40).length, color: 'bg-red-500', to: '/tenders?reco=NO-GO' },
    { label: '40–69', count: allTenders.filter((t) => t.score >= 40 && t.score < 70).length, color: 'bg-amber-500', to: '/tenders?reco=PRÜFEN' },
    { label: '70–100', count: allTenders.filter((t) => t.score >= 70).length, color: 'bg-emerald-500', to: '/tenders?reco=GO' },
  ];
  const maxScore = Math.max(...scoreBuckets.map((b) => b.count), 1);

  return (
    <div className="p-4 space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">KPIs & Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {loading ? 'lädt…' : `${stats.total} Ausschreibungen`}
          </p>
        </div>
        <Link to="/plan" className="text-xs text-pht-400 min-h-[44px] flex items-center px-2">12M-Plan →</Link>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <KpiTile label="Win-Rate" value={`${metrics.winRate}%`} valueClass="text-emerald-400" to="/workflow" />
        <KpiTile label="Gewonnen" value={`${(metrics.wonRevenue / 1e6).toFixed(2)}M €`} to="/workflow?stage=Gewonnen" />
        <KpiTile label="Pipeline" value={`${(metrics.pipelineValue / 1e6).toFixed(1)}M €`} valueClass="text-pht-400" to="/tenders?pipeline=1" />
        <KpiTile label="Workflow 7T" value={workflowMoves7d} valueClass="text-amber-400" to="/workflow" />
      </div>

      <details open className="group">
        <summary className="flex items-center gap-2 p-3 rounded-xl bg-dark-700/50 border border-dark-500/50 cursor-pointer min-h-[44px] list-none">
          <span className="text-sm font-semibold text-white flex-1">Sales-Funnel</span>
          <span className="text-xs text-slate-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <Card className="mt-2">
          <CardContent className="py-4 space-y-3">
            {funnel.map((step) => (
              <Bar key={step.stage} label={`${step.stage} (${(step.value / 1e6).toFixed(1)}M €)`} value={step.count} max={maxFunnel} color="bg-pht-500" to={`/workflow?stage=${encodeURIComponent(step.stage)}`} />
            ))}
          </CardContent>
        </Card>
      </details>

      <details className="group">
        <summary className="flex items-center gap-2 p-3 rounded-xl bg-dark-700/50 border border-dark-500/50 cursor-pointer min-h-[44px] list-none">
          <span className="text-sm font-semibold text-white flex-1">Verlustgründe</span>
          <span className="text-xs text-slate-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <Card className="mt-2">
          <CardContent className="py-4 space-y-3">
            {losses.length === 0 ? (
              <p className="text-sm text-slate-500">Verluste im Workflow dokumentieren.</p>
            ) : (
              losses.map((l) => (
                <Bar key={l.reason} label={l.reason} value={l.count} max={losses[0].count} color="bg-red-500" to="/workflow?stage=Verloren" />
              ))
            )}
          </CardContent>
        </Card>
      </details>

      <details className="group">
        <summary className="flex items-center gap-2 p-3 rounded-xl bg-dark-700/50 border border-dark-500/50 cursor-pointer min-h-[44px] list-none">
          <span className="text-sm font-semibold text-white flex-1">Regionen</span>
          <span className="text-xs text-slate-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <Card className="mt-2">
          <CardContent className="py-4 space-y-3">
            {stats.regions.map((r) => (
              <Bar key={r} label={r} value={allTenders.filter((t) => t.region === r).length} max={maxRegion} color="bg-pht-500" to={`/tenders?region=${encodeURIComponent(r)}`} />
            ))}
          </CardContent>
        </Card>
      </details>

      <details className="group">
        <summary className="flex items-center gap-2 p-3 rounded-xl bg-dark-700/50 border border-dark-500/50 cursor-pointer min-h-[44px] list-none">
          <span className="text-sm font-semibold text-white flex-1">GO / Prüfen / NO-GO</span>
          <span className="text-xs text-slate-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <Card className="mt-2">
          <CardContent className="py-4 space-y-3">
            <Bar label="GO" value={stats.goCount} max={stats.total} color="bg-emerald-500" to="/tenders?reco=GO" />
            <Bar label="Prüfen" value={stats.pruefenCount} max={stats.total} color="bg-amber-500" to="/tenders?reco=PRÜFEN" />
            <Bar label="NO-GO" value={stats.noGoCount} max={stats.total} color="bg-red-500" to="/tenders?reco=NO-GO" />
          </CardContent>
        </Card>
      </details>

      <details className="group">
        <summary className="flex items-center gap-2 p-3 rounded-xl bg-dark-700/50 border border-dark-500/50 cursor-pointer min-h-[44px] list-none">
          <span className="text-sm font-semibold text-white flex-1">Kategorien & Score</span>
          <span className="text-xs text-slate-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <Card className="mt-2">
          <CardContent className="py-4 space-y-3">
            <Bar label="A (0–10k)" value={stats.categoryA} max={stats.total} color="bg-slate-500" to="/tenders?category=A" />
            <Bar label="B (10–50k)" value={stats.categoryB} max={stats.total} color="bg-amber-500" to="/tenders?category=B" />
            <Bar label="C (>50k)" value={stats.categoryC} max={stats.total} color="bg-red-500" to="/tenders?category=C" />
            {scoreBuckets.map((b) => (
              <Bar key={b.label} label={b.label} value={b.count} max={maxScore} color={b.color} to={b.to} />
            ))}
          </CardContent>
        </Card>
      </details>

      {competitors.length > 0 && (
        <details className="group">
          <summary className="flex items-center gap-2 p-3 rounded-xl bg-dark-700/50 border border-dark-500/50 cursor-pointer min-h-[44px] list-none">
            <span className="text-sm font-semibold text-white flex-1">Konkurrenten</span>
            <span className="text-xs text-slate-500 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <Card className="mt-2">
            <CardContent className="py-4 space-y-3">
              {competitors.map((c) => (
                <Bar key={c.name} label={c.name} value={c.count} max={competitors[0].count} color="bg-amber-500" to="/workflow?stage=Verloren" />
              ))}
            </CardContent>
          </Card>
        </details>
      )}

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Top Profile</h2>
            <Link to="/profiles" className="text-xs text-pht-400 min-h-[44px] flex items-center">Alle →</Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(stats.profileDistribution).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => (
              <Link
                key={name}
                to={`/tenders?q=${encodeURIComponent(name)}`}
                className="p-3 rounded-xl bg-dark-600/40 border border-dark-500/40 text-center active:scale-[0.97] min-h-[72px] flex flex-col justify-center"
              >
                <p className="text-xl font-bold text-pht-400">{count}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{name}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
