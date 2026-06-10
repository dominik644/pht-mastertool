/**
 * Ausschreibungs-Daten-Service (JS – Next.js-kompatibel)
 * TypeScript-Hauptversion: src/lib/fetchTenders.ts
 */

export const PHT_FILTER_KEYWORDS = [
  'hygiene', 'cleaning', 'sanitation', 'hospital',
  'food production', 'facility services', 'disinfection',
];

const MOCK_TENDERS = [
  {
    id: 'ted-816821-2024',
    title: 'Industrial hygiene stations for food processing plant',
    country: 'Deutschland',
    budget: 285000,
    category: 'Supplies',
    sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/816821-2024',
    sourcePlatform: 'TED',
    publicationDate: '2026-05-28',
    submissionDeadline: '2026-07-18',
    description: 'Hygiene entrance systems for meat processing facility.',
    industry: 'Food',
    keywords: ['hygiene', 'food production'],
  },
  {
    id: 'bbg-2026-1847',
    title: 'Hygienestationen für Lebensmittelbetrieb',
    country: 'Österreich',
    budget: 156000,
    category: 'Bauleistungen',
    sourceUrl: 'https://www.bbg.gv.at/ttb/ttb.exe?ttb_id=2026-1847',
    sourcePlatform: 'BBG',
    publicationDate: '2026-06-02',
    submissionDeadline: '2026-07-10',
    description: 'Personenschleusen mit Hygienestation.',
    industry: 'Food',
    keywords: ['hygiene', 'sanitation'],
  },
];

export function filterPHTTenders(tenders) {
  return tenders.filter((t) => {
    const text = `${t.title} ${t.description || ''} ${(t.keywords || []).join(' ')}`.toLowerCase();
    return PHT_FILTER_KEYWORDS.some((kw) => text.includes(kw));
  });
}

export function searchTenders(tenders, query) {
  const q = query.trim().toLowerCase();
  if (!q) return tenders;
  return tenders.filter((t) => {
    const text = `${t.title} ${t.country} ${t.description || ''}`.toLowerCase();
    return text.includes(q) || String(t.budget).includes(q.replace(/\D/g, ''));
  });
}

export async function fetchTenders() {
  try {
    const res = await fetch('/api/ted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: '(hygiene OR cleaning OR disinfection)',
        limit: 40,
        scope: 'ACTIVE',
      }),
    });
    if (!res.ok) throw new Error(`TED API: ${res.status}`);
    const data = await res.json();
    const notices = data.notices || data.results || [];
    const tenders = notices.map((n, i) => ({
      id: `ted-${n['publication-number'] || i}`,
      title: n.TI || 'EU Ausschreibung',
      country: n.CY || 'EU',
      budget: Number(n['estimated-value']) || 50000,
      category: 'Supplies',
      sourceUrl: `https://ted.europa.eu/en/notice/-/detail/${n['publication-number'] || i}`,
      sourcePlatform: 'TED',
      publicationDate: new Date().toISOString().slice(0, 10),
      submissionDeadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      description: n.TI || '',
      industry: 'Production',
      keywords: ['hygiene'],
    }));
    const filtered = filterPHTTenders(tenders);
    return { tenders: filtered.length ? filtered : tenders, source: 'ted' };
  } catch (err) {
    return {
      tenders: [],
      source: 'mock',
      error: err.message,
    };
  }
}
