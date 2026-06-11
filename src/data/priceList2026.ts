import raw from './priceList2026.json';

export interface PriceListCategory {
  id: string;
  name: string;
  productCount: number;
  priceMin: number;
  priceMax: number;
}

export interface PriceListProduct {
  articleNumber: string;
  name: string;
  category: string;
  group: string;
  price: number;
  keywords: string[];
}

export interface PriceList2026 {
  source: string;
  extractedAt: string;
  currency: string;
  productCount: number;
  categories: PriceListCategory[];
  products: PriceListProduct[];
}

export const PRICE_LIST_2026 = raw as PriceList2026;

export const PRICE_LIST_PRODUCTS = PRICE_LIST_2026.products;

export function formatPriceListAmount(value: number): string {
  return `${value.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;
}

export function getPriceListCategoryNames(): string[] {
  return PRICE_LIST_2026.categories.map((c) => c.name);
}

export function getPriceListSummary(): {
  productCount: number;
  categoryCount: number;
  priceMin: number;
  priceMax: number;
  topCategories: { name: string; productCount: number; priceMin: number; priceMax: number }[];
} {
  const prices = PRICE_LIST_PRODUCTS.map((p) => p.price).filter((p) => p > 0);
  return {
    productCount: PRICE_LIST_2026.productCount,
    categoryCount: PRICE_LIST_2026.categories.length,
    priceMin: Math.min(...prices),
    priceMax: Math.max(...prices),
    topCategories: PRICE_LIST_2026.categories.slice(0, 12).map((c) => ({
      name: c.name,
      productCount: c.productCount,
      priceMin: c.priceMin,
      priceMax: c.priceMax,
    })),
  };
}

export function findPriceListProduct(articleNumber: string): PriceListProduct | undefined {
  return PRICE_LIST_PRODUCTS.find((p) => p.articleNumber === articleNumber);
}
