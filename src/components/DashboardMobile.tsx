import { Bell, CheckCircle, Crown, GitBranch, Globe, Globe2, RefreshCw, Star, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTenders } from '../context/TenderContext';
import { Badge } from './ui/Badge';
import { Card, CardContent } from './ui/Card';

const kpiCards = [
  { key: 'total', label: 'Treffer', icon: Globe, color: 'text-pht-400', accent: 'from-slate-600/20', to: '/tenders' },
  { key: 'highScore', label: 'Score ≥70', icon: CheckCircle, color: 'text-emerald-400', accent: 'from-emerald-600/15', to: '/tenders?score=70' },
  { key: 'watchlist', label: 'Watchlist', icon: Star, color: 'text-amber-400', accent: 'from-amber-600/15', to: '/watchlist' },
  { key: 'deadlines', label: 'Fristen <14T', icon: Zap, color: 'text-red-400', accent: 'from-red-600/15', to: '/calendar?filter=urgent' },
] as const;

export function DashboardMobile() {
  const { stats, loading, allTenders, openTender, refreshTenders, dataSource, isDemo } = useTenders();
  const watchlist = allTenders.filter((t) => t.watchlist).slice(0, 5);
  const upcoming = [...allTenders]
    .filter((t) => t.scoreRecommendation !== 'NO-GO')
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 5);

  const kpiValues: Record<string, string | number> = {
    total: loading ? '…' : stats.total,
    highScore: loading ? '…' : stats.highScoreCount,
    watchlist: loading ? '…' : stats.watchlistCount,
    deadlines: loading ? '…' : stats.deadlinesUnder14,
  };

  return (
    <div className="p-4 space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Übersicht</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {dataSource ?? 'lädt…'}
            {isDemo && <span className="text-amber-400 ml-1">· Demo</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refreshTenders()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-pht-600 text-white text-xs font-medium min-h-[44px] active:scale-[0.97] disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </button>
      </header>

      <div className="-mx-4 px-4">
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1">
          {kpiCards.map(({ key, label, icon: Icon, color, accent, to }) => (
            <Link
              key={key}
              to={to}
              className={`snap-center shrink-0 w-[42vw] max-w-[160px] rounded-2xl border border-dark-500/60 bg-gradient-to-br ${accent} to-dark-700 p-4 active:scale-[0.97] transition-transform`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="text-[10px] text-pht-400/70">→</span>
              </div>
              <p className="text-2xl font-bold text-white">{kpiValues[key]}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {[
          { to: '/command', label: 'Command', icon: Crown, color: 'text-amber-400' },
          { to: '/tenders', label: 'Suche', icon: Globe, color: 'text-pht-400' },
          { to: '/alerts', label: 'Alerts', icon: Bell, color: 'text-amber-400' },
          { to: '/workflow', label: 'Workflow', icon: GitBranch, color: 'text-pht-400' },
          { to: '/go-no-go', label: 'GO/NO-GO', icon: CheckCircle, color: 'text-emerald-400' },
          { to: '/coverage', label: 'Länder', icon: Globe2, color: 'text-sky-400' },
        ].map(({ to, label, icon: Icon, color }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-1.5 shrink-0 px-3 py-3 rounded-xl bg-dark-700 border border-dark-500 min-w-[72px] min-h-[72px] justify-center active:scale-[0.96] transition-transform"
          >
            <Icon className={`w-5 h-5 ${color}`} />
            <span className="text-[10px] text-white font-medium">{label}</span>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Nächste Deadlines</h2>
            <Link to="/calendar?filter=urgent" className="text-xs text-pht-400 min-h-[44px] flex items-center">Kalender →</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">Keine anstehenden Fristen.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openTender(t.id)}
                  className="w-full text-left p-3.5 rounded-xl bg-dark-600/40 border border-dark-500/40 active:scale-[0.98] transition-transform min-h-[64px]"
                >
                  <p className="text-sm font-medium text-white line-clamp-2">{t.title}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-500">{t.deadline} · {t.country}</span>
                    <Badge variant="score">{t.score}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {watchlist.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white">Watchlist</h2>
              <Link to="/watchlist" className="text-xs text-pht-400 min-h-[44px] flex items-center">Alle →</Link>
            </div>
            {watchlist.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => openTender(t.id)}
                className="w-full text-left py-3.5 border-b border-dark-500/30 last:border-0 min-h-[52px]"
              >
                <p className="text-sm text-white line-clamp-1">{t.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{t.country} · Score {t.score}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
