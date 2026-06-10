import type { PipelineStatus } from '../types/tender';

export interface WorkflowStage {
  status: PipelineStatus;
  label: string;
  description: string;
  suggestedAction: string;
  color: string;
  terminal?: boolean;
}

export const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    status: 'Neu',
    label: 'Neu',
    description: 'Frisch identifizierte Ausschreibung',
    suggestedAction: 'Erstbewertung durchführen und GO/NO-GO bestätigen',
    color: 'bg-slate-100 border-slate-300',
  },
  {
    status: 'Prüfen',
    label: 'Prüfen',
    description: 'Vertrieb prüft Chancen und Anforderungen',
    suggestedAction: 'Anforderungsprofil erstellen und Kundenkontakt klären',
    color: 'bg-blue-50 border-blue-200',
  },
  {
    status: 'Technik prüfen',
    label: 'Technik',
    description: 'Technisches Team bewertet Machbarkeit',
    suggestedAction: 'Technische Spezifikation anfordern und Lösungskonzept erstellen',
    color: 'bg-violet-50 border-violet-200',
  },
  {
    status: 'Angebot vorbereiten',
    label: 'Angebot',
    description: 'Angebot wird kalkuliert und vorbereitet',
    suggestedAction: 'Produktkombination finalisieren und Preis kalkulieren',
    color: 'bg-amber-50 border-amber-200',
  },
  {
    status: 'Abgegeben',
    label: 'Abgegeben',
    description: 'Angebot wurde eingereicht',
    suggestedAction: 'Follow-up planen und Rückmeldung des Kunden abwarten',
    color: 'bg-orange-50 border-orange-200',
  },
  {
    status: 'Gewonnen',
    label: 'Gewonnen',
    description: 'Ausschreibung erfolgreich gewonnen',
    suggestedAction: 'Übergabe an Projektteam und Auftragsbestätigung',
    color: 'bg-emerald-50 border-emerald-300',
    terminal: true,
  },
  {
    status: 'Verloren',
    label: 'Verloren',
    description: 'Ausschreibung nicht gewonnen',
    suggestedAction: 'Nachbesprechung und Learnings dokumentieren',
    color: 'bg-red-50 border-red-200',
    terminal: true,
  },
];

export const ACTIVE_WORKFLOW_STAGES = WORKFLOW_STAGES.filter((s) => !s.terminal);
