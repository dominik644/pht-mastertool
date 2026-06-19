/**
 * News Intelligence – Frühindikatoren für PHT-Vertrieb.
 * Nur öffentliche RSS/Google News Feeds – kein Paywall-Scraping.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { keywordMatchesInText } from './phtMatchRules.js';
import { matchPortfolioSegments } from './phtPortfolio.js';
import { computeNewsLeadProbabilities } from './tenderProbability.js';
import { filterNewsLeads, isNewsLeadFresh, NEWS_MIN_RELEVANCE_SCORE } from './newsLeadFilters.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NEWS_LEADS_DIR = join(__dirname, '../public/data/leads');
const NEWS_LEADS_PATH = join(NEWS_LEADS_DIR, 'news-leads.json');

/** Umbau/Neubau/Expansion – Lebensmittel & Anlagen. */
export const PHT_FOOD_EXPANSION_KEYWORDS = [
  'investition', 'invest', 'investment', 'expansion', 'erweiterung', 'neubau', 'umbau',
  'neue fabrik', 'new factory', 'greenfield', 'capacity increase', 'kapazitätserweiterung',
  'standorterweiterung', 'werkserweiterung', 'produktionsstätte', 'production site',
  'neues werk', 'plant expansion', 'facility expansion', 'bauvorhaben', 'anlagenbau',
  'modernisierung', 'zubau', 'ausbau', 'neuer standort', 'new site', 'groundbreaking',
  'baustart', 'inbetriebnahme', 'fertigstellung', 'millioneninvestition', 'milliardeninvestition',
  'food processing plant', 'lebensmittelbetrieb', 'lebensmittelkonzern', 'dairy factory',
  'molkerei', 'schlachthof', 'fleischverarbeitung', 'fmcg', 'nahrungsmittel',
];

/** Mega-Expansion – große Industrie-/Logistikprojekte. */
export const MEGA_EXPANSION_KEYWORDS = [
  'milliardeninvestition', 'gigafactory', 'giga factory', 'massive expansion', 'neues werk',
  'standorterweiterung', 'capacity doubling', 'kapazitätsverdopplung', 'logistics hub',
  'logistikzentrum', 'distribution center', 'distribution centre', 'distribution center neu',
  'neues logistikzentrum', 'production site', 'greenfield investment', 'greenfield projekt',
  'rekordinvestition', 'record investment', 'größtes werk', 'largest plant', 'largest factory',
  'megafabrik', 'superfabrik', 'industrial park', 'industriepark', 'logistikpark',
];

/** Branchen mit PHT-Hygienebedarf. */
export const PHT_EXPANSION_INDUSTRIES = {
  food: [
    'lebensmittel', 'food', 'nahrungsmittel', 'molkerei', 'dairy', 'fleisch', 'meat',
    'bäckerei', 'baeckerei', 'brewery', 'brauerei', 'fmcg', 'getränke', 'beverage',
    'confectionery', 'süßwaren', 'food processing', 'lebensmittelindustrie',
  ],
  logistics: [
    'logistik', 'logistics', 'warehouse', 'lager', 'distribution', 'fulfillment',
    'cold chain', 'kühlhaus', 'kühlzentrum', 'depot', 'frachtzentrum', 'hubs',
  ],
  pharma: [
    'pharma', 'pharmaceutical', 'pharmazeutisch', 'gmp', 'biotech', 'biopharma',
    'arzneimittel', 'vaccine', 'impfstoff', 'labor', 'laboratory', 'cleanroom',
  ],
  healthcare: [
    'krankenhaus', 'hospital', 'klinik', 'clinic', 'gesundheit', 'healthcare',
    'pflegeheim', 'nursing home', 'medizin', 'medical facility',
  ],
  municipalities: [
    'kommune', 'stadt', 'municipal', 'öffentlich', 'public sector', 'landkreis',
    'gemeinde', 'verwaltung', 'infrastruktur',
  ],
  manufacturing: [
    'produktion', 'production', 'fertigung', 'manufacturing', 'fabrik', 'factory',
    'werk', 'plant', 'industrie', 'industrial', 'hygiene', 'clean room', 'reinraum',
  ],
};

