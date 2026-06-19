/**
 * Lead Discovery – kuratierte RSS/Atom/TED-Quellen für PHT-Portfolio.
 * Kein Homepage-Crawling – nur erlaubte Feed-URLs.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHT_PORTFOLIO_SEGMENTS, matchPortfolioSegments } from './phtPortfolio.js';
import {
  TED_SEARCH_QUERIES,
  TED_FOOD_FACILITY_QUERIES,
  TED_FOOD_FACILITY_COUNTRY_QUERIES,
} from './phtConfig.js';
import { runNewsIntelligence, getNewsIntelligenceSourceCount, NEWS_INTELLIGENCE_SOURCES } from './newsIntelligence.js';
import { filterDiscoveredLeads } from './newsLeadFilters.js';

export { runNewsIntelligence, getNewsIntelligenceSourceCount, NEWS_INTELLIGENCE_SOURCES };

const __dirname = dirname(fileURLToPath(import.meta.url));
const LEADS_DIR = join(__dirname, '../public/data/leads');
const LEADS_PATH = join(LEADS_DIR, 'discovered-leads.json');

/** 30+ kuratierte Quellen – RSS/Atom/TED/Google News. */
export const LEAD_DISCOVERY_SOURCES = [
  // Food industry news (DE)
  { id: 'fleischwirtschaft-rss', name: 'Fleischwirtschaft', type: 'rss', url: 'https://www.fleischwirtschaft.de/rss/news.xml', segment: 'food-facility-construction', region: 'DACH' },
  { id: 'lebensmittel-praxis', name: 'Lebensmittel Praxis', type: 'rss', url: 'https://www.lebensmittelpraxis.de/rss/news.xml', segment: 'food-facility-construction', region: 'DACH' },
  { id: 'foodbev-de', name: 'Food & Beverage DE', type: 'rss', url: 'https://www.foodbev.com/feed/', segment: 'food-facility-construction', region: 'EU' },
  { id: 'dairy-industries', name: 'Dairy Industries', type: 'rss', url: 'https://www.dairyindustries.com/feed/', segment: 'food-facility-construction', region: 'EU' },
  // Construction / procurement aggregators
  { id: 'ted-new-notices', name: 'TED New Notices', type: 'ted', url: 'https://ted.europa.eu/api/v3.0/notices/search', segment: 'all', region: 'EU' },
  { id: 'vergabe24-de', name: 'Vergabe24 News', type: 'rss', url: 'https://www.vergabe24.de/rss/news', segment: 'municipalities', region: 'DE' },
  { id: 'baunetz-rss', name: 'Baunetz', type: 'rss', url: 'https://www.baunetz.de/rss/news.xml', segment: 'food-facility-construction', region: 'DACH' },
  // Hygiene / pharma
  { id: 'gmp-review', name: 'GMP Review', type: 'rss', url: 'https://www.gmp-review.com/feed/', segment: 'healthcare', region: 'EU' },
  { id: 'pharma-food', name: 'Pharma Food', type: 'rss', url: 'https://www.pharmaceutical-technology.com/feed/', segment: 'healthcare', region: 'EU' },
  // Logistics
  { id: 'logistik-heute', name: 'Logistik Heute', type: 'rss', url: 'https://www.logistik-heute.de/rss/news.xml', segment: 'logistics', region: 'DACH' },
  { id: 'transport-logistik', name: 'Transport & Logistik', type: 'rss', url: 'https://www.transport-online.de/rss/news.xml', segment: 'logistics', region: 'DACH' },
  // Municipal / public
  { id: 'kommunal-de', name: 'Kommunal', type: 'rss', url: 'https://www.kommunalmagazin.de/rss/news.xml', segment: 'municipalities', region: 'DE' },
  { id: 'feuerwehr-magazin', name: 'Feuerwehr Magazin', type: 'rss', url: 'https://www.feuerwehr-magazin.de/rss/news.xml', segment: 'fire-departments', region: 'DACH' },
  // EU funding
  { id: 'cordis-h2020', name: 'CORDIS Food', type: 'rss', url: 'https://cordis.europa.eu/rss/food.xml', segment: 'food-facility-construction', region: 'EU' },
  { id: 'europa-press-releases', name: 'EU Press Releases', type: 'rss', url: 'https://ec.europa.eu/commission/presscorner/api/rss', segment: 'all', region: 'EU' },
  // Industry associations
  { id: 'bvl-news', name: 'BVL Logistik', type: 'rss', url: 'https://www.bvl.de/rss/news.xml', segment: 'logistics', region: 'DE' },
  { id: 'dehoga', name: 'DEHOGA', type: 'rss', url: 'https://www.dehoga-bundesverband.de/rss/news.xml', segment: 'food-facility-construction', region: 'DE' },
  // FR sources
  { id: 'process-alimentaire', name: 'Process Alimentaire', type: 'rss', url: 'https://www.processalimentaire.com/rss/news.xml', segment: 'food-facility-construction', region: 'FR' },
  { id: 'batiment-entretien', name: 'Bâtiment Entretien', type: 'rss', url: 'https://www.batiment-entretien.fr/rss/news.xml', segment: 'foam-low-pressure-hygiene', region: 'FR' },
  // UK
  { id: 'food-manufacture-uk', name: 'Food Manufacture UK', type: 'rss', url: 'https://www.foodmanufacture.co.uk/rss/news.xml', segment: 'food-facility-construction', region: 'UK' },
  // Google News RSS (optional queries)
  { id: 'gn-lebensmittel-ausschreibung', name: 'Google News: Lebensmittel Ausschreibung', type: 'google-news', url: 'https://news.google.com/rss/search?q=Lebensmittelbetrieb+Ausschreibung&hl=de&gl=DE&ceid=DE:de', segment: 'food-facility-construction', region: 'DE' },
  { id: 'gn-hygienestation', name: 'Google News: Hygienestation', type: 'google-news', url: 'https://news.google.com/rss/search?q=Hygienestation+Ausschreibung&hl=de&gl=DE&ceid=DE:de', segment: 'foam-low-pressure-hygiene', region: 'DACH' },
  { id: 'gn-kistenwaschanlage', name: 'Google News: Kistenwaschanlage', type: 'google-news', url: 'https://news.google.com/rss/search?q=Kistenwaschanlage&hl=de&gl=DE&ceid=DE:de', segment: 'industrial-washers', region: 'DACH' },
  { id: 'gn-spinde-feuerwehr', name: 'Google News: Feuerwehr Spinde', type: 'google-news', url: 'https://news.google.com/rss/search?q=Feuerwehr+Spinde+Ausschreibung&hl=de&gl=DE&ceid=DE:de', segment: 'fire-departments', region: 'DACH' },
  { id: 'gn-food-facility-construction', name: 'Google News: Food Facility Construction', type: 'google-news', url: 'https://news.google.com/rss/search?q=food+processing+plant+construction+tender&hl=en&gl=US&ceid=US:en', segment: 'food-facility-construction', region: 'global' },
  { id: 'gn-lm-investition-neubau', name: 'Google News: LM Investition Neubau', type: 'google-news', url: 'https://news.google.com/rss/search?q=Lebensmittelbetrieb+Investition+Neubau&hl=de&gl=DE&ceid=DE:de', segment: 'food-facility-construction', region: 'DE' },
  { id: 'gn-lm-konzern-erweiterung', name: 'Google News: LM Konzern Werk Erweiterung', type: 'google-news', url: 'https://news.google.com/rss/search?q=Lebensmittelkonzern+Werk+Erweiterung&hl=de&gl=DE&ceid=DE:de', segment: 'food-facility-construction', region: 'DACH' },
  { id: 'gn-food-plant-expansion-inv', name: 'Google News: Food Plant Expansion Investment', type: 'google-news', url: 'https://news.google.com/rss/search?q=food+processing+plant+expansion+investment&hl=en&gl=GB&ceid=GB:en', segment: 'food-facility-construction', region: 'EU' },
  { id: 'gn-dairy-factory-construction', name: 'Google News: Dairy Factory Construction', type: 'google-news', url: 'https://news.google.com/rss/search?q=dairy+factory+construction&hl=en&gl=GB&ceid=GB:en', segment: 'food-facility-construction', region: 'EU' },
  { id: 'gn-fmcg-factory-expansion-eu', name: 'Google News: FMCG Factory Expansion Europe', type: 'google-news', url: 'https://news.google.com/rss/search?q=FMCG+factory+expansion+Europe&hl=en&gl=GB&ceid=GB:en', segment: 'food-facility-construction', region: 'EU' },
  // Private Bauchancen – LinkedIn & Bauvorhaben-Signale
  { id: 'gn-nestle-werk', name: 'Google News: Nestlé Werk Investition', type: 'google-news', url: 'https://news.google.com/rss/search?q=Nestl%C3%A9+neues+Werk+Investition&hl=de&gl=DE&ceid=DE:de', segment: 'private-construction', region: 'DACH' },
  { id: 'gn-baugenehmigung-lm', name: 'Google News: Baugenehmigung LM', type: 'google-news', url: 'https://news.google.com/rss/search?q=Baugenehmigung+Lebensmittelbetrieb&hl=de&gl=DE&ceid=DE:de', segment: 'private-construction', region: 'DE' },
  { id: 'gn-linkedin-food-plant', name: 'Google News: LinkedIn Food Plant', type: 'google-news', url: 'https://news.google.com/rss/search?q=site%3Alinkedin.com+food+plant+expansion&hl=en&gl=US&ceid=US:en', segment: 'private-construction', region: 'global' },
  { id: 'gn-greenfield-food-de', name: 'Google News: Greenfield Food DE', type: 'google-news', url: 'https://news.google.com/rss/search?q=Greenfield+food+plant+Germany&hl=en&gl=DE&ceid=DE:en', segment: 'private-construction', region: 'DE' },
  { id: 'foodnavigator-rss', name: 'FoodNavigator', type: 'rss', url: 'https://www.foodnavigator.com/rss/news.xml', segment: 'food-facility-construction', region: 'EU' },
  { id: 'gn-crate-washer', name: 'Google News: Crate Washer Tender', type: 'google-news', url: 'https://news.google.com/rss/search?q=crate+washer+tender&hl=en&gl=GB&ceid=GB:en', segment: 'industrial-washers', region: 'EU' },
  { id: 'gn-locker-tender', name: 'Google News: Locker Tender', type: 'google-news', url: 'https://news.google.com/rss/search?q=changing+room+lockers+tender&hl=en&gl=GB&ceid=GB:en', segment: 'lockers-wardrobe', region: 'EU' },
  // NL
  { id: 'vakblad-voedselindustrie', name: 'Vakblad Voedselindustrie', type: 'rss', url: 'https://www.vakbladvoedselindustrie.nl/rss/news.xml', segment: 'food-facility-construction', region: 'NL' },
  // AT/CH
  { id: 'lebensmittel-zeitung-at', name: 'Lebensmittel Zeitung AT', type: 'rss', url: 'https://www.lebensmittelzeitung.net/rss/news.xml', segment: 'food-facility-construction', region: 'AT' },
  // Pharma
  { id: 'pharmazeutische-zeitung', name: 'Pharmazeutische Zeitung', type: 'rss', url: 'https://www.pharmazeutische-zeitung.de/rss/news.xml', segment: 'healthcare', region: 'DE' },
  // Cleaning equipment trade
  { id: 'cleaning-magazine', name: 'Cleaning Magazine', type: 'rss', url: 'https://www.cleaning-magazine.co.uk/rss/news.xml', segment: 'cleaning-tools', region: 'UK' },
  { id: 'hygiene-fokus', name: 'Hygiene Fokus', type: 'rss', url: 'https://www.hygiene-fokus.de/rss/news.xml', segment: 'foam-low-pressure-hygiene', region: 'DE' },
  // TED portfolio segment queries (virtual sources)
  ...PHT_PORTFOLIO_SEGMENTS.map((seg) => ({
    id: `ted-segment-${seg.id}`,
    name: `TED: ${seg.name}`,
    type: 'ted-query',
    url: null,
    segment: seg.id,
    region: 'EU',
    query: buildSegmentTedQuery(seg),
  })),
];

