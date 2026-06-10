import { Calendar, CheckSquare, ExternalLink, Star, X } from 'lucide-react';
import { useState } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { useTenders } from '../context/TenderContext';
import { useMicrosoftAuth } from '../context/MicrosoftAuthContext';
import { createOutlookEvent, createMicrosoftTodoTasks } from '../services/microsoftIntegrations';
import { BidChecklist } from './BidChecklist';
import { Badge } from './ui/Badge';
import { Card, CardContent } from './ui/Card';

const recVariant = { GO: 'success' as const, 'PRÜFEN': 'warning' as const, 'NO-GO': 'danger' as const };

export function TenderDrawer() {
  const { selectedTender, closeTender, toggleWatchlist, updateTender } = useTenders();
  const [msMessage, setMsMessage] = useState<string | null>(null);
  const [msBusy, setMsBusy] = useState(false);
  const { user, configured, defaultUser } = useMicrosoftAuth();

  if (!selectedTender) return null;

  const t = selectedTender;
  const daysLeft = differenceInDays(parseISO(t.deadline), new Date());
  const urgent = daysLeft <= 7 && daysLeft >= 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/60" onClick={closeTender} aria-label="Schließen" />
      <aside className="relative w-full max-w-lg bg-dark-800 border-l border-dark-500/50 overflow-y-auto shadow-2xl animate-in slide-in-from-right">
        <div className="sticky top-0 flex items-start justify-between gap-3 p-5 border-b border-dark-500/50 bg-dark-800">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white leading-tight">{t.title}</h2>
            <p className="text-sm text-slate-400 mt-1">{t.country} · {t.region} · {t.sourcePlatform}</p>
          </div>
          <button type="button" onClick={closeTender} className="p-2 rounded-lg text-slate-400 hover:bg-dark-600 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="score">{t.score}/100</Badge>
            <Badge variant={recVariant[t.scoreRecommendation]}>{t.scoreRecommendation}</Badge>
            <Badge variant="muted">Kat. {t.category}</Badge>
            {urgent && <Badge variant="danger">Noch {daysLeft} Tage</Badge>}
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">{t.description}</p>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-500">Budget</span><p className="text-white font-medium">{t.revenuePotential}</p></div>
            <div><span className="text-slate-500">Frist</span><p className={urgent ? 'text-red-400 font-medium' : 'text-white'}>{t.deadline}</p></div>
            <div><span className="text-slate-500">Veröffentlicht</span><p className="text-white">{t.publicationDate}</p></div>
            {t.decisionDate && <div><span className="text-slate-500">Entscheidung</span><p className="text-white">{t.decisionDate}</p></div>}
          </div>

          {t.productMatch.profiles && t.productMatch.profiles.length > 0 && (
            <Card>
              <CardContent className="py-4">
                <h3 className="text-sm font-semibold text-white mb-2">Produktprofile</h3>
                <div className="flex flex-wrap gap-2">
                  {t.productMatch.profiles.map((p) => (
                    <span key={p.id} className="px-2.5 py-1 rounded-full bg-pht-600/20 text-pht-300 text-xs border border-pht-500/30">{p.name}</span>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">{t.productMatch.main} · {t.productMatch.priceRange}</p>
              </CardContent>
            </Card>
          )}

          {t.similarityHints && t.similarityHints.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Ähnliche Projekte</h3>
              <ul className="space-y-2">
                {t.similarityHints.map((s) => (
                  <li key={s.tenderId} className="text-xs text-slate-400 p-2 rounded-lg bg-dark-700/50">
                    <span className="text-slate-200">{s.title}</span> · {s.score}% Ähnlichkeit
                  </li>
                ))}
              </ul>
            </div>
          )}

          {t.milestones?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Milestones</h3>
              <ul className="space-y-1.5">
                {t.milestones.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={m.completed} onChange={() => {
                      updateTender(t.id, { milestones: t.milestones.map((x) => x.id === m.id ? { ...x, completed: !x.completed } : x) });
                    }} className="rounded" />
                    <span className={m.completed ? 'line-through' : ''}>{m.title}</span>
                    {m.dueDate && <span className="text-slate-600">({m.dueDate})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Card>
            <CardContent className="py-4">
              <BidChecklist
                tender={t}
                onUpdate={(bidChecklist) => updateTender(t.id, { bidChecklist })}
              />
            </CardContent>
          </Card>

          <textarea
            placeholder="Notizen…"
            value={t.notes ?? ''}
            onChange={(e) => updateTender(t.id, { notes: e.target.value })}
            className="w-full h-20 px-3 py-2 rounded-lg border border-dark-500 bg-dark-700 text-sm text-white placeholder:text-slate-600 resize-none"
          />

          <div className="flex flex-col gap-2">
            <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-pht-600 text-white text-sm font-medium hover:bg-pht-700">
              <ExternalLink className="w-4 h-4" /> Ausschreibung öffnen
            </a>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={msBusy} onClick={async () => {
                setMsBusy(true);
                const r = await createOutlookEvent(t);
                setMsMessage(r.message);
                setMsBusy(false);
              }}
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dark-500 text-sm text-slate-300 hover:bg-dark-700 disabled:opacity-50">
                <Calendar className="w-4 h-4" /> Termin
              </button>
              <button type="button" disabled={msBusy} onClick={async () => {
                setMsBusy(true);
                const r = await createMicrosoftTodoTasks(t);
                setMsMessage(r.message);
                setMsBusy(false);
              }}
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dark-500 text-sm text-slate-300 hover:bg-dark-700 disabled:opacity-50">
                <CheckSquare className="w-4 h-4" /> Aufgaben
              </button>
            </div>
            <button type="button" onClick={() => toggleWatchlist(t.id)}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm ${t.watchlist ? 'border-amber-500/50 text-amber-400 bg-amber-500/10' : 'border-dark-500 text-slate-300 hover:bg-dark-700'}`}>
              <Star className={`w-4 h-4 ${t.watchlist ? 'fill-current' : ''}`} />
              {t.watchlist ? 'Auf Watchlist' : 'Zur Watchlist'}
            </button>
          </div>

          {msMessage && <p className="text-xs text-slate-500">{msMessage}</p>}
          <p className="text-xs text-slate-500">
            {user
              ? `Outlook & To Do: ${user.email}`
              : configured
                ? `Anmelden für Graph-Sync mit ${defaultUser}`
                : `Fallback für ${defaultUser} – VITE_AZURE_CLIENT_ID in .env.local`}
          </p>
        </div>
      </aside>
    </div>
  );
}
