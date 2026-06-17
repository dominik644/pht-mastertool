/**
 * Product-driven tender matching – unified catalog scoring.
 * Combines Preisliste 2026, homepage product lines, and user segments.
 */
import { PHT_PRODUCT_CATALOG } from './phtProductCatalog.js';
import { PHT_PORTFOLIO_SEGMENTS, getSegmentKeywords } from './phtPortfolio.js';
import {
  passesHygieneGate,
  textHasExclusion,
  textHasNonPHTServiceExclusion,
  hasStrongEquipmentSignal,
  hasCoreProductSignal,
  keywordMatchesInText,
} from './phtMatchRules.js';

/** Minimum catalog points to count as a PHT match (filter). */
export const CATALOG_MATCH_THRESHOLD = 8;

/** Catalog points required for GO qualification (with other score components). */
export const CATALOG_GO_THRESHOLD = 12;

/** Strong category/line hit without article – still qualifies for GO. */
export const CATALOG_STRONG_LINE_THRESHOLD = 10;

const STOP_TOKENS = new Set([
  'und', 'oder', 'für', 'mit', 'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine',
  'von', 'zur', 'zum', 'bei', 'auf', 'aus', 'als', 'nach', 'über', 'unter', 'sowie',
  'typ', 'modell', 'inkl', 'ohne', 'system', 'anlage', 'gerät', 'geraet', 'standard',
]);

function tokenize(text) {
  return [...new Set(
    String(text || '').toLowerCase()
      .split(/[^a-zäöüß0-9]+/)
      .filter((t) => t.length >= 3 && !STOP_TOKENS.has(t)),
  )];
}

function textIncludesTerm(text, term) {
  return keywordMatchesInText(text, term);
}

function scoreLineHits(text, lines) {
  const hits = [];
  let score = 0;
  for (const line of lines) {
    const matched = line.keywords.filter((kw) => textIncludesTerm(text, kw));
    if (!matched.length) continue;
    const lineScore = Math.min(14, matched.length * 5);
    score += lineScore;
    hits.push({ id: line.id, name: line.name, score: lineScore, matchedKeywords: matched });
  }
  return { score, hits: hits.sort((a, b) => b.score - a.score) };
}

function scoreCategoryHits(text, categories) {
  const hits = [];
  let score = 0;
  for (const cat of categories) {
    const nameHit = textIncludesTerm(text, cat.name.toLowerCase());
    const kwHits = cat.keywords.filter((kw) => textIncludesTerm(text, kw));
    if (!nameHit && !kwHits.length) continue;
    const catScore = nameHit ? 10 : Math.min(8, kwHits.length * 4);
    score += catScore;
    hits.push({
      id: cat.id,
      name: cat.name,
      lineId: cat.lineId,
      score: catScore,
      matchedKeywords: nameHit ? [cat.name, ...kwHits] : kwHits,
    });
  }
  return { score, hits: hits.sort((a, b) => b.score - a.score) };
}

function scoreArticleHits(text, tokens, articles) {
  const scored = [];
  for (const article of articles) {
    const blob = `${article.name} ${article.category} ${article.group}`.toLowerCase();
    const matched = [];
    let articleScore = 0;

    for (const kw of article.keywords) {
      if (kw.length < 4) continue;
      if (textIncludesTerm(text, kw) || tokens.includes(kw)) {
        matched.push(kw);
        articleScore += kw.length >= 6 ? 4 : 2;
      }
    }

    if (article.family && textIncludesTerm(text, article.family)) {
      if (!matched.includes(article.family)) matched.push(article.family);
      articleScore += 6;
    }

    const nameTokens = tokenize(article.name).filter((t) => t.length >= 5);
    const nameHits = nameTokens.filter((t) => textIncludesTerm(text, t));
    if (nameHits.length >= 2) {
      articleScore += 8;
      for (const t of nameHits) if (!matched.includes(t)) matched.push(t);
    }

    if (articleScore > 0) {
      scored.push({
        articleNumber: article.articleNumber,
        name: article.name,
        category: article.category,
        price: article.price,
        lineId: article.lineId,
        score: articleScore,
        matchedKeywords: [...new Set(matched)],
        virtual: article.virtual ?? false,
      });
    }
  }
  return scored.sort((a, b) => b.score - a.score || (b.price ?? 0) - (a.price ?? 0));
}