function buildSegmentTedQuery(seg) {
  const kw = [...seg.keywords.de.slice(0, 3), ...seg.keywords.en.slice(0, 2)];
  const terms = kw.map((k) => k.replace(/\s+/g, ' ')).join(' OR ');
  return `FT~(${terms})`;
}

/** Portfolio-segment TED queries (20+ beyond existing phtConfig). */
export const PORTFOLIO_TED_QUERIES = [
  ...TED_SEARCH_QUERIES,
  ...TED_FOOD_FACILITY_QUERIES,
  ...TED_FOOD_FACILITY_COUNTRY_QUERIES,
  'FT~(kistenwaschanlage OR behälterwaschanlage OR palettenwascher)',
  'FT~(mülltonnenwasch OR blumentopfwasch OR ibc washer)',
  'FT~(schaumstation OR niederdruckanlage OR hygienestation)',
  'FT~(feuerwehrspind OR garderobenschrank OR wertfachschrank)',
  'FT~(besen OR bürste OR reinigungsbedarf OR cleaning brush)',
  'FT~(sohlenreiniger OR sanicare OR portaldrehkreuz)',
  'FT~(lebensmittelbetrieb umbau OR food facility renovation)',
  'FT~(logistikhalle OR warehouse hygiene OR lager reinigung)',
  'FT~(krankenhaus hygienestation OR hospital hygiene station)',
  'FT~(kommune spind OR municipal locker OR vestiaire)',
  'FT~(crate washer OR box washer OR container wash system)',
  'FT~(stiefeltrockner OR boot dryer OR schuhtrocknung)',
  'FT~(messerkorb OR knife basket washer OR sterilisation sink)',
  'FT~(frontlader reinigung OR forklift washer)',
  'FT~(desinfektionsmatte OR disinfection mat entrance)',
  'FT~(personenschleuse OR personnel hygiene lock)',
  'FT~(industrial washer OR sonderbau waschanlage)',
  'FT~(changing room equipment OR umkleideausstattung)',
  'FT~(foam cleaning station OR schaumreinigungsanlage)',
  'FT~(food plant hygiene equipment OR lebensmittelhygiene anlage)',
  'FT~(waste bin washer OR tonnenwaschanlage)',
  'FT~(apron washer OR schürzenreinigung)',
];

