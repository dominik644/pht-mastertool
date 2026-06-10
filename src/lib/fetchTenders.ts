/**
 * Ausschreibungs-Daten-Service
 * Versucht echte TED-Daten zu laden, fällt bei Fehler auf realistische Mock-Daten zurück.
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

const MOCK_TENDERS: FetchedTender[] = [
  {
    id: 'ted-816821-2024',
    title: 'Supply and installation of industrial hygiene stations for food processing plant',
    country: 'Deutschland',
    budget: 285000,
    category: 'Supplies',
    sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/816821-2024',
    sourcePlatform: 'TED',
    publicationDate: '2026-05-28',
    submissionDeadline: '2026-07-18',
    description: 'Complete hygiene entrance systems including hand disinfection and sole cleaning for meat processing facility.',
    industry: 'Food',
    keywords: ['hygiene', 'food production', 'disinfection'],
  },
  {
    id: 'ted-792341-2024',
    title: 'Low-pressure cleaning system for pharmaceutical GMP production',
    country: 'Österreich',
    budget: 420000,
    category: 'Services',
    sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/792341-2024',
    sourcePlatform: 'TED',
    publicationDate: '2026-05-15',
    submissionDeadline: '2026-06-28',
    description: 'Niederdruck-Reinigungssystem für GMP-konforme Pharma-Produktionsumgebung.',
    industry: 'Pharma',
    keywords: ['cleaning', 'pharma', 'sanitation'],
  },
  {
    id: 'bbg-2026-1847',
    title: 'Hygienestationen und Eingangsschleusen für Lebensmittelbetrieb',
    country: 'Österreich',
    budget: 156000,
    category: 'Bauleistungen',
    sourceUrl: 'https://www.bbg.gv.at/ttb/ttb.exe?ttb_id=2026-1847',
    sourcePlatform: 'BBG',
    publicationDate: '2026-06-02',
    submissionDeadline: '2026-07-10',
    description: 'Lieferung und Montage von Personenschleusen mit Hygienestation für Fleischverarbeitung.',
    industry: 'Food',
    keywords: ['hygiene', 'food production', 'sanitation'],
  },
  {
    id: 'etenders-ie-2026-4421',
    title: 'Hospital hygiene dispensers and wash stations – surgical wing',
    country: 'Irland',
    budget: 38000,
    category: 'Medical supplies',
    sourceUrl: 'https://www.etenders.gov.ie/epps/cft/prepareViewCfTWS.do?resourceId=2026-4421',
    sourcePlatform: 'eTenders',
    publicationDate: '2026-06-05',
    submissionDeadline: '2026-06-22',
    description: 'Desinfektionsspender und Waschbecken für chirurgische Abteilung im Krankenhausneubau.',
    industry: 'Hospital',
    keywords: ['hospital', 'hygiene', 'sanitation'],
  },
  {
    id: 'find-tender-uk-2026-8834',
    title: 'Sole cleaners and personnel hygiene airlocks – food factory',
    country: 'UK',
    budget: 118000,
    category: 'Equipment',
    sourceUrl: 'https://www.find-tender.service.gov.uk/Notice/2026-8834',
    sourcePlatform: 'Find a Tender',
    publicationDate: '2026-05-20',
    submissionDeadline: '2026-07-05',
    description: 'Sohlenreiniger und Personenschleusen für neues Lebensmittelwerk.',
    industry: 'Food',
    keywords: ['cleaning', 'food production', 'hygiene'],
  },
  {
    id: 'ted-845102-2024',
    title: 'Complete industrial washing plant for dairy processing',
    country: 'Dänemark',
    budget: 890000,
    category: 'Works',
    sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/845102-2024',
    sourcePlatform: 'TED',
    publicationDate: '2026-05-10',
    submissionDeadline: '2026-08-20',
    description: 'Komplette Industriereinigungsanlage mit CIP-System für Milchverarbeitung.',
    industry: 'Food',
    keywords: ['cleaning', 'food production', 'facility services'],
  },
  {
    id: 'austender-2026-7712',
    title: 'Industrial hygiene equipment for beverage production facility',
    country: 'Australien',
    budget: 245000,
    category: 'Goods',
    sourceUrl: 'https://www.tenders.gov.au/Cn/ShowCn/7712',
    sourcePlatform: 'AusTender',
    publicationDate: '2026-06-01',
    submissionDeadline: '2026-07-25',
    description: 'Hygienesystem für neue Getränkeproduktionsstätte inkl. Eingangssysteme.',
    industry: 'Food',
    keywords: ['hygiene', 'food production', 'sanitation'],
  },
  {
    id: 'ted-801234-2024',
    title: 'Hand hygiene systems and dispensers for production halls',
    country: 'Niederlande',
    budget: 44000,
    category: 'Supplies',
    sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/801234-2024',
    sourcePlatform: 'TED',
    publicationDate: '2026-06-08',
    submissionDeadline: '2026-06-25',
    description: 'EWG-Systeme und Spender für mehrere Produktionshallen in Industriepark.',
    industry: 'Production',
    keywords: ['hygiene', 'cleaning', 'facility services'],
  },
  {
    id: 'ted-823456-2024',
    title: 'SANICARE entrance hygiene system for new pharma facility',
    country: 'Schweiz',
    budget: 365000,
    category: 'Equipment',
    sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/823456-2024',
    sourcePlatform: 'TED',
    publicationDate: '2026-05-22',
    submissionDeadline: '2026-07-22',
    description: 'Hochwertiges Eingangssystem mit Kleidungswechsel und Sohlenreinigung für Pharma-Werk.',
    industry: 'Pharma',
    keywords: ['hygiene', 'pharma', 'sanitation'],
  },
  {
    id: 'ted-834567-2024',
    title: 'COMBI hygiene stations for university hospital extension',
    country: 'Deutschland',
    budget: 92000,
    category: 'Medical equipment',
    sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/834567-2024',
    sourcePlatform: 'TED',
    publicationDate: '2026-06-07',
    submissionDeadline: '2026-07-08',
    description: 'Mehrere COMBI-Hygienestationen für Universitätsklinikum-Neubau.',
    industry: 'Hospital',
    keywords: ['hospital', 'hygiene', 'sanitation'],
  },
  {
    id: 'ted-856789-2024',
    title: 'Facility hygiene services and cleaning systems – industrial park',
    country: 'Belgien',
    budget: 198000,
    category: 'Services',
    sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/856789-2024',
    sourcePlatform: 'TED',
    publicationDate: '2026-06-04',
    submissionDeadline: '2026-07-15',
    description: 'Umfassendes Hygienesystem für Industriepark mit mehreren Produktionsstätten.',
    industry: 'Production',
    keywords: ['facility services', 'cleaning', 'hygiene'],
  },
  {
    id: 'ted-867890-2024',
    title: 'Disinfection and hygiene systems for beverage bottling plant',
    country: 'Frankreich',
    budget: 215000,
    category: 'Supplies',
    sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/867890-2024',
    sourcePlatform: 'TED',
    publicationDate: '2026-06-09',
    submissionDeadline: '2026-06-18',
    description: 'Desinfektions- und Hygienesystem für Getränkeabfüllanlage.',
    industry: 'Food',
    keywords: ['disinfection', 'food production', 'hygiene'],
  },
  {
    id: 'ted-878901-2024',
    title: 'Personnel airlocks with full hygiene station – food production',
    country: 'Polen',
    budget: 168000,
    category: 'Works',
    sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/878901-2024',
    sourcePlatform: 'TED',
    publicationDate: '2026-06-10',
    submissionDeadline: '2026-06-16',
    description: 'Personenschleusen mit vollständiger Hygienestation für zwei Produktionslinien.',
    industry: 'Food',
    keywords: ['hygiene', 'food production', 'sanitation'],
  },
  {
    id: 'ted-889012-2024',
    title: 'Industrial crate and container washing system – meat processing',
    country: 'Italien',
    budget: 520000,
    category: 'Equipment',
    sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/889012-2024',
    sourcePlatform: 'TED',
    publicationDate: '2026-05-30',
    submissionDeadline: '2026-08-10',
    description: 'Industrielle Waschanlage mit Niederdruck-System für Kisten und Behälter.',
    industry: 'Food',
    keywords: ['cleaning', 'food production', 'facility services'],
  },
  {
    id: 'ted-890123-2024',
    title: 'Hygiene dispensers for nursing home – small supply contract',
    country: 'Deutschland',
    budget: 5200,
    category: 'Supplies',
    sourceUrl: 'https://ted.europa.eu/en/notice/-/detail/890123-2024',
    sourcePlatform: 'TED',
    publicationDate: '2026-06-08',
    submissionDeadline: '2026-06-24',
    description: 'Lieferung von 25 Desinfektionsspendern für Pflegeheim.',
    industry: 'Hospital',
    keywords: ['hospital', 'hygiene', 'sanitation'],
  },
];

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
    const tenders = filterPHTTenders(MOCK_TENDERS);
    return { tenders, source: 'mock', error: message };
  }
}
