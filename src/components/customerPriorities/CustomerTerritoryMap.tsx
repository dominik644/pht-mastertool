import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Route, Settings2, X, CalendarCheck, CalendarDays } from 'lucide-react';
import type { CustomerPriority, VisitPriority } from '../../types/customerPriority';
import type { CustomerVisitStore } from '../../types/customerPriority';
import {
  getVisitState, getCustomerVisitUrgency, getDaysUntilDue, VISIT_CADENCE_LABEL,
} from '../../services/customerVisitStorage';
import { isPriorityOverridden } from '../../services/customerPriorityOverrides';
import { PrioritySelector } from './PrioritySelector';
import { getCustomerPoint, type CustomerGeocodesFile } from '../../services/customerGeocodes';
import {
  suggestDayRoute, formatRouteDuration, estimateDriveMinutes, type RoutePlan,
} from '../../lib/geo/routePlanning';
import {
  loadHomeBase, saveHomeBase, DEFAULT_HOME_BASE, type HomeBase,
} from '../../lib/territoryConfig';
import {
  adoptRouteForDate, adoptRouteForToday, getWeekDates, routePlanToPlannedRoute, weekdayLabel,
} from '../../services/plannedRoutesStorage';
import { PlanInOutlookButton } from './PlanInOutlookButton';
import { CustomerScheduleProposalButton } from './CustomerScheduleProposalButton';
import { CustomerOutreachActions } from './CustomerOutreachActions';
import { Badge } from '../ui/Badge';
import { planCustomerVisitInOutlook, planRouteInOutlook } from '../../services/visitOutlookIntegrations';

const PRIORITY_COLORS = { A: '#34d399', B: '#fbbf24', C: '#94a3b8' };

function markerColor(customer: CustomerPriority, store: CustomerVisitStore): string {
  const urgency = getCustomerVisitUrgency(customer, store);
  if (urgency === 'overdue') return '#ef4444';
  return PRIORITY_COLORS[customer.priority];
}

function createIcon(color: string, selected: boolean) {
  const size = selected ? 16 : 12;
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const homeIcon = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:4px;background:#38bdf8;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function FitBounds({ points }: { points: Array<{ lat: number; lng: number }> }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) {
      if (points.length === 1) map.setView([points[0].lat, points[0].lng], 10);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
  }, [map, points]);
  return null;
}

interface MappedCustomer {
  customer: CustomerPriority;
  point: { lat: number; lng: number };
}

interface CustomerTerritoryMapProps {
  customers: CustomerPriority[];
  geocodes: CustomerGeocodesFile | null;
  store: CustomerVisitStore;
  onSelectCustomer?: (id: string) => void;
  onPriorityChange?: (customerId: string, priority: VisitPriority) => void;
  onVisitRecorded?: () => void;
}