function parseRssItems(xml, source) {
  const items = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of itemBlocks.slice(0, 15)) {
    const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim();
    const link = block.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1]?.trim();
    const desc = block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]?.trim();
    const pubDate = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim();
    if (!title) continue;
    items.push({
      id: `${source.id}-${Buffer.from(link || title).toString('base64url').slice(0, 16)}`,
      title: title.replace(/<[^>]+>/g, '').slice(0, 300),
      description: (desc || '').replace(/<[^>]+>/g, '').slice(0, 500),
      url: link || source.url,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.type,
      segment: source.segment,
      region: source.region,
    });
  }
  return items;
}

async function fetchFeedSource(source) {
  if (source.type === 'ted-query' || !source.url) return [];
  try {
    const res = await fetch(source.url, {
      headers: { 'User-Agent': 'PHT-Mastertool/1.0 LeadDiscovery', Accept: 'application/rss+xml, application/xml, text/xml' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    if (!xml.includes('<item') && !xml.includes('<entry')) return [];
    return parseRssItems(xml, source);
  } catch {
    return [];
  }
}

function scoreLead(lead) {
  const text = `${lead.title} ${lead.description}`;
  const segments = matchPortfolioSegments(text);
  const topSegment = segments[0];
  return {
    ...lead,
    portfolioSegments: segments.slice(0, 3),
    topSegment: topSegment?.name ?? null,
    segmentId: topSegment?.segmentId ?? lead.segment,
    relevanceScore: topSegment?.score ?? (segments.length ? 5 : 0),
  };
}

/**
 * Run lead discovery across all curated sources.
 * @returns {Promise<{ leads: object[], sources: number, fetchedAt: string }>}
 */
export async function runLeadDiscovery(options = {}) {
  const feedSources = LEAD_DISCOVERY_SOURCES.filter((s) => s.url && s.type !== 'ted-query');
  const concurrency = 5;
  const allRaw = [];

  for (let i = 0; i < feedSources.length; i += concurrency) {
    const batch = feedSources.slice(i, i + concurrency);
    const results = await Promise.all(batch.map(fetchFeedSource));
    for (const items of results) allRaw.push(...items);
  }

  const scored = allRaw
    .map(scoreLead)
    .filter((l) => l.relevanceScore > 0 || l.segment !== 'all')
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  const deduped = [];
  const seen = new Set();
  for (const lead of scored) {
    const key = lead.title.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(lead);
  }

  const freshRelevant = filterDiscoveredLeads(deduped);

  const output = {
    fetchedAt: new Date().toISOString(),
    sourceCount: feedSources.length,
    tedQueryCount: PORTFOLIO_TED_QUERIES.length,
    leadCount: freshRelevant.length,
    leads: freshRelevant.slice(0, 200),
    tedQueries: options.includeTedQueries !== false ? PORTFOLIO_TED_QUERIES : undefined,
  };

  if (options.write !== false) {
    if (!existsSync(LEADS_DIR)) mkdirSync(LEADS_DIR, { recursive: true });
    writeFileSync(LEADS_PATH, JSON.stringify(output, null, 2), 'utf8');
  }

  return output;
}

export function loadDiscoveredLeads() {
  try {
    const raw = readFileSync(LEADS_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { fetchedAt: null, leadCount: 0, leads: [] };
  }
}

export function getLeadDiscoverySourceCount() {
  return LEAD_DISCOVERY_SOURCES.length;
}
