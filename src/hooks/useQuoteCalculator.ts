import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PHT_PRODUCTS } from '../data/products';
import {
  PRICE_LIST_2026,
  PRICE_LIST_PRODUCTS,
  type PriceListProduct,
} from '../data/priceList2026';
import {
  parseQuotePrefillParam,
  suggestProductsFromText,
  type QuoteSuggestion,
} from '../services/quoteSuggestions';

export interface QuoteLine {
  id: string;
  label: string;
  articleNumber?: string;
  category: string;
  qty: number;
  unitPrice: number;
  lineNet: number;
  source: 'profile' | 'pricelist';
}

export function useQuoteCalculator() {
  const [searchParams] = useSearchParams();
  const [selectedProfiles, setSelectedProfiles] = useState<Record<string, number>>({});
  const [selectedArticles, setSelectedArticles] = useState<Record<string, number>>({});
  const [margin, setMargin] = useState(28);
  const [discount, setDiscount] = useState(0);
  const [servicePct, setServicePct] = useState(12);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tenderHint, setTenderHint] = useState('');
  const [suggestions, setSuggestions] = useState<QuoteSuggestion[]>([]);

  useEffect(() => {
    const prefill = parseQuotePrefillParam(searchParams.get('articles'));
    if (!prefill.length) return;
    setSelectedArticles((prev) => {
      const next = { ...prev };
      for (const art of prefill) next[art] = Math.max(1, next[art] ?? 0);
      return next;
    });
  }, [searchParams]);

  const profileLines = useMemo((): QuoteLine[] => {
    return PHT_PRODUCTS
      .filter((p) => (selectedProfiles[p.id] ?? 0) > 0)
      .map((p) => {
        const qty = selectedProfiles[p.id];
        const unitPrice = (p.priceMin + p.priceMax) / 2;
        return {
          id: `profile-${p.id}`,
          label: p.name,
          category: p.category,
          qty,
          unitPrice,
          lineNet: unitPrice * qty,
          source: 'profile' as const,
        };
      });
  }, [selectedProfiles]);

  const priceListLines = useMemo((): QuoteLine[] => {
    return PRICE_LIST_PRODUCTS
      .filter((p) => (selectedArticles[p.articleNumber] ?? 0) > 0)
      .map((p) => {
        const qty = selectedArticles[p.articleNumber];
        return {
          id: `pl-${p.articleNumber}`,
          label: p.name,
          articleNumber: p.articleNumber,
          category: p.category,
          qty,
          unitPrice: p.price,
          lineNet: p.price * qty,
          source: 'pricelist' as const,
        };
      });
  }, [selectedArticles]);

  const lines = useMemo(() => [...profileLines, ...priceListLines], [profileLines, priceListLines]);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return PRICE_LIST_PRODUCTS.filter((p) => {
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (!q) return true;
      const blob = `${p.articleNumber} ${p.name} ${p.category} ${p.group}`.toLowerCase();
      return blob.includes(q);
    });
  }, [search, categoryFilter]);

  const subtotal = lines.reduce((s, l) => s + l.lineNet, 0);
  const service = subtotal * (servicePct / 100);
  const afterDiscount = (subtotal + service) * (1 - discount / 100);
  const withMargin = afterDiscount * (1 + margin / 100);
  const total = Math.round(withMargin);

  const applySuggestions = () => {
    const hits = suggestProductsFromText(tenderHint, tenderHint, 8);
    setSuggestions(hits);
    setSelectedArticles((prev) => {
      const next = { ...prev };
      for (const s of hits) next[s.product.articleNumber] = Math.max(1, next[s.product.articleNumber] ?? 0);
      return next;
    });
  };

  const addPriceListProduct = (p: PriceListProduct) => {
    setSelectedArticles((s) => ({ ...s, [p.articleNumber]: (s[p.articleNumber] ?? 0) + 1 }));
  };

  return {
    selectedProfiles, setSelectedProfiles,
    selectedArticles, setSelectedArticles,
    margin, setMargin,
    discount, setDiscount,
    servicePct, setServicePct,
    search, setSearch,
    categoryFilter, setCategoryFilter,
    tenderHint, setTenderHint,
    suggestions,
    lines,
    filteredProducts,
    subtotal,
    service,
    total,
    applySuggestions,
    addPriceListProduct,
    priceListMeta: PRICE_LIST_2026,
    products: PHT_PRODUCTS,
  };
}
