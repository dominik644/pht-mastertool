export interface TenderAnalysisResult {
  tenderId?: string;
  mode: string;
  requirements: string[];
  summaryDe: string | null;
  hygieneRelevance: string;
  matches: {
    articleNumber: string;
    name: string;
    category: string;
    price: number;
    matchPct: number;
    matchedKeywords: string[];
  }[];
  overallMatchPct: number;
  recommendedArticles: string[];
  analyzedAt: string;
  pdfUrl?: string | null;
  hasOpenAI: boolean;
  aiError?: string;
  note?: string;
}

const CACHE_PREFIX = 'pht_tender_analysis_';

function cacheKey(tenderId: string): string {
  return `${CACHE_PREFIX}${tenderId}`;
}

export function loadCachedAnalysis(tenderId: string): TenderAnalysisResult | null {
  try {
    const raw = localStorage.getItem(cacheKey(tenderId));
    return raw ? (JSON.parse(raw) as TenderAnalysisResult) : null;
  } catch {
    return null;
  }
}

export function saveCachedAnalysis(tenderId: string, result: TenderAnalysisResult): void {
  localStorage.setItem(cacheKey(tenderId), JSON.stringify(result));
}

export async function analyzeTenderRemote(input: {
  tenderId: string;
  title: string;
  description: string;
  pdfUrl?: string;
  force?: boolean;
}): Promise<TenderAnalysisResult> {
  if (!input.force) {
    const cached = loadCachedAnalysis(input.tenderId);
    if (cached) return { ...cached, mode: `${cached.mode}-cached` };
  }

  const res = await fetch('/api/analyze-tender', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenderId: input.tenderId,
      title: input.title,
      description: input.description,
      pdfUrl: input.pdfUrl,
    }),
  });

  const data = await res.json() as TenderAnalysisResult & { error?: string };
  if (!res.ok || data.error) {
    throw new Error(data.error || `Analyse fehlgeschlagen (${res.status})`);
  }

  saveCachedAnalysis(input.tenderId, data);
  return data;
}
