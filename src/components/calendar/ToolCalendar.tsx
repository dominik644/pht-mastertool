import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth,
  startOfMonth, startOfWeek, subMonths,
} from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Check, ChevronLeft, ChevronRight, ExternalLink, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMicrosoftAuth } from '../../context/MicrosoftAuthContext';
import type { CustomerPriority } from '../../types/customerPriority';
import {
  collectToolCalendarEvents,
  groupEventsByDate,
  isOutlookSynced,
  KIND_CHIP,
  KIND_DOT,
  KIND_LABEL,
  loadOutlookSyncedIds,
  OWN_CALENDAR_CHANGED_EVENT,
  PLANNED_ROUTES_CHANGED_EVENT,
  refreshCalendarFromServer,
  SALES_FUNNEL_CHANGED_EVENT,
  TOOL_CALENDAR_CHANGED_EVENT,
  VISIT_STORE_CHANGED_EVENT,
  type ScheduleCalendarFeedItem,
  type ToolCalendarEvent,
  type ToolCalendarFilter,
  type ToolCalendarKind,
} from '../../services/toolCalendar';
import { pushEventToOutlook, pushEventsToOutlook } from '../../services/toolCalendarOutlook';
import { APPOINTMENT_PRESETS, createOwnAppointment, deleteToolCalendarEvent } from '../../services/toolCalendarMutations';
import { Card, CardContent, CardHeader } from '../ui/Card';

const FILTERS: { id: ToolCalendarFilter; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'block', label: 'Meine Termine' },
  { id: 'confirmed', label: 'Bestätigt' },
  { id: 'pending', label: 'Vorschläge' },
  { id: 'tour', label: 'Touren' },
  { id: 'funnel', label: 'Funnel' },
  { id: 'reminder', label: 'Erinnerungen' },
];

interface ToolCalendarProps {
  customers: CustomerPriority[];
  compact?: boolean;
}

function timeLabel(event: ToolCalendarEvent): string {
  const t = event.start?.split('T')[1]?.slice(0, 5);
  return t || 'ganztags';
}

