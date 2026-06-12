/**
 * oeffentlichevergabe.de – Open Data API (OCDS daily export)
 * https://www.oeffentlichevergabe.de/documentation/swagger-ui/opendata/index.html
 */
import { unzipSync } from 'fflate';
import { inferIndustry, parseIsoDate } from './utils.js';

const API_BASE = 'https://www.oeffentlichevergabe.de/api/notice-exports';

function formatDay(date) {
  return date.toISOString().slice(0, 10);
}

function collectCpvCodes(tender) {
  const codes = new Set();
  for (const item of tender.items ?? []) {
    if (item.classification?.id) codes.add(String(item.classification.id));
  }
  if (tender.classification?.id) codes.add(String(tender.classification.id));
  return [...codes];
}

function mapRelease(release) {
  const tender = release.tender ?? {};
  const tags = release.tag ?? [];
  if (!tags.includes('tender') && !tags.includes('planning')) return null;

  const title = tender.title || release.description || 'Öffentliche Vergabe';
  const desc = tender.description || title;
  const noticeId = release.id || release.ocid;
  if (!noticeId) return null;

  const value = tender.value?.amount || tender.minValue?.amount || 75000;
  const currency = tender.value?.currency || 'EUR';
  const deadline = tender.tenderPeriod?.endDate || release.date;

  return {
    id: `ov-${String(noticeId).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 48)}`,
    title: String(title).slice(0, 300),
    country: 'Deutschland',
    countryCode: 'DEU',
    region: 'DACH',
    budget: Number(value) || 75000,
    currency,
    sourcePlatform: 'oeffentlichevergabe.de',
    sourceUrl: `https://oeffentlichevergabe.de/ui/de/search/details/${noticeId}`,
    publicationDate: parseIsoDate(release.date),
    submissionDeadline: parseIsoDate(deadline),
    description: typeof desc === 'string' ? desc.slice(0, 800) : String(title).slice(0, 300),
    industry: inferIndustry(`${title} ${desc}`),
    cpvCodes: collectCpvCodes(tender),
  };
}

function parseOcdsZip(buffer) {
  const tenders = [];
  const files = unzipSync(buffer);
  for (const content of Object.values(files)) {
    if (!content?.length) continue;
    let pkg;
    try {
      pkg = JSON.parse(new TextDecoder().decode(content));
    } catch {
      continue;
    }
    for (const release of pkg.releases ?? []) {
      const mapped = mapRelease(release);
      if (mapped) tenders.push(mapped);
    }
  }
  return tenders;
}

async function fetchDayOcds(day) {
  const url = `${API_BASE}?pubDay=${day}&format=ocds.zip`;
  const res = await fetch(url, {
    headers: { Accept: 'application/zip', 'User-Agent': 'PHT-Mastertool/1.0' },
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) return [];
  const buffer = new Uint8Array(await res.arrayBuffer());
  if (!buffer.length) return [];
  return parseOcdsZip(buffer);
}

/**
 * @param {{ days?: number }} [options]
 * @returns {Promise<object[]>}
 */
export async function fetchOeffentlichevergabeTenders(options = {}) {
  const days = Math.min(Math.max(options.days ?? 2, 1), 3);
  const dayStrings = [];
  for (let i = 1; i <= days; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayStrings.push(formatDay(d));
  }

  const batches = await Promise.allSettled(dayStrings.map(fetchDayOcds));
  const tenders = [];
  for (const batch of batches) {
    if (batch.status === 'fulfilled') tenders.push(...batch.value);
  }

  return [...new Map(tenders.map((t) => [t.id, t])).values()];
}
