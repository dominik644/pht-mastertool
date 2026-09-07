const STORAGE_KEY = 'pht_market_leader_goals_v2';

export interface MarketLeaderGoals {
  annualRevenueTarget: number;
  winRateTarget: number;
  /** Besuche pro Monat im eigenen Gebiet */
  monthlyVisitsTarget: number;
  /** Neue Funnel-Leads pro Quartal */
  quarterlyLeadsTarget: number;
  startDate: string;
}

export interface QuarterlyMilestone {
  quarter: string;
  title: string;
  items: { id: string; label: string; autoCheck: (ctx: MilestoneContext) => boolean }[];
}

export interface MilestoneContext {
  customerCount: number;
  funnelActive: number;
  funnelWon: number;
  visitsThisQuarter: number;
  newLeadsFromVisits: number;
  growthSectorCustomers: number;
  hasFunnelDeals: boolean;
}

const DEFAULT: MarketLeaderGoals = {
  annualRevenueTarget: 1_500_000,
  winRateTarget: 30,
  monthlyVisitsTarget: 20,
  quarterlyLeadsTarget: 15,
  startDate: new Date().toISOString().slice(0, 10),
};

export function loadGoals(): MarketLeaderGoals {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT, ...(JSON.parse(raw) as MarketLeaderGoals) };
    const legacy = localStorage.getItem('pht_market_leader_goals');
    if (legacy) {
      const parsed = JSON.parse(legacy) as Partial<MarketLeaderGoals>;
      return { ...DEFAULT, annualRevenueTarget: 1_500_000, ...parsed };
    }
    return DEFAULT;
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
    quarter: 'Q1 – Bestandskunden',
    title: 'Gebiet abdecken & Besuche',
    items: [
      { id: 'q1-customers', label: '500+ relevante Kunden im Gebiet', autoCheck: (c) => c.customerCount >= 500 },
      { id: 'q1-visits', label: '60+ Besuche im Quartal', autoCheck: (c) => c.visitsThisQuarter >= 60 },
      { id: 'q1-funnel', label: '10+ aktive Funnel-Leads', autoCheck: (c) => c.funnelActive >= 10 },
      { id: 'q1-growth', label: '50+ Wachstums-Branchen (Obst/Gemüse, Insekten, Vegan)', autoCheck: (c) => c.growthSectorCustomers >= 50 },
    ],
  },
  {
    quarter: 'Q2 – Neukunden & Leads',
    title: 'Käferfarmen, Obst/Gemüse, Verarbeiter',
    items: [
      { id: 'q2-leads', label: '15+ Leads aus Besuchen im Funnel', autoCheck: (c) => c.newLeadsFromVisits >= 15 },
      { id: 'q2-active', label: '25+ aktive Funnel-Deals', autoCheck: (c) => c.funnelActive >= 25 },
      { id: 'q2-visits', label: '120+ Besuche kumuliert', autoCheck: (c) => c.visitsThisQuarter >= 40 },
      { id: 'q2-growth80', label: '80+ Ziel-Branchen-Kunden priorisiert', autoCheck: (c) => c.growthSectorCustomers >= 80 },
    ],
  },
  {
    quarter: 'Q3 – Umsatz aufbauen',
    title: 'Pipeline & Abschlüsse',
    items: [
      { id: 'q3-pipeline', label: '40+ aktive Funnel-Deals', autoCheck: (c) => c.funnelActive >= 40 },
      { id: 'q3-win', label: 'Erste Gewinne im Funnel', autoCheck: (c) => c.funnelWon >= 1 },
      { id: 'q3-leads30', label: '30+ Besuchs-Leads dokumentiert', autoCheck: (c) => c.newLeadsFromVisits >= 30 },
    ],
  },
  {
    quarter: 'Q4 – Marktführerschaft',
    title: '1,5 Mio. € Jahresumsatz',
    items: [
      { id: 'q4-win5', label: '5+ gewonnene Deals', autoCheck: (c) => c.funnelWon >= 5 },
      { id: 'q4-active50', label: '50+ aktive Pipeline-Deals', autoCheck: (c) => c.funnelActive >= 50 },
      { id: 'q4-growth120', label: '120+ Ziel-Branchen im Portfolio', autoCheck: (c) => c.growthSectorCustomers >= 120 },
    ],
  },
];
