import { CalendarCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../ui/Card';
import {
  formatScheduledVisitGerman,
  type UpcomingConfirmedVisit,
} from '../../services/customerVisitStorage';

interface UpcomingConfirmedVisitsPanelProps {
  visits: UpcomingConfirmedVisit[];
}

export function UpcomingConfirmedVisitsPanel({ visits }: UpcomingConfirmedVisitsPanelProps) {
  if (visits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-emerald-400" />
            Bestätigte Termine diese Woche
          </h2>
        </CardHeader>
        <CardContent className="py-6 text-center text-xs text-slate-500">
          Keine bestätigten Kundentermine in den nächsten 7 Tagen.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-emerald-400" />
          Bestätigte Termine diese Woche ({visits.length})
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Via Terminvorschlag oder Wunschtermin bestätigt
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {visits.map((v) => (
          <Link
            key={`${v.customerId}-${v.scheduledVisit}`}
            to={`/priorities?customer=${v.customerId}`}
            className="flex items-center justify-between gap-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{v.customerName}</p>
              {(v.zip || v.city) && (
                <p className="text-xs text-slate-500">{v.zip} {v.city}</p>
              )}
            </div>
            <span className="shrink-0 text-sm font-semibold text-emerald-400 tabular-nums">
              {formatScheduledVisitGerman(v.scheduledVisit)}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
