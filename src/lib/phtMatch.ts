import { matchesPHT as matchesPHTJs } from '../../lib/tenders/utils.js';
import type { GlobalTenderRaw } from './globalTenderSearch';
import type { Tender } from '../types/tender';

export interface PHTMatchInput {
  title: string;
  description?: string;
  keywords?: string[];
  cpvCodes?: string[];
}

export function matchesPHT(input: PHTMatchInput): boolean {
  return matchesPHTJs({
    title: input.title,
    description: input.description ?? '',
    keywords: input.keywords ?? [],
    cpvCodes: input.cpvCodes ?? [],
  });
}

export function rawMatchesPHT(raw: GlobalTenderRaw): boolean {
  return matchesPHT(raw);
}

export function tenderMatchesPHT(t: Tender): boolean {
  return matchesPHT({
    title: t.title,
    description: t.description,
    keywords: t.keywords,
    cpvCodes: t.cpvCodes,
  });
}

export function tenderToRaw(t: Tender): GlobalTenderRaw {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    country: t.country,
    region: t.region,
    budget: t.budget ?? t.estimatedValue ?? 0,
    budgetEur: t.estimatedValue ?? t.estimatedBudget ?? t.budget,
    estimatedBudget: t.estimatedBudget,
    currency: t.currency,
    sourcePlatform: t.sourcePlatform,
    sourceUrl: t.sourceUrl ?? t.url,
    publicationDate: t.publicationDate,
    submissionDeadline: t.submissionDeadline ?? t.deadline,
    decisionDate: t.decisionDate,
    industry: t.industry,
    keywords: t.keywords ?? [],
    cpvCodes: t.cpvCodes ?? [],
  };
}
