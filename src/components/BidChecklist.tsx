import { BID_CHECKLIST_ITEMS } from '../lib/phtConfig';
import type { Tender } from '../types/tender';

interface BidChecklistProps {
  tender: Tender;
  onUpdate: (checklist: Record<string, boolean>) => void;
}

export function BidChecklist({ tender, onUpdate }: BidChecklistProps) {
  const checklist = tender.bidChecklist ?? {};
  const done = BID_CHECKLIST_ITEMS.filter((item) => checklist[item]).length;
  const pct = Math.round((done / BID_CHECKLIST_ITEMS.length) * 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-white">Bid-Checkliste</h3>
        <span className={`text-xs font-medium ${pct >= 80 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-slate-500'}`}>
          {done}/{BID_CHECKLIST_ITEMS.length} ({pct}%)
        </span>
      </div>
      <div className="h-1.5 bg-dark-600 rounded-full mb-3 overflow-hidden">
        <div className="h-full bg-pht-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="space-y-1.5">
        {BID_CHECKLIST_ITEMS.map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={Boolean(checklist[item])}
              onChange={() => onUpdate({ ...checklist, [item]: !checklist[item] })}
              className="mt-0.5 rounded"
            />
            <span className={checklist[item] ? 'line-through text-slate-600' : ''}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
