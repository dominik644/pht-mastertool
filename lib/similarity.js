/**
 * Heuristische Ähnlichkeitsanalyse für Ausschreibungen
 */

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-zäöüß0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

function jaccard(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  const inter = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union ? inter / union : 0;
}

/**
 * @param {object} source
 * @param {object[]} candidates
 * @param {number} [limit=5]
 */
export function findSimilarTenders(source, candidates, limit = 5) {
  const sourceTokens = tokenize(`${source.title} ${source.description} ${(source.keywords || []).join(' ')}`);
  const sourceIndustry = (source.industry || '').toLowerCase();
  const sourceRegion = source.region || '';

  return candidates
    .filter((t) => t.id !== source.id)
    .map((t) => {
      const tokens = tokenize(`${t.title} ${t.description} ${(t.keywords || []).join(' ')}`);
      let score = jaccard(sourceTokens, tokens) * 50;
      if (t.industry?.toLowerCase() === sourceIndustry) score += 20;
      if (t.region === sourceRegion) score += 15;
      if (Math.abs((t.estimatedValue || t.budgetEur || 0) - (source.estimatedValue || source.budgetEur || 0)) < 100000) {
        score += 10;
      }
      const sharedKw = (source.keywords || []).filter((k) => (t.keywords || []).includes(k));
      score += sharedKw.length * 5;

      const reasons = [];
      if (t.industry === source.industry) reasons.push(`Gleiche Branche: ${t.industry}`);
      if (t.region === sourceRegion) reasons.push(`Gleiche Region: ${t.region}`);
      if (sharedKw.length) reasons.push(`Gemeinsame Keywords: ${sharedKw.slice(0, 3).join(', ')}`);

      return {
        tenderId: t.id,
        title: t.title,
        score: Math.min(100, Math.round(score)),
        reasons,
      };
    })
    .filter((s) => s.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function enrichWithSimilarity(tenders) {
  return tenders.map((t) => ({
    ...t,
    similarityHints: findSimilarTenders(t, tenders, 3),
  }));
}
