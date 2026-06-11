/**
 * service.bund.de – RSS-Feed öffentlicher Ausschreibungen (Bund/Länder/Kommunen)
 * https://www.service.bund.de/Content/Globals/Functions/RSSFeed/RSSGenerator_Ausschreibungen.xml
 */

import { PHT_MATCH_KEYWORDS } from '../phtConfig.js';

const API_PROXY = '/api/bund';
const API_DIRECT = 'https://www.service.bund.de/Content/Globals/Functions/RSSFeed/RSSGenerator_Ausschreibungen.xml';

function getUrl() {
  return typeof window !== 'undefined' ? API_PROXY : API_DIRECT;
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&uuml;/g, 'ü')
    .replace(/&ouml;/g, 'ö')
    .replace(/&auml;/g, 'ä')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&Ouml;/g, 'Ö')
    .replace(/&Auml;/g, 'Ä')
    .replace(/&szlig;/g, 'ß')
    .replace(/&nbsp;/g, ' ');
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

function parseDeadline(desc) {
  const m = desc.match(/Angebotsfrist:\s*<strong>\s*(\d{2}\.\d{2}\.\d{4})/i)
    || desc.match(/Angebotsfrist:\s*(\d{2}\.\d{2}\.\d{4})/i);
  if (!m) return new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const [d, mo, y] = m[1].split('.');
  return `${y}-${mo}-${d}`;
}

function parseLocation(desc) {
  const m = desc.match(/Erf&uuml;llungsort:\s*<strong>\s*([^<]+)/i)
    || desc.match(/Erfüllungsort:\s*<strong>\s*([^<]+)/i);
  return m ? decodeEntities(m[1]).trim() : 'Deutschland';
}

function matchesPHT(text) {
  const lower = text.toLowerCase();
  return PHT_MATCH_KEYWORDS.some((kw) => lower.includes(kw));
}

function mapItem(item, index) {
  const id = `bund-${item.link.replace(/[^a-z0-9]+/gi, '-').slice(-40)}-${index}`;
  return {
    id,
    title: item.title.slice(0, 300),
    country: 'Deutschland',
    countryCode: 'DEU',
    region: 'DACH',
    budget: 75000,
    currency: 'EUR',
    sourcePlatform: 'service.bund.de',
    sourceUrl: item.link.split('#')[0],
    publicationDate: item.pubDate ? new Date(item.pubDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    submissionDeadline: parseDeadline(item.desc),
    description: `${item.title}. Erfüllungsort: ${parseLocation(item.desc)}. Bundes-/Länder-/Kommunalvergabe via service.bund.de.`,
    industry: inferIndustry(item.title),
    cpvCodes: [],
  };
}

function inferIndustry(text) {
  const l = text.toLowerCase();
  if (l.includes('krankenhaus') || l.includes('klinik') || l.includes('hospital')) return 'Hospital';
  if (l.includes('pharma') || l.includes('labor')) return 'Pharma';
  if (l.includes('lebensmittel') || l.includes('food')) return 'Food';
  if (l.includes('reinigung') || l.includes('hygiene')) return 'Production';
  return 'Public';
}

export async function fetchBundTenders() {
  const res = await fetch(getUrl(), {
    headers: { 'User-Agent': 'PHT-Mastertool/1.0', Accept: 'application/rss+xml, application/xml, text/xml' },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`service.bund.de ${res.status}`);
  const xml = await res.text();
  const tenders = parseRssItems(xml)
    .filter((item) => matchesPHT(`${item.title} ${item.desc}`))
    .map(mapItem);
  return { tenders, source: 'service.bund.de', live: tenders.length > 0 };
}
