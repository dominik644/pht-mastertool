/**
 * TenderNed Niederlande – öffentlicher Atom-RSS-Feed (kein API-Key)
 * https://www.tenderned.nl/papi/tenderned-rs-tns/rss/laatste-publicatie.rss
 */

import { PHT_MATCH_KEYWORDS } from '../phtConfig.js';

const API_PROXY = '/api/tenderned';
const API_DIRECT = 'https://www.tenderned.nl/papi/tenderned-rs-tns/rss/laatste-publicatie.rss';

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
    .replace(/&nbsp;/g, ' ');
}

function parseAtomEntries(xml) {
  const entries = [];
  const chunks = xml.split('<atom:entry>');
  for (let i = 1; i < chunks.length; i++) {
    const block = chunks[i].split('</atom:entry>')[0];
    const title = decodeEntities((block.match(/<atom:title>([\s\S]*?)<\/atom:title>/) || [])[1] || '').trim();
    const link = (block.match(/<atom:link href="([^"]+)"/) || [])[1]?.trim() || '';
    const content = decodeEntities(
      (block.match(/<atom:content[^>]*>([\s\S]*?)<\/atom:content>/) || [])[1]
      || (block.match(/<atom:summary>([\s\S]*?)<\/atom:summary>/) || [])[1]
      || '',
    );
    const published = (block.match(/<atom:published>([\s\S]*?)<\/atom:published>/) || [])[1]?.trim() || '';
    const author = decodeEntities((block.match(/<atom:name>([\s\S]*?)<\/atom:name>/) || [])[1] || '');
    if (title) entries.push({ title, link, content, published, author });
  }
  return entries;
}

function parseDeadline(content) {
  const m = content.match(/Sluitingsdatum:\s*(\d{2}-\d{2}-\d{4})/i);
  if (!m) return new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
  const [d, mo, y] = m[1].split('-');
  return `${y}-${mo}-${d}`;
}

function parseCpv(content) {
  const m = content.match(/CPV:\s*([^|]+)/i);
  return m ? m[1].trim() : '';
}

function matchesPHT(text) {
  const lower = text.toLowerCase();
  return PHT_MATCH_KEYWORDS.some((kw) => lower.includes(kw));
}

function inferIndustry(text) {
  const l = text.toLowerCase();
  if (l.includes('ziekenhuis') || l.includes('hospital') || l.includes('klinik')) return 'Hospital';
  if (l.includes('pharma') || l.includes('labor')) return 'Pharma';
  if (l.includes('voedsel') || l.includes('food') || l.includes('lebensmittel')) return 'Food';
  if (l.includes('reiniging') || l.includes('hygiene') || l.includes('reinigung') || l.includes('wasch')) return 'Production';
  return 'Public';
}

function mapEntry(entry, index) {
  const id = `tenderned-${entry.link.replace(/[^0-9]+/g, '').slice(-12) || index}`;
  const cpvLabel = parseCpv(entry.content);
  return {
    id,
    title: entry.title.slice(0, 300),
    country: 'Niederlande',
    countryCode: 'NLD',
    region: 'Europa',
    budget: 70000,
    currency: 'EUR',
    sourcePlatform: 'TenderNed',
    sourceUrl: entry.link,
    publicationDate: entry.published ? new Date(entry.published).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    submissionDeadline: parseDeadline(entry.content),
    description: `${entry.title}. Auftraggeber: ${entry.author}. ${entry.content}`.slice(0, 800),
    industry: inferIndustry(`${entry.title} ${entry.content}`),
    cpvCodes: cpvLabel ? [cpvLabel] : [],
  };
}

export async function fetchTenderNedTenders() {
  const res = await fetch(getUrl(), {
    headers: { 'User-Agent': 'PHT-Mastertool/1.0', Accept: 'application/atom+xml, application/xml, text/xml' },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`TenderNed RSS ${res.status}`);
  const xml = await res.text();
  const tenders = parseAtomEntries(xml)
    .filter((e) => matchesPHT(`${e.title} ${e.content}`))
    .map(mapEntry);
  return { tenders, source: 'tenderned-rss', live: tenders.length > 0 };
}
