export type Category = 'A' | 'B' | 'C';
export type GoNoGo = 'GO' | 'NO-GO';
export type ScoreRecommendation = 'GO' | 'PRÜFEN' | 'NO-GO';
export type Region = 'Europa' | 'DACH' | 'UK' | 'Middle East' | 'Afrika' | 'Asien-Pazifik';
export type PipelineStatus =
  | 'Neu'
  | 'Prüfen'
  | 'Technik prüfen'
  | 'Angebot vorbereiten'
  | 'Abgegeben'
  | 'Gewonnen'
  | 'Verloren';

export type TenderSource = 'TED' | 'BBG' | 'Find a Tender' | 'Contracts Finder' | 'eTenders' | 'AusTender';

export interface ProductMatch {
  main: string;
  alternatives: string[];
  priceRange: string;
  reasoning: string;
}

export interface Tender {
  id: string;
  title: string;
  description: string;
  country: string;
  region: string;
  currency: string;
  score: number;
  scoreRecommendation: ScoreRecommendation;
  scoreBreakdown?: {
    keywordScore: number;
    budgetScore: number;
    regionScore: number;
    industryScore: number;
    matchedKeywords: string[];
  };
  source: TenderSource;
  deadline: string;
  estimatedValue: number;
  industry: string;
  keywords: string[];
  url?: string;
  sourceUrl: string;
  sourcePlatform: string;
  publicationDate: string;
  category: Category;
  goNoGo: GoNoGo;
  revenuePotential: string;
  productMatch: ProductMatch;
  nextStep: string;
  status: PipelineStatus;
  watchlist: boolean;
  responsible?: string;
  notes?: string;
  nextAction?: string;
  createdAt: string;
}

export interface Reminder {
  tenderId: string;
  tenderTitle: string;
  deadline: string;
  daysLeft: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
}

export interface DashboardStats {
  total: number;
  newCount: number;
  categoryA: number;
  categoryB: number;
  categoryC: number;
  goCount: number;
  noGoCount: number;
  pruefenCount: number;
  highScoreCount: number;
  watchlistCount: number;
  deadlinesUnder14: number;
  newTodayCount: number;
  topChances: Tender[];
  workflowActive: number;
  workflowCounts: Record<PipelineStatus, number>;
  regions: string[];
}
