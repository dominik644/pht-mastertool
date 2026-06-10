/**
 * Ausschreibungs-Daten-Service – nur Live-TED-Daten
 */

export interface FetchedTender {
  id: string;
  title: string;
  country: string;
  budget: number;
  category: string;
  sourceUrl: string;
  sourcePlatform: string;
  publicationDate: string;
  submissionDeadline: string;
  description: string;
  industry: string;
  keywords: string[];
}

export const PHT_FILTER_KEYWORDS = [
  'hygiene',
  'cleaning',
  'sanitation',
  'hospital',
  'food production',
  'facility services',
  'disinfection',
  'reinigung',
  'desinfektion',
  'wasch',
  'pharma',
  'food',
];

const TED_SEARCH_QUERY =
  '(hygiene OR cleaning OR disinfection OR sanitation OR "food production" OR hospital OR reinigung OR desinfektion)';

const COUNTRY_MAP: Record<string, string> = {
  DE: 'Deutschland',
  AT: 'Österreich',
  FR: 'Frankreich',
  IT: 'Italien',
  NL: 'Niederlande',
  BE: 'Belgien',
  PL: 'Polen',
  DK: 'Dänemark',
  IE: 'Irland',
  ES: 'Spanien',
  PT: 'Portugal',
  SE: 'Schweden',
  FI: 'Finnland',
  CH: 'Schweiz',
  GB: 'UK',
  UK: 'UK',
};

function matchesPHTFilter(tender: FetchedTender): boolean {
  const text = `${tender.title} ${tender.description} ${tender.industry} ${tender.keywords.join(' ')}`.toLowerCase();
  return PHT_FILTER_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));
}

export function filterPHTTenders(tenders: FetchedTender[]): FetchedTender[] {
  return tenders.filter(matchesPHTFilter);
}

export function searchTenders(tenders: FetchedTender[], query: string): FetchedTender[] {
  const q = query.trim().toLowerCase();
  if (!q) return tenders;

  const budgetMatch = q.match(/(\d[\d.,]*)\s*(k|mio|€|eur)?/i);
  const budgetNum = budgetMatch
    ? parseFloat(budgetMatch[1].replace(/\./g, '').replace(',', '.')) *
      (budgetMatch[2]?.toLowerCase().startsWith('m') ? 1_000_000 : budgetMatch[2]?.toLowerCase() === 'k' ? 1_000 : 1)
    : null;

  return tenders.filter((t) => {
    const text = `${t.title} ${t.description} ${t.country} ${t.industry} ${t.keywords.join(' ')}`.toLowerCase();
    const keywordMatch = text.includes(q) || t.keywords.some((k) => k.toLowerCase().includes(q));
    const countryMatch = t.country.toLowerCase().includes(q);
    const budgetMatchResult =
      budgetNum !== null
        ? t.budget >= budgetNum * 0.5 && t.budget <= budgetNum * 2
        : String(t.budget).includes(q.replace(/\D/g, ''));

    return keywordMatch || countryMatch || budgetMatchResult;
  });
}

function mapCountry(code?: string, fallback?: string): string {
  if (!code) return fallback ?? 'EU';
  const upper = code.toUpperCase().slice(0, 2);
  return COUNTRY_MAP[upper] ?? code;
}

function parseTEDNotice(notice: Record<string, unknown>, index: number): FetchedTender | null {
  try {
    const pubNumber =
      (notice['publication-number'] as string) ??
      (notice['ND'] as string) ??
      `ted-live-${index}`;

    const title =
      (notice['TI'] as string) ??
      (notice['title'] as string) ??
      (notice['notice-title'] as string) ??
      'EU Ausschreibung';

    const description =
      (notice['description'] as string) ??
      (notice['DS'] as string) ??
      title;

    const country = mapCountry(
      (notice['CY'] as string) ?? (notice['country'] as string),
      'EU',
    );

    const budget = Number(notice['estimated-value'] ?? notice['value'] ?? 50000) || 50000;
    const pubDate =
      (notice['publication-date'] as string) ??
      (notice['PD'] as string) ??
      new Date().toISOString().slice(0, 10);

    const deadline =
      (notice['deadline-receipt-request'] as string) ??
      (notice['DT'] as string) ??
      new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const id = `ted-${pubNumber}`;
    const sourceUrl = `https://ted.europa.eu/en/notice/-/detail/${pubNumber}`;

    return {
      id,
      title: String(title).slice(0, 300),
      country,
      budget,
      category: (notice['contract-nature'] as string) ?? 'Supplies',
      sourceUrl,
      sourcePlatform: 'TED',
      publicationDate: String(pubDate).slice(0, 10),
      submissionDeadline: String(deadline).slice(0, 10),
      description: String(description).slice(0, 500),
      industry: inferIndustry(String(title + ' ' + description)),
      keywords: extractKeywords(String(title + ' ' + description)),
    };
  } catch {
    return null;
  }
}

function inferIndustry(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('pharma')) return 'Pharma';
  if (lower.includes('hospital') || lower.includes('medical')) return 'Hospital';
  if (lower.includes('food') || lower.includes('meat') || lower.includes('dairy')) return 'Food';
  if (lower.includes('production') || lower.includes('industrial')) return 'Production';
  return 'Public';
}

function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  return PHT_FILTER_KEYWORDS.filter((kw) => lower.includes(kw.toLowerCase()));
}

async function fetchFromTED(): Promise<FetchedTender[]> {
  const response = await fetch('/api/ted', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      query: TED_SEARCH_QUERY,
      limit: 40,
      scope: 'ACTIVE',
      fields: ['ND', 'TI', 'PD', 'DT', 'CY', 'estimated-value', 'contract-nature', 'description'],
    }),
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) throw new Error(`TED API: ${response.status}`);

  const data = (await response.json()) as {
    notices?: Record<string, unknown>[];
    results?: Record<string, unknown>[];
  };

  const notices = data.notices ?? data.results ?? [];
  const mapped = notices
    .map((n, i) => parseTEDNotice(n, i))
    .filter((t): t is FetchedTender => t !== null);

  if (mapped.length === 0) throw new Error('TED API: keine Ergebnisse');
  return mapped;
}

export type FetchResult = {
  tenders: FetchedTender[];
  source: 'ted' | 'mock';
  error?: string;
};

export async function fetchTenders(): Promise<FetchResult> {
  try {
    const raw = await fetchFromTED();
    const filtered = filterPHTTenders(raw);
    const tenders = filtered.length > 0 ? filtered : raw;
    return { tenders, source: 'ted' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
    return { tenders: [], source: 'mock', error: message };
  }
}