function scoreSegmentHits(text, segments) {
  let score = 0;
  const matched = [];
  for (const [segmentId, terms] of Object.entries(segments)) {
    const hits = terms.filter((t) => textIncludesTerm(text, t));
    if (!hits.length) continue;
    const hasProductContext = hasStrongEquipmentSignal(text) || hasCoreProductSignal(text);
    if (!hasProductContext) continue;
    score += Math.min(6, hits.length * 2);
    matched.push({ segmentId, hits });
  }
  for (const seg of PHT_PORTFOLIO_SEGMENTS) {
    const terms = getSegmentKeywords(seg);
    const hits = terms.filter((t) => textIncludesTerm(text, t));
    if (!hits.length) continue;
    const segExcl = seg.exclusionKeywords.some((kw) => textIncludesTerm(text, kw));
    if (segExcl) continue;
    score += Math.min(8, hits.length * 2);
    matched.push({ segmentId: seg.id, name: seg.name, hits: hits.slice(0, 5) });
  }
  return { score, matched };
}

/**
 * Score tender text against the unified PHT product catalog.
 * @returns {{
 *   score: number,
 *   catalogScore: number,
 *   topArticles: object[],
 *   matchedCategories: object[],
 *   matchedLines: object[],
 *   matchedSegments: object[],
 *   strongMatch: boolean,
 *   excluded: boolean,
 * }}
 */
export function scoreCatalogMatch(text) {
  const lower = String(text || '').toLowerCase();
  if (textHasExclusion(lower) || textHasNonPHTServiceExclusion(lower)) {
    return {
      score: 0,
      catalogScore: 0,
      topArticles: [],
      matchedCategories: [],
      matchedLines: [],
      matchedSegments: [],
      strongMatch: false,
      excluded: true,
    };
  }

  const tokens = tokenize(lower);
  const { lines, categories, articles, segments } = PHT_PRODUCT_CATALOG;

  const lineHit = scoreLineHits(lower, lines);
  const catHit = scoreCategoryHits(lower, categories);
  const articleScored = scoreArticleHits(lower, tokens, articles);
  const segHit = scoreSegmentHits(lower, segments);

  const topArticles = articleScored.slice(0, 5);
  const articleScore = Math.min(20, topArticles.reduce((s, a) => s + a.score, 0));

  let catalogScore = Math.min(
    25,
    Math.round(lineHit.score * 0.35 + catHit.score * 0.3 + articleScore * 0.25 + segHit.score * 0.1),
  );

  if (!passesHygieneGate(lower) && !hasCoreProductSignal(lower)) {
    catalogScore = Math.min(catalogScore, 6);
  }

  const strongLine = lineHit.hits.some((h) => h.score >= CATALOG_STRONG_LINE_THRESHOLD);
  const strongCategory = catHit.hits.some((h) => h.score >= 8);
  const strongArticle = topArticles.some((a) => a.score >= 8);
  const strongMatch = catalogScore >= CATALOG_GO_THRESHOLD
    || strongLine
    || strongCategory
    || strongArticle
    || hasStrongEquipmentSignal(lower);

  return {
    score: catalogScore,
    catalogScore,
    topArticles,
    matchedCategories: catHit.hits.slice(0, 5),
    matchedLines: lineHit.hits.slice(0, 3),
    matchedSegments: segHit.matched,
    strongMatch,
    excluded: false,
  };
}

export function matchesCatalog(text) {
  const result = scoreCatalogMatch(text);
  if (result.excluded) return false;
  if (result.catalogScore >= CATALOG_MATCH_THRESHOLD) return true;
  if (result.strongMatch && passesHygieneGate(text)) return true;
  return hasStrongEquipmentSignal(text) || hasCoreProductSignal(text);
}

export function hasStrongCatalogMatch(text) {
  const result = scoreCatalogMatch(text);
  if (result.excluded) return false;
  return result.strongMatch;
}

export function getTopCatalogArticles(text, limit = 5) {
  return scoreCatalogMatch(text).topArticles.slice(0, limit);
}
