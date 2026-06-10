import { useTenders } from '../context/TenderContext';
import { Card, CardContent, CardHeader } from '../components/ui/Card';

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">{label}</span><span className="text-white">{value}</span></div>
      <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const { stats, allTenders, loading } = useTenders();
  const maxRegion = Math.max(...stats.regions.map((r) => allTenders.filter((t) => t.region === r).length), 1);

  const scoreBuckets = [
    { label: '0–39', count: allTenders.filter((t) => t.score < 40).length, color: 'bg-red-500' },
    { label: '40–69', count: allTenders.filter((t) => t.score >= 40 && t.score < 70).length, color: 'bg-amber-500' },
    { label: '70–100', count: allTenders.filter((t) => t.score >= 70).length, color: 'bg-emerald-500' },
  ];
  const maxScore = Math.max(...scoreBuckets.map((b) => b.count), 1);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white">KPIs & Analytics</h1>
        <p className="text-slate-400 mt-1 text-sm">Vertriebskennzahlen aus {loading ? '…' : stats.total} Ausschreibungen</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-white">Verteilung nach Region</h2></CardHeader>
          <CardContent className="space-y-3">
            {stats.regions.map((r) => (
              <Bar key={r} label={r} value={allTenders.filter((t) => t.region === r).length} max={maxRegion} color="bg-pht-500" />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-white">GO / Prüfen / NO-GO</h2></CardHeader>
          <CardContent className="space-y-3">
            <Bar label="GO" value={stats.goCount} max={stats.total} color="bg-emerald-500" />
            <Bar label="Prüfen" value={stats.pruefenCount} max={stats.total} color="bg-amber-500" />
            <Bar label="NO-GO" value={stats.noGoCount} max={stats.total} color="bg-red-500" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-white">Kategorien A / B / C</h2></CardHeader>
          <CardContent className="space-y-3">
            <Bar label="A (0–10k)" value={stats.categoryA} max={stats.total} color="bg-slate-500" />
            <Bar label="B (10–50k)" value={stats.categoryB} max={stats.total} color="bg-amber-500" />
            <Bar label="C (>50k)" value={stats.categoryC} max={stats.total} color="bg-red-500" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-white">Score-Verteilung</h2></CardHeader>
          <CardContent className="space-y-3">
            {scoreBuckets.map((b) => (
              <Bar key={b.label} label={b.label} value={b.count} max={maxScore} color={b.color} />
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><h2 className="text-sm font-semibold text-white">Top Produktprofile</h2></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(stats.profileDistribution).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                <div key={name} className="p-4 rounded-xl bg-dark-700/50 border border-dark-500/40 text-center">
                  <p className="text-2xl font-bold text-pht-400">{count}</p>
                  <p className="text-xs text-slate-400 mt-1">{name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
