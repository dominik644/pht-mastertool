import { PHT_MATCH_KEYWORDS } from '../tedApi.js';

export const CURRENCY_RATES = {
  EUR: 1, GBP: 1.17, CHF: 1.05, AED: 0.25, SAR: 0.24, QAR: 0.25,
  ZAR: 0.05, KES: 0.007, EGP: 0.019,
};

const EXCLUDED_REGIONS = new Set(['Asien-Pazifik', 'North America']);
const EXCLUDED_COUNTRIES = ['USA', 'United States', 'US', 'Vereinigte Staaten', 'China', 'Japan', 'Indien', 'Australien', 'Singapur'];

export function toEur(budget, currency = 'EUR') {
  return Math.round(budget * (CURRENCY_RATES[currency] || 1));
}

export function extractKeywords(t) {
  const text = `${t.title} ${t.description || ''} ${t.industry || ''}`.toLowerCase();
  return PHT_MATCH_KEYWORDS.filter((k) => text.includes(k));
}

export function matchesPHT(t) {
  const text = `${t.title} ${t.description || ''} ${(t.keywords || []).join(' ')}`.toLowerCase();
  return PHT_MATCH_KEYWORDS.some((kw) => text.includes(kw));
}

export function isExcluded(t) {
  if (EXCLUDED_REGIONS.has(t.region)) return true;
  if (EXCLUDED_COUNTRIES.some((c) => t.country?.toLowerCase() === c.toLowerCase())) return true;
  return false;
}

export function normalizeTender(raw) {
  const budgetEur = raw.budgetEur ?? toEur(raw.budget ?? 0, raw.currency || 'EUR');
  return {
    ...raw,
    budgetEur,
    estimatedBudget: budgetEur,
    keywords: raw.keywords?.length ? raw.keywords : extractKeywords(raw),
    cpvCodes: raw.cpvCodes ?? [],
    submissionDeadline: raw.submissionDeadline || raw.deadline,
  };
}

export function dedupeTenders(tenders) {
  const seen = new Set();
  return tenders.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

export function parseIsoDate(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return String(value).replace(/\+.*$/, '').replace(/Z$/, '').slice(0, 10);
}

export function inferIndustry(text) {
  const lower = text.toLowerCase();
  if (lower.includes('pharma') || lower.includes('gmp')) return 'Pharma';
  if (lower.includes('hospital') || lower.includes('medical') || lower.includes('nursing')) return 'Hospital';
  if (lower.includes('food') || lower.includes('meat') || lower.includes('dairy')) return 'Food';
  if (lower.includes('production') || lower.includes('industrial')) return 'Production';
  return 'Public';
}
