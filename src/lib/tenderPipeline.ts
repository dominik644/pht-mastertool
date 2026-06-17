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

const REPROCESS_CHUNK_SIZE = 40;

function scheduleIdleWork(work: () => void): void {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(work, { timeout: 120 });
  } else {
    setTimeout(work, 0);
  }
}

/**
 * Re-score cached tenders in chunks so the main thread stays responsive on load.
 */
export function reprocessStoredTendersChunked(
  stored: Tender[],
  onProgress: (result: Tender[]) => void,
): Promise<Tender[]> {
  const savedMap = new Map(stored.map((t) => [t.id, t]));
  const candidates = stored.filter((t) => !isDemoTenderId(t.id) && isTenderStillActive(t));

  if (candidates.length === 0) {
    onProgress([]);
    return Promise.resolve([]);
  }

  return new Promise((resolve) => {
    const results: Tender[] = [];
    let index = 0;

    const processChunk = () => {
      const end = Math.min(index + REPROCESS_CHUNK_SIZE, candidates.length);
      for (; index < end; index += 1) {
        const rescored = rescoredStoredTender(candidates[index]);
        if (rescored) {
          results.push(applySavedWorkflowState(rescored, savedMap.get(candidates[index].id)));
        }
      }
      onProgress([...results]);
      if (index < candidates.length) {
        scheduleIdleWork(processChunk);
      } else {
        resolve(results);
      }
    };

    scheduleIdleWork(processChunk);
  });
}