/** DAX/MDAX – Food & Logistik (Frühindikator bei Namensnennung). */
export const DAX_MDAX_FOOD_LOGISTICS_COMPANIES = [
  'Nestlé', 'Nestle', 'Unilever', 'Danone', 'Henkel', 'Beiersdorf',
  'Symrise', 'Givaudan', 'Kerry Group', 'Tate & Lyle',
  'Deutsche Post', 'DHL', 'Kühne+Nagel', 'Kuehne Nagel', 'Rhenus', 'Dachser',
  'Schenker', 'DB Schenker', 'Hellmann', 'Fiege', 'Raben Group',
  'Dr. Oetker', 'Dr Oetker', 'Bahlsen', 'Haribo', 'Rügenwalder', 'Rugenwalder',
  'Tönnies', 'Toennies', 'Westfleisch', 'Cargill', 'Bunge', 'ADM',
  'FrieslandCampina', 'Arla', 'Lactalis', 'Müller', 'Mueller Milch',
];

/** Skalen-Keywords – Score-Boost bei großen Investitionen. */
export const EXPANSION_SCALE_KEYWORDS = [
  'million', 'millionen', 'milliarde', 'milliarden', 'billion', 'bn', 'mio',
  'largest', 'größte', 'groesste', 'biggest', 'record investment', 'rekordinvestition',
  'hundreds of millions', 'hunderte millionen', 'milliardeninvestition', 'mega',
];

const GN_BASE = 'https://news.google.com/rss/search';

/** Google News RSS – Expansion & Branchen-Monitoring. */
export const NEWS_GOOGLE_QUERIES = [
  { q: 'Lebensmittelbetrieb Investition Neubau', hl: 'de', gl: 'DE', segment: 'food-facility-construction', region: 'DE' },
  { q: 'Lebensmittelkonzern Werk Erweiterung', hl: 'de', gl: 'DE', segment: 'food-facility-construction', region: 'DACH' },
  { q: 'food processing plant expansion investment', hl: 'en', gl: 'US', segment: 'food-facility-construction', region: 'global' },
  { q: 'dairy factory construction', hl: 'en', gl: 'GB', segment: 'food-facility-construction', region: 'EU' },
  { q: 'FMCG factory expansion Europe', hl: 'en', gl: 'GB', segment: 'food-facility-construction', region: 'EU' },
  { q: 'neues Logistikzentrum Investition', hl: 'de', gl: 'DE', segment: 'logistics', region: 'DACH' },
  { q: 'production facility expansion million', hl: 'en', gl: 'US', segment: 'food-facility-construction', region: 'global' },
  { q: 'Werk Neubau Investition Millionen', hl: 'de', gl: 'DE', segment: 'food-facility-construction', region: 'DACH' },
  { q: 'Gigafactory hygiene', hl: 'en', gl: 'DE', segment: 'foam-low-pressure-hygiene', region: 'EU' },
  { q: 'Milliardeninvestition neues Werk', hl: 'de', gl: 'DE', segment: 'food-facility-construction', region: 'DACH' },
  { q: 'logistics hub expansion investment', hl: 'en', gl: 'GB', segment: 'logistics', region: 'EU' },
  { q: 'pharma production site expansion', hl: 'en', gl: 'DE', segment: 'healthcare', region: 'EU' },
  { q: 'greenfield investment manufacturing Europe', hl: 'en', gl: 'GB', segment: 'food-facility-construction', region: 'EU' },
  { q: 'Standorterweiterung Produktion', hl: 'de', gl: 'DE', segment: 'food-facility-construction', region: 'DACH' },
  { q: 'distribution center new construction', hl: 'en', gl: 'US', segment: 'logistics', region: 'global' },
  { q: 'Kühlhaus Neubau Investition', hl: 'de', gl: 'DE', segment: 'logistics', region: 'DACH' },
  { q: 'massive expansion production plant', hl: 'en', gl: 'GB', segment: 'food-facility-construction', region: 'global' },
  { q: 'Lebensmittelwerk Modernisierung Umbau', hl: 'de', gl: 'DE', segment: 'food-facility-construction', region: 'DACH' },
];

