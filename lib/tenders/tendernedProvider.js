/**
 * TenderNed Niederlande
 * - RSS (öffentlich, Fallback): laatste-publicatie.rss
 * - TNS JSON + XML API (mit TENDERNED_API_USERNAME / TENDERNED_API_PASSWORD)
 *   Listing: GET …/v2/publicaties (öffentlich)
 *   Detail-XML: GET …/v2/publicaties/{id}/public-xml (HTTP Basic Auth)
 * Docs: https://www.tenderned.nl/info/swagger
 */

import { inferIndustry, parseIsoDate } from './utils.js';

const RSS_PROXY = '/api/tenders/tenderned';
const RSS_DIRECT = 'https://www.tenderned.nl/papi/tenderned-rs-tns/rss/laatste-publicatie.rss';
const TNS_PROXY = '/api/tenders/tenderned-tns';
const TNS_BASE = 'https://www.tenderned.nl/papi/tenderned-rs-tns/v2';
const XML_ENRICH_LIMIT = 15;

export function getTenderNedCredentials() {
  if (typeof process !== 'undefined' && process.env) {
    return {
      user: process.env.TENDERNED_API_USERNAME || '',
      pass: process.env.TENDERNED_API_PASSWORD || '',
    };
  }
  return { user: '', pass: '' };
}

export function hasTenderNedXmlCredentials() {
  const { user, pass } = getTenderNedCredentials();
  return !!(user && pass);
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

function parseDeadlineFromRss(content) {
  const m = content.match(/Sluitingsdatum:\s*(\d{2}-\d{2}-\d{4})/i);
  if (!m) return new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
  const [d, mo, y] = m[1].split('-');
  return `${y}-${mo}-${d}`;
}

function parseCpvFromRss(content) {
  const m = content.match(/CPV:\s*([^|]+)/i);
  return m ? m[1].trim() : '';
}

export function parseCpvFromXml(xml) {
  const codes = new Set();
  for (const m of xml.matchAll(/<CPV_CODE>([^<]+)<\/CPV_CODE>/gi)) {
    const code = m[1].trim();
    if (code) codes.add(code);
  }
  return [...codes];
}

function inferIndustryNl(text) {
  const l = text.toLowerCase();
  if (l.includes('ziekenhuis') || l.includes('hospital') || l.includes('klinik')) return 'Hospital';
  if (l.includes('pharma') || l.includes('labor')) return 'Pharma';
  if (l.includes('voedsel') || l.includes('food') || l.includes('lebensmittel')) return 'Food';
  if (l.includes('reiniging') || l.includes('hygiene') || l.includes('reinigung') || l.includes('wasch')) return 'Production';
  return inferIndustry(text);
}

function mapRssEntry(entry, index) {
  const id = `tenderned-${entry.link.replace(/[^0-9]+/g, '').slice(-12) || index}`;
  const cpvLabel = parseCpvFromRss(entry.content);
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
    submissionDeadline: parseDeadlineFromRss(entry.content),
    description: `${entry.title}. Auftraggeber: ${entry.author}. ${entry.content}`.slice(0, 800),
    industry: inferIndustryNl(`${entry.title} ${entry.content}`),
    cpvCodes: cpvLabel ? [cpvLabel] : [],
  };
}

export function mapJsonPublication(pub, cpvCodes = []) {
  const title = pub.aanbestedingNaam || `TenderNed ${pub.publicatieId}`;
  const buyer = pub.opdrachtgeverNaam || '';
  const description = pub.opdrachtBeschrijving || '';
  const deadline = pub.sluitingsDatum || pub.sluitingsDatumMarktconsultatie || '';
  const sourceUrl = pub.link?.href || `https://www.tenderned.nl/aankondigingen/overzicht/${pub.publicatieId}`;

  return {
    id: `tenderned-${pub.publicatieId}`,
    title: title.slice(0, 300),
    country: 'Niederlande',
    countryCode: 'NLD',
    region: 'Europa',
    budget: 70000,
    currency: 'EUR',
    sourcePlatform: 'TenderNed',
    sourceUrl,
    publicationDate: parseIsoDate(pub.publicatieDatum),
    submissionDeadline: parseIsoDate(deadline),
    description: `${title}. Auftraggeber: ${buyer}. ${description}`.slice(0, 800),
    industry: inferIndustryNl(`${title} ${description}`),
    cpvCodes,
  };
}

