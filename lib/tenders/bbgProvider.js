/**
 * BBG Österreich – HTML-Parser für aktuelle Ausschreibungen
 * https://www.bbg.gv.at/information/aktuelle-ausschreibungen
 */

const API_PROXY = '/api/tenders/bbg';
const API_DIRECT = 'https://www.bbg.gv.at/information/aktuelle-ausschreibungen';

function getUrl() {
  return typeof window !== 'undefined' ? API_PROXY : API_DIRECT;
}

function parseTitles(html) {
  const titles = [];
  const parts = html.split('description-search');
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i].slice(0, 600);
    const m = chunk.match(/>\s*([\s\S]*?)\s*</);
    if (!m) continue;
    const title = m[1].replace(/\s+/g, ' ').trim();
    if (title.length > 4 && !titles.includes(title)) titles.push(title);
  }
  return titles;
}

function mapTitle(title, index) {
  const id = `bbg-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}-${index}`;
  return {
    id,
    title,
    country: 'Österreich',
    region: 'DACH',
    budget: 150000,
    currency: 'EUR',
    sourcePlatform: 'BBG',
    sourceUrl: 'https://www.bbg.gv.at/information/aktuelle-ausschreibungen',
    publicationDate: new Date().toISOString().slice(0, 10),
    submissionDeadline: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
    description: `BBG Ausschreibung: ${title}. Details und Unterlagen über ANKÖ-Vergabeportal.`,
    industry: inferIndustry(title),
    cpvCodes: [],
  };
}

function inferIndustry(text) {
  const l = text.toLowerCase();
  if (l.includes('pharma') || l.includes('labor')) return 'Pharma';
  if (l.includes('hospital') || l.includes('klinik')) return 'Hospital';
  if (l.includes('food') || l.includes('lebensmittel')) return 'Food';
  if (l.includes('reinigung') || l.includes('hygiene')) return 'Production';
  return 'Public';
}

export async function fetchBBGTenders() {
  const res = await fetch(getUrl(), {
    headers: { 'User-Agent': 'PHT-Mastertool/1.0', Accept: 'text/html' },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`BBG ${res.status}`);
  const html = await res.text();
  const tenders = parseTitles(html).map(mapTitle);
  return { tenders, source: 'bbg', live: tenders.length > 0 };
}