function buildGoogleNewsUrl({ q, hl, gl }) {
  const ceid = `${gl}:${hl}`;
  return `${GN_BASE}?q=${encodeURIComponent(q)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
}

/** Kuratierte News-Quellen (Google News + Branchen-RSS). */
export const NEWS_INTELLIGENCE_SOURCES = [
  ...NEWS_GOOGLE_QUERIES.map((item, i) => ({
    id: `gn-expansion-${i}`,
    name: `Google News: ${item.q.slice(0, 50)}`,
    type: 'google-news',
    url: buildGoogleNewsUrl(item),
    segment: item.segment,
    region: item.region,
    query: item.q,
  })),
  { id: 'foodnavigator', name: 'FoodNavigator', type: 'rss', url: 'https://www.foodnavigator.com/rss/news.xml', segment: 'food-facility-construction', region: 'EU' },
  { id: 'food-manufacture-uk', name: 'Food Manufacture UK', type: 'rss', url: 'https://www.foodmanufacture.co.uk/rss/news.xml', segment: 'food-facility-construction', region: 'UK' },
  { id: 'fleischwirtschaft', name: 'Fleischwirtschaft', type: 'rss', url: 'https://www.fleischwirtschaft.de/rss/news.xml', segment: 'food-facility-construction', region: 'DACH' },
  { id: 'lebensmittelzeitung', name: 'Lebensmittel Zeitung', type: 'rss', url: 'https://www.lebensmittelzeitung.net/rss/news.xml', segment: 'food-facility-construction', region: 'DACH' },
  { id: 'lebensmittel-praxis', name: 'Lebensmittel Praxis', type: 'rss', url: 'https://www.lebensmittelpraxis.de/rss/news.xml', segment: 'food-facility-construction', region: 'DACH' },
  { id: 'foodbev', name: 'FoodBev Media', type: 'rss', url: 'https://www.foodbev.com/feed/', segment: 'food-facility-construction', region: 'EU' },
  { id: 'just-food', name: 'Just Food', type: 'rss', url: 'https://www.just-food.com/rss/', segment: 'food-facility-construction', region: 'global' },
  { id: 'dairyreporter', name: 'DairyReporter', type: 'rss', url: 'https://www.dairyreporter.com/rss/news.xml', segment: 'food-facility-construction', region: 'EU' },
  { id: 'new-food-magazine', name: 'New Food Magazine', type: 'rss', url: 'https://www.newfoodmagazine.com/feed/', segment: 'food-facility-construction', region: 'UK' },
  { id: 'process-alimentaire', name: 'Process Alimentaire', type: 'rss', url: 'https://www.processalimentaire.com/rss/news.xml', segment: 'food-facility-construction', region: 'FR' },
  { id: 'meatpoultry', name: 'Meat+Poultry', type: 'rss', url: 'https://www.meatpoultry.com/rss/news.xml', segment: 'food-facility-construction', region: 'US' },
  { id: 'supplychaindive', name: 'Supply Chain Dive', type: 'rss', url: 'https://www.supplychaindive.com/feeds/news/', segment: 'logistics', region: 'global' },
  { id: 'logisticsmgmt', name: 'Logistics Management', type: 'rss', url: 'https://www.logisticsmgmt.com/rss/topic/271-all', segment: 'logistics', region: 'US' },
  { id: 'eu-press', name: 'EU Kommission Presse', type: 'rss', url: 'https://ec.europa.eu/commission/presscorner/api/rss', segment: 'food-facility-construction', region: 'EU' },
  { id: 'cordis-food', name: 'CORDIS Food Research', type: 'rss', url: 'https://cordis.europa.eu/rss/food.xml', segment: 'food-facility-construction', region: 'EU' },
  { id: 'nestle-press', name: 'Nestlé Presse', type: 'rss', url: 'https://www.nestle.com/media/news/rss', segment: 'food-facility-construction', region: 'global' },
  { id: 'unilever-press', name: 'Unilever News', type: 'rss', url: 'https://www.unilever.com/news/press-releases/rss/', segment: 'food-facility-construction', region: 'global' },
  { id: 'danone-press', name: 'Danone Presse', type: 'rss', url: 'https://www.danone.com/media/press-releases/rss.xml', segment: 'food-facility-construction', region: 'global' },
  { id: 'arla-news', name: 'Arla News', type: 'rss', url: 'https://www.arla.com/company/news/rss/', segment: 'food-facility-construction', region: 'EU' },
  { id: 'baunetz', name: 'Baunetz', type: 'rss', url: 'https://www.baunetz.de/rss/news.xml', segment: 'food-facility-construction', region: 'DACH' },
];

const ALL_INDUSTRY_KEYWORDS = Object.values(PHT_EXPANSION_INDUSTRIES).flat();

const COUNTRY_PATTERNS = [
  { code: 'DE', patterns: ['deutschland', 'germany', ' german ', ' nrw', ' bayern', ' frankfurt', ' hamburg'] },
  { code: 'AT', patterns: ['österreich', 'austria', ' austrian ', ' wien'] },
  { code: 'CH', patterns: ['schweiz', 'switzerland', ' swiss ', ' zürich'] },
  { code: 'FR', patterns: ['frankreich', 'france', ' french ', ' paris', ' lyon'] },
  { code: 'NL', patterns: ['niederlande', 'netherlands', ' dutch ', ' amsterdam'] },
  { code: 'BE', patterns: ['belgien', 'belgium', ' belgian ', ' brüssel'] },
  { code: 'UK', patterns: ['united kingdom', ' britain', ' british ', ' england', ' scotland'] },
  { code: 'IE', patterns: ['irland', 'ireland', ' irish ', ' dublin'] },
  { code: 'PL', patterns: ['polen', 'poland', ' polish ', ' warsaw'] },
  { code: 'IT', patterns: ['italien', 'italy', ' italian ', ' milan', ' rom'] },
  { code: 'ES', patterns: ['spanien', 'spain', ' spanish ', ' madrid'] },
  { code: 'US', patterns: ['united states', ' usa', ' u.s.', ' america'] },
];

function extractCountry(text) {
  const lower = ` ${text.toLowerCase()} `;
  for (const { code, patterns } of COUNTRY_PATTERNS) {
    if (patterns.some((p) => lower.includes(p))) return code;
  }
  return null;
}

function buildSummaryDe({ companyGuess, projectType, country, matchedKeywords, isMegaExpansion }) {
  const parts = [];
  if (companyGuess) parts.push(companyGuess);
  if (projectType) parts.push(projectType);
  if (country) parts.push(`Standort: ${country}`);
  if (isMegaExpansion) parts.push('Mega-Expansion');
  if (matchedKeywords?.length) parts.push(`Signale: ${matchedKeywords.slice(0, 3).join(', ')}`);
  return parts.length ? parts.join(' · ') : null;
}

function stripHtml(text) {
  return String(text || '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
}

function matchKeywords(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => keywordMatchesInText(lower, kw));
}

function guessCompany(text) {
  for (const company of DAX_MDAX_FOOD_LOGISTICS_COMPANIES) {
    if (keywordMatchesInText(text.toLowerCase(), company.toLowerCase())) return company;
  }
  const m = text.match(/^([A-ZÄÖÜ][\wäöüÄÖÜß&.+ -]{2,40})\s+(?:baut|erweitert|investiert|plant|opens|expands|announces)/i);
  return m?.[1]?.trim() ?? null;
}

function guessProjectType(matchedExpansion, matchedMega, matchedIndustries) {
  if (matchedMega.some((k) => /logistik|logistics|distribution|hub/i.test(k))) return 'Logistik-Expansion';
  if (matchedIndustries.includes('pharma') || matchedIndustries.some((i) => /pharma|gmp/i.test(i))) return 'Pharma-Produktion';
  if (matchedMega.length > 0) return 'Mega-Expansion';
  if (matchedExpansion.some((k) => /neubau|greenfield|new factory/i.test(k))) return 'Neubau';
  if (matchedExpansion.some((k) => /umbau|modernisierung|renovation/i.test(k))) return 'Umbau/Modernisierung';
  if (matchedExpansion.some((k) => /erweiterung|expansion|capacity/i.test(k))) return 'Erweiterung';
  return 'Investition';
}

/**
 * Score news article 0–100 for PHT expansion relevance.
 * @returns {{ relevanceScore: number, isMegaExpansion: boolean, matchedKeywords: string[], projectType: string, companyGuess: string|null, portfolioSegments: object[] }}
 */
export function scoreNewsArticle(title, description = '') {
  const text = `${title} ${description}`;
  const lower = text.toLowerCase();

  const matchedExpansion = matchKeywords(lower, PHT_FOOD_EXPANSION_KEYWORDS);
  const matchedMega = matchKeywords(lower, MEGA_EXPANSION_KEYWORDS);
  const matchedScale = matchKeywords(lower, EXPANSION_SCALE_KEYWORDS);
  const matchedIndustry = matchKeywords(lower, ALL_INDUSTRY_KEYWORDS);
  const matchedCompanies = DAX_MDAX_FOOD_LOGISTICS_COMPANIES.filter((c) =>
    keywordMatchesInText(lower, c.toLowerCase()),
  );

  const industryHits = Object.entries(PHT_EXPANSION_INDUSTRIES)
    .filter(([, kws]) => kws.some((kw) => keywordMatchesInText(lower, kw)))
    .map(([id]) => id);

  let score = 0;
  score += Math.min(matchedExpansion.length * 8, 32);
  score += Math.min(matchedMega.length * 12, 36);
  score += Math.min(matchedIndustry.length * 4, 16);
  score += Math.min(matchedScale.length * 10, 30);
  score += Math.min(matchedCompanies.length * 12, 24);

  const portfolioSegments = matchPortfolioSegments(text);
  if (portfolioSegments.length) score += Math.min(portfolioSegments[0].score, 20);

  const hasExpansionSignal = matchedExpansion.length > 0 || matchedMega.length > 0;
  const hasIndustrySignal = industryHits.length > 0 || matchedCompanies.length > 0;
  if (!hasExpansionSignal) score = Math.max(0, score - 25);
  if (!hasIndustrySignal && !matchedCompanies.length) score = Math.max(0, score - 15);

  score = Math.min(100, Math.max(0, score));

  const isMegaExpansion =
    matchedMega.length >= 1 &&
    (matchedScale.length >= 1 || score >= 55) &&
    (hasIndustrySignal || matchedCompanies.length > 0);

  const base = {
    relevanceScore: score,
    isMegaExpansion,
    matchedKeywords: [...new Set([...matchedExpansion, ...matchedMega, ...matchedScale])].slice(0, 12),
    matchedIndustries: industryHits,
    projectType: guessProjectType(matchedExpansion, matchedMega, industryHits),
    companyGuess: guessCompany(text) ?? matchedCompanies[0] ?? null,
    portfolioSegments: portfolioSegments.slice(0, 3),
    topSegment: portfolioSegments[0]?.name ?? null,
  };
  return { ...base, ...computeNewsLeadProbabilities(base) };
}

export function parseNewsRssItems(xml, source) {
  const items = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of itemBlocks.slice(0, 20)) {
    const title = stripHtml(block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]);
    const link = stripHtml(block.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1]);
    const desc = stripHtml(block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]);
    const pubDate = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim();
    if (!title) continue;

    const publishedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
    if (!isNewsLeadFresh(publishedAt)) continue;

    const scoring = scoreNewsArticle(title, desc);
    if (scoring.relevanceScore < NEWS_MIN_RELEVANCE_SCORE) continue;

    const country = extractCountry(`${title} ${desc}`);
    const summaryDe = buildSummaryDe({ ...scoring, country });

    items.push({
      id: `${source.id}-${Buffer.from(link || title).toString('base64url').slice(0, 16)}`,
      title: title.slice(0, 300),
      description: desc.slice(0, 500),
      url: link || source.url,
      publishedAt,
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.type,
      segment: source.segment,
      region: source.region,
      leadType: 'news',
      signalType: 'early-indicator',
      isEarlyIndicator: true,
      country,
      summaryDe,
      ...scoring,
    });
  }
  return items;
}

async function fetchNewsSource(source) {
  if (!source.url) return [];
  try {
    const res = await fetch(source.url, {
      headers: { 'User-Agent': 'PHT-Mastertool/1.0 NewsIntelligence', Accept: 'application/rss+xml, application/xml, text/xml' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    if (!xml.includes('<item') && !xml.includes('<entry')) return [];
    return parseNewsRssItems(xml, source);
  } catch {
    return [];
  }
}

/**
 * Run news intelligence across curated sources.
 * @returns {Promise<{ leads: object[], sourceCount: number, fetchedAt: string, megaExpansionCount: number }>}
 */
export async function runNewsIntelligence(options = {}) {
  const sources = NEWS_INTELLIGENCE_SOURCES.filter((s) => s.url);
  const concurrency = 5;
  const allRaw = [];

  for (let i = 0; i < sources.length; i += concurrency) {
    const batch = sources.slice(i, i + concurrency);
    const results = await Promise.all(batch.map(fetchNewsSource));
    for (const items of results) allRaw.push(...items);
  }

  const sorted = allRaw.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const deduped = [];
  const seen = new Set();
  for (const lead of sorted) {
    const key = lead.title.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(lead);
  }

  const freshRelevant = filterNewsLeads(deduped);

  const output = {
    fetchedAt: new Date().toISOString(),
    sourceCount: sources.length,
    leadCount: freshRelevant.length,
    megaExpansionCount: freshRelevant.filter((l) => l.isMegaExpansion).length,
    signalType: 'early-indicator',
    description: 'Branchen-News & Expansion – Frühindikatoren vor formaler Ausschreibung',
    leads: freshRelevant.slice(0, 150),
  };

  if (options.write !== false) {
    if (!existsSync(NEWS_LEADS_DIR)) mkdirSync(NEWS_LEADS_DIR, { recursive: true });
    writeFileSync(NEWS_LEADS_PATH, JSON.stringify(output, null, 2), 'utf8');
  }

  return output;
}

export function loadNewsLeads() {
  try {
    const raw = JSON.parse(readFileSync(NEWS_LEADS_PATH, 'utf8'));
    const leads = filterNewsLeads(raw.leads ?? []);
    return { ...raw, leads, leadCount: leads.length, megaExpansionCount: leads.filter((l) => l.isMegaExpansion).length };
  } catch {
    return { fetchedAt: null, leadCount: 0, megaExpansionCount: 0, leads: [] };
  }
}

export function getNewsIntelligenceSourceCount() {
  return NEWS_INTELLIGENCE_SOURCES.length;
}
