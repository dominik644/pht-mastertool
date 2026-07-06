import { AlertCircle } from 'lucide-react';
import { BUNDESLAND_SHORT } from '../../lib/bundeslandFromPlz';
import type { BundeslandOverview } from '../../services/customerVisitStorage';

interface BundeslandCardsProps {
  overview: BundeslandOverview[];
  selected: string[];
  onSelect: (name: string) => void;
}

export function BundeslandCards({ overview, selected, onSelect }: BundeslandCardsProps) {
  if (overview.length === 0) {
    return <p className="text-sm text-slate-500 text-center py-6">Keine Bundesland-Daten.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {overview.map((bl) => {
        const isActive = selected.includes(bl.name);
        const short = BUNDESLAND_SHORT[bl.name as keyof typeof BUNDESLAND_SHORT] ?? bl.name;
        return (
          <button
            key={bl.name}
            type="button"
            onClick={() => onSelect(bl.name)}
            className={`text-left p-3 rounded-xl border transition-colors min-h-[88px] ${
              isActive
                ? 'border-pht-500/60 bg-pht-600/15 ring-1 ring-pht-500/30'
                : 'border-dark-500/50 bg-dark-700/40 hover:border-pht-500/30'
            }`}
          >
            <div className="flex items-start justify-between gap-1">
              <p className="text-sm font-semibold text-white">{short}</p>
              {bl.overdue > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-red-400">
                  <AlertCircle className="w-3 h-3" />
                  {bl.overdue}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">{bl.count} Kunden</p>
            <p className="text-xs mt-2 tabular-nums">
              <span className="text-emerald-400">{bl.priorities.A}A</span>
              {' · '}
              <span className="text-amber-400">{bl.priorities.B}B</span>
              {' · '}
              <span className="text-slate-400">{bl.priorities.C}C</span>
            </p>
          </button>
        );
      })}
    </div>
  );
}