function WeekPlanPicker({
  onPick,
  onClose,
}: {
  onPick: (date: string) => void;
  onClose: () => void;
}) {
  const dates = useMemo(() => getWeekDates(), []);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl border border-dark-500 bg-dark-900 p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-white flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-pht-400" />
            Tag in dieser Woche wählen
          </p>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {dates.map((date) => (
            <button
              key={date}
              type="button"
              onClick={() => onPick(date)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                date === today
                  ? 'border-pht-500/50 bg-pht-600/10 text-pht-300'
                  : 'border-dark-500 text-slate-300 hover:border-pht-500/30 hover:bg-dark-700'
              }`}
            >
              {weekdayLabel(date)}
              {date === today && <span className="text-xs text-pht-400 ml-2">(heute)</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoutePanel({
  plan,
  onClose,
  homeBase,
  territory = 'ost',
}: {
  plan: RoutePlan;
  onClose: () => void;
  homeBase: HomeBase;
  territory?: string;
}) {
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const handleAdoptToday = () => {
    adoptRouteForToday(plan, homeBase, territory);
    setSavedHint('Route für heute übernommen.');
    setTimeout(() => setSavedHint(null), 3000);
  };

  const handleAdoptWeekDay = (date: string) => {
    adoptRouteForDate(plan, date, homeBase, territory);
    setWeekPickerOpen(false);
    setSavedHint(`Route für ${weekdayLabel(date)} gespeichert.`);
    setTimeout(() => setSavedHint(null), 3000);
  };

  return (
    <>
      <div className="absolute top-3 right-3 z-[1000] w-[min(100%,20rem)] rounded-xl border border-dark-500 bg-dark-900/95 backdrop-blur p-3 shadow-xl">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="text-xs font-semibold text-white flex items-center gap-1">
              <Route className="w-3.5 h-3.5 text-pht-400" />
              Tagesroute ({plan.stops.length} Stopps)
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              ab {plan.origin.label} · {formatRouteDuration(plan.totalMinutes)} gesamt
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-white" aria-label="Schließen">
            <X className="w-4 h-4" />
          </button>
        </div>
        <ol className="space-y-2 text-xs max-h-52 overflow-y-auto">
          <li className="text-sky-400">🏠 {homeBase.name} ({homeBase.zip})</li>
          {plan.stops.map((s, i) => (
            <li key={s.customer.id} className="text-slate-300">
              <span className="text-pht-400 font-mono">{i + 1}.</span>{' '}
              {s.customer.name}
              <span className="text-slate-600 block pl-4">
                {s.customer.zip} {s.customer.city} · ~{s.driveMinutesFromPrev} min Fahrt
              </span>
            </li>
          ))}
        </ol>
        <p className="text-[10px] text-slate-600 mt-2">
          Fahrt: {formatRouteDuration(plan.totalDriveMinutes)} · Termine: {formatRouteDuration(plan.totalAppointmentMinutes)}
        </p>

        {plan.stops.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-dark-500/50 pt-3">
            <PlanInOutlookButton
              compact
              className="w-full"
              onPlan={() => planRouteInOutlook(
                routePlanToPlannedRoute(plan, today, homeBase, territory),
              )}
              label="In Outlook planen"
            />
            <button
              type="button"
              onClick={handleAdoptToday}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-pht-600 text-white text-xs font-medium hover:bg-pht-700"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              In Mein Tag übernehmen
            </button>
            <button
              type="button"
              onClick={() => setWeekPickerOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-pht-500/40 text-pht-300 text-xs hover:bg-pht-600/10"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Für Woche planen
            </button>
            <Link
              to="/command-center?tab=tag"
              className="block text-center text-[10px] text-slate-500 hover:text-pht-400"
            >
              Command Center → Mein Tag / Woche
            </Link>
          </div>
        )}

        {savedHint && (
          <p className="text-[10px] text-emerald-400 mt-2 text-center">{savedHint}</p>
        )}
      </div>

      {weekPickerOpen && (
        <WeekPlanPicker
          onPick={handleAdoptWeekDay}
          onClose={() => setWeekPickerOpen(false)}
        />
      )}
    </>
  );
}

function HomeBaseSettings({
  base,
  onSave,
  onClose,
}: {
  base: HomeBase;
  onSave: (b: HomeBase) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(base);
  return (
    <div className="absolute bottom-3 left-3 z-[1000] w-[min(100%,18rem)] rounded-xl border border-dark-500 bg-dark-900/95 backdrop-blur p-3 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-white flex items-center gap-1">
          <Settings2 className="w-3.5 h-3.5" /> Heimatbasis
        </p>
        <button type="button" onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
      </div>
      <div className="space-y-2">
        <input
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="Name"
          className="w-full px-2 py-1.5 rounded-lg bg-dark-700 border border-dark-500 text-xs text-white"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={draft.lat}
            onChange={(e) => setDraft((d) => ({ ...d, lat: parseFloat(e.target.value) || 0 }))}
            placeholder="Lat"
            className="px-2 py-1.5 rounded-lg bg-dark-700 border border-dark-500 text-xs text-white"
          />
          <input
            value={draft.lng}
            onChange={(e) => setDraft((d) => ({ ...d, lng: parseFloat(e.target.value) || 0 }))}
            placeholder="Lng"
            className="px-2 py-1.5 rounded-lg bg-dark-700 border border-dark-500 text-xs text-white"
          />
        </div>
        <button
          type="button"
          onClick={() => { onSave(draft); onClose(); }}
          className="w-full py-1.5 rounded-lg bg-pht-600 text-white text-xs hover:bg-pht-700"
        >
          Speichern
        </button>
        <button
          type="button"
          onClick={() => { onSave({ ...DEFAULT_HOME_BASE }); onClose(); }}
          className="w-full py-1 text-[10px] text-slate-500 hover:text-white"
        >
          Auf Pitten zurücksetzen
        </button>
      </div>
    </div>
  );
}

function CustomerTerritoryMapInner({
  customers, geocodes, store, onSelectCustomer, onPriorityChange, onVisitRecorded,
}: CustomerTerritoryMapProps) {
  const [homeBase, setHomeBase] = useState<HomeBase>(() => loadHomeBase());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null);
  const [showBaseSettings, setShowBaseSettings] = useState(false);
  const [dayPlanMode, setDayPlanMode] = useState(false);

  const mapped = useMemo((): MappedCustomer[] => {
    const out: MappedCustomer[] = [];
    for (const c of customers) {
      const pt = getCustomerPoint(geocodes, c.id, c.zip, c.city, c.country);
      if (pt) out.push({ customer: c, point: pt });
    }
    return out;
  }, [customers, geocodes]);

  const selected = mapped.find((m) => m.customer.id === selectedId);

  const buildCandidates = useCallback(() =>
    mapped.map((m) => ({ customer: m.customer, point: m.point })),
  [mapped]);

  const handleRouteFromHome = () => {
    const plan = suggestDayRoute(
      { label: homeBase.name, point: { lat: homeBase.lat, lng: homeBase.lng } },
      buildCandidates(),
      store,
    );
    setRoutePlan(plan);
    setDayPlanMode(true);
  };

  const handleRouteFromCustomer = (mc: MappedCustomer) => {
    const plan = suggestDayRoute(
      { label: mc.customer.name, point: mc.point },
      buildCandidates(),
      store,
      new Set([mc.customer.id]),
    );
    setRoutePlan(plan);
    setDayPlanMode(true);
    setSelectedId(mc.customer.id);
  };

  const routeLine = useMemo(() => {
    if (!routePlan) return [];
    const pts = [{ lat: routePlan.origin.point.lat, lng: routePlan.origin.point.lng }];
    for (const s of routePlan.stops) pts.push(s.point);
    return pts;
  }, [routePlan]);

  const fitPoints = useMemo(() => {
    const pts = mapped.map((m) => m.point);
    pts.push({ lat: homeBase.lat, lng: homeBase.lng });
    return pts;
  }, [mapped, homeBase]);

  const unmapped = customers.length - mapped.length;

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          onClick={handleRouteFromHome}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pht-600 text-white text-xs font-medium hover:bg-pht-700"
        >
          <Navigation className="w-3.5 h-3.5" />
          Routenvorschlag ab {homeBase.name}
        </button>
        <button
          type="button"
          onClick={() => setDayPlanMode((v) => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs border ${
            dayPlanMode ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'border-dark-500 text-slate-400 hover:text-white'
          }`}
        >
          Tagesplan-Modus
        </button>
        <button
          type="button"
          onClick={() => setShowBaseSettings((v) => !v)}
          className="px-3 py-1.5 rounded-lg border border-dark-500 text-slate-400 text-xs hover:text-white"
        >
          <Settings2 className="w-3.5 h-3.5 inline mr-1" />
          Basis
        </button>
        <span className="text-[10px] text-slate-600 self-center ml-auto">
          {mapped.length} auf Karte{unmapped > 0 ? ` · ${unmapped} ohne Geo` : ''}
        </span>
      </div>

      <div className="rounded-xl overflow-hidden border border-dark-500 h-[min(70vh,520px)]">
        <MapContainer
          center={[47.5, 14.5]}
          zoom={7}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={fitPoints} />

          <Marker position={[homeBase.lat, homeBase.lng]} icon={homeIcon}>
            <Popup>
              <strong>{homeBase.name}</strong><br />
              {homeBase.zip} {homeBase.city}<br />
              <span className="text-xs text-gray-500">Heimatbasis</span>
            </Popup>
          </Marker>

          {mapped.map((m) => {
            const visit = getVisitState(m.customer.id);
            const urgency = getCustomerVisitUrgency(m.customer, store);
            const color = markerColor(m.customer, store);
            const isSelected = selectedId === m.customer.id;
            const onRoute = routePlan?.stops.some((s) => s.customer.id === m.customer.id);
            return (
              <Marker
                key={m.customer.id}
                position={[m.point.lat, m.point.lng]}
                icon={createIcon(onRoute ? '#38bdf8' : color, isSelected)}
                eventHandlers={{
                  click: () => {
                    setSelectedId(m.customer.id);
                    onSelectCustomer?.(m.customer.id);
                  },
                }}
              >
                <Popup>
                  <div className="text-sm min-w-[12rem]">
                    <p className="font-semibold">{m.customer.name}</p>
                    <p className="text-xs text-gray-600">{m.customer.zip} {m.customer.city}</p>
                    <p className="text-xs">Pot {m.customer.potentialScore}</p>
                    {onPriorityChange && (
                      <div className="my-1.5" onClick={(e) => e.stopPropagation()}>
                        <PrioritySelector
                          priority={m.customer.priority}
                          isOverridden={isPriorityOverridden(m.customer.id)}
                          onChange={(p) => onPriorityChange(m.customer.id, p)}
                          compact
                        />
                      </div>
                    )}
                    {!onPriorityChange && (
                      <p className="text-xs">Prio {m.customer.priority}</p>
                    )}
                    {visit.nextDue && (
                      <p className="text-xs">
                        Fällig: {visit.nextDue}
                        {urgency === 'overdue' && ' ⚠ überfällig'}
                      </p>
                    )}
                    {visit.notes && <p className="text-xs italic mt-1">„{visit.notes}"</p>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="text-xs text-blue-600 hover:underline"
                        onClick={() => handleRouteFromCustomer(m)}
                      >
                        Nächste Kunden von hier
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {routeLine.length > 1 && (
            <Polyline
              positions={routeLine.map((p) => [p.lat, p.lng])}
              pathOptions={{ color: '#38bdf8', weight: 3, dashArray: '8 6', opacity: 0.85 }}
            />
          )}

          {routePlan?.stops.map((s, i) => (
            <CircleMarker
              key={`route-${s.customer.id}`}
              center={[s.point.lat, s.point.lng]}
              radius={14}
              pathOptions={{ color: '#38bdf8', fillColor: '#0ea5e9', fillOpacity: 0.15, weight: 2 }}
            >
              <Popup>Stopp {i + 1}: {s.customer.name}</Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {routePlan && dayPlanMode && (
        <RoutePanel
          plan={routePlan}
          homeBase={homeBase}
          territory="ost"
          onClose={() => { setRoutePlan(null); setDayPlanMode(false); }}
        />
      )}

      {showBaseSettings && (
        <HomeBaseSettings
          base={homeBase}
          onSave={(b) => { setHomeBase(b); saveHomeBase(b); }}
          onClose={() => setShowBaseSettings(false)}
        />
      )}

      {selected && (
        <div className="mt-3 p-3 rounded-xl border border-dark-500 bg-dark-800/80">
          <div className="flex flex-wrap items-start gap-2 justify-between">
            <div>
              <p className="text-sm font-medium text-white">{selected.customer.name}</p>
              <p className="text-xs text-slate-500">
                {selected.customer.zip} {selected.customer.city}
              </p>
              {onPriorityChange && (
                <PrioritySelector
                  priority={selected.customer.priority}
                  isOverridden={isPriorityOverridden(selected.customer.id)}
                  onChange={(p) => onPriorityChange(selected.customer.id, p)}
                />
              )}
              {!onPriorityChange && (
                <p className="text-xs text-slate-500">Prio {selected.customer.priority}</p>
              )}
              {(() => {
                const visit = getVisitState(selected.customer.id);
                const urgency = getCustomerVisitUrgency(selected.customer, store);
                const days = getDaysUntilDue(visit.nextDue);
                return (
                  <p className="text-xs text-slate-400 mt-1">
                    {visit.nextDue ? `Fällig: ${visit.nextDue}` : 'Kein Termin'}
                    {urgency === 'overdue' && <Badge variant="danger">überfällig</Badge>}
                    {urgency === 'due_soon' && <span className="text-amber-400 ml-1">in {days}T</span>}
                    {visit.notes && <span className="block italic mt-1 text-slate-500">„{visit.notes}"</span>}
                  </p>
                );
              })()}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleRouteFromCustomer(selected)}
                className="px-3 py-1.5 rounded-lg bg-dark-700 border border-dark-500 text-xs text-pht-300 hover:bg-dark-600"
              >
                Nächste Kunden von hier
              </button>
              <PlanInOutlookButton
                compact
                onPlan={() => planCustomerVisitInOutlook(selected.customer)}
              />
              <CustomerScheduleProposalButton
                compact
                customer={selected.customer}
                allCustomers={customers}
                geocodes={geocodes}
                urgency={getCustomerVisitUrgency(selected.customer, store)}
                onSent={onVisitRecorded}
              />
              {homeBase && selected && (
                <span className="text-[10px] text-slate-600 self-center">
                  ~{Math.round(estimateDriveMinutes(
                    { lat: homeBase.lat, lng: homeBase.lng },
                    selected.point,
                  ))} min ab {homeBase.name}
                </span>
              )}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-dark-600/40">
            <CustomerOutreachActions
              customer={selected.customer}
              urgency={getCustomerVisitUrgency(selected.customer, store)}
            />
          </div>
          <p className="text-[10px] text-slate-600 mt-1">
            Besuchsrhythmus: {VISIT_CADENCE_LABEL[selected.customer.priority]}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Prio A</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Prio B</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Prio C</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> überfällig</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-sky-400" /> Basis</span>
      </div>
    </div>
  );
}

const CustomerTerritoryMapLazy = lazy(() =>
  Promise.resolve({ default: CustomerTerritoryMapInner }),
);

export function CustomerTerritoryMap(props: CustomerTerritoryMapProps) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500 py-8 text-center">Karte wird geladen…</p>}>
      <CustomerTerritoryMapLazy {...props} />
    </Suspense>
  );
}