export function ToolCalendar({
  customers,
  compact = false,
}: ToolCalendarProps) {
  const { user, configured, signIn } = useMicrosoftAuth();
  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [filter, setFilter] = useState<ToolCalendarFilter>('all');
  const [feed, setFeed] = useState<ScheduleCalendarFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [syncedTick, setSyncedTick] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [presetId, setPresetId] = useState<(typeof APPOINTMENT_PRESETS)[number]['id']>('homeoffice');
  const [title, setTitle] = useState('Homeoffice');
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [syncOutlook, setSyncOutlook] = useState(true);

  const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');

  const reload = async () => {
    setLoading(true);
    try {
      const items = await refreshCalendarFromServer();
      setFeed(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    const bump = () => setSyncedTick((n) => n + 1);
    window.addEventListener(VISIT_STORE_CHANGED_EVENT, bump);
    window.addEventListener(PLANNED_ROUTES_CHANGED_EVENT, bump);
    window.addEventListener(SALES_FUNNEL_CHANGED_EVENT, bump);
    window.addEventListener(TOOL_CALENDAR_CHANGED_EVENT, bump);
    window.addEventListener(OWN_CALENDAR_CHANGED_EVENT, bump);
    return () => {
      window.removeEventListener(VISIT_STORE_CHANGED_EVENT, bump);
      window.removeEventListener(PLANNED_ROUTES_CHANGED_EVENT, bump);
      window.removeEventListener(SALES_FUNNEL_CHANGED_EVENT, bump);
      window.removeEventListener(TOOL_CALENDAR_CHANGED_EVENT, bump);
      window.removeEventListener(OWN_CALENDAR_CHANGED_EVENT, bump);
    };
  }, []);

  const events = useMemo(() => {
    void syncedTick;
    try {
      return collectToolCalendarEvents({
        customers,
        feed,
        monthStart,
        monthEnd,
      });
    } catch (err) {
      console.error('[ToolCalendar] collect failed', err);
      return [];
    }
  }, [customers, feed, monthStart, monthEnd, syncedTick]);

  const visible = useMemo(
    () => events.filter((e) => {
      if (filter === 'all') return true;
      if (filter === 'pending') return e.kind === 'pending' || e.kind === 'wish';
      return e.kind === filter;
    }),
    [events, filter],
  );
  const byDate = useMemo(() => groupEventsByDate(visible), [visible]);

  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const selectedKey = format(selectedDay, 'yyyy-MM-dd');
  const selectedEvents = byDate.get(selectedKey) ?? [];
  const synced = loadOutlookSyncedIds();
  const outlookOn = Boolean(user);
  const unsyncedReady = selectedEvents.filter((e) => e.outlookReady && !isOutlookSynced(e.id, synced));

  const handlePushOne = async (event: ToolCalendarEvent) => {
    setBusyId(event.id);
    setMsg(null);
    const result = await pushEventToOutlook(event, customers);
    setMsg(result.message);
    setBusyId(null);
    setSyncedTick((n) => n + 1);
  };

  const handlePushDay = async () => {
    setBusyId('day');
    setMsg(null);
    const result = await pushEventsToOutlook(unsyncedReady, customers);
    setMsg(result.message);
    setBusyId(null);
    setSyncedTick((n) => n + 1);
  };

  const applyPreset = (id: (typeof APPOINTMENT_PRESETS)[number]['id']) => {
    const preset = APPOINTMENT_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setPresetId(id);
    if (preset.title) setTitle(preset.title);
    setAllDay(preset.allDay);
    if ('startTime' in preset && preset.startTime) setStartTime(preset.startTime);
    if ('endTime' in preset && preset.endTime) setEndTime(preset.endTime);
  };

  const handleCreate = async () => {
    setBusyId('create');
    setMsg(null);
    const result = await createOwnAppointment({
      title,
      date: selectedKey,
      allDay,
      startTime,
      endTime,
      syncOutlook: syncOutlook && outlookOn,
    });
    setMsg(result.message);
    setBusyId(null);
    setComposerOpen(false);
    setSyncedTick((n) => n + 1);
  };

  const handleDelete = async (event: ToolCalendarEvent) => {
    setBusyId(event.id);
    setMsg(null);
    const result = await deleteToolCalendarEvent(event);
    setMsg(result.message);
    setBusyId(null);
    setSyncedTick((n) => n + 1);
  };

  const counts = useMemo(() => {
    const map = new Map<ToolCalendarKind | 'all', number>();
    map.set('all', events.length);
    map.set('pending', events.filter((e) => e.kind === 'pending' || e.kind === 'wish').length);
    for (const e of events) {
      if (e.kind === 'wish') continue;
      map.set(e.kind, (map.get(e.kind) ?? 0) + 1);
    }
    return map;
  }, [events]);

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      <header className={`flex flex-col gap-3 ${compact ? '' : 'sm:flex-row sm:items-start sm:justify-between'}`}>
        <div>
          <h1 className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-white flex items-center gap-2`}>
            <Calendar className={compact ? 'w-5 h-5 text-pht-400' : 'w-7 h-7 text-pht-400'} />
            Kalender
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Eigene Termine (Homeoffice) sperren die Tourenplanung. Fristen und Buchungen lassen sich löschen.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-pht-accent text-white font-semibold hover:bg-pht-accent-hover"
          >
            <Plus className="w-3.5 h-3.5" />
            Neuer Termin
          </button>
          <button
            type="button"
            onClick={() => void reload()}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-dark-500 text-slate-300 hover:bg-dark-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
          {configured && !outlookOn && (
            <button
              type="button"
              onClick={() => void signIn()}
              className="text-xs px-3 py-2 rounded-lg bg-pht-accent text-white font-semibold hover:bg-pht-accent-hover"
            >
              Microsoft verbinden
            </button>
          )}
          {outlookOn && (
            <span className="text-[11px] text-emerald-400 px-2 py-1 rounded border border-emerald-500/30">
              Outlook verbunden
            </span>
          )}
        </div>
      </header>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`shrink-0 text-[11px] px-2.5 py-1.5 rounded-lg border ${
              filter === f.id
                ? 'border-pht-500 bg-pht-600/20 text-white'
                : 'border-dark-500 text-slate-400 hover:text-slate-200'
            }`}
          >
            {f.label}
            {counts.get(f.id) ? <span className="ml-1 tabular-nums opacity-70">{counts.get(f.id)}</span> : null}
          </button>
        ))}
      </div>

      <div className={`grid gap-6 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
        <Card className={compact ? '' : 'lg:col-span-2'}>
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
                const dayEvents = byDate.get(key) ?? [];
                const isSelected = isSameDay(day, selectedDay);
                const isToday = isSameDay(day, new Date());
                const kinds = [...new Set(dayEvents.map((e) => e.kind))];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    onDoubleClick={() => { setSelectedDay(day); setComposerOpen(true); }}
                    className={`${compact ? 'min-h-[44px]' : 'min-h-[64px]'} p-1 rounded-lg border text-left transition-colors ${
                      isSelected ? 'border-pht-500 bg-pht-600/20' : 'border-dark-500/40 hover:border-dark-400'
                    } ${!isSameMonth(day, month) ? 'opacity-35' : ''}`}
                  >
                    <span className={`text-xs font-medium ${isToday ? 'text-pht-400' : 'text-slate-300'}`}>
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-0.5">
                        {kinds.slice(0, 4).map((kind) => (
                          <span key={kind} className={`w-1.5 h-1.5 rounded-full ${KIND_DOT[kind]}`} />
                        ))}
                        {dayEvents.length > 4 && (
                          <span className="text-[9px] text-slate-500 leading-none">+{dayEvents.length - 4}</span>
                        )}
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
              {format(selectedDay, 'dd. MMMM yyyy', { locale: de })}
            </h2>
            {unsyncedReady.length > 0 && (
              <button
                type="button"
                disabled={busyId === 'day'}
                onClick={() => void handlePushDay()}
                className="text-[10px] px-2 py-1 rounded-lg bg-pht-accent text-white font-semibold hover:bg-pht-accent-hover disabled:opacity-50 shrink-0"
              >
                {busyId === 'day' ? '…' : 'Tag in Outlook'}
              </button>
            )}
          </CardHeader>
          <CardContent className={`space-y-2 ${compact ? 'max-h-[50vh]' : 'max-h-[480px]'} overflow-y-auto`}>
            {composerOpen && (
              <div className="p-3 rounded-lg border border-pht-500/30 bg-pht-600/10 space-y-2">
                <p className="text-[11px] font-semibold text-pht-200 uppercase tracking-wide">Neuer Termin · {format(selectedDay, 'dd.MM.yyyy')}</p>
                <div className="flex flex-wrap gap-1">
                  {APPOINTMENT_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p.id)}
                      className={`text-[10px] px-2 py-1 rounded-lg border ${
                        presetId === p.id ? 'border-pht-400 bg-pht-600/30 text-white' : 'border-dark-500 text-slate-400'
                      }`}
                    >
                      {p.id === 'custom' ? 'Eigener Titel' : p.title}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z. B. Homeoffice"
                  className="w-full px-2.5 py-2 rounded-lg bg-dark-900 border border-pht-500/20 text-sm text-white"
                />
                <label className="flex items-center gap-2 text-[11px] text-slate-300">
                  <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
                  Ganzer Tag (keine Tour an diesem Tag)
                </label>
                {!allDay && (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[10px] text-slate-400">
                      Von
                      <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 w-full px-2 py-1.5 rounded bg-dark-900 border border-dark-500 text-white text-sm" />
                    </label>
                    <label className="text-[10px] text-slate-400">
                      Bis
                      <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1 w-full px-2 py-1.5 rounded bg-dark-900 border border-dark-500 text-white text-sm" />
                    </label>
                  </div>
                )}
                {outlookOn && (
                  <label className="flex items-center gap-2 text-[11px] text-slate-300">
                    <input type="checkbox" checked={syncOutlook} onChange={(e) => setSyncOutlook(e.target.checked)} />
                    Gleichzeitig in Outlook eintragen
                  </label>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === 'create' || !title.trim()}
                    onClick={() => void handleCreate()}
                    className="flex-1 text-[11px] py-2 rounded-lg bg-pht-accent text-white font-semibold disabled:opacity-50"
                  >
                    {busyId === 'create' ? '…' : 'Speichern'}
                  </button>
                  <button type="button" onClick={() => setComposerOpen(false)} className="text-[11px] px-3 py-2 rounded-lg border border-dark-500 text-slate-400">
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
            {selectedEvents.length === 0 && !composerOpen ? (
              <p className="text-sm text-slate-500 py-6 text-center">
                {loading ? 'Termine werden geladen …' : 'Keine Einträge. „Neuer Termin“ für Homeoffice oder Blocker.'}
              </p>
            ) : (
              selectedEvents.map((event) => {
                const done = isOutlookSynced(event.id, synced);
                return (
                  <div key={event.id} className="p-3 rounded-lg border border-dark-500/50 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{event.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {event.kind === 'block' && event.subtitle?.includes('Ganzer Tag') ? 'ganztags' : timeLabel(event)}
                          {event.location ? ` · ${event.location}` : ''}
                        </p>
                        {event.subtitle && <p className="text-[11px] text-slate-400 mt-1">{event.subtitle}</p>}
                      </div>
                      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${KIND_CHIP[event.kind]}`}>
                        {KIND_LABEL[event.kind]}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {event.outlookReady && (
                        <button
                          type="button"
                          disabled={busyId === event.id || done}
                          onClick={() => void handlePushOne(event)}
                          className="flex-1 text-[11px] py-1.5 rounded-lg border border-pht-500/40 text-pht-200 hover:bg-pht-600/20 disabled:opacity-50"
                        >
                          {done ? (
                            <span className="inline-flex items-center gap-1 justify-center">
                              <Check className="w-3 h-3" /> In Outlook
                            </span>
                          ) : busyId === event.id ? '…' : 'In Outlook übernehmen'}
                        </button>
                      )}
                      {event.href && (
                        <Link
                          to={event.href}
                          className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-dark-500 text-[11px] text-slate-400 hover:text-white"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Öffnen
                        </Link>
                      )}
                      <button
                        type="button"
                        disabled={busyId === event.id}
                        onClick={() => void handleDelete(event)}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/30 text-[11px] text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                        title="Löschen"
                      >
                        <Trash2 className="w-3 h-3" />
                        Löschen
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
      {msg && <p className="text-xs text-slate-400">{msg}</p>}
    </div>
  );
}
