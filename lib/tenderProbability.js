/**
 * Lightweight probability / relevance metrics for tenders & news leads.
 * Designed for server-side batch use (no heavy deps, O(1) per item).
 */
import { hasEquipmentSignal } from './phtMatchRules.js';
import { cpvMatchesEquipment } from './tenders/cpvMatch.js';

function clamp(n, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function daysUntilDeadline(deadline) {
  if (!deadline) return null;
  const dateOnly = String(deadline).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const target = new Date(`${dateOnly}T12:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function nicheEquipmentBonus(tender, breakdown) {
  const text = `${tender.title ?? ''} ${tender.description ?? ''}`.toLowerCase();
  const cpvCodes = Array.isArray(tender.cpvCodes) ? tender.cpvCodes : [];
  const cpvHit = cpvMatchesEquipment(cpvCodes);
  const catalogStrong = (breakdown.catalogScore ?? 0) >= 18;
  const equipSignal = hasEquipmentSignal(text);
  if (catalogStrong && equipSignal) return 12;
  if (cpvHit && equipSignal) return 10;
  if (catalogStrong || cpvHit) return 6;
  if (equipSignal) return 4;
  return 0;
}

/**
 * Portfolio fit 0–100: catalog + segment + equipment signals.
 */
export function portfolioMatchProb(tender, breakdown = {}) {
  const catalog = Math.min(42, (breakdown.catalogScore ?? 0) * 1.4);
  const segments = breakdown.matchedPortfolioSegments ?? [];
  const segment = segments.length
    ? Math.min(33, (segments[0].score ?? 0) * 3.3)
    : 0;
  const text = `${tender.title ?? ''} ${tender.description ?? ''}`.toLowerCase();
  let equip = 0;
  if (hasEquipmentSignal(text)) equip = 28;
  else if ((breakdown.cpvScore ?? 0) > 0) equip = 14;
  else if ((breakdown.priceListScore ?? 0) > 0) equip = 10;
  return clamp(catalog + segment + equip);
}

/**
 * Win heuristic 0–100: score, deadline buffer, budget, region, GO/PRÜFEN, niche equipment.
 */
export function winProbability(tender, scoring) {
  const breakdown = scoring.breakdown ?? {};
  const score = scoring.score ?? 0;
  const recommendation = scoring.recommendation ?? 'NO-GO';

  let prob = score * 0.42;

  const days = daysUntilDeadline(tender.submissionDeadline || tender.deadline);
  if (days === null) prob += 6;
  else if (days >= 14) prob += 18;
  else if (days >= 7) prob += 10;
  else if (days >= 0) prob += 2;

  const category = scoring.category ?? 'B';
  if (category === 'C') prob += 14;
  else if (category === 'B') prob += 9;
  else prob += 4;

  const region = tender.region ?? '';
  if (region === 'DACH') prob += 14;
  else if (region === 'Europa' || region === 'UK') prob += 8;
  else prob += 3;

  if (recommendation === 'GO') prob += 14;
  else if (recommendation === 'PRÜFEN') prob += 5;

  prob += nicheEquipmentBonus(tender, breakdown);

  const budgetEur = tender.budgetEur ?? tender.budget ?? 0;
  if (budgetEur >= 100_000 && budgetEur <= 2_000_000) prob += 6;

  return clamp(prob);
}

/**
 * Urgency 0–100 from days to submission deadline.
 */
export function urgencyScore(tender) {
  const days = daysUntilDeadline(tender.submissionDeadline || tender.deadline);
  if (days === null) return 18;
  if (days <= 0) return 92;
  if (days <= 3) return 96;
  if (days <= 7) return 86;
  if (days <= 14) return 72;
  if (days <= 30) return 52;
  if (days <= 60) return 32;
  return 14;
}

/**
 * Revenue tier from budget + segment.
 * @returns {'low'|'medium'|'high'}
 */
export function revenueTier(tender, breakdown = {}) {
  const budgetEur = tender.budgetEur ?? tender.budget ?? 0;
  const segments = breakdown.matchedPortfolioSegments ?? [];
  const topSegment = segments[0]?.segmentId ?? segments[0]?.lineId ?? '';
  const highValueSegment = /food|pharma|healthcare|industrial|logistics/i.test(topSegment)
    || /Food|Pharma|Hospital|Production/i.test(tender.industry ?? '');

  if (budgetEur >= 100_000 || (budgetEur >= 50_000 && highValueSegment)) return 'high';
  if (budgetEur >= 10_000 || highValueSegment) return 'medium';
  return 'low';
}

const REVENUE_TIER_LABEL = { low: 'niedrig', medium: 'mittel', high: 'hoch' };

/**
 * Weighted sort key 0–100.
 */
export function overallOpportunityScore(tender, scoring, metrics) {
  const portfolio = metrics?.portfolioMatchProb ?? portfolioMatchProb(tender, scoring.breakdown);
  const win = metrics?.winProbability ?? winProbability(tender, scoring);
  const urgency = metrics?.urgencyScore ?? urgencyScore(tender);
  const score = scoring.score ?? 0;
  const tier = metrics?.revenueTier ?? revenueTier(tender, scoring.breakdown);
  const tierBoost = tier === 'high' ? 8 : tier === 'medium' ? 4 : 0;

  const combined = portfolio * 0.28 + win * 0.34 + urgency * 0.14 + score * 0.24 + tierBoost;
  return clamp(combined);
}

/**
 * Attach all tender probability fields (server read path).
 */
export function computeTenderProbabilities(tender, scoring) {
  const breakdown = scoring.breakdown ?? {};
  const portfolio = portfolioMatchProb(tender, breakdown);
  const win = winProbability(tender, scoring);
  const urgency = urgencyScore(tender);
  const tier = revenueTier(tender, breakdown);
  const overall = overallOpportunityScore(tender, scoring, {
    portfolioMatchProb: portfolio,
    winProbability: win,
    urgencyScore: urgency,
    revenueTier: tier,
  });

  return {
    portfolioMatchProb: portfolio,
    winProbability: win,
    urgencyScore: urgency,
    revenueTier: tier,
    revenuePotentialLevel: REVENUE_TIER_LABEL[tier],
    overallOpportunityScore: overall,
    probabilityBreakdown: {
      portfolioMatchProb: portfolio,
      winProbability: win,
      urgencyScore: urgency,
      revenueTier: tier,
      overallOpportunityScore: overall,
      catalogContribution: clamp((breakdown.catalogScore ?? 0) * 1.4),
      segmentContribution: breakdown.matchedPortfolioSegments?.[0]?.name ?? null,
      deadlineDays: daysUntilDeadline(tender.submissionDeadline || tender.deadline),
    },
  };
}

/**
 * News lead: chance a formal tender follows in 3–12 months.
 */
export function tenderLikelihood(newsScoring) {
  const {
    relevanceScore = 0,
    isMegaExpansion = false,
    matchedKeywords = [],
    matchedIndustries = [],
    portfolioSegments = [],
    projectType = '',
  } = newsScoring;

  let prob = relevanceScore * 0.55;
  if (isMegaExpansion) prob += 22;
  if (matchedKeywords.length >= 3) prob += 8;
  if (matchedIndustries.length >= 2) prob += 6;
  if (/neubau|greenfield|mega|gigafactory/i.test(projectType)) prob += 10;
  if (/umbau|modernisierung|erweiterung/i.test(projectType)) prob += 6;
  if (portfolioSegments.length) prob += Math.min(12, portfolioSegments[0].score ?? 0);

  return clamp(prob);
}

/**
 * News lead: PHT portfolio segment fit 0–100.
 */
export function phtFitProb(newsScoring) {
  const segments = newsScoring.portfolioSegments ?? [];
  if (!segments.length) {
    const ind = newsScoring.matchedIndustries ?? [];
    if (ind.includes('food') || ind.includes('pharma') || ind.includes('healthcare')) return 45;
    if (ind.includes('logistics') || ind.includes('manufacturing')) return 35;
    return 15;
  }
  return clamp(Math.min(100, (segments[0].score ?? 0) * 4 + segments.length * 5));
}

export function computeNewsLeadProbabilities(newsScoring) {
  return {
    tenderLikelihood: tenderLikelihood(newsScoring),
    phtFitProb: phtFitProb(newsScoring),
  };
}
