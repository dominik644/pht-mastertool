import { useCallback, useEffect, useState } from 'react';
import {
  computePipelineMetrics,
  loadPipelineEntries,
  PIPELINE_CHANGED_EVENT,
} from '../services/salesPipelineStorage';
import type { SalesPipelineMetrics } from '../types/salesPipeline';

const STORAGE_KEY = 'pht_sales_pipeline';

/** Reactive pipeline metrics (Monatsziel, Forecast, Win-Rate). */
export function usePipelineMetrics(): SalesPipelineMetrics {
  const [metrics, setMetrics] = useState(() => computePipelineMetrics());

  const refresh = useCallback(() => {
    setMetrics(computePipelineMetrics(loadPipelineEntries()));
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener(PIPELINE_CHANGED_EVENT, refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(PIPELINE_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, [refresh]);

  return metrics;
}
