/**
 * UK Planning Data API – food-related planning applications (England).
 * https://www.planning.data.gov.uk/docs – free open data, rate-limit politely.
 */
import { scoreNewsArticle } from './newsIntelligence.js';
import { isNewsLeadFresh, NEWS_MIN_RELEVANCE_SCORE, PLANNING_MAX_AGE_DAYS } from './newsLeadFilters.js';

const API_BASE = 'https://www.planning.data.gov.uk/entity.json';
const USER_AGENT = 'PHT-Mastertool/1.0 UKPlanningLeads';
const DEFAULT_MAX_PAGES = 40;
const PAGE_SIZE = 100;
const REQUEST_DELAY_MS = 450;

/** Food factory / cold store / slaughterhouse / dairy planning descriptions. */
export const UK_FOOD_PLANNING_KEYWORDS = [
  'food factory', 'food processing', 'food manufacturing', 'food production',
  'food plant', 'foodstore', 'food store', 'cold store', 'cold storage',
  'cold room', 'chilled warehouse', 'frozen food', 'slaughterhouse', 'abattoir',
  'meat processing', 'meat factory', 'dairy plant', 'dairy processing',
  'bakery', 'beverage production', 'food warehouse', 'ready meal',
  'poultry processing', 'fish processing', 'food distribution',
  'food preparation', 'food hall', 'industrial food',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function matchesFoodPlanning(text) {
  const lower = String(text || '').toLowerCase();
  return UK_FOOD_PLANNING_KEYWORDS.some((kw) => lower.includes(kw));
}

function entityUrl(entityId) {
  return `https://www.planning.data.gov.uk/entity/${entityId}`;
}

function parseEntityDate(entity) {
  const raw = entity['entry-date'] || entity['decision-date'] || entity['start-date'];
  if (!raw) return new Date().toISOString();
  const ts = new Date(raw).getTime();
  return Number.isFinite(ts) ? new Date(ts).toISOString() : new Date().toISOString();
}

function mapEntityToLead(entity) {
  const description = entity.description || '';
  const reference = entity.reference || '';
  const title = reference
    ? `UK Planning ${reference}: ${description.slice(0, 120)}`
    : description.slice(0, 200);

  const scoring = scoreNewsArticle(title, description);
  const publishedAt = parseEntityDate(entity);

  if (scoring.relevanceScore < NEWS_MIN_RELEVANCE_SCORE && !matchesFoodPlanning(description)) {
    return null;
  }

  const boostedScore = matchesFoodPlanning(description)
    ? Math.max(NEWS_MIN_RELEVANCE_SCORE + 5, Math.min(100, scoring.relevanceScore + 20))
    : scoring.relevanceScore;

  return {
    id: `uk-planning-${entity.entity}`,
    title: title.slice(0, 300),
    description: description.slice(0, 500),
    url: entityUrl(entity.entity),
    publishedAt,
    sourceId: 'uk-planning-odp',
    sourceName: 'UK Planning Data (planning.data.gov.uk)',
    sourceType: 'planning-api',
    segment: 'food-facility-construction',
    region: 'UK',
    country: 'UK',
    leadType: 'planning',
    signalType: 'early-indicator',
    isEarlyIndicator: true,
    projectType: 'Baugenehmigung UK',
    summaryDe: [
      reference ? `Ref: ${reference}` : null,
      'UK Planning Application',
      matchesFoodPlanning(description) ? 'Lebensmittel/Kühlhaus-Signal' : null,
    ].filter(Boolean).join(' · '),
    ...scoring,
    relevanceScore: boostedScore,
    matchedKeywords: [
      ...(scoring.matchedKeywords ?? []),
      ...UK_FOOD_PLANNING_KEYWORDS.filter((kw) => description.toLowerCase().includes(kw)),
    ].slice(0, 12),
  };
}

async function fetchPlanningPage(offset, limit = PAGE_SIZE) {
  const url = `${API_BASE}?dataset=planning-application&limit=${limit}&offset=${offset}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`UK Planning API HTTP ${res.status}`);
  return res.json();
}

/**
 * Scan recent planning applications and return food-related leads.
 * @param {{ maxPages?: number, write?: boolean }} options
 */
export async function runUkPlanningLeads(options = {}) {
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
  const hits = [];
  let pagesScanned = 0;

  let startOffset = 0;
  try {
    const probe = await fetchPlanningPage(0, 1);
    const total = probe.count ?? 0;
    startOffset = Math.max(0, total - maxPages * PAGE_SIZE);
  } catch {
    startOffset = 0;
  }

  for (let page = 0; page < maxPages; page++) {
    const offset = startOffset + page * PAGE_SIZE;
    let data;
    try {
      data = await fetchPlanningPage(offset);
    } catch {
      break;
    }
    pagesScanned += 1;
    const entities = data.entities ?? [];
    if (!entities.length) break;

    for (const entity of entities) {
      if (!matchesFoodPlanning(entity.description)) continue;
      const lead = mapEntityToLead(entity);
      if (!lead || !isNewsLeadFresh(lead.publishedAt, PLANNING_MAX_AGE_DAYS)) continue;
      hits.push(lead);
    }

    if (!data.links?.next || offset + PAGE_SIZE >= (data.count ?? Infinity)) break;
    if (page < maxPages - 1) await sleep(REQUEST_DELAY_MS);
  }

  const deduped = [];
  const seen = new Set();
  for (const lead of hits.sort((a, b) => b.relevanceScore - a.relevanceScore)) {
    const key = `${lead.title.slice(0, 60)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(lead);
  }

  return {
    fetchedAt: new Date().toISOString(),
    sourceId: 'uk-planning-odp',
    pagesScanned,
    leadCount: deduped.length,
    leads: deduped,
  };
}
