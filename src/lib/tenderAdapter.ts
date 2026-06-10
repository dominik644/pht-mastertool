import { formatRevenue } from '../services/analysis';
import type { Category, GoNoGo, ProductProfileMatch, Tender, TenderSource } from '../types/tender';
import type { GlobalTenderRaw } from './globalTenderSearch';
import { buildDefaultMilestones } from './milestones';
import { getTopProfiles, type MatchedProfile } from './productProfiles';
import { findSimilarTenders } from './similarity';
import { scoreGlobalTender, type ScoreResult } from './phtScoring';
import { PHT_PRODUCTS } from '../data/products';

const PLATFORM_MAP: Record<string, TenderSource> = {
  TED: 'TED', BBG: 'BBG', eTenders: 'eTenders', 'Find a Tender': 'Find a Tender',
  AusTender: 'AusTender', 'Contracts Finder': 'Contracts Finder', Simap: 'BBG',
  'Deutsche e-Vergabe': 'TED', GeBIZ: 'AusTender', GeM: 'AusTender',
};

function mapPlatform(platform: string): TenderSource {
  return PLATFORM_MAP[platform] ?? 'TED';
}

function mapRecommendation(rec: 'GO' | 'PRÜFEN' | 'NO-GO'): GoNoGo {
  if (rec === 'GO') return 'GO';
  if (rec === 'NO-GO') return 'NO-GO';
  return 'GO';
}

function buildNextStep(rec: 'GO' | 'PRÜFEN' | 'NO-GO', score: number): string {
  if (rec === 'GO') return `Score ${score}/100 – Sofort verfolgen. Technik einbinden und Angebot vorbereiten.`;
  if (rec === 'PRÜFEN') return `Score ${score}/100 – Vertrieb prüfen. Machbarkeit und ROI bewerten.`;
  return `Score ${score}/100 – Geringe Priorität. Ressourcen auf Top-Chancen fokussieren.`;
}

function quickProductMatch(title: string, description: string, value: number, profiles: ProductProfileMatch[]) {
  const text = `${title} ${description}`.toLowerCase();
  const scored = PHT_PRODUCTS.map((p) => ({
    product: p,
    score: p.keywords.reduce((s, kw) => (text.includes(kw) ? s + 1 : s), 0),
  })).filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
  const main = scored[0]?.product ?? PHT_PRODUCTS[0];
  return {
    main: main.name,
    alternatives: scored.slice(1, 3).map((s) => s.product.name),
    priceRange: `${formatRevenue(main.priceMin)} – ${formatRevenue(main.priceMax)}`,
    reasoning: `PHT-Match: ${profiles.map((p) => p.name).join(', ') || 'Allgemein'} · Budget ${formatRevenue(value)}.`,
    profiles,
  };
}

export function globalToTender(raw: GlobalTenderRaw, scoring: ScoreResult, allForSimilarity?: Tender[]): Tender {
  const text = `${raw.title} ${raw.description}`;
  const profiles: ProductProfileMatch[] = (getTopProfiles(text) as MatchedProfile[]).map((p) => ({
    id: p.id, name: p.name, score: p.score ?? 0, matchedKeywords: p.matchedKeywords ?? [],
  }));
  const productMatch = quickProductMatch(raw.title, raw.description, raw.budgetEur, profiles);
  const goNoGo = mapRecommendation(scoring.recommendation);
  const deadline = raw.submissionDeadline;
  const tender: Tender = {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    country: raw.country,
    region: raw.region,
    currency: raw.currency,
    budget: raw.budget,
    source: mapPlatform(raw.sourcePlatform),
    deadline,
    submissionDeadline: deadline,
    decisionDate: raw.decisionDate,
    estimatedValue: raw.budgetEur,
    estimatedBudget: raw.budgetEur ?? raw.estimatedBudget ?? raw.budget,
    industry: raw.industry,
    keywords: raw.keywords,
    cpvCodes: raw.cpvCodes ?? [],
    url: raw.sourceUrl,
    sourceUrl: raw.sourceUrl,
    sourcePlatform: raw.sourcePlatform,
    publicationDate: raw.publicationDate,
    category: scoring.category as Category,
    goNoGo,
    score: scoring.score,
    scoreRecommendation: scoring.recommendation,
    scoreBreakdown: scoring.breakdown,
    revenuePotential: raw.budgetEur > 0 ? `${formatRevenue(raw.budgetEur)} (${raw.currency})` : 'unbekannt',
    productMatch,
    matchedProducts: [productMatch.main, ...productMatch.alternatives],
    milestones: buildDefaultMilestones(deadline),
    nextStep: buildNextStep(scoring.recommendation, scoring.score),
    status: 'Neu',
    watchlist: false,
    priority: scoring.score > 70 ? 'hoch' : scoring.score >= 40 ? 'mittel' : 'niedrig',
    createdAt: raw.publicationDate,
  };
  if (allForSimilarity?.length) {
    tender.similarityHints = findSimilarTenders(tender, allForSimilarity, 3);
  }
  return tender;
}

export function adaptGlobalTenders(raws: GlobalTenderRaw[]): Tender[] {
  const scored = raws.map((raw) => {
    const scoring = raw.score != null ? {
      score: raw.score, recommendation: raw.recommendation!, category: raw.category!,
      breakdown: { keywordScore: 0, budgetScore: 0, regionScore: 0, industryScore: 0, matchedKeywords: raw.keywords },
    } as ScoreResult : scoreGlobalTender(raw);
    return { raw, scoring };
  });
  const tenders = scored.map(({ raw, scoring }) => globalToTender(raw, scoring));
  return tenders.map((t) => ({
    ...t,
    similarityHints: findSimilarTenders(t, tenders, 3),
  }));
}

export function mergeTenderState(fetched: Tender[], saved: Tender[]): Tender[] {
  const savedMap = new Map(saved.map((t) => [t.id, t]));
  return fetched.map((t) => {
    const prev = savedMap.get(t.id);
    if (!prev) return t;
    return {
      ...t,
      watchlist: prev.watchlist,
      status: prev.status,
      responsible: prev.responsible,
      notes: prev.notes,
      nextAction: prev.nextAction,
      priority: prev.priority,
      milestones: prev.milestones?.length ? prev.milestones : t.milestones,
      goNoGo: prev.goNoGo ?? t.goNoGo,
    };
  });
}
