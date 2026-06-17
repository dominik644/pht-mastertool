import type { Tender } from '../types/tender';
import { PORTFOLIO_CATALOG_THRESHOLD } from './performanceConstants';

const EQUIPMENT_CPV_PREFIXES = [
  '42924', '42996', '42920', '39711', '39713', '44614', '44617',
  '33192', '33790', '39830', '39134', '39130', '44421', '45330',
];

function cpvIsEquipment(cpvCodes: string[] = []) {
  return cpvCodes.some((c) =>
    EQUIPMENT_CPV_PREFIXES.some((p) => c.startsWith(p)),
  );
}

function hasFoodFacilitySignal(text: string) {
  const lower = text.toLowerCase();
  return [
    'lebensmittelbetrieb', 'food facility', 'food plant', 'food processing',
    'molkerei', 'schlachthof', 'umbau', 'neubau', 'anlagenbau',
  ].some((kw) => lower.includes(kw));
}

export function getCatalogScore(tender: Tender): number {
  const bd = tender.scoreBreakdown as { catalogScore?: number } | undefined;
  return bd?.catalogScore ?? 0;
}

/** PHT Portfolio preset: catalog ≥12 OR food facility OR equipment CPV. */
export function meetsPortfolioFilter(tender: Tender): boolean {
  const text = `${tender.title} ${tender.description}`;
  const catalogScore = getCatalogScore(tender);
  if (catalogScore >= PORTFOLIO_CATALOG_THRESHOLD) return true;
  if (hasFoodFacilitySignal(text)) return true;
  if (cpvIsEquipment(tender.cpvCodes ?? [])) return true;
  return false;
}

export function filterPortfolioTenders(tenders: Tender[]): Tender[] {
  return tenders.filter(meetsPortfolioFilter);
}
