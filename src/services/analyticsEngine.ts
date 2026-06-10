import type { Tender } from '../types/tender';
import type { WorkflowHistoryEntry } from '../types/workflow';
import { loadGoals } from './marketLeaderGoals';

export interface FunnelStep {
  stage: string;
  count: number;
  value: number;
}

export interface MarketLeaderMetrics {
  wonRevenue: number;
  lostCount: number;
  wonCount: number;
  winRate: number;
  pipelineValue: number;
  submittedCount: number;
  dachShare: number;
  revenueVsTarget: number;
  winRateVsTarget: number;
  monthlyBidsRate: number;
}

const FUNNEL_STAGES = ['Neu', 'Prüfen', 'Technik prüfen', 'Angebot vorbereiten', 'Abgegeben', 'Gewonnen'] as const;

export function computeFunnel(tenders: Tender[]): FunnelStep[] {
  return FUNNEL_STAGES.map((stage) => {
    const items = tenders.filter((t) => t.status === stage);
    return {
      stage,
      count: items.length,
      value: items.reduce((s, t) => s + t.estimatedValue, 0),
    };
  });
}

export function computeMarketLeaderMetrics(tenders: Tender[]): MarketLeaderMetrics {
  const goals = loadGoals();
  const won = tenders.filter((t) => t.status === 'Gewonnen');
  const lost = tenders.filter((t) => t.status === 'Verloren');
  const submitted = tenders.filter((t) =>
    ['Abgegeben', 'Gewonnen', 'Verloren'].includes(t.status),
  );
  const pipeline = tenders.filter((t) => t.scoreRecommendation !== 'NO-GO' && t.status !== 'Verloren');
  const dach = tenders.filter((t) => t.region === 'DACH' || ['DEU', 'AUT', 'CHE', 'Germany', 'Austria', 'Switzerland'].includes(t.country));

  const wonRevenue = won.reduce((s, t) => s + (t.wonValue ?? t.estimatedValue), 0);
  const winRate = won.length + lost.length > 0 ? (won.length / (won.length + lost.length)) * 100 : 0;
  const pipelineValue = pipeline.reduce((s, t) => s + t.estimatedValue, 0);
  const months = Math.max(1, Math.ceil((Date.now() - new Date(goals.startDate).getTime()) / (30 * 86400000)));

  return {
    wonRevenue,
    lostCount: lost.length,
    wonCount: won.length,
    winRate: Math.round(winRate),
    pipelineValue,
    submittedCount: submitted.length,
    dachShare: tenders.length ? Math.round((dach.length / tenders.length) * 100) : 0,
    revenueVsTarget: Math.round((wonRevenue / goals.annualRevenueTarget) * 100),
    winRateVsTarget: Math.round((winRate / goals.winRateTarget) * 100),
    monthlyBidsRate: Math.round(submitted.length / months),
  };
}

export function lossReasonStats(tenders: Tender[]): { reason: string; count: number }[] {
  const map = new Map<string, number>();
  for (const t of tenders) {
    if (t.status !== 'Verloren' || !t.lossReason?.trim()) continue;
    const r = t.lossReason.trim();
    map.set(r, (map.get(r) ?? 0) + 1);
  }
  return [...map.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
}

export function competitorStats(tenders: Tender[]): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const t of tenders) {
    if (!t.competitor?.trim()) continue;
    const c = t.competitor.trim();
    map.set(c, (map.get(c) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export function weeklyVelocity(history: WorkflowHistoryEntry[]): number {
  const weekAgo = Date.now() - 7 * 86400000;
  return history.filter((h) => new Date(h.timestamp).getTime() >= weekAgo).length;
}
