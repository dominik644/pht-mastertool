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
  portfolioMatchProb?: number;
  winProbability?: number;
  urgencyScore?: number;
  overallOpportunityScore?: number;
  revenueTier?: 'low' | 'medium' | 'high';
  revenuePotentialLevel?: string;
  probabilityBreakdown?: import('../types/tender').TenderProbabilityBreakdown;
  scoreBreakdown?: Record<string, unknown>;
}

export type GlobalSearchResult = {
  tenders: GlobalTenderRaw[];
  source: string;
  regions: string[];
  total: number;
  page?: number;
  hasMore?: boolean;
  cursor?: number;
  estimatedTotal?: number;
  /** PHT-relevante Treffer laut letztem Ingest – nicht Roh-DB-Zeilen. */
  relevantTotal?: number;
  dbRowTotal?: number;
  excluded?: number;
  error?: string;
  tedSource?: string;
  isDemo?: boolean;
  providerCount?: number;
  providersTotal?: number;
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
