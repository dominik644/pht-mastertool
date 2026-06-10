import { PHT_PRODUCTS } from '../data/products';
import type { Category, GoNoGo, ProductMatch, Tender } from '../types/tender';

const EXCLUSION_KEYWORDS = [
  'bürobedarf', 'it ', 'server', 'netzwerk', 'infrastruktur', 'software',
  'unterhaltsreinigung', 'reinigungsdienst', 'büro', 'papier',
];

const STRONG_INDUSTRIES = ['food', 'pharma', 'production', 'hospital'];

export function categorizeByValue(value: number): Category {
  if (value <= 10000) return 'A';
  if (value <= 50000) return 'B';
  return 'C';
}

export function formatRevenue(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)} Mio. €`;
  if (value >= 1000) return `${Math.round(value / 1000)}k €`;
  return `${value.toLocaleString('de-DE')} €`;
}

function isExcluded(text: string): boolean {
  const lower = text.toLowerCase();
  return EXCLUSION_KEYWORDS.some((kw) => lower.includes(kw));
}

function scoreProductMatch(text: string, product: typeof PHT_PRODUCTS[0]): number {
  const lower = text.toLowerCase();
  return product.keywords.reduce((score, kw) => (lower.includes(kw) ? score + 1 : score), 0);
}

export function matchProducts(title: string, description: string, estimatedValue: number): ProductMatch {
  const text = `${title} ${description}`;
  const scored = PHT_PRODUCTS.map((p) => ({
    product: p,
    score: scoreProductMatch(text, p),
  }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    const fallback = estimatedValue > 100000
      ? PHT_PRODUCTS.find((p) => p.id === 'ekw')!
      : estimatedValue > 50000
        ? PHT_PRODUCTS.find((p) => p.id === 'sanicare')!
        : PHT_PRODUCTS.find((p) => p.id === 'spender')!;

    return {
      main: fallback.name,
      alternatives: PHT_PRODUCTS.filter((p) => p.id !== fallback.id).slice(0, 2).map((p) => p.name),
      priceRange: `${formatRevenue(fallback.priceMin)} – ${formatRevenue(fallback.priceMax)}`,
      reasoning: 'Schwache Textpassung – Zuordnung basierend auf geschätztem Projektvolumen.',
    };
  }

  const main = scored[0].product;
  const alternatives = scored.slice(1, 4).map((s) => s.product.name);

  const reasoningParts = [
    `Stärkste Keyword-Übereinstimmung: ${main.category}.`,
    estimatedValue >= main.priceMin ? 'Projektvolumen passt zum Produktportfolio.' : 'Projektvolumen unter typischem Preisrahmen – Upselling prüfen.',
  ];

  if (text.toLowerCase().includes('food') || text.toLowerCase().includes('pharma')) {
    reasoningParts.push('Branche Food/Pharma – hohe PHT-Relevanz.');
  }

  return {
    main: main.name,
    alternatives,
    priceRange: `${formatRevenue(main.priceMin)} – ${formatRevenue(main.priceMax)}`,
    reasoning: reasoningParts.join(' '),
  };
}

export function evaluateGoNoGo(
  title: string,
  description: string,
  industry: string,
  estimatedValue: number,
  category: Category,
): { goNoGo: GoNoGo; nextStep: string } {
  const text = `${title} ${description} ${industry}`.toLowerCase();

  if (isExcluded(text)) {
    return {
      goNoGo: 'NO-GO',
      nextStep: 'Ausschreibung ignorieren – kein PHT-Relevanzbereich.',
    };
  }

  const hasHygieneRelevance =
    ['hygiene', 'cleaning', 'desinfektion', 'washing', 'reinigung', 'spender', 'wasch'].some((kw) =>
      text.includes(kw),
    );

  if (!hasHygieneRelevance) {
    return {
      goNoGo: 'NO-GO',
      nextStep: 'Keine Hygiene-/Reinigungsrelevanz erkennbar.',
    };
  }

  const strongIndustry = STRONG_INDUSTRIES.some((ind) => text.includes(ind));
  let score = 0;

  if (strongIndustry) score += 3;
  if (category === 'C') score += 3;
  else if (category === 'B') score += 2;
  else score += 1;
  if (estimatedValue >= 100000) score += 2;
  if (hasHygieneRelevance) score += 2;

  if (score >= 5) {
    const nextStep =
      category === 'C'
        ? 'Sofort prüfen – Top-Chance. Technik-Team einbinden und Angebot vorbereiten.'
        : category === 'B'
          ? 'Vertrieb kontaktieren – mittleres Potenzial, Cross-Selling prüfen.'
          : 'Watchlist – kleines Projekt, ggf. als Einstieg für größere Lösung nutzen.';

    return { goNoGo: 'GO', nextStep };
  }

  return {
    goNoGo: 'NO-GO',
    nextStep: 'Geringe Priorität – Ressourcen auf größere Chancen fokussieren.',
  };
}

export function analyzeTender(
  raw: Omit<Tender, 'category' | 'goNoGo' | 'revenuePotential' | 'productMatch' | 'nextStep'>,
): Tender {
  const category = categorizeByValue(raw.estimatedValue);
  const productMatch = matchProducts(raw.title, raw.description, raw.estimatedValue);
  const { goNoGo, nextStep } = evaluateGoNoGo(
    raw.title,
    raw.description,
    raw.industry,
    raw.estimatedValue,
    category,
  );

  return {
    ...raw,
    category,
    goNoGo,
    revenuePotential: formatRevenue(raw.estimatedValue),
    productMatch,
    nextStep,
  };
}

export function analyzeAllTenders(
  raws: Omit<Tender, 'category' | 'goNoGo' | 'revenuePotential' | 'productMatch' | 'nextStep'>[],
): Tender[] {
  return raws.map(analyzeTender);
}
