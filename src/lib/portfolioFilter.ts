import type { Tender } from '../types/tender';
import { meetsPortfolioActionableFilter } from '../../lib/phtPortfolio.js';
import { PORTFOLIO_CATALOG_THRESHOLD } from './performanceConstants';

export function getCatalogScore(tender: Tender): number {
  const bd = tender.scoreBreakdown as { catalogScore?: number } | undefined;
  return bd?.catalogScore ?? 0;
}

/** PHT Portfolio preset: catalog ≥12 OR food facility OR equipment CPV (shared server rules). */
export function meetsPortfolioFilter(tender: Tender): boolean {
  const text = `${tender.title} ${tender.description ?? ''}`;
  return meetsPortfolioActionableFilter(text, tender.cpvCodes ?? [], getCatalogScore(tender));
}

export function filterPortfolioTenders(tenders: Tender[]): Tender[] {
  return tenders.filter(meetsPortfolioFilter);
}

export { PORTFOLIO_CATALOG_THRESHOLD };
