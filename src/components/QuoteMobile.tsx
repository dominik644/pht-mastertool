import { Calculator, Download, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';
import {
  formatPriceListAmount,
  PRICE_LIST_PDF_URL,
} from '../data/priceList2026';
import { useQuoteCalculator } from '../hooks/useQuoteCalculator';
import { markQuoteUsed } from '../pages/QuotePage';
import { Card, CardContent } from './ui/Card';

type Tab = 'calc' | 'profiles' | 'pricelist' | 'kva';

export function QuoteMobile() {
  const [tab, setTab] = useState<Tab>('calc');
  const q = useQuoteCalculator();

  const handleExport = () => {
    markQuoteUsed();
    const text = [
      'PHT Angebotskalkulation (Preisliste 2026)',
      `Datum: ${new Date().toLocaleDateString('de-DE')}`,
      `Quelle: ${q.priceListMeta.source}`,
      '',
      ...q.lines.map((l) => {
        const art = l.articleNumber ? ` [${l.articleNumber}]` : '';
        return `${l.qty}x ${l.label}${art} – ${Math.round(l.lineNet).toLocaleString('de-DE')} €`;
      }),
      '',
      `Zwischensumme: ${Math.round(q.subtotal).toLocaleString('de-DE')} €`,
      `Service: ${Math.round(q.service).toLocaleString('de-DE')} €`,
      `ANGEBOTSPREIS: ${q.total.toLocaleString('de-DE')} €`,
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pht-angebot-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'calc', label: 'Kalkulation' },
    { id: 'kva', label: 'KVA' },
    { id: 'profiles', label: 'Profile' },
    { id: 'pricelist', label: 'Preisliste' },
  ];

  return (
    <div className="p-4 pb-28 space-y-4">
      <header>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Calculator className="w-5 h-5 text-pht-400" />
          Angebotsrechner
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Preisliste 2026 · {q.priceListMeta.productCount} Artikel
        </p>
        <a
          href={PRICE_LIST_PDF_URL}
          download="PHT_Preisliste_2026_AT-DE.pdf"
          className="inline-flex items-center gap-1.5 mt-2 text-xs text-pht-400 min-h-[44px]"
        >
          <Download className="w-3.5 h-3.5" /> PDF herunterladen
        </a>
      </header>

      <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`shrink-0 px-3 py-2.5 rounded-xl text-xs font-medium min-h-[44px] ${
              tab === id ? 'bg-pht-600/25 text-pht-300 border border-pht-500/40' : 'text-slate-500 border border-dark-500/40'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'kva' && (
        <Card>
          <CardContent className="py-4 space-y-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pht-400" /> Keyword-Match
            </h2>
            <textarea
              value={q.tenderHint}
              onChange={(e) => q.setTenderHint(e.target.value)}
              placeholder="Ausschreibungstitel oder Stichworte…"
              className="w-full h-24 px-3 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-sm text-white resize-none"
            />
            <button
              type="button"
              disabled={!q.tenderHint.trim()}
              onClick={q.applySuggestions}
              className="w-full py-3 rounded-xl bg-pht-600 text-white text-sm font-medium disabled:opacity-40 min-h-[44px]"
            >
              Produkte vorschlagen
            </button>
            {q.suggestions.length > 0 && (
              <ul className="text-xs text-slate-400 space-y-1">
                {q.suggestions.map((s) => (
                  <li key={s.product.articleNumber}>{s.product.name} · {formatPriceListAmount(s.product.price)}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'profiles' && (
        <div className="space-y-2">
          {q.products.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-dark-500/50 min-h-[56px]">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium line-clamp-1">{p.name}</p>
                <p className="text-xs text-slate-500">{p.priceMin.toLocaleString('de-DE')}–{p.priceMax.toLocaleString('de-DE')} €</p>
              </div>
              <input
                type="number"
                min={0}
                value={q.selectedProfiles[p.id] ?? 0}
                onChange={(e) => q.setSelectedProfiles((s) => ({ ...s, [p.id]: Math.max(0, Number(e.target.value)) }))}
                className="w-14 px-2 py-2 rounded-lg border border-dark-500 bg-dark-700 text-sm text-white text-center min-h-[44px]"
              />
            </div>
          ))}
        </div>
      )}

      {tab === 'pricelist' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="search"
              value={q.search}
              onChange={(e) => q.setSearch(e.target.value)}
              placeholder="Artikel suchen…"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-sm text-white min-h-[44px]"
            />
          </div>
          <select
            value={q.categoryFilter}
            onChange={(e) => q.setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-dark-500 bg-dark-700 text-sm text-white min-h-[44px]"
          >
            <option value="">Alle Kategorien</option>
            {q.priceListMeta.categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {q.filteredProducts.slice(0, 60).map((p) => (
              <div key={p.articleNumber} className="flex items-center gap-2 p-3 rounded-xl border border-dark-500/40 min-h-[56px]">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white line-clamp-1">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.articleNumber} · {formatPriceListAmount(p.price)}</p>
                </div>
                <input
                  type="number"
                  min={0}
                  value={q.selectedArticles[p.articleNumber] ?? 0}
                  onChange={(e) => q.setSelectedArticles((s) => ({
                    ...s,
                    [p.articleNumber]: Math.max(0, Number(e.target.value)),
                  }))}
                  className="w-12 px-1 py-2 rounded-lg border border-dark-500 bg-dark-700 text-sm text-white text-center"
                />
                <button
                  type="button"
                  onClick={() => q.addPriceListProduct(p)}
                  className="px-3 py-2 rounded-lg bg-dark-600 text-pht-300 min-h-[44px] min-w-[44px]"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'calc' && (
        <Card>
          <CardContent className="py-4 space-y-4">
            {q.lines.length > 0 && (
              <ul className="text-xs text-slate-400 space-y-1 max-h-32 overflow-y-auto border-b border-dark-500 pb-3">
                {q.lines.map((l) => (
                  <li key={l.id} className="flex justify-between gap-2">
                    <span className="truncate">{l.qty}× {l.label}</span>
                    <span className="text-slate-300 shrink-0">{Math.round(l.lineNet).toLocaleString('de-DE')} €</span>
                  </li>
                ))}
              </ul>
            )}
            <label className="block text-xs text-slate-400">
              Marge {q.margin}%
              <input type="range" min={10} max={45} value={q.margin} onChange={(e) => q.setMargin(Number(e.target.value))} className="w-full mt-1" />
            </label>
            <label className="block text-xs text-slate-400">
              Service {q.servicePct}%
              <input type="range" min={0} max={25} value={q.servicePct} onChange={(e) => q.setServicePct(Number(e.target.value))} className="w-full mt-1" />
            </label>
            <label className="block text-xs text-slate-400">
              Rabatt {q.discount}%
              <input type="range" min={0} max={20} value={q.discount} onChange={(e) => q.setDiscount(Number(e.target.value))} className="w-full mt-1" />
            </label>
            <div className="pt-2 border-t border-dark-500">
              <p className="text-xs text-slate-500">Angebotspreis</p>
              <p className="text-3xl font-bold text-pht-400">{q.total.toLocaleString('de-DE')} €</p>
            </div>
            <button
              type="button"
              disabled={q.lines.length === 0}
              onClick={handleExport}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-pht-600 text-white text-sm font-medium disabled:opacity-40 min-h-[44px]"
            >
              <Download className="w-4 h-4" /> Export
            </button>
          </CardContent>
        </Card>
      )}

      {tab !== 'calc' && (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] inset-x-0 z-30 px-4">
          <div className="rounded-2xl border border-pht-500/40 bg-dark-800/95 backdrop-blur-md p-3 flex items-center justify-between shadow-xl">
            <div>
              <p className="text-[10px] text-slate-500">Angebotspreis</p>
              <p className="text-xl font-bold text-pht-400">{q.total.toLocaleString('de-DE')} €</p>
            </div>
            <button
              type="button"
              disabled={q.lines.length === 0}
              onClick={handleExport}
              className="px-4 py-2.5 rounded-xl bg-pht-600 text-white text-sm font-medium disabled:opacity-40 min-h-[44px]"
            >
              Export
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
