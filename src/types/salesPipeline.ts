export type SalesPipelineStage =
  | 'Lead'
  | 'Qualifiziert'
  | 'Angebot'
  | 'Verhandlung'
  | 'Gewonnen'
  | 'Verloren';

export type SalesSourceType = 'tender' | 'news' | 'lead' | 'manual';

export interface SalesPipelineEntry {
  id: string;
  title: string;
  stage: SalesPipelineStage;
  estimatedValue: number;
  /** Gewinnwahrscheinlichkeit 0–100 */
  probability: number;
  sourceType: SalesSourceType;
  sourceId?: string;
  sourceUrl?: string;
  country?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesPipelineMetrics {
  totalDeals: number;
  activeDeals: number;
  pipelineValue: number;
  weightedForecast: number;
  wonValue: number;
  winRate: number;
  byStage: Record<SalesPipelineStage, number>;
}

export const SALES_PIPELINE_STAGES: {
  stage: SalesPipelineStage;
  label: string;
  color: string;
  terminal?: boolean;
}[] = [
  { stage: 'Lead', label: 'Lead', color: 'bg-slate-100/10 border-slate-400/40' },
  { stage: 'Qualifiziert', label: 'Qualifiziert', color: 'bg-blue-500/10 border-blue-400/40' },
  { stage: 'Angebot', label: 'Angebot', color: 'bg-amber-500/10 border-amber-400/40' },
  { stage: 'Verhandlung', label: 'Verhandlung', color: 'bg-violet-500/10 border-violet-400/40' },
  { stage: 'Gewonnen', label: 'Gewonnen', color: 'bg-emerald-500/10 border-emerald-400/40', terminal: true },
  { stage: 'Verloren', label: 'Verloren', color: 'bg-red-500/10 border-red-400/40', terminal: true },
];

export const REVENUE_GOAL_EUR = 1_000_000;
