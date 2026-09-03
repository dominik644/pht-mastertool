import {
  adjustPriorityScore as adjustScore,
  getCustomerFeedback as getFeedback,
  loadSalesFeedback,
  recordLeadFeedback,
  SALES_FEEDBACK_STORAGE_KEY,
} from '../../lib/salesLearning.js';
import { loadDiscoveryProfile, rebuildDiscoveryProfile } from './discoveryLearning';

export const SALES_FEEDBACK_CHANGED_EVENT = 'pht-sales-feedback-changed';

export type LeadRating = 'good' | 'bad' | null;
export type VisitOutcome = 'won' | 'lost' | 'neutral' | null;

export interface CustomerFeedback {
  leadRating: LeadRating;
  visitRelevant: boolean | null;
  visitOutcome: VisitOutcome;
  sectorHits: string[];
  positiveCount: number;
  negativeCount: number;
  leadReason?: string;
  reasonTags?: string[];
  updatedAt: string;
}

export function getCustomerFeedback(customerId: string): CustomerFeedback | null {
  return getFeedback(customerId) as CustomerFeedback | null;
}

export function adjustPriorityScore(
  baseScore: number,
  customerId: string,
  sector?: string,
): number {
  return adjustScore(baseScore, customerId, sector, loadDiscoveryProfile());
}

export function recordFeedback(
  customerId: string,
  patch: {
    leadRating?: LeadRating;
    visitRelevant?: boolean | null;
    visitOutcome?: VisitOutcome;
    sectorHit?: string;
    leadReason?: string;
    reasonTags?: string[];
  },
  customerMeta?: { sector?: string; name?: string },
): CustomerFeedback {
  const result = recordLeadFeedback(customerId, patch) as CustomerFeedback;
  rebuildDiscoveryProfile(
    customerMeta ? { [customerId]: customerMeta } : undefined,
  );
  window.dispatchEvent(new CustomEvent(SALES_FEEDBACK_CHANGED_EVENT));
  void import('./salesSync').then(({ syncFeedbackToSupabase }) => {
    void syncFeedbackToSupabase(customerId, result);
  });
  return result;
}

export { loadSalesFeedback, SALES_FEEDBACK_STORAGE_KEY };
