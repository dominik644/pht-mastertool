import { Bell, CheckCircle, Globe, Star, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTenders } from '../context/TenderContext';
import { Badge } from './ui/Badge';
import { Card, CardContent } from './ui/Card';
import { Stat } from './ui/Stat';

export function DashboardMobile() {
  const { stats, loading, allTenders, openTender } = useTenders();
  const watchlist = allTenders.filter((t) => t.watchlist).slice(0, 5);
  const upcoming = [...allTenders]
    .filter((t) => t.scoreRecommendation !== 'NO-GO')
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 5);

  return (
    <div className="p-4 max-w-md mx-auto space-y-4 pb-24">
      <header>
        <h1 className="text-xl font-bold text-white">Mobile Dashboard</h1>
        <p className="text-xs text-slate-500 mt-1">Touch-optimierte Vertriebsübersicht</p>
      </header>

      <div className="space-y-3">
        <Stat label="Treffer" value={loading ? '…' : stats.total} icon={Globe} accent="from-slate-600/20 to-dark-700" />
        <Stat label="Score ≥ 60" value={loading ? '…' : stats.highScoreCount} icon={CheckCircle} color="text-emerald-400" accent="from-emerald-600/15 to-dark-700" />
        <Stat label="Watchlist" value={loading ? '…' : stats.watchlistCount} icon={Star} color="text-amber-400" accent="from-amber-600/15 to-dark-700" />
        <Stat label="Deadlines < 14T" value={loading ? '…' : stats.deadlinesUnder14} icon={Zap} color="text-red-400" accent="from-red-600/15 to-dark-700" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/tenders" className="p-4 rounded-xl bg-dark-700 border border-dark-500 text-center">
          <Globe className="w-6 h-6 text-pht-400 mx-auto mb-2" />
          <span className="text-sm text-white font-medium">Suche</span>
        </Link>
        <Link to="/alerts" className="p-4 rounded-xl bg-dark-700 border border-dark-500 text-center">
          <Bell className="w-6 h-6 text-amber-400 mx-auto mb-2" />
          <span className="text-sm text-white font-medium">Alerts</span>
        </Link>
      </div>

      <Card>
        <CardContent className="py-4">
          <h2 className="text-sm font-semibold text-white mb-3">Nächste Deadlines</h2>
          {upcoming.length === 0 ? (
            <p className="text-xs text-slate-500">Keine anstehenden Fristen.</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((t) => (
                <button key={t.id} type="button" onClick={() => openTender(t.id)}
                  className="w-full text-left p-3 rounded-xl bg-dark-600/40 border border-dark-500/40 active:scale-[0.98] transition-transform">
                  <p className="text-sm font-medium text-white line-clamp-2">{t.title}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-500">{t.deadline}</span>
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
            <h2 className="text-sm font-semibold text-white mb-3">Watchlist</h2>
            {watchlist.map((t) => (
              <button key={t.id} type="button" onClick={() => openTender(t.id)}
                className="w-full text-left py-3 border-b border-dark-500/30 last:border-0">
                <p className="text-sm text-white truncate">{t.title}</p>
                <p className="text-xs text-slate-500">{t.country} · Score {t.score}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
