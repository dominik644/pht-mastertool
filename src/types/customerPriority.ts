export type VisitPriority = 'A' | 'B' | 'C';

export type CustomerSource = 'excel' | 'research';

export interface CustomerPriority {
  id: string;
  customerNumber: string | null;
  name: string;
  city: string;
  zip: string;
  country: string;
  bundesland: string | null;
  sector: string;
  sectorLabel: string;
  priority: VisitPriority;
  potentialScore: number;
  visitCadenceMonths: number;
  source: CustomerSource;
  owner: string | null;
  excelAbc: string | null;
  excelScore: number | null;
  excelStatus: string | null;
  active2026: boolean;
  daysSincePurchase: number | null;
  exchangePotential: string[];
  expansionNote?: string;
  researchUrl?: string;
  isMeatIndustry: boolean;
  /** PLZ/Ort-Validierung: Warnung bei Abweichung */
  plzWarning?: boolean;
  plzWarningDetail?: string;
  /** PLZ wurde per Nominatim korrigiert */
  plzCorrected?: boolean;
  originalZip?: string;
}

export interface CustomerPrioritiesData {
  generatedAt: string;
  owner: string;
  region: string;
  strategy: string;
  importedFromExcel: number;
  addedFromResearch: number;
  priorityCounts: { A: number; B: number; C: number };
  plzReconciliation?: { corrected: number; warnings: number; nominatim: boolean };
  visitCadence: Record<VisitPriority, string>;
  customers: CustomerPriority[];
}

export interface CustomerVisitState {
  lastVisit: string | null;
  nextDue: string | null;
  notes: string;
  /** Aus aktiver Liste ausgeblendet („Nicht mehr relevant“) */
  archived?: boolean;
}

export type CustomerVisitStore = Record<string, CustomerVisitState>;
