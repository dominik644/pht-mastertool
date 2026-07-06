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
}

export interface CustomerPrioritiesData {
  generatedAt: string;
  owner: string;
  region: string;
  strategy: string;
  importedFromExcel: number;
  addedFromResearch: number;
  priorityCounts: { A: number; B: number; C: number };
  visitCadence: Record<VisitPriority, string>;
  customers: CustomerPriority[];
}

export interface CustomerVisitState {
  lastVisit: string | null;
  nextDue: string | null;
  notes: string;
}

export type CustomerVisitStore = Record<string, CustomerVisitState>;
