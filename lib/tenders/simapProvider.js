/**
 * SIMAP Schweiz – öffentliche Projekt-Suche (kein API-Key nötig)
 * https://www.simap.ch/api/publications/v2/project/project-search
 */

import { PHT_CPV_CODES } from '../phtConfig.js';
import { cpvMatchesPHT } from './cpvMatch.js';
import { inferIndustry, parseIsoDate } from './utils.js';

const API_PROXY = '/api/tenders/simap';
const API_DIRECT = 'https://www.simap.ch/api/publications/v2/project/project-search';

const SEARCH_TERMS = [
  'hygiene', 'reinigung', 'desinfektion', 'wasch', 'hospital', 'sanitär', 'labor',
  'spital', 'klinik', 'gmp', 'lebensmittel',
];

const CPV_BATCH_SIZE = 4;

function getUrl() {
  return typeof window !== 'undefined' ? API_PROXY : API_DIRECT;
}

function pickTitle(titleObj) {
  if (!titleObj || typeof titleObj !== 'object') return '';
  return titleObj.de || titleObj.fr || titleObj.it || titleObj.en || '';
}

function pickLotCpvCodes(lots = []) {
  const codes = new Set();
  for (const lot of lots) {
    for (const raw of lot.cpvCodes ?? (lot.cpvCode ? [lot.cpvCode] : [])) {
      const code = String(raw).replace(/\D/g, '').slice(0, 8);
      if (code) codes.add(code);
    }
  }
  return [...codes];
}

function mapProject(project, searchCpvCodes = []) {
  const title = pickTitle(project.title) || `SIMAP ${project.projectNumber}`;
  const office = pickTitle(project.procOfficeName) || '';
  const pubType = project.pubType || project.lots?.[0]?.pubType;
  if (pubType && pubType !== 'tender' && pubType !== 'advance_notice') return null;

  const lotCpvs = pickLotCpvCodes(project.lots);
  const fromCpvSearch = searchCpvCodes.length > 0;
  const text = `${title} ${office}`;
  const keywordHit = SEARCH_TERMS.some((term) => text.toLowerCase().includes(term));
  if (!cpvMatchesPHT(lotCpvs) && !fromCpvSearch && !keywordHit) return null;

  const id = `simap-${project.id}`;
  const publicationDate = parseIsoDate(project.publicationDate);
  const deadline = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);

  return {
    id,
    title: title.slice(0, 300),
    country: 'Schweiz',
    countryCode: 'CHE',
    region: 'DACH',
    budget: 80000,
    currency: 'CHF',
    sourcePlatform: 'SIMAP',
    sourceUrl: `https://www.simap.ch/de/project-detail/${project.projectNumber}`,
    publicationDate,
    submissionDeadline: deadline,
    description: `${title}. Auftraggeber: ${office}. SIMAP Projekt ${project.projectNumber}.`,
    industry: inferIndustry(text),
    cpvCodes: lotCpvs,
  };
}

async function searchCpvBatch(cpvBatch) {
  const params = new URLSearchParams({
    cpvCodes: cpvBatch.join(','),
    pageSize: '20',
  });
  const res = await fetch(`${getUrl()}?${params}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'PHT-Mastertool/1.0' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`SIMAP ${res.status}`);
  const data = await res.json();
  return (data.projects ?? []).map((p) => mapProject(p, cpvBatch)).filter(Boolean);
}

async function searchTerm(term) {
  const params = new URLSearchParams({ search: term, pageSize: '15' });
  const res = await fetch(`${getUrl()}?${params}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'PHT-Mastertool/1.0' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`SIMAP ${res.status}`);
  const data = await res.json();
  return (data.projects ?? []).map((p) => mapProject(p)).filter(Boolean);
}

function buildCpvBatches() {
  const batches = [];
  for (let i = 0; i < PHT_CPV_CODES.length; i += CPV_BATCH_SIZE) {
    batches.push(PHT_CPV_CODES.slice(i, i + CPV_BATCH_SIZE));
  }
  return batches;
}

export async function fetchSimapTenders() {
  const cpvBatches = buildCpvBatches();
  const keywordTerms = SEARCH_TERMS.slice(0, 5);
  const tasks = [
    ...cpvBatches.map((batch) => searchCpvBatch(batch)),
    ...keywordTerms.map(searchTerm),
  ];
  const results = await Promise.allSettled(tasks);
  const tenders = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  const unique = [...new Map(tenders.map((t) => [t.id, t])).values()];
  return { tenders: unique, source: 'simap', live: unique.length > 0 };
}
