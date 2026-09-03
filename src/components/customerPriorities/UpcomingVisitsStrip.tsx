import { CalendarCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  formatScheduledVisitGerman,
  type UpcomingConfirmedVisit,
} from '../../services/customerVisitStorage';

interface UpcomingVisitsStripProps {
  visits: UpcomingConfirmedVisit[];
}

export function UpcomingVisitsStrip({ visits }: UpcomingVisitsStripProps) {
  if (visits.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-emerald-500/20 flex items-center gap-2">
        <CalendarCheck className="w-4 h-4 text-emerald-400" />
        <h2 className="text-sm font-semibold text-emerald-200">
          Anstehende Kundentermine ({visits.length})
        </h2>
      </div>
      <ul className="divide-y divide-emerald-500/10">
        {visits.map((v) => (
          <li key={`${v.customerId}-${v.scheduledVisit}`}>
            <Link
              to={`/priorities?customer=${v.customerId}`}
              className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-emerald-500/10 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{v.customerName}</p>
                {(v.zip || v.city) && (
                  <p className="text-[10px] text-slate-500">{v.zip} {v.city}</p>
                )}
              </div>
              <span className="shrink-0 text-xs font-semibold text-emerald-400 tabular-nums">
                {formatScheduledVisitGerman(v.scheduledVisit)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ConfirmedVisitBadgeProps {
  scheduledVisit: string;
  prominent?: boolean;
}

export function ConfirmedVisitBadge({ scheduledVisit, prominent = false }: ConfirmedVisitBadgeProps) {
  const label = formatScheduledVisitGerman(scheduledVisit);
  if (prominent) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-xs font-semibold text-emerald-300">
        <CalendarCheck className="w-3.5 h-3.5" />
        Termin bestätigt: {label}
      </span>
    );
  }
  return (
    <span className="text-[10px] text-emerald-400/90 font-medium">
      Termin bestätigt: {label}
    </span>
  );
}
