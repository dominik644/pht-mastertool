export type SalesFunnelQuarter = 'NEU' | 'F' | string;

export type SalesFunnelStatus =
  | 'In Bearbeitung'
  | 'Umsetzung 2027'
  | 'Gewonnen'
  | 'Verloren'
  | string;

export type SalesFunnelSourceType = 'customer' | 'manual' | 'excel' | 'pipeline';

export interface SalesFunnelActivity {
  type: string;
  date?: string;
  result?: string;
}

export interface SalesFunnelDeal {
  id: string;
  ownerKey: string;
  customerId?: string;
  sourceType?: SalesFunnelSourceType;
  offerNumber?: string;
  offerMonth?: string;
  validUntil?: string;
  followUpUntil?: string;
  quarter: SalesFunnelQuarter;
  status: SalesFunnelStatus;
  customer: string;
  project: string;
  city?: string;
  country?: string;
  contactPerson?: string;
  notes?: string;
  volume: number;
  winProbability: number;
  forecast: number;
  expectedClose?: string;
  monthLabel?: string;
  calendarWeek?: number | string;
  activities: SalesFunnelActivity[];
  createdAt: string;
  updatedAt: string;
}

export const SALES_FUNNEL_STATUSES: SalesFunnelStatus[] = [
  'In Bearbeitung',
  'Umsetzung 2027',
  'Gewonnen',
  'Verloren',
];

export const SALES_FUNNEL_QUARTERS: SalesFunnelQuarter[] = ['NEU', 'F'];

export interface SalesFunnelMetrics {
  dealCount: number;
  activeCount: number;
  pipelineVolume: number;
  weightedForecast: number;
  wonVolume: number;
  byStatus: Record<string, number>;
}
