/**
 * SIMAP Schweiz – öffentliche Projekt-Suche (kein API-Key nötig)
 * https://www.simap.ch/api/publications/v2/project/project-search
 */

import { PHT_MATCH_KEYWORDS } from '../phtConfig.js';

const API_PROXY = '/api/simap';
const API_DIRECT = 'https://www.simap.ch/api/publications/v2/project/project-search';

const SEARCH_TERMS = [
  'hygiene', 'reinigung', 'desinfektion', 'wasch', 'hospital', 'sanitär', 'labor',
];

function getUrl() {
  return typeof window !== 'undefined' ? API_PROXY : API_DIRECT;
}

function pickTitle(titleObj) {
  if (!titleObj || typeof titleObj !== 'object') return '';
  return titleObj.de || titleObj.fr || titleObj.it || titleObj.en || '';
}

function matchesPHT(text) {
  const lower = text.toLowerCase();
  return PHT_MATCH_KEYWORDS.some((kw) => lower.includes(kw));
}

function mapProject(project) {
  const title = pickTitle(project.title) || `SIMAP ${project.projectNumber}`;
  const office = pickTitle(project.procOfficeName) || '';
  const pubType = project.pubType || project.lots?.[0]?.pubType;
  if (pubType && pubType !== 'tender' && pubType !== 'advance_notice') return null;

  const id = `simap-${project.id}`;
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
    publicationDate: project.publicationDate || new Date().toISOString().slice(0, 10),
    submissionDeadline: deadline,
    description: `${title}. Auftraggeber: ${office}. SIMAP Projekt ${project.projectNumber}.`,
    industry: inferIndustry(title),
    cpvCodes: [],
  };
}

function inferIndustry(text) {
  const l = text.toLowerCase();
  if (l.includes('hospital') || l.includes('spital') || l.includes('klinik')) return 'Hospital';
  if (l.includes('pharma') || l.includes('labor')) return 'Pharma';
  if (l.includes('food') || l.includes('lebensmittel')) return 'Food';
  if (l.includes('reinigung') || l.includes('hygiene') || l.includes('wasch')) return 'Production';
  return 'Public';
}

async function searchTerm(term) {
  const params = new URLSearchParams({ search: term, pageSize: '15' });
  const res = await fetch(`${getUrl()}?${params}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'PHT-Mastertool/1.0' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`SIMAP ${res.status}`);
  const data = await res.json();
  return (data.projects ?? [])
    .map(mapProject)
    .filter(Boolean)
    .filter((t) => matchesPHT(`${t.title} ${t.description}`));
}

export async function fetchSimapTenders() {
  const results = await Promise.allSettled(SEARCH_TERMS.slice(0, 5).map(searchTerm));
  const tenders = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  const unique = [...new Map(tenders.map((t) => [t.id, t])).values()];
  return { tenders: unique, source: 'simap', live: unique.length > 0 };
}
