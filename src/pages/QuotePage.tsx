import { Calculator, Download, Search, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PHT_PRODUCTS } from '../data/products';
import {
  formatPriceListAmount,
  PRICE_LIST_2026,
  PRICE_LIST_PRODUCTS,
  type PriceListProduct,
} from '../data/priceList2026';
import {
  parseQuotePrefillParam,
  suggestProductsFromText,
  type QuoteSuggestion,
} from '../services/quoteSuggestions';
import { Card, CardContent, CardHeader } from '../components/ui/Card';

const QUOTES_KEY = 'pht_quotes_used';

export function markQuoteUsed(): void {
  localStorage.setItem(QUOTES_KEY, '1');
}

export function hasUsedQuotes(): boolean {
  return localStorage.getItem(QUOTES_KEY) === '1';
}

interface QuoteLine {
  id: string;
  label: string;
  articleNumber?: string;
  category: string;
  qty: number;
  unitPrice: number;
  lineNet: number;
  source: 'profile' | 'pricelist';
}

export function QuotePage() {
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

  const handleExport = () => {
    markQuoteUsed();
    const text = [
      'PHT Angebotskalkulation (Preisliste 2026)',
      `Datum: ${new Date().toLocaleDateString('de-DE')}`,
      `Quelle: ${PRICE_LIST_2026.source}`,
      '',
      ...lines.map((l) => {
        const art = l.articleNumber ? ` [${l.articleNumber}]` : '';
        return `${l.qty}x ${l.label}${art} – ${Math.round(l.lineNet).toLocaleString('de-DE')} €`;
      }),
      '',
      `Zwischensumme: ${Math.round(subtotal).toLocaleString('de-DE')} €`,
      `Service (${servicePct}%): ${Math.round(service).toLocaleString('de-DE')} €`,
      `Rabatt: ${discount}%`,
      `Marge: ${margin}%`,
      `ANGEBOTSPREIS: ${total.toLocaleString('de-DE')} €`,
      '',
      'Listenpreise netto zzgl. Lieferkosten und MwSt.',
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pht-angebot-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calculator className="w-7 h-7 text-pht-400" />
          Angebotsrechner
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          PHT Preisliste 2026 · {PRICE_LIST_2026.productCount} Artikel · {PRICE_LIST_2026.categories.length} Kategorien
        </p>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pht-400" />
            Kostenvoranschlag (Keyword-Match)
          </h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={tenderHint}
            onChange={(e) => setTenderHint(e.target.value)}
            placeholder="Ausschreibungstitel oder Stichworte eingeben, z. B. „Hygienestation Sohlenreinigung Lebensmittelbetrieb“…"
            className="w-full h-20 px-3 py-2 rounded-lg border border-dark-500 bg-dark-700 text-sm text-white placeholder:text-slate-600 resize-none"
          />
          <button
            type="button"
            disabled={!tenderHint.trim()}
            onClick={applySuggestions}
            className="px-4 py-2 rounded-lg bg-pht-600 text-white text-sm font-medium hover:bg-pht-700 disabled:opacity-40"
          >
            Produkte vorschlagen
          </button>
          {suggestions.length > 0 && (
            <ul className="text-xs text-slate-400 space-y-1">
              {suggestions.map((s) => (
                <li key={s.product.articleNumber}>
                  {s.product.name} · {formatPriceListAmount(s.product.price)}
                  {s.matchedKeywords.length > 0 && (
                    <span className="text-slate-600"> ({s.matchedKeywords.slice(0, 4).join(', ')})</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><h2 className="text-sm font-semibold text-white">Produktprofile (Schnellauswahl)</h2></CardHeader>
            <CardContent className="space-y-3">
              {PHT_PRODUCTS.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-dark-500/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.category} · {p.priceMin.toLocaleString('de-DE')}–{p.priceMax.toLocaleString('de-DE')} € (Richtwert)</p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={selectedProfiles[p.id] ?? 0}
                    onChange={(e) => setSelectedProfiles((s) => ({ ...s, [p.id]: Math.max(0, Number(e.target.value)) }))}
                    className="w-16 px-2 py-1 rounded border border-dark-500 bg-dark-700 text-sm text-white text-center"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <h2 className="text-sm font-semibold text-white flex-1">Preisliste 2026</h2>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Suche Artikel…"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-dark-500 bg-dark-700 text-sm text-white"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-dark-500 bg-dark-700 text-sm text-white max-w-[200px]"
                >
                  <option value="">Alle Kategorien</option>
                  {PRICE_LIST_2026.categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[480px] overflow-y-auto">
              {filteredProducts.slice(0, 80).map((p) => (
                <div key={p.articleNumber} className="flex items-center gap-3 p-2.5 rounded-lg border border-dark-500/40 hover:border-pht-500/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      {p.articleNumber} · {p.category} · {formatPriceListAmount(p.price)}
                    </p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={selectedArticles[p.articleNumber] ?? 0}
                    onChange={(e) => setSelectedArticles((s) => ({
                      ...s,
                      [p.articleNumber]: Math.max(0, Number(e.target.value)),
                    }))}
                    className="w-14 px-2 py-1 rounded border border-dark-500 bg-dark-700 text-sm text-white text-center"
                  />
                  <button
                    type="button"
                    onClick={() => addPriceListProduct(p)}
                    className="px-2 py-1 text-xs rounded bg-dark-600 text-pht-300 hover:bg-pht-600/20"
                  >
                    +
                  </button>
                </div>
              ))}
              {filteredProducts.length > 80 && (
                <p className="text-xs text-slate-500 text-center py-2">
                  {filteredProducts.length - 80} weitere Treffer – Suche eingrenzen
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><h2 className="text-sm font-semibold text-white">Kalkulation</h2></CardHeader>
            <CardContent className="space-y-3">
              {lines.length > 0 && (
                <ul className="text-xs text-slate-400 space-y-1 max-h-40 overflow-y-auto border-b border-dark-500 pb-3">
                  {lines.map((l) => (
                    <li key={l.id} className="flex justify-between gap-2">
                      <span className="truncate">{l.qty}× {l.label}</span>
                      <span className="text-slate-300 shrink-0">{Math.round(l.lineNet).toLocaleString('de-DE')} €</span>
                    </li>
                  ))}
                </ul>
              )}
              <label className="block text-xs text-slate-400">
                Marge %
                <input type="range" min={10} max={45} value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="w-full mt-1" />
                <span className="text-white">{margin}%</span>
              </label>
              <label className="block text-xs text-slate-400">
                Service %
                <input type="range" min={0} max={25} value={servicePct} onChange={(e) => setServicePct(Number(e.target.value))} className="w-full mt-1" />
                <span className="text-white">{servicePct}%</span>
              </label>
              <label className="block text-xs text-slate-400">
                Rabatt %
                <input type="range" min={0} max={20} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-full mt-1" />
                <span className="text-white">{discount}%</span>
              </label>
              <div className="pt-3 border-t border-dark-500">
                <p className="text-xs text-slate-500">Angebotspreis</p>
                <p className="text-3xl font-bold text-pht-400">{total.toLocaleString('de-DE')} €</p>
                <p className="text-xs text-slate-600 mt-1">Listenpreise netto · zzgl. Lieferung & MwSt.</p>
              </div>
              <button
                type="button"
                disabled={lines.length === 0}
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-pht-600 text-white text-sm font-medium hover:bg-pht-700 disabled:opacity-40"
              >
                <Download className="w-4 h-4" /> Export
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
