import { PHT_MATCH_KEYWORDS } from '../tedApi.js';
import { countryNameToExcluded } from './regions.js';

export const CURRENCY_RATES = {
  EUR: 1, GBP: 1.17, CHF: 1.05, AED: 0.25, SAR: 0.24, QAR: 0.25,
  ZAR: 0.05, KES: 0.007, EGP: 0.019, UAH: 0.024, CAD: 0.68, MXN: 0.05,
  BRL: 0.18, AUD: 0.6, NZD: 0.55,
};

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
  if (countryNameToExcluded(t.country)) return true;
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

function normalizeTitleKey(title) {
  return (title || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, 72);
}

export function dedupeTenders(tenders) {
  const seen = new Set();
  return tenders.filter((t) => {
    if (seen.has(t.id)) return false;
    const titleKey = normalizeTitleKey(t.title);
    const softKey = `${titleKey}|${t.country}|${t.submissionDeadline || t.deadline || ''}`;
    if (titleKey && seen.has(softKey)) return false;
    seen.add(t.id);
    if (titleKey) seen.add(softKey);
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
