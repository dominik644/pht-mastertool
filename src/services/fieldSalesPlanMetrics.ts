import type { CustomerPriority, CustomerVisitStore } from '../types/customerPriority';
import type { SalesFunnelDeal } from '../types/salesFunnel';
import { loadGoals, type MilestoneContext } from './marketLeaderGoals';

/** Wachstums-Branchen: Käferfarmen, Obst/Gemüse, pflanzlich. */
export const GROWTH_SECTOR_IDS = new Set(['insects', 'fruit_veg', 'vegan', 'plant_based', 'bio', 'convenience']);

export interface FieldSalesPlanMetrics {
  wonRevenue: number;
  winRate: number;
  pipelineVolume: number;
  weightedForecast: number;
  activeDeals: number;
  wonCount: number;
  lostCount: number;
  visitsThisMonth: number;
  funnelLeadsFromVisits: number;
  growthSectorCustomers: number;
  revenueVsTarget: number;
  winRateVsTarget: number;
}

export function countVisitsSince(store: CustomerVisitStore, since: Date): number {
  let count = 0;
  for (const state of Object.values(store)) {
    if (!state.lastVisit) continue;
    if (new Date(state.lastVisit) >= since) count += 1;
  }
  return count;
}

export function countGrowthSectorCustomers(customers: CustomerPriority[]): number {
  return customers.filter(
    (c) => c.sector && GROWTH_SECTOR_IDS.has(c.sector) && c.priority !== 'C',
  ).length;
}

export function computeFieldSalesPlanMetrics(
  deals: SalesFunnelDeal[],
  customers: CustomerPriority[],
  visitStore: CustomerVisitStore,
): FieldSalesPlanMetrics {
  const goals = loadGoals();
  const won = deals.filter((d) => d.status === 'Gewonnen');
  const lost = deals.filter((d) => d.status === 'Verloren');
  const active = deals.filter((d) => !['Gewonnen', 'Verloren'].includes(d.status));

  const wonRevenue = won.reduce((s, d) => s + d.volume, 0);
  const winRate = won.length + lost.length > 0
    ? Math.round((won.length / (won.length + lost.length)) * 100)
    : 0;
  const pipelineVolume = active.reduce((s, d) => s + d.volume, 0);
  const weightedForecast = active.reduce(
    (s, d) => s + Math.round(d.volume * (d.winProbability / 100)),
    0,
  );

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const funnelLeadsFromVisits = deals.filter((d) =>
    d.activities?.some((a) => /besuch|tourenplanung/i.test(a.result ?? '') || /nach besuch/i.test(d.project ?? '')),
  ).length;

  return {
    wonRevenue,
    winRate,
    pipelineVolume,
    weightedForecast,
    activeDeals: active.length,
    wonCount: won.length,
    lostCount: lost.length,
    visitsThisMonth: countVisitsSince(visitStore, monthStart),
    funnelLeadsFromVisits,
    growthSectorCustomers: countGrowthSectorCustomers(customers),
    revenueVsTarget: goals.annualRevenueTarget > 0
      ? Math.round((wonRevenue / goals.annualRevenueTarget) * 100)
      : 0,
    winRateVsTarget: goals.winRateTarget > 0
      ? Math.round((winRate / goals.winRateTarget) * 100)
      : 0,
  };
}

export function buildMilestoneContext(
  deals: SalesFunnelDeal[],
  customers: CustomerPriority[],
  visitStore: CustomerVisitStore,
): MilestoneContext {
  const metrics = computeFieldSalesPlanMetrics(deals, customers, visitStore);
  const quarterStart = new Date();
  quarterStart.setMonth(quarterStart.getMonth() - (quarterStart.getMonth() % 3));
  quarterStart.setDate(1);
  quarterStart.setHours(0, 0, 0, 0);

  return {
    customerCount: customers.length,
    funnelActive: metrics.activeDeals,
    funnelWon: metrics.wonCount,
    visitsThisQuarter: countVisitsSince(visitStore, quarterStart),
    newLeadsFromVisits: metrics.funnelLeadsFromVisits,
    growthSectorCustomers: metrics.growthSectorCustomers,
    hasFunnelDeals: deals.length > 0,
  };
}
