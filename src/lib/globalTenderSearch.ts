import {
  searchGlobalTenders as searchJS,
  filterByRegion,
  filterByCountry,
} from '../../lib/globalTenderSearch.js';

export interface GlobalTenderRaw {
  id: string;
  title: string;
  country: string;
  region: string;
  budget: number;
  budgetEur: number;
  estimatedBudget?: number;
  currency: string;
  sourcePlatform: string;
  sourceUrl: string;
  publicationDate: string;
  submissionDeadline: string;
  decisionDate?: string;
  description: string;
  industry: string;
  keywords: string[];
  cpvCodes?: string[];
  score?: number;
  recommendation?: 'GO' | 'PRÜFEN' | 'NO-GO';
  category?: 'A' | 'B' | 'C';
}

export type GlobalSearchResult = {
  tenders: GlobalTenderRaw[];
  source: string;
  regions: string[];
  total: number;
  excluded?: number;
  error?: string;
  tedSource?: string;
  isDemo?: boolean;
  providerCount?: number;
  providersTotal?: number;
  estimatedTotal?: number;
  liveProviders?: string[];
  bulkFreshnessLabel?: string | null;
  bulkStale?: boolean;
  lastBulkUpdate?: string | null;
};

export async function searchGlobalTenders(options?: { mobile?: boolean }): Promise<GlobalSearchResult> {
  return searchJS(options) as Promise<GlobalSearchResult>;
}

export async function searchGlobalTendersIncremental(
  options?: { mobile?: boolean; batchSize?: number; onProgress?: (partial: GlobalSearchResult) => void },
): Promise<GlobalSearchResult> {
  const { loadTendersIncremental } = await import('../../lib/tenders/index.js');
  return loadTendersIncremental({
    ...options,
    onProgress: options?.onProgress
      ? (partial) => options.onProgress!(partial as GlobalSearchResult)
      : undefined,
  }) as Promise<GlobalSearchResult>;
}

export { WORLDWIDE_PROVIDER_TOTAL } from '../../lib/tenders/index.js';

export { filterByRegion, filterByCountry };
