/**
 * Lightweight scan of cached public tender bulk files for Sub-GU / hygiene trade patterns.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreNewsArticle } from './newsIntelligence.js';
import { isNewsLeadFresh, NEWS_MIN_RELEVANCE_SCORE } from './newsLeadFilters.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BULK_DIR = join(__dirname, '../public/data/bulk');

/** HLS/TGA/hygiene subcontractor patterns in LV descriptions. */
export const SUB_GU_KEYWORDS = [
  'nachunternehmer', 'subcontractor', 'sub-contractor', 'sub contractor',
  'unterauftrag', 'sub-gu', 'sub gu', 'los hls', 'los tga', 'gewerk hls', 'gewerk tga',
  'personenschleuse', 'personnel hygiene lock', 'personnel lock', 'hygiene lock',
  'schaumdesinfektion', 'foam disinfection', 'schaumstation', 'hygienestation',
  'niederdruckanlage', 'low pressure hygiene', 'sanitary installation food',
  'hygiene equipment', 'hygiene gewerk', 'lot sanit', 'trade package hygiene',
  'kistenwaschanlage', 'crate washer', 'industrial washer', 'cip system',
  'schleusenanlage', 'eingangskontrolle hygiene',
];

function matchesSubGu(text) {
  const lower = String(text || '').toLowerCase();
  return SUB_GU_KEYWORDS.filter((kw) => lower.includes(kw));
}

function mapTenderToLead(tender, matchedKws, sourceFile) {
  const title = tender.title || '';
  const description = tender.description || '';
  const scoring = scoreNewsArticle(title, description);
  const publishedAt = tender.publicationDate
    ? new Date(tender.publicationDate).toISOString()
    : new Date().toISOString();

  const boostedScore = Math.min(100, Math.max(scoring.relevanceScore, NEWS_MIN_RELEVANCE_SCORE + 5));

  return {
    id: `subgu-${tender.id}`,
    title: title.slice(0, 300),
    description: description.slice(0, 500),
    url: tender.sourceUrl || tender.url || '#',
    publishedAt,
    sourceId: 'subgu-tender-scan',
    sourceName: `Sub-GU Scan (${tender.sourcePlatform || sourceFile})`,
    sourceType: 'tender-scan',
    segment: 'foam-low-pressure-hygiene',
    region: tender.country || 'EU',
    country: tender.country?.slice(0, 2)?.toUpperCase() || null,
    leadType: 'sub-gu-tender',
    signalType: 'early-indicator',
    isEarlyIndicator: true,
    projectType: 'Sub-GU Ausschreibung',
    summaryDe: `Sub-GU/Hygiene-Gewerk · ${matchedKws.slice(0, 3).join(', ')}`,
    ...scoring,
    relevanceScore: boostedScore,
    matchedKeywords: [...new Set([...(scoring.matchedKeywords ?? []), ...matchedKws])].slice(0, 12),
  };
}

/**
 * Scan public/data/bulk/*.json for Sub-GU hygiene trade mentions.
 * @param {{ maxPerFile?: number, maxAgeDays?: number }} options
 */
export function scanSubGuTendersFromBulk(options = {}) {
  const maxPerFile = options.maxPerFile ?? 20;
  const maxAgeDays = options.maxAgeDays ?? 60;
  const now = Date.now();

  if (!existsSync(BULK_DIR)) {
    return { leadCount: 0, leads: [], filesScanned: 0 };
  }

  const files = readdirSync(BULK_DIR).filter((f) => f.endsWith('.json'));
  const leads = [];

  for (const file of files) {
    let payload;
    try {
      payload = JSON.parse(readFileSync(join(BULK_DIR, file), 'utf8'));
    } catch {
      continue;
    }
    const tenders = payload.tenders ?? [];
    let fileHits = 0;

    for (const tender of tenders) {
      if (fileHits >= maxPerFile) break;
      const text = `${tender.title} ${tender.description}`;
      const matchedKws = matchesSubGu(text);
      if (!matchedKws.length) continue;

      const pubTs = tender.publicationDate ? new Date(tender.publicationDate).getTime() : now;
      if (!Number.isFinite(pubTs) || pubTs < now - maxAgeDays * 86_400_000) continue;

      const lead = mapTenderToLead(tender, matchedKws, file);
      if (lead.relevanceScore < NEWS_MIN_RELEVANCE_SCORE) continue;
      leads.push(lead);
      fileHits += 1;
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const lead of leads.sort((a, b) => b.relevanceScore - a.relevanceScore)) {
    const key = lead.id;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(lead);
  }

  return {
    fetchedAt: new Date().toISOString(),
    filesScanned: files.length,
    leadCount: deduped.length,
    leads: deduped,
  };
}
