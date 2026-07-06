import { Pencil } from 'lucide-react';
import type { VisitPriority } from '../../types/customerPriority';

const PRIORITIES: VisitPriority[] = ['A', 'B', 'C'];

const BTN_CLASS: Record<VisitPriority, string> = {
  A: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
  B: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
  C: 'bg-slate-500/20 text-slate-300 border-slate-500/50',
};

interface PrioritySelectorProps {
  priority: VisitPriority;
  isOverridden?: boolean;
  onChange: (priority: VisitPriority) => void;
  compact?: boolean;
}

export function PrioritySelector({
  priority,
  isOverridden = false,
  onChange,
  compact = false,
}: PrioritySelectorProps) {
  return (
    <div className={`flex items-center gap-1 ${compact ? '' : 'mt-1'}`}>
      {isOverridden && (
        <span title="Manuell geändert" className="shrink-0">
          <Pencil
            className="w-3 h-3 text-pht-400"
            aria-label="Priorität manuell geändert"
          />
        </span>
      )}
      <div
        className="inline-flex rounded-lg border border-dark-500 overflow-hidden"
        role="group"
        aria-label="Priorität wählen"
      >
        {PRIORITIES.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`${compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'} font-semibold border-r border-dark-500 last:border-r-0 transition-colors ${
              priority === p
                ? BTN_CLASS[p]
                : 'bg-dark-700 text-slate-500 hover:text-slate-300'
            }`}
            aria-pressed={priority === p}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
