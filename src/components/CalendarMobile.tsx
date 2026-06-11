import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth,
  parseISO, startOfMonth, startOfWeek, subMonths,
} from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, Mail } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMicrosoftAuth } from '../context/MicrosoftAuthContext';
import { useTenders } from '../context/TenderContext';
import { mailtoBulkDeadlines } from '../services/calendarIntegrations';
import { createOutlookEvent, sendCalendarToEmail } from '../services/microsoftIntegrations';
import { Badge } from './ui/Badge';
import { Card, CardContent } from './ui/Card';
import type { Tender } from '../types/tender';

function daysUntil(deadline: string) {
  return Math.ceil((parseISO(deadline).getTime() - Date.now()) / 86400000);
}

export function CalendarMobile() {
  const { allTenders, openTender } = useTenders();
  const { targetEmail } = useMicrosoftAuth();
  const [searchParams] = useSearchParams();
  const [msg, setMsg] = useState<string | null>(null);
  const urgentOnly = searchParams.get('filter') === 'urgent';
  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [listOpen, setListOpen] = useState(true);

  const withDeadline = useMemo(() => {
    return allTenders.filter((t) => {
      if (!t.deadline || t.scoreRecommendation === 'NO-GO') return false;
      if (!urgentOnly) return true;
      const d = daysUntil(t.deadline);
      return d >= 0 && d <= 14;
    });
  }, [allTenders, urgentOnly]);

  const byDate = useMemo(() => {
    const map = new Map<string, Tender[]>();
    for (const t of withDeadline) {
      const key = t.deadline.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [withDeadline]);

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const selectedKey = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : '';
  const selectedTenders = byDate.get(selectedKey) ?? [];

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-pht-400" />
            Kalender
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Angebotsfristen
            {urgentOnly && <span className="text-red-400 ml-1">· &lt;14T</span>}
          </p>
        </div>
        <Link
          to={urgentOnly ? '/calendar' : '/calendar?filter=urgent'}
          className="text-xs px-3 py-2.5 rounded-xl border border-dark-500 text-slate-300 min-h-[44px] flex items-center shrink-0"
        >
          {urgentOnly ? 'Alle' : 'Dringend'}
        </Link>
      </header>

      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setMonth((m) => subMonths(m, 1))} className="p-2.5 rounded-lg text-slate-400 min-h-[44px] min-w-[44px] flex items-center justify-center">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-semibold text-white capitalize">
              {format(month, 'MMMM yyyy', { locale: de })}
            </h2>
            <button type="button" onClick={() => setMonth((m) => addMonths(m, 1))} className="p-2.5 rounded-lg text-slate-400 min-h-[44px] min-w-[44px] flex items-center justify-center">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
              <div key={d} className="text-center text-[9px] text-slate-500 font-medium py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const count = byDate.get(key)?.length ?? 0;
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const isToday = isSameDay(day, new Date());
              const urgent = (byDate.get(key) ?? []).some((t) => {
                const d = daysUntil(t.deadline);
                return d >= 0 && d <= 14;
              });
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setSelectedDay(day); setListOpen(true); }}
                  className={`min-h-[44px] p-0.5 rounded-lg border text-center transition-colors ${
                    isSelected ? 'border-pht-500 bg-pht-600/20' : 'border-transparent'
                  } ${!isSameMonth(day, month) ? 'opacity-30' : ''}`}
                >
                  <span className={`text-xs font-medium block ${isToday ? 'text-pht-400' : 'text-slate-300'}`}>
                    {format(day, 'd')}
                  </span>
                  {count > 0 && (
                    <span className={`inline-block mt-0.5 text-[8px] font-bold rounded px-1 ${
                      urgent ? 'bg-red-500/20 text-red-400' : 'bg-pht-500/20 text-pht-300'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <details open={listOpen} onToggle={(e) => setListOpen((e.target as HTMLDetailsElement).open)} className="group">
        <summary className="flex items-center gap-2 p-3 rounded-xl bg-dark-700/50 border border-dark-500/50 cursor-pointer min-h-[44px] list-none">
          <span className="text-sm font-semibold text-white flex-1 line-clamp-1">
            {selectedDay ? format(selectedDay, 'dd. MMM yyyy', { locale: de }) : 'Tag wählen'}
            {selectedTenders.length > 0 && <span className="text-slate-500 font-normal ml-1">({selectedTenders.length})</span>}
          </span>
          {selectedTenders.length > 0 && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); mailtoBulkDeadlines(targetEmail, selectedTenders); }}
              className="p-2 text-sky-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Tag per E-Mail"
            >
              <Mail className="w-4 h-4" />
            </button>
          )}
          <span className="text-xs text-slate-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="mt-2 space-y-2">
          {selectedTenders.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">Keine Fristen an diesem Tag.</p>
          ) : (
            selectedTenders.map((t) => {
              const d = daysUntil(t.deadline);
              return (
                <Card key={t.id}>
                  <CardContent className="py-3">
                    <button type="button" onClick={() => openTender(t.id)} className="w-full text-left min-h-[44px]">
                      <p className="text-sm font-medium text-white line-clamp-2">{t.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{t.country} · {t.sourcePlatform}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="score">{t.score}</Badge>
                        {d >= 0 && d <= 14 && <Badge variant="danger">{d} Tage</Badge>}
                      </div>
                    </button>
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={async () => setMsg((await createOutlookEvent(t)).message)}
                        className="flex-1 text-xs py-2.5 rounded-xl border border-dark-500 text-slate-400 min-h-[44px]"
                      >
                        Termin
                      </button>
                      <button
                        type="button"
                        onClick={async () => setMsg((await sendCalendarToEmail(t)).message)}
                        className="flex-1 text-xs py-2.5 rounded-xl border border-sky-500/30 text-sky-400 min-h-[44px]"
                      >
                        E-Mail
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </details>
      {msg && <p className="text-xs text-slate-500">{msg}</p>}
    </div>
  );
}
