/**
 * PHT Power Scoring Engine v2 – Score 0–100, Win-Fokus + Produktprofil
 */
import { PHT_CPV_CODES, PHT_CPV_EQUIPMENT_CODES } from './phtConfig.js';
import { matchProductProfiles } from './productProfiles.js';
import { scorePriceListKeywords } from './priceListKeywords.js';
import { isServiceOnlyCleaning, textHasExclusion, hasEquipmentSignal } from './phtMatchRules.js';
import { cpvMatchesEquipment, cpvMatchesServiceOnly } from './tenders/cpvMatch.js';

const KEYWORDS = {
  hygiene: 10, desinfektion: 8, disinfection: 8, hospital: 8, pharma: 7, food: 7, cip: 7,
  hygienestation: 9, personenschleuse: 8, sanicare: 8, niederdruck: 8, gmp: 6,
  handreinigungsbecken: 8, behälterreinigung: 8, sohlenreiniger: 8, waschkabinett: 7,
  schuhtrocknung: 7, messerkorb: 6, bürstenreinigung: 6,
  spind: 9, spinde: 9, garderobe: 9, wertfachschrank: 9, umkleide: 9, feuerwehrspind: 9,
  besen: 8, bürste: 8, schaufel: 8, reinigungsgerät: 8,
  schaumstation: 9, hauptstation: 8, satellitenstation: 8, schäumer: 8, foamico: 8,
  sonderbau: 9, waschanlage: 9, industriewasch: 9, kistenwasch: 9, behälterwasch: 9,
  palettenwasch: 9, mülltonnenwasch: 9, containerwasch: 9, blumentopf: 8, palettenwascher: 9,
  reinigungsanlage: 7, bodendose: 7,
  // Generische Begriffe – nur schwach (Dienstleistungs-False-Positives vermeiden)
  cleaning: 2, sanitation: 2, reinigung: 2, reiniging: 2, desinfectie: 3, wasch: 2, industrial: 3,
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
  const hits = cpvCodes.filter((c) => PHT_CPV_EQUIPMENT_CODES.some((p) => String(c).startsWith(p.slice(0, 5))));
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

  if (textHasExclusion(text)) {
    return {
      score: 0,
      recommendation: 'NO-GO',
      category: categorizeBudget(tender.budgetEur ?? tender.budget ?? 0),
      breakdown: {
        keywordScore: 0, budgetScore: 0, regionScore: 0, industryScore: 0,
        productProfileScore: 0, priceListScore: 0, cpvScore: 0, deadlineScore: 0,
        matchedKeywords: [], priceListMatches: [], topProfile: null, excluded: true,
      },
    };
  }

  if (isServiceOnlyCleaning(text, tender.cpvCodes ?? [], cpvMatchesServiceOnly, cpvMatchesEquipment)) {
    return {
      score: 0,
      recommendation: 'NO-GO',
      category: categorizeBudget(tender.budgetEur ?? tender.budget ?? 0),
      breakdown: {
        keywordScore: 0, budgetScore: 0, regionScore: 0, industryScore: 0,
        productProfileScore: 0, priceListScore: 0, cpvScore: 0, deadlineScore: 0,
        matchedKeywords: [], priceListMatches: [], topProfile: null, excluded: true,
        serviceOnly: true,
      },
    };
  }

  let keywordScore = 0;
  const matchedKeywords = [];
  const hasEquip = hasEquipmentSignal(text);
  for (const [kw, pts] of Object.entries(KEYWORDS)) {
    if (text.includes(kw)) {
      const effectivePts = (!hasEquip && pts <= 3) ? Math.min(pts, 1) : pts;
      keywordScore += effectivePts;
      matchedKeywords.push(kw);
    }
  }
  keywordScore = Math.min(30, keywordScore);

  const profileMatches = matchProductProfiles(text);
  const productProfileScore = profileMatches.length
    ? Math.min(10, profileMatches[0].score * 3)
  : 0;

  const priceListHit = scorePriceListKeywords(text);
  const priceListScore = priceListHit.score;
  if (priceListHit.matched.length) {
    for (const kw of priceListHit.matched.slice(0, 5)) {
      if (!matchedKeywords.includes(kw)) matchedKeywords.push(kw);
    }
  }

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
    keywordScore + budgetScore + regionScore + industryScore + cpvPts + dlPts + productProfileScore + priceListScore,
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
      productProfileScore, priceListScore, cpvScore: cpvPts, deadlineScore: dlPts, matchedKeywords,
      priceListMatches: priceListHit.matched,
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
