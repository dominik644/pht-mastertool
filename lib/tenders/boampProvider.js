/**
 * BOAMP Frankreich – OpenDataSoft API (data.gouv.fr / DILA)
 * GET https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records
 * Kein API-Key; Filter über ODS-Query-Syntax (where, order_by, limit).
 */

import { inferIndustry, parseIsoDate } from './utils.js';

const API_BASE = 'https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records';
const API_PROXY = '/api/tenders/boamp';

function getSearchUrl(params) {
  const qs = new URLSearchParams(params).toString();
  const base = typeof window !== 'undefined' ? API_PROXY : API_BASE;
  return `${base}?${qs}`;
}

function extractCpvFromDonnees(donnees) {
  if (!donnees) return [];
  const codes = new Set();
  const text = typeof donnees === 'string' ? donnees : JSON.stringify(donnees);
  for (const m of text.matchAll(/"cpv[^"]*"\s*:\s*"(\d{8})"/gi)) codes.add(m[1]);
  for (const m of text.matchAll(/listName"\s*:\s*"cpv"[^}]*#text"\s*:\s*"(\d{8})"/gi)) codes.add(m[1]);
  for (const m of text.matchAll(/ItemClassificationCode[^}]*#text"\s*:\s*"(\d{8})"/gi)) codes.add(m[1]);
  return [...codes];
}

function mapRecord(r) {
  const title = r.objet || `BOAMP ${r.idweb || r.id}`;
  const buyer = r.nomacheteur || '';
  const cpv = extractCpvFromDonnees(r.donnees);
  const descriptors = Array.isArray(r.descripteur_libelle) ? r.descripteur_libelle.join(', ') : '';

  return {
    id: `boamp-${(r.idweb || r.id || '').replace(/[^a-zA-Z0-9-]/g, '')}`,
    title: title.slice(0, 300),
    country: 'Frankreich',
    countryCode: 'FRA',
    region: 'Europa',
    budget: 70000,
    currency: 'EUR',
    sourcePlatform: 'BOAMP',
    sourceUrl: r.url_avis || `https://www.boamp.fr/pages/avis/?q=idweb:${r.idweb || r.id}`,
    publicationDate: parseIsoDate(r.dateparution),
    submissionDeadline: parseIsoDate(r.datelimitereponse),
    description: `${title}. Acheteur: ${buyer}. ${descriptors}`.slice(0, 800),
    industry: inferIndustry(`${title} ${descriptors}`),
    cpvCodes: cpv,
  };
}

export async function fetchBoampTenders() {
  const from = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10);
  const params = {
    limit: '50',
    where: `dateparution >= "${from}" AND nature="APPEL_OFFRE"`,
    order_by: 'dateparution desc',
  };

  try {
    const res = await fetch(getSearchUrl(params), {
      headers: { Accept: 'application/json', 'User-Agent': 'PHT-Mastertool/1.0' },
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) throw new Error(`BOAMP ${res.status}`);

    const data = await res.json();
    const tenders = (data.results ?? []).map(mapRecord);
    const unique = [...new Map(tenders.map((t) => [t.id, t])).values()];
    return { tenders: unique, source: 'boamp', live: unique.length > 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'BOAMP Fehler';
    console.warn('[BOAMP]', message);
    return { tenders: [], source: 'boamp-error', error: message, live: false };
  }
}
