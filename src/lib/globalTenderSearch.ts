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
  liveProviders?: string[];
};

export async function searchGlobalTenders(): Promise<GlobalSearchResult> {
  return searchJS() as Promise<GlobalSearchResult>;
}

export { filterByRegion, filterByCountry };
