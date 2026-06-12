/**
 * UK Contracts Finder – Live API v2
 * https://www.contractsfinder.service.gov.uk/api/rest/2/search_notices/json
 */

const API_PROXY = '/api/uk?target=contracts';
const API_DIRECT = 'https://www.contractsfinder.service.gov.uk/api/rest/2/search_notices/json';

const PHT_SEARCH_TERMS = ['hygiene', 'cleaning', 'hospital', 'sanitation', 'disinfection', 'food production'];

function getApiUrl() {
  return typeof window !== 'undefined' ? API_PROXY : API_DIRECT;
}

function mapNotice(item) {
  const n = item.item ?? item;
  const id = n.noticeIdentifier || n.id;
  const budget = Number(n.valueLow || n.valueHigh || n.awardedValue) || 50000;

  return {
    id: `uk-cf-${id}`,
    title: n.title || 'UK Contract Notice',
    country: 'UK',
    region: 'UK',
    budget,
    currency: 'GBP',
    sourcePlatform: 'Contracts Finder',
    sourceUrl: `https://www.contractsfinder.service.gov.uk/Notice/${id}`,
    publicationDate: parseDate(n.publishedDate),
    submissionDeadline: parseDate(n.deadlineDate),
    description: (n.description || n.title || '').slice(0, 800),
    industry: inferIndustry(`${n.title} ${n.description}`),
    cpvCodes: String(n.cpvCodes || '').split(/\s+/).filter(Boolean),
  };
}

function parseDate(v) {
  if (!v) return new Date().toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function inferIndustry(text) {
  const l = text.toLowerCase();
  if (l.includes('hospital') || l.includes('medical')) return 'Hospital';
  if (l.includes('food')) return 'Food';
  if (l.includes('pharma')) return 'Pharma';
  return 'Public';
}

async function searchTerm(keyword) {
  const res = await fetch(getApiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      searchCriteria: { keyword, statuses: ['Open'], suitableForSme: true },
      size: 15,
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Contracts Finder ${res.status}`);
  const data = await res.json();
  return (data.noticeList ?? []).map(mapNotice);
}

export async function fetchUKContractsFinder() {
  const results = await Promise.allSettled(PHT_SEARCH_TERMS.slice(0, 4).map(searchTerm));
  const tenders = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  const unique = [...new Map(tenders.map((t) => [t.id, t])).values()];
  return { tenders: unique, source: 'uk-contracts-finder', live: unique.length > 0 };
}
