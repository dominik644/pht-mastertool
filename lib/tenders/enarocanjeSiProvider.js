/**
 * Slovenia ENAROCANJE – Interim: TED RSS für Slowenien (country=SVN)
 * Kein öffentliches ENAROCANJE REST-API; TED deckt EU-Schwellen ab.
 * @see data/discovered-sources.json → enarocanje-si-rss
 */
import { inferIndustry, parseIsoDate } from './utils.js';

const TED_RSS = 'https://ted.europa.eu/en/rss/search?query=country%3DSVN&scope=ACTIVE&limit=40';

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function parseRssItems(xml) {
  const items = [];
  const chunks = xml.split('<item>');
  for (let i = 1; i < chunks.length; i++) {
    const block = chunks[i].split('</item>')[0];
    const title = decodeEntities((block.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').trim();
    const link = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1]?.trim() || '';
    const desc = decodeEntities((block.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '');
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1]?.trim() || '';
    if (title) items.push({ title, link, desc, pubDate });
  }
  return items;
}

function mapItem(item, index) {
  const id = `si-ted-rss-${item.link.replace(/[^a-z0-9]+/gi, '-').slice(-36)}-${index}`;
  const pub = item.pubDate ? new Date(item.pubDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  return {
    id,
    title: item.title.slice(0, 300),
    country: 'Slowenien',
    countryCode: 'SVN',
    region: 'Europe',
    budget: 60000,
    currency: 'EUR',
    sourcePlatform: 'TED RSS (SI)',
    sourceUrl: item.link,
    publicationDate: pub,
    submissionDeadline: parseIsoDate(new Date(Date.now() + 35 * 86400000).toISOString()),
    description: item.desc || item.title,
    industry: inferIndustry(item.title),
    cpvCodes: [],
  };
}

export async function fetchEnarocanjeSiTenders() {
  try {
    const res = await fetch(TED_RSS, {
      headers: { Accept: 'application/rss+xml, application/xml', 'User-Agent': 'PHT-Mastertool/1.0' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`TED SI RSS ${res.status}`);
    const xml = await res.text();
    const tenders = parseRssItems(xml).map(mapItem);
    return { tenders, source: 'enarocanje-si-ted-rss', live: tenders.length > 0 };
  } catch (err) {
    console.warn('[ENAROCANJE SI] TED RSS fallback fehlgeschlagen:', err.message);
    return {
      tenders: [],
      source: 'enarocanje-si-stub',
      live: false,
      error: err instanceof Error ? err.message : 'TED SI RSS fehlgeschlagen',
    };
  }
}
