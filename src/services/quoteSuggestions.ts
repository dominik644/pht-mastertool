import {
  formatPriceListAmount,
  PRICE_LIST_PRODUCTS,
  type PriceListProduct,
} from '../data/priceList2026';

export interface QuoteSuggestion {
  product: PriceListProduct;
  score: number;
  matchedKeywords: string[];
}

const STOP_WORDS = new Set([
  'und', 'oder', 'für', 'mit', 'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine',
  'von', 'zur', 'zum', 'bei', 'auf', 'aus', 'als', 'nach', 'über', 'unter', 'sowie',
]);

function tokenize(text: string): string[] {
  return [...new Set(
    text
      .toLowerCase()
      .split(/[^a-zäöüß0-9]+/)
      .filter((t) => t.length >= 3 && !STOP_WORDS.has(t)),
  )];
}

function scoreProduct(text: string, tokens: string[], product: PriceListProduct): QuoteSuggestion {
  const blob = `${product.name} ${product.category} ${product.group} ${product.keywords.join(' ')}`.toLowerCase();
  const matched = tokens.filter((t) => blob.includes(t));
  for (const kw of product.keywords) {
    if (text.includes(kw) && !matched.includes(kw)) matched.push(kw);
  }
  // bonus for article family codes in tender text
  const familyCodes = ['ewg', 'dzw', 'sanicare', 'combi', 'ekw', 'hdt', 'hst', 'ezd'];
  for (const code of familyCodes) {
    if (text.includes(code) && blob.includes(code) && !matched.includes(code)) {
      matched.push(code);
    }
  }
  const score = matched.length;
  return { product, score, matchedKeywords: matched };
}

export function suggestProductsFromText(
  title: string,
  description = '',
  limit = 8,
): QuoteSuggestion[] {
  const text = `${title} ${description}`.toLowerCase();
  const tokens = tokenize(text);
  if (tokens.length === 0) return [];

  return PRICE_LIST_PRODUCTS
    .map((p) => scoreProduct(text, tokens, p))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.product.price - a.product.price)
    .slice(0, limit);
}

export function formatSuggestionSummary(suggestions: QuoteSuggestion[]): string {
  if (!suggestions.length) return 'Keine passenden Preislisten-Artikel gefunden.';
  const total = suggestions.reduce((s, x) => s + x.product.price, 0);
  const lines = suggestions.map(
    (s) => `• ${s.product.name} (${s.product.articleNumber}) – ${formatPriceListAmount(s.product.price)}`,
  );
  return [
    ...lines,
    '',
    `Kostenvoranschlag (Listenpreise netto): ca. ${formatPriceListAmount(total)}`,
  ].join('\n');
}

export function buildQuotePrefillParam(articleNumbers: string[]): string {
  return articleNumbers.join(',');
}

export function parseQuotePrefillParam(param: string | null): string[] {
  if (!param) return [];
  return param.split(',').map((s) => s.trim()).filter(Boolean);
}
