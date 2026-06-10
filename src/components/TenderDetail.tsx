import { ArrowLeft, Calendar, CheckSquare, ExternalLink, GitBranch, Mail, Star } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSuggestedAction } from '../services/workflow';
import { getReminderLabel, getRemindersForTender } from '../services/reminders';
import { createOutlookEvent, createMicrosoftTodoTasks } from '../services/microsoftIntegrations';
import { useTenders } from '../context/TenderContext';
import type { PipelineStatus } from '../types/tender';
import { WorkflowStepper } from './WorkflowStepper';
import { Badge } from './ui/Badge';
import { Card, CardContent, CardHeader } from './ui/Card';

const PIPELINE_STATUSES: PipelineStatus[] = [
  'Neu', 'Prüfen', 'Technik prüfen', 'Angebot vorbereiten', 'Abgegeben', 'Gewonnen', 'Verloren',
];

const recVariant = { GO: 'success' as const, 'PRÜFEN': 'warning' as const, 'NO-GO': 'danger' as const };

export function TenderDetail() {
  const { id } = useParams<{ id: string }>();
  const { allTenders, toggleWatchlist, setStatus, updateTender, moveToStage, addToWorkflow } = useTenders();
  const tender = allTenders.find((t) => t.id === id);
  const [msMessage, setMsMessage] = useState<string | null>(null);

  if (!tender) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Ausschreibung nicht gefunden.</p>
        <Link to="/tenders" className="text-pht-400 text-sm mt-2 inline-block">Zurück zur Liste</Link>
      </div>
    );
  }

  const reminders = getRemindersForTender(tender);
  const inWorkflow = tender.scoreRecommendation !== 'NO-GO';

  const followUpEmail = `Betreff: Anfrage zur Ausschreibung – ${tender.title}

Sehr geehrte Damen und Herren,

wir interessieren uns für die Ausschreibung "${tender.title}" (Deadline: ${tender.deadline}).

Als Spezialist für industrielle Hygiene- und Reinigungslösungen bieten wir mit ${tender.productMatch.main} eine passende Lösung im Bereich ${tender.revenuePotential}.

Link: ${tender.sourceUrl}

Mit freundlichen Grüßen`;

  const handleOutlook = () => {
    const result = createOutlookEvent(tender);
    setMsMessage(result.message);
  };

  const handleTodo = () => {
    const result = createMicrosoftTodoTasks(tender);
    setMsMessage(result.message);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link to="/tenders" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-pht-400 mb-6">
        <ArrowLeft className="w-4 h-4" /> Zurück
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">{tender.title}</h1>
          <p className="text-slate-400 mt-2">{tender.country} · {tender.region} · {tender.sourcePlatform} · {tender.industry}</p>
          <a href={tender.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-pht-400 hover:text-pht-300 mt-2">
            <ExternalLink className="w-4 h-4" /> Originalquelle öffnen
          </a>
        </div>
        <button onClick={() => toggleWatchlist(tender.id)} className={`p-2 rounded-lg border transition-colors ${tender.watchlist ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-dark-500 text-slate-500 hover:text-amber-400'}`}>
          <Star className={`w-5 h-5 ${tender.watchlist ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Badge variant="score">{tender.score}/100</Badge>
        <Badge variant={recVariant[tender.scoreRecommendation]}>{tender.scoreRecommendation}</Badge>
        <Badge variant={tender.category === 'C' ? 'danger' : tender.category === 'B' ? 'warning' : 'muted'}>Kat. {tender.category}</Badge>
        <Badge variant="info">{tender.revenuePotential}</Badge>
        {reminders.map((r) => <Badge key={r.tenderId} variant="warning">{getReminderLabel(r.daysLeft)}</Badge>)}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <button onClick={handleOutlook} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-600/30 transition-colors">
          <Calendar className="w-4 h-4" /> Termin erstellen
        </button>
        <button onClick={handleTodo} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-400 text-sm font-medium hover:bg-violet-600/30 transition-colors">
          <CheckSquare className="w-4 h-4" /> Aufgaben erstellen
        </button>
      </div>

      {msMessage && (
        <div className="mb-6 p-3 rounded-lg bg-dark-600/50 border border-dark-500/50 text-sm text-slate-300">{msMessage}</div>
      )}

      <div className="grid gap-6">
        {inWorkflow && (
          <Card glow>
            <CardHeader className="flex flex-row items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2"><GitBranch className="w-4 h-4 text-pht-400" /> Workflow</h2>
              <Link to="/workflow" className="text-xs text-pht-400 hover:text-pht-300">Kanban →</Link>
            </CardHeader>
            <CardContent className="space-y-4">
              <WorkflowStepper currentStatus={tender.status} onStatusClick={(s) => moveToStage(tender.id, s)} />
              <div className="p-3 rounded-lg bg-dark-600/50 border border-dark-500/50">
                <p className="text-xs text-slate-500 uppercase">Empfohlene Aktion</p>
                <p className="text-sm text-slate-300 mt-1">{tender.nextAction || getSuggestedAction(tender.status)}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {inWorkflow && tender.status === 'Neu' && (
          <button onClick={() => addToWorkflow(tender.id)} className="w-full py-3 rounded-lg bg-pht-600 text-white font-medium hover:bg-pht-700 transition-colors">
            In Workflow aufnehmen
          </button>
        )}

        {tender.scoreBreakdown && (
          <Card>
            <CardHeader><h2 className="font-semibold text-white">PHT Score Breakdown</h2></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-lg bg-dark-600/30"><p className="text-xs text-slate-500">Keywords</p><p className="text-lg font-bold text-white">{tender.scoreBreakdown.keywordScore}</p></div>
                <div className="p-3 rounded-lg bg-dark-600/30"><p className="text-xs text-slate-500">Budget</p><p className="text-lg font-bold text-white">{tender.scoreBreakdown.budgetScore}</p></div>
                <div className="p-3 rounded-lg bg-dark-600/30"><p className="text-xs text-slate-500">Region</p><p className="text-lg font-bold text-white">{tender.scoreBreakdown.regionScore}</p></div>
                <div className="p-3 rounded-lg bg-dark-600/30"><p className="text-xs text-slate-500">Industrie</p><p className="text-lg font-bold text-white">{tender.scoreBreakdown.industryScore}</p></div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><h2 className="font-semibold text-white">Beschreibung</h2></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400 leading-relaxed">{tender.description}</p>
            <p className="text-sm text-slate-500 mt-3">Deadline: <strong className="text-white">{tender.deadline}</strong> · Veröffentlicht: {tender.publicationDate}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold text-white">Produkt-Matching (PHT)</h2></CardHeader>
          <CardContent className="space-y-3">
            <div><p className="text-xs text-slate-500 uppercase">Hauptprodukt</p><p className="font-medium text-pht-400 mt-1">{tender.productMatch.main}</p></div>
            <div><p className="text-xs text-slate-500 uppercase">Alternativen</p><p className="text-sm text-slate-400 mt-1">{tender.productMatch.alternatives.join(' · ') || '—'}</p></div>
            <div><p className="text-xs text-slate-500 uppercase">Preisrahmen</p><p className="text-sm text-slate-400 mt-1">{tender.productMatch.priceRange}</p></div>
            <div><p className="text-xs text-slate-500 uppercase">Begründung</p><p className="text-sm text-slate-400 mt-1">{tender.productMatch.reasoning}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold text-white">Nächster Schritt</h2></CardHeader>
          <CardContent><p className="text-sm text-slate-300">{tender.nextStep}</p></CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold text-white">Pipeline & Notizen</h2></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-slate-500 uppercase">Status</label>
              <select value={tender.status} onChange={(e) => setStatus(tender.id, e.target.value as PipelineStatus)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-dark-500 bg-dark-600 text-sm text-white">
                {PIPELINE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase">Verantwortlich</label>
              <input type="text" value={tender.responsible ?? ''} onChange={(e) => updateTender(tender.id, { responsible: e.target.value })}
                placeholder="Name…" className="mt-1 w-full px-3 py-2 rounded-lg border border-dark-500 bg-dark-600 text-sm text-white placeholder:text-slate-600" />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase">Nächste Aktion</label>
              <input type="text" value={tender.nextAction ?? ''} onChange={(e) => updateTender(tender.id, { nextAction: e.target.value })}
                placeholder="z.B. Angebot bis Freitag" className="mt-1 w-full px-3 py-2 rounded-lg border border-dark-500 bg-dark-600 text-sm text-white placeholder:text-slate-600" />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase">Notizen</label>
              <textarea value={tender.notes ?? ''} onChange={(e) => updateTender(tender.id, { notes: e.target.value })}
                rows={3} placeholder="Interne Notizen…" className="mt-1 w-full px-3 py-2 rounded-lg border border-dark-500 bg-dark-600 text-sm text-white placeholder:text-slate-600 resize-none" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold text-white flex items-center gap-2"><Mail className="w-4 h-4" /> E-Mail-Vorlage</h2></CardHeader>
          <CardContent>
            <pre className="text-xs text-slate-400 whitespace-pre-wrap bg-dark-600/50 p-4 rounded-lg border border-dark-500/50">{followUpEmail}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
