import { ArrowLeft, Calendar, CheckSquare, Copy, ExternalLink, GitBranch, Mail, Star } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSuggestedAction } from '../services/workflow';
import { getReminderLabel, getRemindersForTender } from '../services/reminders';
import { createOutlookEvent, createMicrosoftTodoTasks } from '../services/microsoftIntegrations';
import { useTenders } from '../context/TenderContext';
import type { PipelineStatus } from '../types/tender';
import { WorkflowStepper } from './WorkflowStepper';
import { Badge } from './ui/Badge';
import { Card, CardContent } from './ui/Card';

const PIPELINE_STATUSES: PipelineStatus[] = [
  'Neu', 'Prüfen', 'Technik prüfen', 'Angebot vorbereiten', 'Abgegeben', 'Gewonnen', 'Verloren',
];

const recVariant = { GO: 'success' as const, 'PRÜFEN': 'warning' as const, 'NO-GO': 'danger' as const };

export function TenderDetailMobile() {
  const { id } = useParams<{ id: string }>();
  const { allTenders, toggleWatchlist, setStatus, updateTender, moveToStage, addToWorkflow, openTender } = useTenders();
  const tender = allTenders.find((t) => t.id === id);
  const [msMessage, setMsMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!tender) {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-500 text-sm">Ausschreibung nicht gefunden.</p>
        <Link to="/tenders" className="text-pht-400 text-sm mt-3 inline-block min-h-[44px]">Zurück zur Liste</Link>
      </div>
    );
  }

  const reminders = getRemindersForTender(tender);
  const inWorkflow = tender.scoreRecommendation !== 'NO-GO';

  const followUpEmail = `Betreff: Anfrage zur Ausschreibung – ${tender.title}

Sehr geehrte Damen und Herren,

wir interessieren uns für die Ausschreibung "${tender.title}" (Deadline: ${tender.deadline}).

Link: ${tender.sourceUrl}

Mit freundlichen Grüßen`;

  return (
    <div className="p-4 space-y-4 pb-20">
      <Link to="/tenders" className="inline-flex items-center gap-1 text-sm text-slate-500 min-h-[44px]">
        <ArrowLeft className="w-4 h-4" /> Zurück
      </Link>

      <header>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-lg font-bold text-white line-clamp-3 flex-1">{tender.title}</h1>
          <button
            type="button"
            onClick={() => toggleWatchlist(tender.id)}
            className={`p-2.5 rounded-xl border min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 ${
              tender.watchlist ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-dark-500 text-slate-500'
            }`}
          >
            <Star className={`w-5 h-5 ${tender.watchlist ? 'fill-current' : ''}`} />
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">{tender.country} · {tender.region} · {tender.sourcePlatform}</p>
        <a
          href={tender.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-pht-400 mt-2 min-h-[44px]"
        >
          <ExternalLink className="w-4 h-4" /> Originalquelle
        </a>
      </header>

      <div className="flex flex-wrap gap-2">
        <Badge variant="score">{tender.score}/100</Badge>
        <Badge variant={recVariant[tender.scoreRecommendation]}>{tender.scoreRecommendation}</Badge>
        <Badge variant="info">{tender.revenuePotential}</Badge>
        {reminders.map((r) => <Badge key={r.tenderId} variant="warning">{getReminderLabel(r.daysLeft)}</Badge>)}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={async () => setMsMessage((await createOutlookEvent(tender)).message)}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-medium min-h-[44px]"
        >
          <Calendar className="w-4 h-4" /> Termin
        </button>
        <button
          type="button"
          onClick={async () => setMsMessage((await createMicrosoftTodoTasks(tender)).message)}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400 text-xs font-medium min-h-[44px]"
        >
          <CheckSquare className="w-4 h-4" /> Aufgaben
        </button>
      </div>
      {msMessage && <p className="text-xs text-slate-500">{msMessage}</p>}

      {inWorkflow && (
        <details open className="group">
          <summary className="flex items-center gap-2 p-3 rounded-xl bg-dark-700/50 border border-dark-500/50 cursor-pointer min-h-[44px] list-none">
            <GitBranch className="w-4 h-4 text-pht-400" />
            <span className="text-sm font-semibold text-white flex-1">Workflow</span>
            <Link to="/workflow" onClick={(e) => e.stopPropagation()} className="text-xs text-pht-400">Kanban →</Link>
          </summary>
          <Card className="mt-2">
            <CardContent className="py-4 space-y-3">
              <WorkflowStepper currentStatus={tender.status} onStatusClick={(s) => moveToStage(tender.id, s)} />
              <p className="text-xs text-slate-400">{tender.nextAction || getSuggestedAction(tender.status)}</p>
            </CardContent>
          </Card>
        </details>
      )}

      {inWorkflow && tender.status === 'Neu' && (
        <button
          type="button"
          onClick={() => addToWorkflow(tender.id)}
          className="w-full py-3 rounded-xl bg-pht-600 text-white font-medium min-h-[44px]"
        >
          In Workflow aufnehmen
        </button>
      )}

      {tender.scoreBreakdown && (
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Keywords', val: tender.scoreBreakdown.keywordScore },
            { label: 'Budget', val: tender.scoreBreakdown.budgetScore },
            { label: 'Region', val: tender.scoreBreakdown.regionScore },
            { label: 'Industrie', val: tender.scoreBreakdown.industryScore },
          ].map(({ label, val }) => (
            <div key={label} className="p-3 rounded-xl bg-dark-600/30 text-center">
              <p className="text-[10px] text-slate-500">{label}</p>
              <p className="text-lg font-bold text-white">{val}</p>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="py-4">
          <h2 className="text-sm font-semibold text-white mb-2">Beschreibung</h2>
          <p className="text-sm text-slate-400 leading-relaxed">{tender.description}</p>
          <p className="text-xs text-slate-500 mt-3">Deadline: <strong className="text-white">{tender.deadline}</strong></p>
        </CardContent>
      </Card>

      <details className="group">
        <summary className="flex items-center gap-2 p-3 rounded-xl bg-dark-700/50 border border-dark-500/50 cursor-pointer min-h-[44px] list-none">
          <span className="text-sm font-semibold text-white flex-1">Produkt-Matching</span>
          <span className="text-xs text-slate-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <Card className="mt-2">
          <CardContent className="py-4 space-y-3 text-sm">
            <p className="font-medium text-pht-400">{tender.productMatch.main}</p>
            <p className="text-xs text-slate-400">{tender.productMatch.reasoning}</p>
            <Link to="/profiles" className="text-xs text-pht-400 min-h-[44px] inline-flex items-center">Profile →</Link>
          </CardContent>
        </Card>
      </details>

      <details className="group">
        <summary className="flex items-center gap-2 p-3 rounded-xl bg-dark-700/50 border border-dark-500/50 cursor-pointer min-h-[44px] list-none">
          <span className="text-sm font-semibold text-white flex-1">Pipeline & Notizen</span>
          <span className="text-xs text-slate-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <Card className="mt-2">
          <CardContent className="py-4 space-y-3">
            <select
              value={tender.status}
              onChange={(e) => setStatus(tender.id, e.target.value as PipelineStatus)}
              className="w-full px-3 py-2.5 rounded-xl border border-dark-500 bg-dark-600 text-sm text-white min-h-[44px]"
            >
              {PIPELINE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input
              type="text"
              value={tender.responsible ?? ''}
              onChange={(e) => updateTender(tender.id, { responsible: e.target.value })}
              placeholder="Verantwortlich…"
              className="w-full px-3 py-2.5 rounded-xl border border-dark-500 bg-dark-600 text-sm text-white min-h-[44px]"
            />
            <textarea
              value={tender.notes ?? ''}
              onChange={(e) => updateTender(tender.id, { notes: e.target.value })}
              rows={3}
              placeholder="Notizen…"
              className="w-full px-3 py-2.5 rounded-xl border border-dark-500 bg-dark-600 text-sm text-white resize-none"
            />
          </CardContent>
        </Card>
      </details>

      {tender.similarityHints && tender.similarityHints.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <h2 className="text-sm font-semibold text-white mb-3">Ähnliche Projekte</h2>
            {tender.similarityHints.map((h) => (
              <button
                key={h.tenderId}
                type="button"
                onClick={() => openTender(h.tenderId)}
                className="w-full text-left p-3 rounded-xl bg-dark-600/30 border border-dark-500/30 mb-2 min-h-[52px]"
              >
                <p className="text-sm text-white line-clamp-2">{h.title}</p>
                <p className="text-xs text-slate-500">{h.score}% Ähnlichkeit</p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <details className="group">
        <summary className="flex items-center gap-2 p-3 rounded-xl bg-dark-700/50 border border-dark-500/50 cursor-pointer min-h-[44px] list-none">
          <Mail className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-white flex-1">E-Mail-Vorlage</span>
        </summary>
        <Card className="mt-2">
          <CardContent className="py-4">
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(followUpEmail);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dark-500 text-xs text-slate-400 mb-3 min-h-[44px]"
            >
              <Copy className="w-3.5 h-3.5" /> {copied ? 'Kopiert!' : 'Kopieren'}
            </button>
            <pre className="text-xs text-slate-400 whitespace-pre-wrap bg-dark-600/50 p-3 rounded-xl">{followUpEmail}</pre>
          </CardContent>
        </Card>
      </details>
    </div>
  );
}
