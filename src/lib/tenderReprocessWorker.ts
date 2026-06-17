import { REPROCESS_CHUNK_SIZE } from './performanceConstants';
import type { ReprocessBatchRequest, ReprocessBatchResponse } from '../workers/tenderReprocess.worker';
import type { Tender } from '../types/tender';

let worker: Worker | null = null;
let workerFailed = false;

function getWorker(): Worker | null {
  if (workerFailed || typeof Worker === 'undefined') return null;
  if (!worker) {
    try {
      worker = new Worker(new URL('../workers/tenderReprocess.worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.addEventListener('error', () => {
        workerFailed = true;
        worker?.terminate();
        worker = null;
      });
    } catch {
      workerFailed = true;
      return null;
    }
  }
  return worker;
}

function reprocessBatchInWorker(
  candidates: Tender[],
  savedById: Record<string, Tender>,
): Promise<Tender[]> {
  const w = getWorker();
  if (!w) return Promise.reject(new Error('Worker unavailable'));

  const id = Date.now() + Math.random();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Worker batch timeout'));
    }, 30_000);

    const onMessage = (event: MessageEvent<ReprocessBatchResponse>) => {
      if (event.data?.type !== 'batch-result' || event.data.id !== id) return;
      cleanup();
      resolve(event.data.results);
    };

    const onError = () => {
      cleanup();
      workerFailed = true;
      reject(new Error('Worker error'));
    };

    const cleanup = () => {
      clearTimeout(timeout);
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
    };

    w.addEventListener('message', onMessage);
    w.addEventListener('error', onError);

    const request: ReprocessBatchRequest = {
      type: 'reprocess-batch',
      id,
      candidates,
      savedById,
    };
    w.postMessage(request);
  });
}

/**
 * Re-score cached tenders in a Web Worker when available (keeps price-list matching off the main thread).
 */
export async function reprocessTendersInWorker(
  candidates: Tender[],
  savedById: Record<string, Tender>,
  onProgress: (result: Tender[]) => void,
): Promise<Tender[]> {
  const results: Tender[] = [];

  for (let i = 0; i < candidates.length; i += REPROCESS_CHUNK_SIZE) {
    const batch = candidates.slice(i, i + REPROCESS_CHUNK_SIZE);
    const batchResults = await reprocessBatchInWorker(batch, savedById);
    results.push(...batchResults);
    onProgress([...results]);
  }

  return results;
}