export function isActivePublication(pub) {
  if (typeof pub.aantalDagenTotSluitingsDatum === 'number' && pub.aantalDagenTotSluitingsDatum > 0) {
    return true;
  }
  if (pub.sluitingsDatumMarktconsultatie) {
    const end = new Date(pub.sluitingsDatumMarktconsultatie);
    if (!Number.isNaN(end.getTime()) && end.getTime() >= Date.now()) return true;
  }
  if (pub.typePublicatie?.code === 'AGO') return false;
  const pubDate = pub.publicatieDatum ? new Date(pub.publicatieDatum) : null;
  if (pubDate && !Number.isNaN(pubDate.getTime())) {
    return pubDate.getTime() >= Date.now() - 45 * 86400000;
  }
  return true;
}

function getRssUrl() {
  return typeof window !== 'undefined' ? RSS_PROXY : RSS_DIRECT;
}

function getTnsListUrl(page = 0, size = 50) {
  const qs = new URLSearchParams({ page: String(page), size: String(size) }).toString();
  return typeof window !== 'undefined' ? `${TNS_PROXY}?${qs}` : `${TNS_BASE}/publicaties?${qs}`;
}

async function fetchRssTenders() {
  const res = await fetch(getRssUrl(), {
    headers: { 'User-Agent': 'PHT-Mastertool/1.0', Accept: 'application/atom+xml, application/xml, text/xml' },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`TenderNed RSS ${res.status}`);
  const xml = await res.text();
  const tenders = parseAtomEntries(xml).map(mapRssEntry);
  return { tenders, source: 'tenderned-rss', live: tenders.length > 0 };
}

async function fetchPublicationXml(publicatieId, creds) {
  const auth = Buffer.from(`${creds.user}:${creds.pass}`).toString('base64');
  const res = await fetch(`${TNS_BASE}/publicaties/${publicatieId}/public-xml`, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/xml, text/xml',
      'User-Agent': 'PHT-Mastertool/1.0',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error('TenderNed XML-API Zugangsdaten ungültig (TENDERNED_API_USERNAME / TENDERNED_API_PASSWORD)');
  }
  if (!res.ok) throw new Error(`TenderNed XML ${res.status}`);
  return res.text();
}

async function enrichWithCpv(publications, creds) {
  const cpvById = new Map();
  const targets = publications.slice(0, XML_ENRICH_LIMIT);
  await Promise.all(targets.map(async (pub) => {
    try {
      const xml = await fetchPublicationXml(pub.publicatieId, creds);
      cpvById.set(pub.publicatieId, parseCpvFromXml(xml));
    } catch {
      cpvById.set(pub.publicatieId, []);
    }
  }));
  return cpvById;
}

async function fetchTnsTenders() {
  const res = await fetch(getTnsListUrl(), {
    headers: { Accept: 'application/json', 'User-Agent': 'PHT-Mastertool/1.0' },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`TenderNed TNS ${res.status}`);
  const data = await res.json();
  const publications = (data.content ?? []).filter(isActivePublication);
  const creds = getTenderNedCredentials();
  const useXml = typeof window === 'undefined' && hasTenderNedXmlCredentials();
  const cpvById = useXml ? await enrichWithCpv(publications, creds) : new Map();
  const tenders = publications.map((pub) => mapJsonPublication(pub, cpvById.get(pub.publicatieId) ?? []));
  const source = useXml ? 'tenderned-xml-api' : 'tenderned-tns';
  return { tenders, source, live: tenders.length > 0 };
}

export async function fetchTenderNedTenders() {
  const useTns = typeof window === 'undefined'
    ? hasTenderNedXmlCredentials()
    : true;

  if (useTns) {
    try {
      return await fetchTnsTenders();
    } catch (err) {
      if (hasTenderNedXmlCredentials()) {
        console.warn('[TenderNed] TNS/XML fehlgeschlagen, RSS-Fallback:', err.message);
      }
    }
  }

  return fetchRssTenders();
}
