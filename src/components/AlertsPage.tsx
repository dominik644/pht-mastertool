import { Bell, ExternalLink, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { differenceInDays, parseISO } from 'date-fns';
import { useTenders } from '../context/TenderContext';
import { Badge } from './ui/Badge';
import { Card, CardContent, CardHeader } from './ui/Card';

export function AlertsPage() {
  const { allTenders, reminders, stats, loading } = useTenders();
  const today = new Date().toISOString().slice(0, 10);

  const newTenders = allTenders
    .filter((t) => t.publicationDate >= today || t.status === 'Neu')
    .filter((t) => t.scoreRecommendation !== 'NO-GO')
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const deadlineAlerts = allTenders
    .filter((t) => {
      const days = differenceInDays(parseISO(t.deadline), new Date());
      return days >= 0 && days <= 14 && t.scoreRecommendation !== 'NO-GO';
    })
    .sort((a, b) => a.deadline.localeCompare(b.deadline));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Alerts</h1>
        <p className="text-slate-400 mt-1 text-sm">Fristen, neue Ausschreibungen und offene Aktionen</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card glow><CardContent className="py-4 text-center"><Bell className="w-5 h-5 text-amber-400 mx-auto mb-2" /><p className="text-2xl font-bold text-white">{loading ? '…' : stats.deadlinesUnder14}</p><p className="text-xs text-slate-500">Fristen &lt; 14 Tage</p></CardContent></Card>
        <Card><CardContent className="py-4 text-center"><Sparkles className="w-5 h-5 text-pht-400 mx-auto mb-2" /><p className="text-2xl font-bold text-white">{loading ? '…' : newTenders.length}</p><p className="text-xs text-slate-500">Neue Chancen</p></CardContent></Card>
        <Card><CardContent className="py-4 text-center"><Bell className="w-5 h-5 text-red-400 mx-auto mb-2" /><p className="text-2xl font-bold text-white">{loading ? '…' : reminders.length}</p><p className="text-xs text-slate-500">Aktive Erinnerungen</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-white">Deadline-Alerts</h2></CardHeader>
          <CardContent className="space-y-2">
            {deadlineAlerts.length === 0 ? <p className="text-sm text-slate-600">Keine anstehenden Fristen.</p> : deadlineAlerts.map((t) => {
              const days = differenceInDays(parseISO(t.deadline), new Date());
              return (
                <Link key={t.id} to={`/tenders/${t.id}`} className="flex items-center justify-between p-3 rounded-lg bg-dark-600/30 border border-dark-500/30 hover:border-pht-500/30 transition-all">
                  <div className="min-w-0"><p className="text-sm text-white truncate">{t.title}</p><p className="text-xs text-slate-500">{t.country} · {t.deadline}</p></div>
                  <Badge variant={days <= 3 ? 'danger' : days <= 7 ? 'warning' : 'info'}>{days === 0 ? 'Heute' : `${days}d`}</Badge>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-white">Neue Ausschreibungen</h2></CardHeader>
          <CardContent className="space-y-2">
            {newTenders.length === 0 ? <p className="text-sm text-slate-600">Keine neuen Treffer.</p> : newTenders.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-dark-600/30 border border-dark-500/30">
                <div className="min-w-0 flex-1">
                  <Link to={`/tenders/${t.id}`} className="text-sm text-white hover:text-pht-400 truncate block">{t.title}</Link>
                  <p className="text-xs text-slate-500">{t.region} · Score {t.score}</p>
                </div>
                <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-pht-400 ml-2"><ExternalLink className="w-4 h-4" /></a>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
