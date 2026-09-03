import {
  Calendar, CalendarDays, CheckCircle2, GripVertical, MapPin, Navigation,
  Route, Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlanInOutlookButton } from '../customerPriorities/PlanInOutlookButton';
import { RouteTimelineView } from '../customerPriorities/RouteTimelineView';
import { Badge } from '../ui/Badge';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { formatRouteDuration } from '../../lib/geo/routePlanning';
import {
  adaptRouteToCalendar,
  buildCalendarPlanFromPlannedRoute,
  calendarAnchoredToRoutePlan,
  type CalendarAnchoredRoutePlan,
} from '../../lib/geo/calendarRoutePlanning';
import { resolveCalendarBusyForDay } from '../../services/calendarBusyTimes';
import {
  computeStopSchedules, estimateRouteKm, getRouteForDate, getWeekDates,
  loadPlannedRoutes, moveRouteToDate, PLANNED_ROUTES_CHANGED_EVENT,
  removePlannedRoute, weekdayLabel, type PlannedRoute,
} from '../../services/plannedRoutesStorage';
import {
  getVisitState, getVisitUrgency, recordVisit, VISIT_CADENCE_MONTHS,
} from '../../services/customerVisitStorage';
import { planCalendarAnchoredRouteInOutlook, planRouteInOutlook } from '../../services/visitOutlookIntegrations';

const PRIORITY_VARIANT = { A: 'success' as const, B: 'warning' as const, C: 'muted' as const };

type SubView = 'tag' | 'woche';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function RouteKpiStrip({ route }: { route: PlannedRoute | null }) {
  const overdue = useMemo(() => {
    if (!route) return 0;
    return route.stops.filter((s) => {
      const v = getVisitState(s.customerId);
      return getVisitUrgency(v.nextDue, new Date(), v.lastVisit) === 'overdue';
    }).length;
  }, [route]);

  const km = route ? estimateRouteKm(route) : 0;
  const stops = route?.stops.length ?? 0;

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <div className="rounded-xl border border-pht-500/30 bg-pht-600/5 px-3 py-2.5">
        <p className="text-[10px] sm:text-xs text-slate-500">Stopps heute</p>
        <p className="text-lg sm:text-xl font-bold text-pht-300 tabular-nums">{stops}</p>
      </div>
      <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 px-3 py-2.5">
        <p className="text-[10px] sm:text-xs text-slate-500">km geschätzt</p>
        <p className="text-lg sm:text-xl font-bold text-sky-300 tabular-nums">{km}</p>
      </div>
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2.5">
        <p className="text-[10px] sm:text-xs text-slate-500">Überfällig auf Route</p>
        <p className="text-lg sm:text-xl font-bold text-red-400 tabular-nums">{overdue}</p>
      </div>
    </div>
  );
}

