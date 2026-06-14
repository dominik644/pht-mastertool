export type Category = 'A' | 'B' | 'C';
export type GoNoGo = 'GO' | 'NO-GO';
export type ScoreRecommendation = 'GO' | 'PRÜFEN' | 'NO-GO';
export type Region = 'Europa' | 'DACH' | 'UK' | 'Middle East' | 'Afrika';
export type Priority = 'hoch' | 'mittel' | 'niedrig';
export type PipelineStatus =
  | 'Neu'
  | 'Prüfen'
  | 'Technik prüfen'
  | 'Angebot vorbereiten'
  | 'Abgegeben'
  | 'Gewonnen'
  | 'Verloren';

export type TenderSource = 'TED' | 'BBG' | 'Find a Tender' | 'Contracts Finder' | 'eTenders' | 'AusTender';

export interface ProductProfileMatch {
  id: string;
  name: string;
  score: number;
  matchedKeywords: string[];
}

export interface ProductMatch {
  main: string;
  alternatives: string[];
  priceRange: string;
  reasoning: string;
  profiles?: ProductProfileMatch[];
}

export interface Milestone {
  id: string;
  title: string;
  dueDate: string;
  type: string;
  completed: boolean;
}

export interface SimilarityHint {
  tenderId: string;
  title: string;
  score: number;
  reasons: string[];
}

export interface Tender {
  id: string;
  title: string;
  description: string;
  country: string;
  region: string;
  currency: string;
  budget?: number;
  estimatedBudget: number;
  score: number;
  scoreRecommendation: ScoreRecommendation;
  scoreBreakdown?: {
    keywordScore: number;
    budgetScore: number;
    regionScore: number;
    industryScore: number;
    productProfileScore?: number;
    deadlineScore?: number;
    cpvScore?: number;
    matchedKeywords: string[];
  };
  source: TenderSource;
  deadline: string;
  submissionDeadline: string;
  decisionDate?: string;
  estimatedValue: number;
  industry: string;
  keywords: string[];
  cpvCodes: string[];
  url?: string;
  sourceUrl: string;
  sourcePlatform: string;
  publicationDate: string;
  category: Category;
  goNoGo: GoNoGo;
  revenuePotential: string;
  productMatch: ProductMatch;
  matchedProducts?: string[];
  similarityHints?: SimilarityHint[];
  milestones: Milestone[];
  nextStep: string;
  status: PipelineStatus;
  watchlist: boolean;
  priority?: Priority;
  responsible?: string;
  notes?: string;
  nextAction?: string;
  bidChecklist?: Record<string, boolean>;
  lossReason?: string;
  competitor?: string;
  wonValue?: number;
  createdAt: string;
  /** Retained from a prior search fetch; not in the latest API response. */
  fromHistory?: boolean;
}

export interface Reminder {
  tenderId: string;
  tenderTitle: string;
  deadline: string;
  daysLeft: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  suggestedAction?: string;
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
  profileDistribution: Record<string, number>;
}
