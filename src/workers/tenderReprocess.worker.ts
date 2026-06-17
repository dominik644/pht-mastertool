import { applySavedWorkflowState } from '../lib/tenderAdapter';
import { rescoredStoredTender } from '../lib/tenderPipelineCore';
import type { Tender } from '../types/tender';

export interface ReprocessBatchRequest {
  type: 'reprocess-batch';
  id: number;
  candidates: Tender[];
  savedById: Record<string, Tender>;
}

export interface ReprocessBatchResponse {
  type: 'batch-result';
  id: number;
  results: Tender[];
}

self.onmessage = (event: MessageEvent<ReprocessBatchRequest>) => {
  const { type, id, candidates, savedById } = event.data;
  if (type !== 'reprocess-batch') return;

  const results: Tender[] = [];
  for (const candidate of candidates) {
    const rescored = rescoredStoredTender(candidate);
    if (rescored) {
      results.push(applySavedWorkflowState(rescored, savedById[candidate.id]));
    }
  }

  const response: ReprocessBatchResponse = { type: 'batch-result', id, results };
  self.postMessage(response);
};
