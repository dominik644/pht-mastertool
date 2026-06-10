import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth,
  parseISO, startOfMonth, startOfWeek, subMonths,
} from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, Mail } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMicrosoftAuth } from '../context/MicrosoftAuthContext';
import { useTenders } from '../context/TenderContext';
import { mailtoBulkDeadlines } from '../services/calendarIntegrations';
import { createOutlookEvent, sendCalendarToEmail } from '../services/microsoftIntegrations';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import type { Tender } from '../types/tender';

function daysUntil(deadline: string) {
  return Math.ceil((parseISO(deadline).getTime() - Date.now()) / 86400000);
}

export function CalendarPage() {
  const { allTenders, openTender } = useTenders();
  const { targetEmail } = useMicrosoftAuth();
  const [searchParams] = useSearchParams();
  const [msg, setMsg] = useState<string | null>(null);
  const urgentOnly = searchParams.get('filter') === 'urgent';
  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

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
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calendar className="w-7 h-7 text-pht-400" />
          Kalender
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Angebotsfristen aller Ausschreibungen
          {urgentOnly && <span className="text-red-400 ml-2">· nur &lt; 14 Tage</span>}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <button type="button" onClick={() => setMonth((m) => subMonths(m, 1))} className="p-2 rounded-lg hover:bg-dark-600 text-slate-400">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-semibold text-white capitalize">
              {format(month, 'MMMM yyyy', { locale: de })}
            </h2>
            <button type="button" onClick={() => setMonth((m) => addMonths(m, 1))} className="p-2 rounded-lg hover:bg-dark-600 text-slate-400">
              <ChevronRight className="w-5 h-5" />
            </button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
                <div key={d} className="text-center text-[10px] text-slate-500 font-medium py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
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
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[52px] p-1 rounded-lg border text-left transition-colors ${
                      isSelected ? 'border-pht-500 bg-pht-600/20' : 'border-dark-500/40 hover:border-dark-400'
                    } ${!isSameMonth(day, month) ? 'opacity-35' : ''}`}
                  >
                    <span className={`text-xs font-medium ${isToday ? 'text-pht-400' : 'text-slate-300'}`}>
                      {format(day, 'd')}
                    </span>
                    {count > 0 && (
                      <span className={`block mt-1 text-[10px] font-bold rounded px-1 w-fit ${
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">
              {selectedDay ? format(selectedDay, 'dd. MMMM yyyy', { locale: de }) : 'Tag wählen'}
            </h2>
            {selectedTenders.length > 0 && (
              <button
                type="button"
                onClick={() => mailtoBulkDeadlines(targetEmail, selectedTenders)}
                className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 shrink-0"
              >
                <Mail className="w-3 h-3" /> Tag per E-Mail
              </button>
            )}
          </CardHeader>
          <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
            {selectedTenders.length === 0 ? (
              <p className="text-sm text-slate-500">Keine Fristen an diesem Tag.</p>
            ) : (
              selectedTenders.map((t) => {
                const d = daysUntil(t.deadline);
                return (
                  <div key={t.id} className="p-3 rounded-lg border border-dark-500/50 hover:border-pht-500/40">
                    <button
                      type="button"
                      onClick={() => openTender(t.id)}
                      className="w-full text-left hover:bg-dark-600/30 transition-colors rounded -m-1 p-1"
                    >
                      <p className="text-sm font-medium text-white line-clamp-2">{t.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{t.country} · {t.sourcePlatform}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="score">{t.score}</Badge>
                        {d >= 0 && d <= 14 && <Badge variant="danger">{d} Tage</Badge>}
                      </div>
                    </button>
                    <div className="flex gap-1 mt-2">
                      <button
                        type="button"
                        onClick={async () => setMsg((await createOutlookEvent(t)).message)}
                        className="flex-1 text-[10px] py-1 rounded border border-dark-500 text-slate-400 hover:text-white"
                      >
                        Termin
                      </button>
                      <button
                        type="button"
                        onClick={async () => setMsg((await sendCalendarToEmail(t)).message)}
                        className="flex-1 text-[10px] py-1 rounded border border-sky-500/30 text-sky-400 hover:bg-sky-500/10"
                      >
                        An {targetEmail.split('@')[0]}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
      {msg && <p className="mt-4 text-xs text-slate-500">{msg}</p>}
    </div>
  );
}
