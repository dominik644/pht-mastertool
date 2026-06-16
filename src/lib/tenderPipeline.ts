import type { GlobalTenderRaw } from './globalTenderSearch';
import { rawMatchesPHT, tenderMatchesPHT, tenderToRaw } from './phtMatch';
import { scoreGlobalTender } from './phtScoring';
import {
  adaptGlobalTenders,
  applySavedWorkflowState,
  globalToTender,
  isTenderStillActive,
  mergeTenderState,
} from './tenderAdapter';
import type { Tender } from '../types/tender';

const DEMO_ID_PREFIXES = ['demo-', 'dach-', 'af-', 'me-', 'ted-fallback-'];

function isDemoTenderId(id: string): boolean {
  return DEMO_ID_PREFIXES.some((p) => id.startsWith(p));
}

/** Drop cached ingest scores so scoring always uses current rules. */
function stripCachedScores(raw: GlobalTenderRaw): GlobalTenderRaw {
  const { score: _s, recommendation: _r, category: _c, ...rest } = raw;
  return rest as GlobalTenderRaw;
}

/**
 * Re-score a stored tender with current rules; null if it no longer matches PHT.
 */
export function rescoredStoredTender(t: Tender): Tender | null {
  if (isDemoTenderId(t.id)) return null;
  if (!tenderMatchesPHT(t)) return null;
  const raw = stripCachedScores(tenderToRaw(t));
  const scoring = scoreGlobalTender(raw);
  const refreshed = globalToTender(raw, scoring);
  return {
    ...refreshed,
    watchlist: t.watchlist,
    excluded: t.excluded ?? false,
    status: t.status,
    responsible: t.responsible,
    notes: t.notes,
    nextAction: t.nextAction,
    priority: t.priority,
    milestones: t.milestones?.length ? t.milestones : refreshed.milestones,
    goNoGo: t.goNoGo ?? refreshed.goNoGo,
    fromHistory: t.fromHistory,
  };
}

export function filterMatchingRaws(raws: GlobalTenderRaw[]): GlobalTenderRaw[] {
  return raws.filter(rawMatchesPHT).map(stripCachedScores);
}

/**
 * Full read-path pipeline: PHT match gate → fresh score → adapt → merge workflow state.
 */
export function processTendersFromSource(raws: GlobalTenderRaw[], saved: Tender[] = []): Tender[] {
  const analyzed = adaptGlobalTenders(filterMatchingRaws(raws));
  const reprocessedSaved = saved
    .filter((t) => !isDemoTenderId(t.id))
    .map(rescoredStoredTender)
    .filter((t): t is Tender => t !== null);
  return mergeTenderState(analyzed, reprocessedSaved).filter(tenderMatchesPHT);
}

/** Re-apply match + score rules to tenders restored from localStorage. */
export function reprocessStoredTenders(stored: Tender[]): Tender[] {
  const savedMap = new Map(stored.map((t) => [t.id, t]));
  return stored
    .filter((t) => !isDemoTenderId(t.id) && isTenderStillActive(t))
    .map((t) => rescoredStoredTender(t))
    .filter((t): t is Tender => t !== null)
    .map((t) => applySavedWorkflowState(t, savedMap.get(t.id)));
}
