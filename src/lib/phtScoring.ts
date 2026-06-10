import {
  scoreTender,
  scoreAllTenders,
  categorizeBudget,
  filterByScore,
  filterByRecommendation,
} from '../../lib/phtScoring.js';
import type { GlobalTenderRaw } from './globalTenderSearch';

export interface ScoreResult {
  score: number;
  recommendation: 'GO' | 'PRÜFEN' | 'NO-GO';
  category: 'A' | 'B' | 'C';
  breakdown: {
    keywordScore: number;
    budgetScore: number;
    regionScore: number;
    industryScore: number;
    matchedKeywords: string[];
  };
}

export function scoreGlobalTender(tender: GlobalTenderRaw): ScoreResult {
  return scoreTender(tender) as ScoreResult;
}

export function scoreGlobalTenders(tenders: GlobalTenderRaw[]): GlobalTenderRaw[] {
  return scoreAllTenders(tenders) as GlobalTenderRaw[];
}

export { categorizeBudget, filterByScore, filterByRecommendation };
