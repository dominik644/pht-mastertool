import { differenceInDays, parseISO } from 'date-fns';
import type { Tender } from '../types/tender';
import type { DashboardStats } from '../types/tender';
import { buildPowerActions, computeWinPriority } from '../lib/powerEngine';
import { computeMarketLeaderMetrics } from './analyticsEngine';
import { getTargetEmail } from './integrationSettings';
import { loadGoals } from './marketLeaderGoals';
import { getPriceListSummary } from '../data/priceList2026';

export interface AssistantContextPayload {
  userName: string;
  targetEmail: string;
  currentPath: string;
  tenderCount: number;
  goCount: number;
  mustWinCount: number;
  dataSource: string | null;
  selectedTender: { id: string; title: string; score: number; deadline: string; status: string } | null;
  urgentDeadlines: { id: string; title: string; deadline: string; daysLeft: number; score: number; country: string }[];
  topActions: { title: string; action: string; winPriority: number; daysLeft: number; tenderId: string }[];
  metrics: {
    winRate: number;
    pipelineMio: string;
    revenueVsTarget: number;
    dachShare: number;
  };
  watchlistCount: number;
  workflowActive: number;
  goals: { annualRevenue: number; winRateTarget: number };
  priceList: {
    source: string;
    productCount: number;
    categoryCount: number;
    priceMin: number;
    priceMax: number;
    topCategories: { name: string; productCount: number; priceMin: number; priceMax: number }[];
  };
}

export function buildAssistantContext(
  allTenders: Tender[],
  stats: DashboardStats,
  dataSource: string | null,
  currentPath: string,
  selectedTender: Tender | null,
): AssistantContextPayload {
  const metrics = computeMarketLeaderMetrics(allTenders);
  const goals = loadGoals();
  const priceList = getPriceListSummary();
  const actions = buildPowerActions(allTenders);
  const mustWin = allTenders.filter((t) => computeWinPriority(t) >= 75 && t.scoreRecommendation === 'GO');

  const urgentDeadlines = allTenders
    .filter((t) => {
      const days = differenceInDays(parseISO(t.deadline), new Date());
      return days >= 0 && days <= 14 && t.scoreRecommendation !== 'NO-GO';
    })
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 12)
    .map((t) => ({
      id: t.id,
      title: t.title.slice(0, 100),
      deadline: t.deadline,
      daysLeft: differenceInDays(parseISO(t.deadline), new Date()),
      score: t.score,
      country: t.country,
    }));

  return {
    userName: 'Geschäftsführung PHT',
    targetEmail: getTargetEmail(),
    currentPath,
    tenderCount: stats.total,
    goCount: stats.goCount,
    mustWinCount: mustWin.length,
    dataSource,
    selectedTender: selectedTender
      ? {
          id: selectedTender.id,
          title: selectedTender.title,
          score: selectedTender.score,
          deadline: selectedTender.deadline,
          status: selectedTender.status,
        }
      : null,
    urgentDeadlines,
    topActions: actions.slice(0, 8).map((a) => ({
      title: a.title.slice(0, 80),
      action: a.action,
      winPriority: a.winPriority,
      daysLeft: a.daysLeft,
      tenderId: a.tenderId,
    })),
    metrics: {
      winRate: metrics.winRate,
      pipelineMio: (metrics.pipelineValue / 1e6).toFixed(1),
      revenueVsTarget: metrics.revenueVsTarget,
      dachShare: metrics.dachShare,
    },
    watchlistCount: stats.watchlistCount,
    workflowActive: stats.workflowActive,
    goals: {
      annualRevenue: goals.annualRevenueTarget,
      winRateTarget: goals.winRateTarget,
    },
    priceList: {
      source: 'PHT Preisliste 2026 AT-DE',
      ...priceList,
    },
  };
}
