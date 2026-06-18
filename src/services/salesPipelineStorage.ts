import {
  type SalesPipelineEntry,
  type SalesPipelineMetrics,
  type SalesPipelineStage,
  type SalesSourceType,
  SALES_PIPELINE_STAGES,
} from '../types/salesPipeline';

const STORAGE_KEY = 'pht_sales_pipeline';

function nowIso(): string {
  return new Date().toISOString();
}

export function loadPipelineEntries(): SalesPipelineEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SalesPipelineEntry[]) : [];
  } catch {
    return [];
  }
}

export function savePipelineEntries(entries: SalesPipelineEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function createPipelineEntry(input: {
  title: string;
  estimatedValue?: number;
  probability?: number;
  sourceType: SalesSourceType;
  sourceId?: string;
  sourceUrl?: string;
  country?: string;
  notes?: string;
  stage?: SalesPipelineStage;
}): SalesPipelineEntry {
  const ts = nowIso();
  const entry: SalesPipelineEntry = {
    id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    stage: input.stage ?? 'Lead',
    estimatedValue: input.estimatedValue ?? 50_000,
    probability: input.probability ?? 25,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    sourceUrl: input.sourceUrl,
    country: input.country,
    notes: input.notes,
    createdAt: ts,
    updatedAt: ts,
  };
  const entries = loadPipelineEntries();
  entries.unshift(entry);
  savePipelineEntries(entries);
  return entry;
}

export function updatePipelineEntry(
  id: string,
  patch: Partial<Pick<SalesPipelineEntry, 'title' | 'stage' | 'estimatedValue' | 'probability' | 'notes'>>,
): SalesPipelineEntry | null {
  const entries = loadPipelineEntries();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  entries[idx] = { ...entries[idx], ...patch, updatedAt: nowIso() };
  savePipelineEntries(entries);
  return entries[idx];
}

export function deletePipelineEntry(id: string): void {
  savePipelineEntries(loadPipelineEntries().filter((e) => e.id !== id));
}

export function findBySource(sourceType: SalesSourceType, sourceId: string): SalesPipelineEntry | undefined {
  return loadPipelineEntries().find((e) => e.sourceType === sourceType && e.sourceId === sourceId);
}

export function addFromTender(tender: {
  id: string;
  title: string;
  estimatedValue: number;
  winProbability?: number;
  sourceUrl: string;
  country: string;
}): SalesPipelineEntry {
  const existing = findBySource('tender', tender.id);
  if (existing) return existing;
  return createPipelineEntry({
    title: tender.title,
    estimatedValue: tender.estimatedValue,
    probability: tender.winProbability ?? 30,
    sourceType: 'tender',
    sourceId: tender.id,
    sourceUrl: tender.sourceUrl,
    country: tender.country,
    stage: 'Lead',
  });
}

export function addFromNewsLead(lead: {
  id: string;
  title: string;
  url: string;
  country?: string | null;
  phtFitProb?: number;
}): SalesPipelineEntry {
  const existing = findBySource('news', lead.id);
  if (existing) return existing;
  return createPipelineEntry({
    title: lead.title,
    estimatedValue: 150_000,
    probability: lead.phtFitProb ?? 20,
    sourceType: 'news',
    sourceId: lead.id,
    sourceUrl: lead.url,
    country: lead.country ?? undefined,
    stage: 'Lead',
    notes: 'Aus Branchen-News / Frühindikator',
  });
}

export function addFromDiscoveredLead(lead: {
  id: string;
  title: string;
  url: string;
  relevanceScore?: number;
}): SalesPipelineEntry {
  const existing = findBySource('lead', lead.id);
  if (existing) return existing;
  return createPipelineEntry({
    title: lead.title,
    estimatedValue: 80_000,
    probability: Math.min(60, (lead.relevanceScore ?? 20) + 10),
    sourceType: 'lead',
    sourceId: lead.id,
    sourceUrl: lead.url,
    stage: 'Lead',
  });
}

export function computePipelineMetrics(entries = loadPipelineEntries()): SalesPipelineMetrics {
  const byStage = Object.fromEntries(
    SALES_PIPELINE_STAGES.map((s) => [s.stage, 0]),
  ) as Record<SalesPipelineStage, number>;

  let pipelineValue = 0;
  let weightedForecast = 0;
  let wonValue = 0;
  let won = 0;
  let lost = 0;

  for (const e of entries) {
    byStage[e.stage] = (byStage[e.stage] ?? 0) + 1;
    if (e.stage === 'Gewonnen') {
      won++;
      wonValue += e.estimatedValue;
    } else if (e.stage === 'Verloren') {
      lost++;
    } else {
      pipelineValue += e.estimatedValue;
      weightedForecast += e.estimatedValue * (e.probability / 100);
    }
  }

  const activeDeals = entries.filter((e) => e.stage !== 'Gewonnen' && e.stage !== 'Verloren').length;
  const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

  return {
    totalDeals: entries.length,
    activeDeals,
    pipelineValue,
    weightedForecast,
    wonValue,
    winRate,
    byStage,
  };
}

export function groupByStage(entries = loadPipelineEntries()): Record<SalesPipelineStage, SalesPipelineEntry[]> {
  const groups = Object.fromEntries(
    SALES_PIPELINE_STAGES.map((s) => [s.stage, [] as SalesPipelineEntry[]]),
  ) as Record<SalesPipelineStage, SalesPipelineEntry[]>;
  for (const e of entries) {
    groups[e.stage]?.push(e);
  }
  return groups;
}
