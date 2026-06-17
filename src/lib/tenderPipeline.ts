import type { GlobalTenderRaw } from './globalTenderSearch';
import { rawMatchesPHT } from './phtMatch';
import { processItemsWithBudget, runWithSyncBudget } from './mainThreadBudget';
import { IDLE_WORK_TIMEOUT_MS, REPROCESS_CHUNK_SIZE } from './performanceConstants';
import { reprocessTendersInWorker } from './tenderReprocessWorker';
import {
  filterReprocessCandidates,
  processTendersFromSource,
  rescoredStoredTender,
  stripCachedScores,
} from './tenderPipelineCore';
import { applySavedWorkflowState } from './tenderAdapter';
import type { Tender } from '../types/tender';

export {
  filterMatchingRaws,
  processTendersFromSource,
  reprocessStoredTenders,
  rescoredStoredTender,
} from './tenderPipelineCore';

function scheduleIdleWork(work: () => void): void {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(work, { timeout: IDLE_WORK_TIMEOUT_MS });
  } else {
    setTimeout(work, 0);
  }
}

async function reprocessOnMainThread(
  stored: Tender[],
  onProgress: (result: Tender[]) => void,
): Promise<Tender[]> {
  const savedMap = new Map(stored.map((t) => [t.id, t]));
  const candidates = filterReprocessCandidates(stored);

  if (candidates.length === 0) {
    onProgress([]);
    return [];
  }

  const results: Tender[] = [];
  let index = 0;

  return new Promise((resolve) => {
    const processChunk = () => {
      const frameStart = performance.now();
      const end = Math.min(index + REPROCESS_CHUNK_SIZE, candidates.length);

      for (; index < end; index += 1) {
        const candidate = candidates[index];
        const rescored = rescoredStoredTender(candidate);
        if (rescored) {
          results.push(applySavedWorkflowState(rescored, savedMap.get(candidate.id)));
        }
        if (performance.now() - frameStart >= 12) break;
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

/**
 * Re-score cached tenders in chunks (Web Worker preferred) so the main thread stays responsive on load.
 */
export function reprocessStoredTendersChunked(
  stored: Tender[],
  onProgress: (result: Tender[]) => void,
): Promise<Tender[]> {
  const candidates = filterReprocessCandidates(stored);

  if (candidates.length === 0) {
    onProgress([]);
    return Promise.resolve([]);
  }

  const savedById = Object.fromEntries(stored.map((t) => [t.id, t]));

  return reprocessTendersInWorker(candidates, savedById, onProgress).catch(() =>
    reprocessOnMainThread(stored, onProgress),
  );
}

/**
 * Async pipeline for large API responses – filters in budgeted chunks before adapt/merge.
 */
export async function processTendersFromSourceAsync(
  raws: GlobalTenderRaw[],
  saved: Tender[] = [],
): Promise<Tender[]> {
  const matched: GlobalTenderRaw[] = [];
  await processItemsWithBudget(
    raws,
    (raw) => {
      if (rawMatchesPHT(raw)) matched.push(stripCachedScores(raw));
    },
    { chunkSize: REPROCESS_CHUNK_SIZE, label: 'filterMatchingRaws' },
  );

  return runWithSyncBudget('processTendersFromSource', () =>
    processTendersFromSource(matched, saved),
  );
}
