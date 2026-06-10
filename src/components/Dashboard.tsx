import {
  ArrowRight, Bell, CheckCircle, FileText, GitBranch, Globe, Star, TrendingUp, Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ACTIVE_WORKFLOW_STAGES } from '../data/workflow';
import { useTenders } from '../context/TenderContext';
import { useViewMode } from '../context/ViewModeContext';
import { PRODUCT_PROFILES } from '../lib/productProfiles';
import { DashboardMobile } from './DashboardMobile';
import { RemindersPanel } from './RemindersPanel';
import { Badge } from './ui/Badge';
import { Card, CardContent, CardHeader } from './ui/Card';
import { Stat } from './ui/Stat';

const modules = [
  { to: '/tenders', label: 'Suche', desc: 'Ausschreibungen durchsuchen', icon: Globe, color: 'from-blue-600/20' },
  { to: '/go-no-go', label: 'GO / NO-GO', desc: 'Bewertete Projekte', icon: CheckCircle, color: 'from-emerald-600/20' },
  { to: '/analytics', label: 'Analytics', desc: 'KPIs & Verteilungen', icon: TrendingUp, color: 'from-violet-600/20' },
  { to: '/alerts', label: 'Alerts', desc: 'Fristen & Chancen', icon: Bell, color: 'from-amber-600/20' },
];

export function Dashboard() {
  const { stats, loading, dataSource, isDemo, openTender } = useTenders();
  const { isMobileView } = useViewMode();

  if (isMobileView) return <DashboardMobile />;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white">Procurement Intelligence</h1>
        <p className="text-slate-400 mt-1">
          Vertriebs- & Ausschreibungsmaschine · {dataSource ?? 'lädt…'} · weltweit außer USA & Asien
          {isDemo && <span className="text-amber-400 ml-2">· Keine Live-Daten</span>}
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="Treffer Gesamt" value={loading ? '…' : stats.total} icon={FileText} accent="from-slate-600/20 to-dark-700" />
        <Stat label="Score ≥ 60" value={loading ? '…' : stats.highScoreCount} icon={TrendingUp} color="text-emerald-400" accent="from-emerald-600/15 to-dark-700" />
        <Stat label="Watchlist" value={loading ? '…' : stats.watchlistCount} icon={Star} color="text-amber-400" accent="from-amber-600/15 to-dark-700" />
        <Stat label="Deadlines < 14 Tage" value={loading ? '…' : stats.deadlinesUnder14} icon={Zap} color="text-red-400" accent="from-red-600/15 to-dark-700" trend={stats.newTodayCount > 0 ? `${stats.newTodayCount} neu heute` : undefined} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {modules.map((m) => (
          <Link key={m.to} to={m.to}>
            <Card glow className="h-full hover:border-pht-500/40 transition-colors">
              <CardContent className="py-5">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${m.color} to-dark-700 flex items-center justify-center mb-3`}>
                  <m.icon className="w-5 h-5 text-pht-400" />
                </div>
                <h3 className="font-semibold text-white text-sm">{m.label}</h3>
                <p className="text-xs text-slate-500 mt-1">{m.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mb-8">
        <CardHeader><h2 className="text-sm font-semibold text-white">Schnellzugriff Produktprofile</h2></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {PRODUCT_PROFILES.map((p: { id: string; name: string; icon: string; description: string }) => (
              <Link key={p.id} to="/profiles" className="p-4 rounded-xl border border-dark-500/50 bg-dark-700/30 hover:border-pht-500/30 transition-colors">
                <span className="text-2xl">{p.icon}</span>
                <p className="text-sm font-medium text-white mt-2">{p.name}</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.description}</p>
                <p className="text-xs text-pht-400 mt-2">{stats.profileDistribution[p.name] ?? 0} Treffer</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-white">Bewertung</h2></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><div className="text-2xl font-bold text-emerald-400">{stats.goCount}</div><div className="text-xs text-slate-500 mt-1">GO</div></div>
              <div><div className="text-2xl font-bold text-amber-400">{stats.pruefenCount}</div><div className="text-xs text-slate-500 mt-1">Prüfen</div></div>
              <div><div className="text-2xl font-bold text-red-400">{stats.noGoCount}</div><div className="text-xs text-slate-500 mt-1">NO-GO</div></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-white">Kategorien A / B / C</h2></CardHeader>
          <CardContent className="space-y-3">
            {(['A', 'B', 'C'] as const).map((cat) => {
              const count = stats[`category${cat}`];
              const colors = { A: 'bg-slate-500', B: 'bg-amber-500', C: 'bg-red-500' };
              const labels = { A: '0–10k €', B: '10–50k €', C: '>50k €' };
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">Kat. {cat} ({labels[cat]})</span><span className="text-white">{count}</span></div>
                  <div className="h-1.5 bg-dark-600 rounded-full overflow-hidden">
                    <div className={`h-full ${colors[cat]}`} style={{ width: `${stats.total ? (count / stats.total) * 100 : 0}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <RemindersPanel />
      </div>

      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2"><GitBranch className="w-4 h-4 text-pht-400" />Workflow-Pipeline</h2>
          <Link to="/workflow" className="text-xs text-pht-400 hover:text-pht-300 flex items-center gap-1">Kanban <ArrowRight className="w-3 h-3" /></Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {ACTIVE_WORKFLOW_STAGES.map((stage) => (
              <div key={stage.status} className="rounded-lg border border-dark-500/50 bg-dark-600/30 p-3">
                <p className="text-[10px] text-slate-500">{stage.label}</p>
                <p className="text-lg font-bold text-white mt-1">{stats.workflowCounts[stage.status] ?? 0}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Top Opportunities</h2>
          <Link to="/tenders?filter=top" className="text-xs text-pht-400 hover:text-pht-300 flex items-center gap-1">Alle <ArrowRight className="w-3 h-3" /></Link>
        </CardHeader>
        <CardContent>
          {stats.topChances.length === 0 ? (
            <p className="text-sm text-slate-500">Keine Top-Chancen.</p>
          ) : (
            <div className="space-y-2">
              {stats.topChances.map((t) => (
                <button key={t.id} type="button" onClick={() => openTender(t.id)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-dark-500/40 hover:border-pht-500/30 hover:bg-dark-600/30 transition-all text-left">
                  <div className="min-w-0 flex-1 mr-4">
                    <p className="text-sm font-medium text-white truncate">{t.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t.country} · {t.region} · {t.revenuePotential}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="score">{t.score}</Badge>
                    <Badge variant="success">GO</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
