export interface NewsLead {
  id: string;
  title: string;
  description?: string;
  url: string;
  publishedAt: string;
  sourceName: string;
  relevanceScore: number;
  tenderLikelihood?: number;
  phtFitProb?: number;
  signalType?: 'early-indicator';
  isEarlyIndicator?: boolean;
  isMegaExpansion?: boolean;
  companyGuess?: string | null;
  country?: string | null;
  projectType?: string;
  summaryDe?: string | null;
  topSegment?: string | null;
  matchedKeywords?: string[];
}
