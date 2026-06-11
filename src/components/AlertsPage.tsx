import { Bell, ExternalLink, Mail, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { differenceInDays, parseISO } from 'date-fns';
import { useViewMode } from '../context/ViewModeContext';
import { useTenders } from '../context/TenderContext';
import { AlertsMobile } from './AlertsMobile';
import { sendDailyDigest } from '../services/digestService';
import { loadAlertRules, saveAlertRules, matchAlertRules, type AlertRule } from '../services/alertRules';
import { Badge } from './ui/Badge';
import { Card, CardContent, CardHeader } from './ui/Card';

export function AlertsPage() {
  const { isMobileView } = useViewMode();
  if (isMobileView) return <AlertsMobile />;

  const { allTenders, reminders, stats, loading } = useTenders();
  const [rules, setRules] = useState<AlertRule[]>(() => loadAlertRules());
  const [digestMsg, setDigestMsg] = useState<string | null>(null);

  const ruleMatches = allTenders.filter((t) => matchAlertRules(t, rules).length > 0).slice(0, 20);

  const toggleRule = (id: string) => {
    const next = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    setRules(next);
    saveAlertRules(next);
  };
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
      <header className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Alerts</h1>
          <p className="text-slate-400 mt-1 text-sm">Fristen, Regeln, Digest & neue Ausschreibungen</p>
        </div>
        <button
          type="button"
          onClick={async () => setDigestMsg((await sendDailyDigest(allTenders)).message)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-sky-500/40 text-sm text-sky-300 hover:bg-sky-500/10"
        >
          <Mail className="w-4 h-4" /> Tages-Digest
        </button>
      </header>
      {digestMsg && <p className="text-xs text-slate-500 mb-4">{digestMsg}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link to="/calendar?filter=urgent" className="block">
          <Card glow className="h-full hover:border-amber-500/40 transition-colors cursor-pointer">
            <CardContent className="py-4 text-center">
              <Bell className="w-5 h-5 text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{loading ? '…' : stats.deadlinesUnder14}</p>
              <p className="text-xs text-slate-500">Fristen &lt; 14 Tage</p>
              <p className="text-[10px] text-pht-400/70 mt-2">Kalender →</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/tenders?filter=new" className="block">
          <Card className="h-full hover:border-pht-500/40 transition-colors cursor-pointer">
            <CardContent className="py-4 text-center">
              <Sparkles className="w-5 h-5 text-pht-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{loading ? '…' : newTenders.length}</p>
              <p className="text-xs text-slate-500">Neue Chancen</p>
              <p className="text-[10px] text-pht-400/70 mt-2">Treffer anzeigen →</p>
            </CardContent>
          </Card>
        </Link>
        <a href="#deadline-alerts" className="block">
          <Card className="h-full hover:border-red-500/40 transition-colors cursor-pointer">
            <CardContent className="py-4 text-center">
              <Bell className="w-5 h-5 text-red-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{loading ? '…' : reminders.length}</p>
              <p className="text-xs text-slate-500">Aktive Erinnerungen</p>
              <p className="text-[10px] text-pht-400/70 mt-2">Zu Alerts scrollen →</p>
            </CardContent>
          </Card>
        </a>
      </div>

      <Card className="mb-6">
        <CardHeader><h2 className="text-sm font-semibold text-white">Alert-Regeln</h2></CardHeader>
        <CardContent className="space-y-2">
          {rules.map((r) => (
            <label key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-dark-500/50 cursor-pointer hover:bg-dark-600/20">
              <div>
                <p className="text-sm text-white">{r.name}</p>
                <p className="text-xs text-slate-500">Score ≥{r.minScore} · Frist ≤{r.deadlineDaysMax}T{r.regions.length ? ` · ${r.regions.join(', ')}` : ''}</p>
              </div>
              <input type="checkbox" checked={r.enabled} onChange={() => toggleRule(r.id)} className="rounded" />
            </label>
          ))}
          <p className="text-xs text-slate-600 pt-2">{ruleMatches.length} aktuelle Treffer · Digest sendet Matches an Ziel-E-Mail</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-white">Regel-Matches</h2></CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {ruleMatches.length === 0 ? <p className="text-sm text-slate-600">Keine Matches.</p> : ruleMatches.map((t) => (
              <Link key={t.id} to={`/tenders/${t.id}`} className="block p-3 rounded-lg bg-dark-600/30 border border-dark-500/30 hover:border-pht-500/30">
                <p className="text-sm text-white truncate">{t.title}</p>
                <p className="text-xs text-slate-500">Score {t.score} · {t.deadline}</p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <div id="deadline-alerts">
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
        </div>

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
