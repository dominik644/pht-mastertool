import { formatRevenue } from '../services/analysis';
import type { Category, GoNoGo, Tender, TenderSource } from '../types/tender';
import type { GlobalTenderRaw } from './globalTenderSearch';
import { scoreGlobalTender, type ScoreResult } from './phtScoring';
import { PHT_PRODUCTS } from '../data/products';

const PLATFORM_MAP: Record<string, TenderSource> = {
  TED: 'TED',
  BBG: 'BBG',
  eTenders: 'eTenders',
  'Find a Tender': 'Find a Tender',
  AusTender: 'AusTender',
  'Contracts Finder': 'Contracts Finder',
  Simap: 'BBG',
  'Deutsche e-Vergabe': 'TED',
  GeBIZ: 'AusTender',
  GeM: 'AusTender',
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

function quickProductMatch(title: string, description: string, value: number) {
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
    reasoning: `PHT-Match basierend auf Keywords und Budget (${formatRevenue(value)}).`,
  };
}

export function globalToTender(raw: GlobalTenderRaw, scoring: ScoreResult): Tender {
  const productMatch = quickProductMatch(raw.title, raw.description, raw.budgetEur);
  const goNoGo = mapRecommendation(scoring.recommendation);

  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    country: raw.country,
    region: raw.region,
    currency: raw.currency,
    source: mapPlatform(raw.sourcePlatform),
    deadline: raw.submissionDeadline,
    estimatedValue: raw.budgetEur,
    industry: raw.industry,
    keywords: raw.keywords,
    url: raw.sourceUrl,
    sourceUrl: raw.sourceUrl,
    sourcePlatform: raw.sourcePlatform,
    publicationDate: raw.publicationDate,
    category: scoring.category as Category,
    goNoGo,
    score: scoring.score,
    scoreRecommendation: scoring.recommendation,
    scoreBreakdown: scoring.breakdown,
    revenuePotential: `${formatRevenue(raw.budgetEur)} (${raw.currency})`,
    productMatch,
    nextStep: buildNextStep(scoring.recommendation, scoring.score),
    status: 'Neu',
    watchlist: false,
    createdAt: raw.publicationDate,
  };
}

export function adaptGlobalTenders(raws: GlobalTenderRaw[]): Tender[] {
  return raws.map((raw) => {
    const scoring = raw.score != null ? {
      score: raw.score,
      recommendation: raw.recommendation!,
      category: raw.category!,
      breakdown: { keywordScore: 0, budgetScore: 0, regionScore: 0, industryScore: 0, matchedKeywords: raw.keywords },
    } as ScoreResult : scoreGlobalTender(raw);
    return globalToTender(raw, scoring);
  });
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
    };
  });
}
