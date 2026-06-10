import { Calculator, Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PHT_PRODUCTS } from '../data/products';
import { Card, CardContent, CardHeader } from '../components/ui/Card';

const QUOTES_KEY = 'pht_quotes_used';

export function markQuoteUsed(): void {
  localStorage.setItem(QUOTES_KEY, '1');
}

export function hasUsedQuotes(): boolean {
  return localStorage.getItem(QUOTES_KEY) === '1';
}

export function QuotePage() {
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [margin, setMargin] = useState(28);
  const [discount, setDiscount] = useState(0);
  const [servicePct, setServicePct] = useState(12);

  const lines = useMemo(() => {
    return PHT_PRODUCTS
      .filter((p) => (selected[p.id] ?? 0) > 0)
      .map((p) => {
        const qty = selected[p.id];
        const unitMid = (p.priceMin + p.priceMax) / 2;
        const lineNet = unitMid * qty;
        return { ...p, qty, unitMid, lineNet };
      });
  }, [selected]);

  const subtotal = lines.reduce((s, l) => s + l.lineNet, 0);
  const service = subtotal * (servicePct / 100);
  const afterDiscount = (subtotal + service) * (1 - discount / 100);
  const withMargin = afterDiscount * (1 + margin / 100);
  const total = Math.round(withMargin);

  const handleExport = () => {
    markQuoteUsed();
    const text = [
      'PHT Angebotskalkulation',
      `Datum: ${new Date().toLocaleDateString('de-DE')}`,
      '',
      ...lines.map((l) => `${l.qty}x ${l.name} – ${Math.round(l.lineNet).toLocaleString('de-DE')} €`),
      '',
      `Zwischensumme: ${Math.round(subtotal).toLocaleString('de-DE')} €`,
      `Service (${servicePct}%): ${Math.round(service).toLocaleString('de-DE')} €`,
      `Rabatt: ${discount}%`,
      `Marge: ${margin}%`,
      `ANGEBOTSPREIS: ${total.toLocaleString('de-DE')} €`,
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
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calculator className="w-7 h-7 text-pht-400" />
          Angebotsrechner
        </h1>
        <p className="text-slate-400 mt-1 text-sm">PHT-Produkte · Marge · Service · Export für Angebote</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><h2 className="text-sm font-semibold text-white">Produktauswahl</h2></CardHeader>
          <CardContent className="space-y-3">
            {PHT_PRODUCTS.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-dark-500/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.category} · {p.priceMin.toLocaleString('de-DE')}–{p.priceMax.toLocaleString('de-DE')} €</p>
                </div>
                <input
                  type="number"
                  min={0}
                  value={selected[p.id] ?? 0}
                  onChange={(e) => setSelected((s) => ({ ...s, [p.id]: Math.max(0, Number(e.target.value)) }))}
                  className="w-16 px-2 py-1 rounded border border-dark-500 bg-dark-700 text-sm text-white text-center"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><h2 className="text-sm font-semibold text-white">Kalkulation</h2></CardHeader>
            <CardContent className="space-y-3">
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
