const STORAGE_KEY = 'pht_market_leader_goals';

export interface MarketLeaderGoals {
  annualRevenueTarget: number;
  winRateTarget: number;
  monthlyBidsTarget: number;
  dachShareTarget: number;
  startDate: string;
}

export interface QuarterlyMilestone {
  quarter: string;
  title: string;
  items: { id: string; label: string; autoCheck: (ctx: MilestoneContext) => boolean }[];
}

export interface MilestoneContext {
  tenderCount: number;
  goCount: number;
  wonCount: number;
  workflowActive: number;
  dachCount: number;
  hasAlertRules: boolean;
  hasQuotes: boolean;
}

const DEFAULT: MarketLeaderGoals = {
  annualRevenueTarget: 5_000_000,
  winRateTarget: 35,
  monthlyBidsTarget: 8,
  dachShareTarget: 40,
  startDate: new Date().toISOString().slice(0, 10),
};

export function loadGoals(): MarketLeaderGoals {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT, ...(JSON.parse(raw) as MarketLeaderGoals) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function saveGoals(goals: MarketLeaderGoals): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

export function monthsElapsed(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
}

export function yearProgressPct(startDate: string): number {
  return Math.min(100, Math.round((monthsElapsed(startDate) / 12) * 100));
}

export const QUARTERLY_MILESTONES: QuarterlyMilestone[] = [
  {
    quarter: 'Q1 – Fundament',
    title: 'Abdeckung & Prozess',
    items: [
      { id: 'q1-tenders', label: '500+ relevante Ausschreibungen im System', autoCheck: (c) => c.tenderCount >= 500 },
      { id: 'q1-go', label: '50+ GO-Chancen identifiziert', autoCheck: (c) => c.goCount >= 50 },
      { id: 'q1-workflow', label: '20+ Deals im aktiven Workflow', autoCheck: (c) => c.workflowActive >= 20 },
      { id: 'q1-dach', label: 'DACH-Fokus: 30%+ der Treffer', autoCheck: (c) => c.tenderCount > 0 && c.dachCount / c.tenderCount >= 0.3 },
    ],
  },
  {
    quarter: 'Q2 – Win-Rate',
    title: 'Angebote gewinnen',
    items: [
      { id: 'q2-bids', label: '10+ Angebote abgegeben (Workflow)', autoCheck: (c) => c.wonCount >= 1 || c.workflowActive >= 10 },
      { id: 'q2-quotes', label: 'Angebotsrechner aktiv genutzt', autoCheck: (c) => c.hasQuotes },
      { id: 'q2-win', label: 'Erste Gewinne dokumentiert', autoCheck: (c) => c.wonCount >= 1 },
      { id: 'q2-alerts', label: 'Alert-Regeln konfiguriert', autoCheck: (c) => c.hasAlertRules },
    ],
  },
  {
    quarter: 'Q3 – Skalierung',
    title: 'Team & Automatisierung',
    items: [
      { id: 'q3-pipeline', label: '100+ aktive Pipeline-Deals', autoCheck: (c) => c.workflowActive >= 100 },
      { id: 'q3-win3', label: '3+ gewonnene Deals', autoCheck: (c) => c.wonCount >= 3 },
      { id: 'q3-dach50', label: 'DACH-Anteil ≥ 40%', autoCheck: (c) => c.tenderCount > 0 && c.dachCount / c.tenderCount >= 0.4 },
    ],
  },
  {
    quarter: 'Q4 – Marktführerschaft',
    title: 'Dominanz & Lernen',
    items: [
      { id: 'q4-win10', label: '10+ gewonnene Deals im Jahr', autoCheck: (c) => c.wonCount >= 10 },
      { id: 'q4-go100', label: '100+ GO-Chancen', autoCheck: (c) => c.goCount >= 100 },
      { id: 'q4-share', label: 'DACH-Marktanteil-Ziel erreicht', autoCheck: (c) => c.tenderCount > 0 && c.dachCount / c.tenderCount >= 0.45 },
    ],
  },
];
