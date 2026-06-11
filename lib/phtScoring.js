/**
 * PHT Power Scoring Engine v2 – Score 0–100, Win-Fokus + Produktprofil
 */
import { PHT_CPV_CODES } from './phtConfig.js';
import { matchProductProfiles } from './productProfiles.js';

const KEYWORDS = {
  hygiene: 10, cleaning: 9, sanitation: 9, reinigung: 9, desinfektion: 8,
  disinfection: 8, hospital: 8, pharma: 7, food: 7, cip: 7, hygienestation: 8,
  personenschleuse: 8, sanicare: 7, niederdruck: 6, gmp: 6, wasch: 5, industrial: 4,
  handreinigungsbecken: 7, behälterreinigung: 7, sohlenreiniger: 7, waschkabinett: 6,
  schuhtrocknung: 6, messerkorb: 5, bürstenreinigung: 5, reiniging: 8, desinfectie: 7,
};

const REGION_SCORES = {
  Europa: 18, DACH: 20, UK: 15, 'Middle East': 10, Afrika: 8,
  'Latin America': 8, Oceania: 8, 'North America': 10,
};

const INDUSTRY_SCORES = {
  Food: 10, Pharma: 10, Hospital: 9, Production: 7, Public: 3,
};

export function categorizeBudget(budgetEur) {
  if (budgetEur <= 10000) return 'A';
  if (budgetEur <= 50000) return 'B';
  return 'C';
}

function cpvScore(cpvCodes = []) {
  const hits = cpvCodes.filter((c) => PHT_CPV_CODES.some((p) => String(c).startsWith(p.slice(0, 5))));
  return Math.min(12, hits.length * 4);
}

function deadlineScore(deadline) {
  if (!deadline) return 0;
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (days < 0) return 0;
  if (days <= 7) return 10;
  if (days <= 14) return 7;
  if (days <= 30) return 4;
  return 2;
}

export function scoreTender(tender) {
  const text = `${tender.title} ${tender.description} ${tender.industry} ${(tender.keywords || []).join(' ')}`.toLowerCase();

  let keywordScore = 0;
  const matchedKeywords = [];
  for (const [kw, pts] of Object.entries(KEYWORDS)) {
    if (text.includes(kw)) {
      keywordScore += pts;
      matchedKeywords.push(kw);
    }
  }
  keywordScore = Math.min(30, keywordScore);

  const profileMatches = matchProductProfiles(text);
  const productProfileScore = profileMatches.length
    ? Math.min(10, profileMatches[0].score * 3)
  : 0;

  const budgetEur = tender.budgetEur ?? tender.budget ?? 0;
  let budgetScore = 0;
  if (budgetEur >= 500000) budgetScore = 25;
  else if (budgetEur >= 100000) budgetScore = 20;
  else if (budgetEur >= 50000) budgetScore = 14;
  else if (budgetEur >= 10000) budgetScore = 8;
  else budgetScore = 3;

  const regionScore = Math.min(18, REGION_SCORES[tender.region] ?? 5);
  const industryScore = INDUSTRY_SCORES[tender.industry] ?? 3;
  const cpvPts = cpvScore(tender.cpvCodes);
  const dlPts = deadlineScore(tender.submissionDeadline || tender.deadline);

  const score = Math.min(100, Math.round(
    keywordScore + budgetScore + regionScore + industryScore + cpvPts + dlPts + productProfileScore,
  ));

  let recommendation;
  if (score >= 70) recommendation = 'GO';
  else if (score >= 40) recommendation = 'PRÜFEN';
  else recommendation = 'NO-GO';

  return {
    score,
    recommendation,
    category: categorizeBudget(budgetEur),
    breakdown: {
      keywordScore, budgetScore, regionScore, industryScore,
      productProfileScore, cpvScore: cpvPts, deadlineScore: dlPts, matchedKeywords,
      topProfile: profileMatches[0]?.name ?? null,
    },
  };
}

export function scoreAllTenders(tenders) {
  return tenders.map((t) => ({ ...t, ...scoreTender(t) }));
}

export function filterByScore(tenders, minScore) {
  if (!minScore || minScore <= 0) return tenders;
  return tenders.filter((t) => (t.score ?? scoreTender(t).score) >= minScore);
}

export function filterByRecommendation(tenders, rec) {
  if (!rec || rec === 'all') return tenders;
  return tenders.filter((t) => (t.recommendation ?? scoreTender(t).recommendation) === rec);
}
