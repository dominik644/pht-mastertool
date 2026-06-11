import { Bell, ExternalLink, Mail, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { differenceInDays, parseISO } from 'date-fns';
import { useTenders } from '../context/TenderContext';
import { sendDailyDigest } from '../services/digestService';
import { loadAlertRules, saveAlertRules, matchAlertRules, type AlertRule } from '../services/alertRules';
import { Badge } from './ui/Badge';
import { Card, CardContent } from './ui/Card';

export function AlertsMobile() {
  const { allTenders, reminders, stats, loading, openTender } = useTenders();
  const [rules, setRules] = useState<AlertRule[]>(() => loadAlertRules());
  const [digestMsg, setDigestMsg] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  const ruleMatches = allTenders.filter((t) => matchAlertRules(t, rules).length > 0).slice(0, 20);
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

  const toggleRule = (id: string) => {
    const next = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    setRules(next);
    saveAlertRules(next);
  };

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Alerts</h1>
          <p className="text-xs text-slate-500 mt-0.5">Fristen, Regeln & Digest</p>
        </div>
        <button
          type="button"
          onClick={async () => setDigestMsg((await sendDailyDigest(allTenders)).message)}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-sky-500/40 text-xs text-sky-300 min-h-[44px] shrink-0"
        >
          <Mail className="w-4 h-4" /> Digest
        </button>
      </header>
      {digestMsg && <p className="text-xs text-slate-500">{digestMsg}</p>}

      <div className="-mx-4 px-4">
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1">
          <Link to="/calendar?filter=urgent" className="snap-center shrink-0 w-[38vw] max-w-[140px] rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 min-h-[88px]">
            <Bell className="w-5 h-5 text-amber-400 mb-2" />
            <p className="text-2xl font-bold text-white">{loading ? '…' : stats.deadlinesUnder14}</p>
            <p className="text-[10px] text-slate-500">Fristen &lt;14T</p>
          </Link>
          <Link to="/tenders?filter=new" className="snap-center shrink-0 w-[38vw] max-w-[140px] rounded-2xl border border-dark-500/60 bg-dark-700/50 p-4 min-h-[88px]">
            <Sparkles className="w-5 h-5 text-pht-400 mb-2" />
            <p className="text-2xl font-bold text-white">{loading ? '…' : newTenders.length}</p>
            <p className="text-[10px] text-slate-500">Neue Chancen</p>
          </Link>
          <div className="snap-center shrink-0 w-[38vw] max-w-[140px] rounded-2xl border border-red-500/30 bg-red-500/10 p-4 min-h-[88px]">
            <Bell className="w-5 h-5 text-red-400 mb-2" />
            <p className="text-2xl font-bold text-white">{loading ? '…' : reminders.length}</p>
            <p className="text-[10px] text-slate-500">Erinnerungen</p>
          </div>
        </div>
      </div>

      <details open={rulesOpen} onToggle={(e) => setRulesOpen((e.target as HTMLDetailsElement).open)} className="group">
        <summary className="flex items-center gap-2 p-3 rounded-xl bg-dark-700/50 border border-dark-500/50 cursor-pointer min-h-[44px] list-none">
          <span className="text-sm font-semibold text-white flex-1">Alert-Regeln ({rules.filter((r) => r.enabled).length} aktiv)</span>
          <span className="text-xs text-slate-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <Card className="mt-2">
          <CardContent className="py-3 space-y-2">
            {rules.map((r) => (
              <label key={r.id} className="flex items-center justify-between p-3 rounded-xl border border-dark-500/50 min-h-[52px]">
                <div className="min-w-0 pr-3">
                  <p className="text-sm text-white">{r.name}</p>
                  <p className="text-xs text-slate-500">Score ≥{r.minScore} · ≤{r.deadlineDaysMax}T</p>
                </div>
                <input type="checkbox" checked={r.enabled} onChange={() => toggleRule(r.id)} className="rounded w-5 h-5" />
              </label>
            ))}
            <p className="text-xs text-slate-600 pt-1">{ruleMatches.length} aktuelle Treffer</p>
          </CardContent>
        </Card>
      </details>

      <Card>
        <CardContent className="py-4">
          <h2 className="text-sm font-semibold text-white mb-3">Regel-Matches</h2>
          <div className="space-y-2">
            {ruleMatches.length === 0 ? (
              <p className="text-sm text-slate-600">Keine Matches.</p>
            ) : (
              ruleMatches.map((t) => (
                <button key={t.id} type="button" onClick={() => openTender(t.id)} className="w-full text-left p-3 rounded-xl bg-dark-600/30 border border-dark-500/30 min-h-[52px]">
                  <p className="text-sm text-white line-clamp-2">{t.title}</p>
                  <p className="text-xs text-slate-500 mt-1">Score {t.score} · {t.deadline}</p>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <h2 className="text-sm font-semibold text-white mb-3">Deadline-Alerts</h2>
          <div className="space-y-2">
            {deadlineAlerts.length === 0 ? (
              <p className="text-sm text-slate-600">Keine anstehenden Fristen.</p>
            ) : (
              deadlineAlerts.map((t) => {
                const days = differenceInDays(parseISO(t.deadline), new Date());
                return (
                  <button key={t.id} type="button" onClick={() => openTender(t.id)} className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-dark-600/30 border border-dark-500/30 min-h-[52px]">
                    <div className="min-w-0 text-left">
                      <p className="text-sm text-white line-clamp-2">{t.title}</p>
                      <p className="text-xs text-slate-500">{t.country} · {t.deadline}</p>
                    </div>
                    <Badge variant={days <= 3 ? 'danger' : days <= 7 ? 'warning' : 'info'}>{days === 0 ? 'Heute' : `${days}d`}</Badge>
                  </button>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <h2 className="text-sm font-semibold text-white mb-3">Neue Ausschreibungen</h2>
          <div className="space-y-2">
            {newTenders.length === 0 ? (
              <p className="text-sm text-slate-600">Keine neuen Treffer.</p>
            ) : (
              newTenders.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-dark-600/30 border border-dark-500/30 min-h-[52px]">
                  <button type="button" onClick={() => openTender(t.id)} className="min-w-0 flex-1 text-left">
                    <p className="text-sm text-white line-clamp-2">{t.title}</p>
                    <p className="text-xs text-slate-500">{t.region} · Score {t.score}</p>
                  </button>
                  <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-500 min-h-[44px] min-w-[44px] flex items-center justify-center">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
