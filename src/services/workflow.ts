import { BID_CHECKLIST_ITEMS } from '../../lib/phtConfig.js';
import { WORKFLOW_STAGES } from '../data/workflow';
import type { PipelineStatus, Tender } from '../types/tender';
import type { WorkflowHistoryEntry } from '../types/workflow';

function checklistPct(tender: Tender): number {
  const done = BID_CHECKLIST_ITEMS.filter((item) => tender.bidChecklist?.[item]).length;
  return done / BID_CHECKLIST_ITEMS.length;
}

export function canAdvanceToStage(
  tender: Tender,
  toStatus: PipelineStatus,
): { ok: boolean; reason?: string } {
  const pct = checklistPct(tender);
  if (toStatus === 'Abgegeben' && pct < 0.7) {
    return { ok: false, reason: `Bid-Checklist ${Math.round(pct * 100)}% – mindestens 70% für Abgabe` };
  }
  if (toStatus === 'Angebot vorbereiten' && tender.status === 'Technik prüfen' && pct < 0.4) {
    return { ok: false, reason: `Bid-Checklist ${Math.round(pct * 100)}% – mindestens 40% für Angebot` };
  }
  return { ok: true };
}

export function getStageIndex(status: PipelineStatus): number {
  return WORKFLOW_STAGES.findIndex((s) => s.status === status);
}

export function getStage(status: PipelineStatus) {
  return WORKFLOW_STAGES.find((s) => s.status === status);
}

export function getNextStatus(status: PipelineStatus): PipelineStatus | null {
  const idx = getStageIndex(status);
  if (idx < 0) return null;
  if (status === 'Abgegeben') return null;
  const next = WORKFLOW_STAGES[idx + 1];
  if (!next || next.terminal) return null;
  return next.status;
}

export function getPreviousStatus(status: PipelineStatus): PipelineStatus | null {
  const idx = getStageIndex(status);
  if (idx <= 0) return null;
  return WORKFLOW_STAGES[idx - 1].status;
}

export function getSuggestedAction(status: PipelineStatus): string {
  return getStage(status)?.suggestedAction ?? '';
}

export function isTerminalStatus(status: PipelineStatus): boolean {
  return getStage(status)?.terminal ?? false;
}

export function isInWorkflow(tender: Tender): boolean {
  return tender.scoreRecommendation !== 'NO-GO';
}

export function createHistoryEntry(
  tender: Tender,
  fromStatus: PipelineStatus | null,
  toStatus: PipelineStatus,
  note?: string,
): WorkflowHistoryEntry {
  return {
    id: `${tender.id}-${Date.now()}`,
    tenderId: tender.id,
    tenderTitle: tender.title,
    fromStatus,
    toStatus,
    timestamp: new Date().toISOString(),
    note,
  };
}

export function groupTendersByStatus(tenders: Tender[]): Record<PipelineStatus, Tender[]> {
  const groups = Object.fromEntries(
    WORKFLOW_STAGES.map((s) => [s.status, [] as Tender[]]),
  ) as Record<PipelineStatus, Tender[]>;

  for (const tender of tenders) {
    if (isInWorkflow(tender) && groups[tender.status]) {
      groups[tender.status].push(tender);
    }
  }

  for (const status of Object.keys(groups) as PipelineStatus[]) {
    groups[status].sort((a, b) => b.estimatedValue - a.estimatedValue);
  }

  return groups;
}
