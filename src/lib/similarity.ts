import type { SimilarityHint, Tender } from '../types/tender';
import { findSimilarTenders as findSimilar } from '../../lib/similarity.js';

export function findSimilarTenders(source: Tender, candidates: Tender[], limit = 5): SimilarityHint[] {
  return findSimilar(
    { ...source, budgetEur: source.estimatedValue },
    candidates.map((t) => ({ ...t, budgetEur: t.estimatedValue })),
    limit,
  );
}