function DayRouteView({
  route,
  onRefresh,
}: {
  route: PlannedRoute | null;
  onRefresh: () => void;
}) {
  const [calendarPlan, setCalendarPlan] = useState<CalendarAnchoredRoutePlan | null>(null);
  const [calendarBusy, setCalendarBusy] = useState(false);
  const today = todayIso();

  const schedules = useMemo(
    () => (route ? computeStopSchedules(route) : []),
    [route],
  );

  useEffect(() => {
    if (!route) {
      setCalendarPlan(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setCalendarBusy(true);
      try {
        const cal = await resolveCalendarBusyForDay(route.date);
        if (cancelled) return;
        const hasScheduled = route.stops.some((s) => s.scheduledStartIso);
        setCalendarPlan(
          hasScheduled
            ? buildCalendarPlanFromPlannedRoute(route, cal.busyTimes, cal.connected)
            : adaptRouteToCalendar(
              route.date,
              calendarAnchoredToRoutePlan(buildCalendarPlanFromPlannedRoute(route, [], false)),
              cal.busyTimes,
              cal.connected,
            ),
        );
      } finally {
        if (!cancelled) setCalendarBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [route]);

  const handleAdaptToCalendar = async () => {
    if (!route) return;
    setCalendarBusy(true);
    try {
      const cal = await resolveCalendarBusyForDay(route.date);
      const base = buildCalendarPlanFromPlannedRoute(route, [], false);
      setCalendarPlan(
        adaptRouteToCalendar(
          route.date,
          calendarAnchoredToRoutePlan(base),
          cal.busyTimes,
          cal.connected,
        ),
      );
    } finally {
      setCalendarBusy(false);
    }
  };

  if (!route || route.stops.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Route className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Keine Route für heute geplant.</p>
          <p className="text-xs text-slate-600 mt-2">
            Erstelle eine Routenvorschlag auf der{' '}
            <Link to="/priorities?territory=ost&view=map" className="text-pht-400 hover:text-pht-300">
              Kartenansicht
            </Link>
            {' '}und klicke „In Mein Tag übernehmen“.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalDrive = route.stops.reduce((s, st) => s + st.driveMinutesFromPrev, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Navigation className="w-4 h-4 text-pht-400" />
            Heutige Route · {route.stops.length} Stopps
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ab {route.homeBase.name} ({route.homeBase.zip}) · Fahrt {formatRouteDuration(totalDrive)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void handleAdaptToCalendar()}
            disabled={calendarBusy}
            className="px-2 py-1 rounded-lg border border-amber-500/40 text-[10px] text-amber-200 hover:bg-amber-500/10 disabled:opacity-50"
          >
            {calendarBusy ? '…' : 'An Kalender anpassen'}
          </button>
          <PlanInOutlookButton
            compact
            onPlan={() => (calendarPlan
              ? planCalendarAnchoredRouteInOutlook(calendarPlan)
              : planRouteInOutlook(route))}
            label="Route in Outlook"
          />
          <button
            type="button"
            onClick={() => { removePlannedRoute(route.id); onRefresh(); }}
            className="text-slate-500 hover:text-red-400 p-1"
            title="Route entfernen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {calendarPlan && <RouteTimelineView plan={calendarPlan} />}

        <div className="flex items-center gap-2 text-xs text-sky-400 px-3 py-2 rounded-lg bg-sky-500/5 border border-sky-500/20">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          Start {route.homeBase.name}, {route.homeBase.zip} {route.homeBase.city} · ab 08:00
        </div>

        {route.stops.map((stop, i) => {
          const sched = schedules[i];
          const visit = getVisitState(stop.customerId);
          const urgency = getVisitUrgency(visit.nextDue, new Date(), visit.lastVisit);
          const done = visit.lastVisit === today;

          return (
            <div
              key={stop.customerId}
              className={`p-3 rounded-xl border transition-colors ${
                done ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-dark-500/50 bg-dark-800/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-pht-600/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-pht-400">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-white">{stop.customerName}</p>
                    <Badge variant={PRIORITY_VARIANT[stop.priority]}>Prio {stop.priority}</Badge>
                    {urgency === 'overdue' && <Badge variant="danger">überfällig</Badge>}
                    {done && <Badge variant="success">besucht</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {stop.zip} {stop.city}
                  </p>
                  {visit.notes && (
                    <p className="text-[10px] text-slate-500 italic mt-1">„{visit.notes}"</p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs">
                    <span className="text-pht-300 font-medium">{sched.slotLabel}</span>
                    {stop.driveMinutesFromPrev > 0 && (
                      <span className="text-slate-600">~{stop.driveMinutesFromPrev} min Fahrt</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Link
                    to={`/priorities?territory=ost&view=map&customer=${stop.customerId}`}
                    className="px-2 py-1 rounded-lg border border-dark-500 text-[10px] text-pht-300 hover:bg-dark-700 text-center"
                  >
                    Karte
                  </Link>
                  {!done && (
                    <button
                      type="button"
                      onClick={() => {
                        recordVisit(stop.customerId, VISIT_CADENCE_MONTHS[stop.priority]);
                        onRefresh();
                      }}
                      className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-[10px] text-emerald-300 hover:bg-emerald-600/30"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Erledigt
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function WeekDaySlot({
  date,
  route,
  isToday,
  onDrop,
  onRemove,
  dragRouteId,
  onDragStart,
}: {
  date: string;
  route: PlannedRoute | null;
  isToday: boolean;
  onDrop: (routeId: string, date: string) => void;
  onRemove: (id: string) => void;
  dragRouteId: string | null;
  onDragStart: (id: string) => void;
}) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/route-id') || dragRouteId;
    if (id) onDrop(id, date);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`rounded-xl border p-3 min-h-[7rem] transition-colors ${
        isToday ? 'border-pht-500/40 bg-pht-600/5' : 'border-dark-500/50 bg-dark-800/30'
      } ${dragRouteId ? 'ring-1 ring-pht-500/20' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className={`text-xs font-medium ${isToday ? 'text-pht-300' : 'text-slate-400'}`}>
          {weekdayLabel(date)}
          {isToday && <span className="ml-1 text-[10px] text-pht-400">(heute)</span>}
        </p>
        {!route && (
          <span className="text-[10px] text-slate-600">Route zuweisen</span>
        )}
      </div>

      {route ? (
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/route-id', route.id);
            onDragStart(route.id);
          }}
          onDragEnd={() => onDragStart('')}
          className="p-2 rounded-lg border border-dark-500/50 bg-dark-700/50 cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-start gap-2">
            <GripVertical className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white">
                {route.stops.length} Stopps · ~{estimateRouteKm(route)} km
              </p>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                {route.stops.map((s) => s.customerName).join(' → ')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(route.id)}
              className="text-slate-600 hover:text-red-400 shrink-0"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-14 rounded-lg border border-dashed border-dark-500/40 text-[10px] text-slate-600">
          Keine Route
        </div>
      )}
    </div>
  );
}

function WeekRouteView({ tick, onRefresh }: { tick: number; onRefresh: () => void }) {
  const weekDates = useMemo(() => getWeekDates(), []);
  const today = todayIso();
  const [dragRouteId, setDragRouteId] = useState('');

  const routesByDate = useMemo(() => {
    const store = loadPlannedRoutes();
    const map = new Map<string, PlannedRoute>();
    for (const d of weekDates) {
      const r = store.routes.find((rt) => rt.date === d);
      if (r) map.set(d, r);
    }
    return map;
  }, [weekDates, tick]);

  const handleDrop = (routeId: string, date: string) => {
    moveRouteToDate(routeId, date);
    setDragRouteId('');
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Wochenplan Mo–Fr · Route per Drag &amp; Drop auf einen Tag ziehen oder auf der Karte „Für Woche planen“ wählen.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {weekDates.map((date) => (
          <WeekDaySlot
            key={date}
            date={date}
            route={routesByDate.get(date) ?? null}
            isToday={date === today}
            onDrop={handleDrop}
            onRemove={(id) => { removePlannedRoute(id); onRefresh(); }}
            dragRouteId={dragRouteId || null}
            onDragStart={setDragRouteId}
          />
        ))}
      </div>
      <Link
        to="/priorities?territory=ost&view=map"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pht-600 text-white text-sm hover:bg-pht-700"
      >
        <MapPin className="w-4 h-4" />
        Neue Route auf Karte planen
      </Link>
    </div>
  );
}

export function MeinTagWocheTab() {
  const [subView, setSubView] = useState<SubView>('tag');
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const onChange = () => refresh();
    window.addEventListener(PLANNED_ROUTES_CHANGED_EVENT, onChange);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'pht-planned-routes') refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(PLANNED_ROUTES_CHANGED_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [refresh]);

  void tick;
  const todayRoute = useMemo(() => getRouteForDate(todayIso()), [tick]);

  return (
    <div className="space-y-6">
      <RouteKpiStrip route={subView === 'tag' ? todayRoute : todayRoute} />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSubView('tag')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium ${
            subView === 'tag' ? 'bg-pht-600 text-white' : 'bg-dark-700 text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Mein Tag
        </button>
        <button
          type="button"
          onClick={() => setSubView('woche')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium ${
            subView === 'woche' ? 'bg-pht-600 text-white' : 'bg-dark-700 text-slate-400 hover:text-white'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Meine Woche
        </button>
      </div>

      {subView === 'tag' ? (
        <DayRouteView route={todayRoute} onRefresh={refresh} />
      ) : (
        <WeekRouteView tick={tick} onRefresh={refresh} />
      )}
    </div>
  );
}
