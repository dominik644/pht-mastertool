import { useEffect, useState } from 'react';
import {
  loadPipelineSourceIds,
  PIPELINE_CHANGED_EVENT,
} from '../services/salesPipelineStorage';
import type { SalesSourceType } from '../types/salesPipeline';

const STORAGE_KEY = 'pht_sales_pipeline';

/** Reactive set of source IDs in the Vertriebs-Pipeline for a given source type. */
export function usePipelineSourceIds(sourceType: SalesSourceType): Set<string> {
  const [ids, setIds] = useState(() => loadPipelineSourceIds(sourceType));

  useEffect(() => {
    const refresh = () => setIds(loadPipelineSourceIds(sourceType));
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener(PIPELINE_CHANGED_EVENT, refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(PIPELINE_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, [sourceType]);

  return ids;
}
