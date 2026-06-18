import { useMemo } from 'react';
import { CheckSquare, Square } from 'lucide-react';
import type { QuoteSuggestion } from '../services/quoteSuggestions';
import { formatPriceListAmount } from '../data/priceList2026';

const DEFAULT_STEPS = [
  'Technische Anforderungen prüfen',
  'Passende Preislisten-Artikel auswählen',
  'Lieferzeiten und Logistik klären',
  'Preiskalkulation im Angebotsrechner',
  'Anhang: Produktblätter vorbereiten',
  'Interne Freigabe einholen',
  'Angebot einreichen vor Frist',
];

interface OfferChecklistProps {
  suggestions: QuoteSuggestion[];
  checked: Record<string, boolean>;
  onToggle: (key: string) => void;
}

export function OfferChecklist({ suggestions, checked, onToggle }: OfferChecklistProps) {
  const articleSteps = useMemo(
    () => suggestions.slice(0, 5).map((s) => `Artikel ${s.product.articleNumber}: ${s.product.name}`),
    [suggestions],
  );

  const steps = [...DEFAULT_STEPS.slice(0, 3), ...articleSteps, ...DEFAULT_STEPS.slice(3)];
  const done = steps.filter((s) => checked[s]).length;
  const total = suggestions.reduce((sum, s) => sum + s.product.price, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-pht-400" />
          Angebot vorbereiten
        </h3>
        <span className="text-xs text-slate-500">{done}/{steps.length}</span>
      </div>
      <ul className="space-y-2">
        {steps.map((step) => {
          const isDone = !!checked[step];
          return (
            <li key={step}>
              <button
                type="button"
                onClick={() => onToggle(step)}
                className="flex items-start gap-2 w-full text-left text-xs text-slate-400 hover:text-slate-200"
              >
                {isDone ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                )}
                <span className={isDone ? 'line-through text-slate-600' : ''}>{step}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {suggestions.length > 0 && (
        <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-dark-500/50">
          KVA netto ca. {formatPriceListAmount(total)} · {suggestions.length} Artikel
        </p>
      )}
    </div>
  );
}
