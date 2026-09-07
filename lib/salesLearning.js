/**
 * Sales feedback storage – explicit thumb + reason only (no silent score tuning).
 *
 * Storage key: `pht-sales-feedback`
 */

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
 * Simple weighted score adjustment – returns base score unchanged.
 * Learning happens only via explicit thumb + reason feedback (discovery profile).
 */
export function adjustPriorityScore(baseScore, _customerId, _sector, _discoveryProfile) {
  return baseScore;
}

/** @param {string} customerId */
export function getCustomerFeedback(customerId) {
  return loadSalesFeedback()[customerId] ?? null;
}
