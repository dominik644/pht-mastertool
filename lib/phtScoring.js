/**
 * PHT Matching & Scoring Engine
 * Score 0–100, Go/No-Go Empfehlung
 */

const KEYWORDS = {
  hygiene: 12,
  cleaning: 10,
  sanitation: 10,
  food: 8,
  hospital: 8,
  pharma: 7,
  disinfection: 6,
  industrial: 4,
  washing: 5,
};

const REGION_SCORES = {
  Europa: 20,
  DACH: 20,
  UK: 15,
  'Middle East': 10,
  Afrika: 8,
  'Asien-Pazifik': 10,
};

const INDUSTRY_SCORES = {
  Food: 10,
  Pharma: 10,
  Hospital: 9,
  Production: 7,
  Public: 3,
};

/**
 * Kategorie nach Budget (EUR)
 */
export function categorizeBudget(budgetEur) {
  if (budgetEur <= 10000) return 'A';
  if (budgetEur <= 50000) return 'B';
  return 'C';
}

/**
 * @param {object} tender
 * @returns {{ score: number, recommendation: 'GO'|'PRÜFEN'|'NO-GO', category: 'A'|'B'|'C', breakdown: object }}
 */
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
  keywordScore = Math.min(keywordScore, 40);

  const budgetEur = tender.budgetEur ?? tender.budget ?? 0;
  let budgetScore = 0;
  if (budgetEur >= 500000) budgetScore = 30;
  else if (budgetEur >= 100000) budgetScore = 25;
  else if (budgetEur >= 50000) budgetScore = 18;
  else if (budgetEur >= 10000) budgetScore = 10;
  else budgetScore = 4;

  const regionScore = REGION_SCORES[tender.region] ?? 5;
  const industryScore = INDUSTRY_SCORES[tender.industry] ?? 3;

  const score = Math.min(100, Math.round(keywordScore + budgetScore + regionScore + industryScore));

  let recommendation;
  if (score > 70) recommendation = 'GO';
  else if (score >= 40) recommendation = 'PRÜFEN';
  else recommendation = 'NO-GO';

  const category = categorizeBudget(budgetEur);

  return {
    score,
    recommendation,
    category,
    breakdown: { keywordScore, budgetScore, regionScore, industryScore, matchedKeywords },
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
