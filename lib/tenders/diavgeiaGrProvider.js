/**
 * Greece Diavgeia – Open Data API (öffentlich, kein Key)
 * GET https://diavgeia.gov.gr/luminapi/opendata/search.json?term=…
 * Transparenzportal mit Vergabeentscheidungen (Typ Δ.1, Γ.3.4 u.a.)
 */

import { inferIndustry, parseIsoDate } from './utils.js';

const API_BASE = 'https://diavgeia.gov.gr/luminapi/opendata/search.json';
const API_PROXY = '/api/tenders/diavgeia';

/** Griechische Suchbegriffe für Hygiene/Reinigung/Medizin */
const SEARCH_TERMS = ['υγιεινή', 'απολύμανση', 'καθαρισμός', 'νοσοκομείο', 'προμήθεια'];

/** Vergabe-/Vertragsentscheidungstypen */
const PROC_TYPES = new Set(['Δ.1', 'Γ.3.4', 'Ε.2', '2.4.4']);

function apiRoot() {
  return typeof window !== 'undefined' ? API_PROXY : API_BASE;
}

function epochToIso(ms) {
  if (!ms) return new Date().toISOString().slice(0, 10);
  return new Date(Number(ms)).toISOString().slice(0, 10);
}

function decisionUrl(d) {
  if (d.url) return d.url.replace('/api/decisions/', '/decision/view/').replace('/luminapi/api/', '/');
  if (d.ada) return `https://diavgeia.gov.gr/decision/view/${encodeURIComponent(d.ada)}`;
  return 'https://diavgeia.gov.gr';
}

function mapDecision(d) {
  const title = d.subject || `Diavgeia ${d.ada || d.protocolNumber}`;
  return {
    id: `diavgeia-gr-${String(d.ada || d.protocolNumber).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 48)}`,
    title: String(title).slice(0, 300),
    country: 'Griechenland',
    countryCode: 'GRC',
    region: 'Europa',
    budget: 70000,
    currency: 'EUR',
    sourcePlatform: 'Diavgeia',
    sourceUrl: decisionUrl(d),
    publicationDate: epochToIso(d.issueDate || d.publishTimestamp),
    submissionDeadline: epochToIso(d.issueDate || d.publishTimestamp),
    description: `${title}. Τύπος: ${d.decisionTypeId || ''}. ΑΔΑ: ${d.ada || ''}.`.slice(0, 800),
    industry: inferIndustry(title),
    cpvCodes: [],
  };
}

async function searchTerm(term) {
  const params = new URLSearchParams({ term, page: '0', size: '12' });
  const res = await fetch(`${apiRoot()}?${params}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'PHT-Mastertool/1.0' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Diavgeia ${res.status}`);
  const data = await res.json();
  return (data.decisions ?? []).filter((d) => PROC_TYPES.has(d.decisionTypeId));
}

export async function fetchDiavgeiaGrTenders() {
  try {
    const results = await Promise.allSettled(SEARCH_TERMS.map(searchTerm));
    const tenders = results.flatMap((r) => (r.status === 'fulfilled' ? r.value.map(mapDecision) : []));
    const unique = [...new Map(tenders.map((t) => [t.id, t])).values()];
    return { tenders: unique, source: 'diavgeia-gr', live: unique.length > 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Diavgeia Fehler';
    console.warn('[Diavgeia GR]', message);
    return { tenders: [], source: 'diavgeia-gr-error', error: message, live: false };
  }
}
