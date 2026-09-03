import { Calendar, MapPin } from 'lucide-react';
import { useMemo } from 'react';
import type { CalendarAnchoredRoutePlan } from '../../lib/geo/calendarRoutePlanning';
import {
  WORKDAY_END_MINUTES,
  WORKDAY_START_MINUTES,
  buildTimelineEntries,
  minutesToTimeLabel,
} from '../../lib/geo/dayTimeSlots';

interface RouteTimelineViewProps {
  plan: CalendarAnchoredRoutePlan;
  compact?: boolean;
}

export function RouteTimelineView({ plan, compact = false }: RouteTimelineViewProps) {
  const entries = useMemo(
    () => buildTimelineEntries(
      plan.date,
      plan.anchors,
      plan.stops.map((s) => ({
        startMinutes: s.startMinutes,
        endMinutes: s.endMinutes,
        label: s.customer.name,
        customerId: s.customer.id,
        priority: s.customer.priority,
      })),
    ),
    [plan],
  );

  const span = WORKDAY_END_MINUTES - WORKDAY_START_MINUTES;

  const pct = (minutes: number) =>
    `${Math.max(0, Math.min(100, ((minutes - WORKDAY_START_MINUTES) / span) * 100))}%`;

  const height = compact ? 'h-48' : 'h-64';

  return (
    <div className="rounded-xl border border-dark-500/60 bg-dark-800/50 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-medium text-white flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-pht-400" />
          Tages-Timeline
        </p>
        <p className="text-[10px] text-slate-500">
          {minutesToTimeLabel(WORKDAY_START_MINUTES)} – {minutesToTimeLabel(WORKDAY_END_MINUTES)}
        </p>
      </div>

      <div className={`relative ${height} rounded-lg border border-dark-600/50 bg-dark-900/60 overflow-hidden`}>
        <div className="absolute inset-y-0 left-0 w-10 border-r border-dark-600/40 flex flex-col justify-between py-1 text-[9px] text-slate-600">
          <span>{minutesToTimeLabel(WORKDAY_START_MINUTES)}</span>
          <span>{minutesToTimeLabel(Math.floor((WORKDAY_START_MINUTES + WORKDAY_END_MINUTES) / 2))}</span>
          <span>{minutesToTimeLabel(WORKDAY_END_MINUTES)}</span>
        </div>

        <div className="absolute inset-y-0 left-10 right-0 px-2 py-1">
          {plan.gaps.map((gap, i) => (
            <div
              key={`gap-${i}`}
              className="absolute left-2 right-2 rounded border border-dashed border-slate-700/50 bg-slate-800/20"
              style={{
                top: pct(gap.startMinutes),
                height: `calc(${pct(gap.endMinutes)} - ${pct(gap.startMinutes)})`,
                minHeight: '2px',
              }}
              title={`Freies Fenster ${minutesToTimeLabel(gap.startMinutes)} – ${minutesToTimeLabel(gap.endMinutes)}`}
            />
          ))}

          {entries.map((entry, i) => {
            const top = pct(entry.startMinutes);
            const heightPct = `calc(${pct(entry.endMinutes)} - ${pct(entry.startMinutes)})`;
            const isAnchor = entry.kind === 'anchor';
            const isBreak = entry.kind === 'break';
            return (
              <div
                key={`${entry.kind}-${entry.startMinutes}-${i}`}
                className={`absolute left-2 right-2 rounded-md px-2 py-0.5 text-[10px] leading-tight overflow-hidden border ${
                  isBreak
                    ? 'bg-violet-500/20 border-violet-500/35 text-violet-100'
                    : isAnchor
                      ? 'bg-amber-500/25 border-amber-500/40 text-amber-100'
                      : 'bg-pht-600/30 border-pht-500/40 text-pht-100'
                }`}
                style={{ top, height: heightPct, minHeight: '18px' }}
                title={`${minutesToTimeLabel(entry.startMinutes)} – ${minutesToTimeLabel(entry.endMinutes)}: ${entry.label}`}
              >
                <span className="font-medium truncate block">
                  {isBreak ? '☕' : isAnchor ? '📅' : '📍'} {entry.label}
                </span>
                {!compact && (
                  <span className="text-[9px] opacity-80">
                    {minutesToTimeLabel(entry.startMinutes)} – {minutesToTimeLabel(entry.endMinutes)}
                    {!isAnchor && entry.priority ? ` · Prio ${entry.priority}` : ''}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-amber-500/50 border border-amber-500/40" />
          Kalender (fix)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-violet-500/40 border border-violet-500/35" />
          Pause
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-pht-600/50 border border-pht-500/40" />
          Besuche (vorgeschlagen)
        </span>
        {plan.stops.length === 0 && plan.anchors.length > 0 && (
          <span className="text-amber-400">Keine Besuche passen in die freien Fenster</span>
        )}
        {!plan.calendarConnected && (
          <span className="text-slate-600">Kalender nicht verbunden – voller Arbeitstag angenommen</span>
        )}
      </div>

      {plan.stops.length > 0 && !compact && (
        <ol className="mt-2 space-y-1 text-[10px] text-slate-400">
          {plan.stops.map((s, i) => (
            <li key={s.customer.id} className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-pht-400 shrink-0" />
              <span className="text-pht-300 font-mono">{i + 1}.</span>
              <span className="text-slate-200 truncate">{s.customer.name}</span>
              <span className="text-slate-600 shrink-0">{s.slotLabel}</span>
              {s.driveMinutesFromPrev > 0 && (
                <span className="text-slate-600 shrink-0">~{s.driveMinutesFromPrev} min Fahrt</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
