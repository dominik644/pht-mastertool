import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useTenders } from '../context/TenderContext';
import {
  competitorStats, computeFunnel, computeMarketLeaderMetrics, lossReasonStats,
} from '../services/analyticsEngine';
import { Card, CardContent, CardHeader } from '../components/ui/Card';

function Bar({ label, value, max, color, suffix = '', to }: {
  label: string; value: number; max: number; color: string; suffix?: string; to?: string;
}) {
  const inner = (
    <div>
      <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">{label}</span><span className="text-white">{value}{suffix}</span></div>
      <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </div>
    </div>
  );
  if (to) {
    return (
      <Link to={to} className="block rounded-lg p-1 -m-1 hover:bg-dark-600/40 transition-colors">
        {inner}
      </Link>
    );
  }
  return inner;
}

function KpiCard({ label, value, valueClass, to }: {
  label: string; value: string | number; valueClass?: string; to: string;
}) {
  return (
    <Link to={to} className="block h-full">
      <Card className="h-full hover:border-pht-500/40 transition-colors cursor-pointer">
        <CardContent className="py-4">
          <p className="text-xs text-slate-500">{label}</p>
          <p className={`text-2xl font-bold ${valueClass ?? 'text-white'}`}>{value}</p>
          <p className="text-[10px] text-pht-400/70 mt-2">Anzeigen →</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function AnalyticsPage() {
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
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">KPIs & Analytics</h1>
          <p className="text-slate-400 mt-1 text-sm">Vertriebskennzahlen aus {loading ? '…' : stats.total} Ausschreibungen</p>
        </div>
        <Link to="/plan" className="text-sm text-pht-400 hover:text-pht-300">12-Monats-Plan →</Link>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Win-Rate" value={`${metrics.winRate}%`} valueClass="text-emerald-400" to="/workflow" />
        <KpiCard label="Gewonnen" value={`${(metrics.wonRevenue / 1e6).toFixed(2)}M €`} to="/workflow?stage=Gewonnen" />
        <KpiCard label="Pipeline" value={`${(metrics.pipelineValue / 1e6).toFixed(1)}M €`} valueClass="text-pht-400" to="/tenders?pipeline=1" />
        <KpiCard label="Workflow-Bewegungen (7T)" value={workflowMoves7d} valueClass="text-amber-400" to="/workflow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-white">Sales-Funnel</h2></CardHeader>
          <CardContent className="space-y-3">
            {funnel.map((step) => (
              <Bar key={step.stage} label={`${step.stage} (${(step.value / 1e6).toFixed(1)}M €)`} value={step.count} max={maxFunnel} color="bg-pht-500" to={`/workflow?stage=${encodeURIComponent(step.stage)}`} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-white">Verlustgründe (Lernen)</h2></CardHeader>
          <CardContent className="space-y-3">
            {losses.length === 0 ? (
              <p className="text-sm text-slate-500">Verluste im Workflow mit Grund dokumentieren.</p>
            ) : (
              losses.map((l) => (
                <Bar key={l.reason} label={l.reason} value={l.count} max={losses[0].count} color="bg-red-500" to="/workflow?stage=Verloren" />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-white">Verteilung nach Region</h2></CardHeader>
          <CardContent className="space-y-3">
            {stats.regions.map((r) => (
              <Bar key={r} label={r} value={allTenders.filter((t) => t.region === r).length} max={maxRegion} color="bg-pht-500" to={`/tenders?region=${encodeURIComponent(r)}`} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-white">GO / Prüfen / NO-GO</h2></CardHeader>
          <CardContent className="space-y-3">
            <Bar label="GO" value={stats.goCount} max={stats.total} color="bg-emerald-500" to="/tenders?reco=GO" />
            <Bar label="Prüfen" value={stats.pruefenCount} max={stats.total} color="bg-amber-500" to="/tenders?reco=PRÜFEN" />
            <Bar label="NO-GO" value={stats.noGoCount} max={stats.total} color="bg-red-500" to="/tenders?reco=NO-GO" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-white">Kategorien A / B / C</h2></CardHeader>
          <CardContent className="space-y-3">
            <Bar label="A (0–10k)" value={stats.categoryA} max={stats.total} color="bg-slate-500" to="/tenders?category=A" />
            <Bar label="B (10–50k)" value={stats.categoryB} max={stats.total} color="bg-amber-500" to="/tenders?category=B" />
            <Bar label="C (>50k)" value={stats.categoryC} max={stats.total} color="bg-red-500" to="/tenders?category=C" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-white">Score-Verteilung</h2></CardHeader>
          <CardContent className="space-y-3">
            {scoreBuckets.map((b) => (
              <Bar key={b.label} label={b.label} value={b.count} max={maxScore} color={b.color} to={b.to} />
            ))}
          </CardContent>
        </Card>

        {competitors.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader><h2 className="text-sm font-semibold text-white">Konkurrenten (aus Verlusten)</h2></CardHeader>
            <CardContent className="space-y-3">
              {competitors.map((c) => (
                <Bar key={c.name} label={c.name} value={c.count} max={competitors[0].count} color="bg-amber-500" to="/workflow?stage=Verloren" />
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Top Produktprofile</h2>
            <Link to="/profiles" className="text-xs text-pht-400 hover:text-pht-300">Alle Profile →</Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(stats.profileDistribution).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                <Link key={name} to={`/tenders?q=${encodeURIComponent(name)}`} className="p-4 rounded-xl bg-dark-600/40 border border-dark-500/40 text-center hover:border-pht-500/40 hover:bg-dark-600/60 transition-colors">
                  <p className="text-2xl font-bold text-pht-400">{count}</p>
                  <p className="text-xs text-slate-400 mt-1">{name}</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
