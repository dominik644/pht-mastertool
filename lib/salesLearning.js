/**
 * Sales learning foundation – weighted feedback loop (localStorage, no ML yet).
 *
 * Stores user signals (lead quality, visit outcomes, sector hits) and adjusts
 * priority scores over time. Path to real ML: export `pht-sales-feedback` +
 * visit/pipeline outcomes as training labels for a classifier on sector/geo features.
 *
 * Storage key: `pht-sales-feedback`
 */

import { scoreDiscoveryLead } from './discoveryLearning.js';

export const SALES_FEEDBACK_STORAGE_KEY = 'pht-sales-feedback';

/** @typedef {'good' | 'bad' | null} LeadRating */
/** @typedef {'won' | 'lost' | 'neutral' | null} VisitOutcome */

/**
 * @typedef {object} CustomerFeedback
 * @property {LeadRating} leadRating
 * @property {boolean | null} visitRelevant
 * @property {VisitOutcome} visitOutcome
 * @property {string[]} sectorHits
 * @property {number} positiveCount
 * @property {number} negativeCount
 * @property {string} [leadReason]
 * @property {string[]} [reasonTags]
 * @property {string} updatedAt
 */

/** @returns {Record<string, CustomerFeedback>} */
export function loadSalesFeedback() {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SALES_FEEDBACK_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** @param {Record<string, CustomerFeedback>} store */
export function saveSalesFeedback(store) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SALES_FEEDBACK_STORAGE_KEY, JSON.stringify(store));
}

/**
 * @param {string} customerId
 * @param {{ leadRating?: LeadRating, visitRelevant?: boolean | null, visitOutcome?: VisitOutcome, sectorHit?: string, leadReason?: string, reasonTags?: string[] }} patch
 */
export function recordLeadFeedback(customerId, patch = {}) {
  const store = loadSalesFeedback();
  const prev = store[customerId] ?? {
    leadRating: null,
    visitRelevant: null,
    visitOutcome: null,
    sectorHits: [],
    positiveCount: 0,
    negativeCount: 0,
    leadReason: undefined,
    reasonTags: [],
    updatedAt: new Date().toISOString(),
  };

  const next = { ...prev, updatedAt: new Date().toISOString() };

  if (patch.leadRating !== undefined) {
    const ratingChanged = patch.leadRating !== prev.leadRating;
    next.leadRating = patch.leadRating;
    if (ratingChanged) {
      if (patch.leadRating === 'good') next.positiveCount += 1;
      if (patch.leadRating === 'bad') next.negativeCount += 1;
    }
  }
  if (patch.leadReason !== undefined) {
    next.leadReason = patch.leadReason?.trim() || undefined;
  }
  if (patch.reasonTags !== undefined) {
    next.reasonTags = [...patch.reasonTags];
  }
  if (patch.visitRelevant !== undefined) {
    next.visitRelevant = patch.visitRelevant;
    if (patch.visitRelevant) next.positiveCount += 1;
    else next.negativeCount += 1;
  }
  if (patch.visitOutcome !== undefined) {
    next.visitOutcome = patch.visitOutcome;
    if (patch.visitOutcome === 'won') next.positiveCount += 2;
    if (patch.visitOutcome === 'lost') next.negativeCount += 1;
  }
  if (patch.sectorHit) {
    const hits = new Set(next.sectorHits);
    hits.add(patch.sectorHit);
    next.sectorHits = [...hits];
  }

  store[customerId] = next;
  saveSalesFeedback(store);
  return next;
}

/**
 * Simple weighted score adjustment from feedback history.
 * @param {number} baseScore
 * @param {string} customerId
 * @param {string} [sector]
 * @param {ReturnType<import('./discoveryLearning.js').emptyDiscoveryProfile>} [discoveryProfile]
 */
export function adjustPriorityScore(baseScore, customerId, sector, discoveryProfile) {
  const store = loadSalesFeedback();
  const fb = store[customerId];
  let score = baseScore;
  let delta = 0;

  if (fb) {
    if (fb.leadRating === 'good') delta += 8;
    if (fb.leadRating === 'bad') delta -= 12;
    if (fb.visitRelevant === true) delta += 6;
    if (fb.visitRelevant === false) delta -= 10;
    if (fb.visitOutcome === 'won') delta += 15;
    if (fb.visitOutcome === 'lost') delta -= 5;
    delta += Math.min(10, fb.positiveCount * 2);
    delta -= Math.min(15, fb.negativeCount * 3);
    if (sector && fb.sectorHits.includes(sector)) delta += 4;
    score = Math.max(0, Math.min(100, Math.round(baseScore + delta)));
  }

  if (discoveryProfile && sector && !fb?.leadRating) {
    const leadScore = scoreDiscoveryLead({ sector }, discoveryProfile);
    score = Math.max(0, Math.min(100, Math.round(score + leadScore * 0.3)));
  }

  return score;
}

/** @param {string} customerId */
export function getCustomerFeedback(customerId) {
  return loadSalesFeedback()[customerId] ?? null;
}
