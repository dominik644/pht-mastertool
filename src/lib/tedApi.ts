export {
  loadTendersFromTED,
  fetchTEDNotices,
  parseTEDNotice,
  PHT_MATCH_KEYWORDS,
  FALLBACK_TENDERS,
  ALLOWED_REGIONS,
} from '../../lib/tedApi.js';

export interface TEDTenderRaw {
  id: string;
  title: string;
  country: string;
  countryCode?: string;
  region: string;
  budget: number;
  currency: string;
  sourcePlatform: string;
  sourceUrl: string;
  publicationDate: string;
  submissionDeadline: string;
  description: string;
  industry: string;
  cpvCodes: string[];
  keywords: string[];
}

export type TEDLoadResult = {
  tenders: TEDTenderRaw[];
  source: 'ted-api' | 'ted-fallback';
  total: number;
  apiTotal?: number;
  error?: string;
};
