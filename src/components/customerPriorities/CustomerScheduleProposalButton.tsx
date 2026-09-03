import { AlertCircle, AlertTriangle, CalendarClock, ChevronDown, Copy, ExternalLink, Mail, MapPin, Route } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CustomerPriority } from '../../types/customerPriority';
import { useMicrosoftAuth } from '../../context/MicrosoftAuthContext';
import { getCustomerDetails } from '../../services/customerDetailsStorage';
import {
  calendarStatusLabel,
  resolveCalendarBusy,
  resolveCalendarBusyForDay,
  type CalendarBusyResult,
} from '../../services/calendarBusyTimes';
import type { CustomerGeocodesFile } from '../../services/customerGeocodes';
import { getCustomerPoint } from '../../services/customerGeocodes';
import {
  findNearbyCustomers,
  formatDistanceKm,
  pickBestRouteDay,
  type NearbyCustomer,
} from '../../services/nearbyCustomers';
import { suggestCalendarAnchoredRoute } from '../../lib/geo/calendarRoutePlanning';
import {
  loadVisitStore,
  URGENCY_LABEL,
  type VisitUrgency,
} from '../../services/customerVisitStorage';
import {
  sendScheduleProposal,
  type ScheduleCalendarStats,
  type ScheduleSlotOption,
} from '../../services/scheduleProposal';
import { planCalendarAnchoredRouteInOutlook, planTourInOutlook } from '../../services/visitOutlookIntegrations';

interface CustomerScheduleProposalButtonProps {
  customer: CustomerPriority;
  urgency: VisitUrgency;
  allCustomers: CustomerPriority[];
  geocodes: CustomerGeocodesFile | null;
  compact?: boolean;
  onSent?: () => void;
}

export function CustomerScheduleProposalButton({
  customer,
  urgency,
  allCustomers,
  geocodes,
  compact = false,
  onSent,
}: CustomerScheduleProposalButtonProps) {
  const { user, configured: msConfigured } = useMicrosoftAuth();
  const [busy, setBusy] = useState(false);
  const [routeBusy, setRouteBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [slotOptions, setSlotOptions] = useState<ScheduleSlotOption[]>([]);
  const [mailtoUrl, setMailtoUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [calendarResult, setCalendarResult] = useState<CalendarBusyResult | null>(null);
  const [calendarStats, setCalendarStats] = useState<ScheduleCalendarStats | null>(null);
  const [routeDay, setRouteDay] = useState<{ date: string; customers: NearbyCustomer[] } | null>(null);
  const [nearbyOpen, setNearbyOpen] = useState(false);

  const visitStore = useMemo(() => loadVisitStore(), []);

  const email = useMemo(() => {
    if (customer.contactEmail) return customer.contactEmail;
    return getCustomerDetails(customer.id).ansprechperson.email || null;
  }, [customer]);

  const nearbyCustomers = useMemo(
    () => findNearbyCustomers(customer, allCustomers, geocodes, visitStore, { onlyDue: true, limit: 6 }),
    [customer, allCustomers, geocodes, visitStore],
  );

  const eligible = urgency === 'overdue' || urgency === 'due_soon';

  useEffect(() => {
    if (!eligible) return;
    void resolveCalendarBusy().then(setCalendarResult);
  }, [eligible, user?.email]);

  if (!eligible) return null;

  const calendarWarning = calendarResult && !calendarResult.connected && calendarResult.source === 'none';
  const calendarLabel = calendarStats
    ? calendarStatusLabel(
        calendarResult ?? { busyTimes: [], connected: false, source: 'none' },
        calendarStats.freeCount,
        calendarStats.targetCount,
      )
    : null;

  const copyPreview = async (html: string, text: string) => {
    const payload = `Betreff: PHT Terminvorschläge\n\n${text}\n\n--- HTML ---\n${html}`;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setStatus('Kopieren fehlgeschlagen – Text markieren und manuell kopieren');
    }
  };

  const handlePlanRoute = async () => {
    setRouteBusy(true);
    setStatus(null);
    try {
      const fallbackDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const best = pickBestRouteDay(customer, [fallbackDate], allCustomers, geocodes, visitStore)
        ?? (nearbyCustomers.length ? { date: fallbackDate, customers: nearbyCustomers } : null);
      if (!best?.customers.length) {
        setStatus('Keine Kunden in der Nähe für eine Tagesroute gefunden');
        return;
      }
      setRouteDay(best);
      const cal = await resolveCalendarBusyForDay(best.date);
      const originPoint = getCustomerPoint(geocodes, customer.id, customer.zip, customer.city, customer.country);
      const origin = originPoint
        ? { label: customer.name, point: originPoint }
        : { label: customer.name, point: { lat: 0, lng: 0 } };
      const candidates = [customer, ...best.customers.map((n) => n.customer)]
        .map((c) => {
          const pt = getCustomerPoint(geocodes, c.id, c.zip, c.city, c.country);
          return pt ? { customer: c, point: pt } : null;
        })
        .filter(Boolean) as Array<{ customer: CustomerPriority; point: { lat: number; lng: number } }>;

      const calendarPlan = suggestCalendarAnchoredRoute(
        best.date,
        origin,
        candidates,
        visitStore,
        cal.busyTimes,
        { calendarConnected: cal.connected, maxStops: 6 },
      );

      const result = calendarPlan.stops.length > 0
        ? await planCalendarAnchoredRouteInOutlook(calendarPlan)
        : await planTourInOutlook(
          [customer, ...best.customers.map((n) => n.customer)].slice(0, 6),
          undefined,
          best.date,
        );
      setStatus(result.message);
    } finally {
      setRouteBusy(false);
    }
  };

  const handleSend = async () => {
    setBusy(true);
    setStatus(null);
    setIsError(false);
    setPreviewHtml(null);
    setPreviewText(null);
    setSlotOptions([]);
    setMailtoUrl(null);
    setCalendarStats(null);
    try {
      const cal = await resolveCalendarBusy();
      setCalendarResult(cal);

      const result = await sendScheduleProposal({
        customerId: customer.id,
        customerEmail: email ?? undefined,
        territory: customer.salesRep ?? undefined,
        busyTimes: cal.busyTimes,
        calendarConnected: cal.connected,
      });
      if (result.calendar) setCalendarStats(result.calendar);
      if (result.ok) {
        if (result.slotOptions?.length) setSlotOptions(result.slotOptions);
        if (result.preview && result.emailPreview) {
          setPreviewHtml(result.emailPreview.html);
          setPreviewText(result.emailPreview.text);
          setMailtoUrl(result.emailPreview.mailtoUrl ?? null);
          setStatus(result.message ?? 'E-Mail-Vorschau bereit – 5 Terminlinks zum Kopieren');
        } else {
          setStatus(result.message ?? 'Terminvorschläge gesendet');
          onSent?.();
        }
      } else {
        setIsError(true);
        const detail = result.error ?? 'Senden fehlgeschlagen';
        setStatus(
          result.configured === false
            ? `${detail} (API nicht konfiguriert – SCHEDULE_TOKEN_SECRET prüfen)`
            : detail,
        );
      }
      if (!result.preview && !result.ok) {
        window.setTimeout(() => { setStatus(null); setIsError(false); }, 12000);
      } else if (!result.preview) {
        window.setTimeout(() => setStatus(null), 8000);
      }
    } catch (err) {
      setIsError(true);
      setStatus(err instanceof Error ? err.message : 'Netzwerkfehler beim Erstellen der Terminvorschläge');
    } finally {
      setBusy(false);
    }
  };

  const iconSize = compact ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const btnClass = compact
    ? 'px-2 py-1 text-[10px] min-h-[32px]'
    : 'px-3 py-1.5 text-xs min-h-[36px]';

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => void handleSend()}
        disabled={busy || !email}
        title={
          email
            ? `5 buchbare Terminlinks per E-Mail an ${email} (${URGENCY_LABEL[urgency]})`
            : 'Keine Kunden-E-Mail hinterlegt'
        }
        className={`flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:bg-emerald-900/40 disabled:text-emerald-200/70 shadow-sm ${btnClass}`}
      >
        <CalendarClock className={iconSize} />
        {busy ? 'Erstelle…' : 'Terminvorschlag senden'}
      </button>

      {calendarWarning && (
        <p className="mt-1 flex items-start gap-1 text-[10px] text-amber-400 leading-snug max-w-xs">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
          Kalender nicht verbunden – alle Slots werden vorgeschlagen.{' '}
          {msConfigured ? 'Bitte bei Microsoft anmelden.' : 'MS Graph oder VITE_AZURE_CLIENT_ID konfigurieren.'}
        </p>
      )}
      {calendarLabel && !calendarWarning && (
        <p className="mt-1 text-[10px] text-slate-500 leading-snug max-w-xs">{calendarLabel}</p>
      )}
      {calendarStats && (
        <p className="mt-0.5 text-[10px] text-emerald-400/80 leading-snug max-w-xs">
          {calendarStats.proposedCount} Terminvorschläge erstellt
          {calendarStats.calendarChecked
            ? ` (${calendarStats.freeCount} von ${calendarStats.targetCount} geprüft frei)`
            : ''}
        </p>
      )}

      {nearbyCustomers.length > 0 && !compact && (
        <div className="mt-1.5">
          <button
            type="button"
            onClick={() => setNearbyOpen((o) => !o)}
            className="flex items-center gap-1 text-[10px] text-sky-400/90 hover:text-sky-300 transition-colors"
          >
            <MapPin className="w-3 h-3 shrink-0" />
            <span>Kunden in der Nähe ({nearbyCustomers.length})</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${nearbyOpen ? 'rotate-180' : ''}`} />
          </button>
          {nearbyOpen && (
            <div className="mt-1.5 max-w-sm rounded-lg border border-sky-500/20 bg-dark-800/60 p-2">
              <ul className="space-y-0.5">
                {nearbyCustomers.map((n) => (
                  <li
                    key={n.customer.id}
                    className="flex items-center justify-between gap-2 px-2 py-1 rounded text-[10px] hover:bg-dark-700/40"
                  >
                    <span className="text-slate-300 truncate">
                      <span className="text-slate-500 mr-1">[{n.customer.priority}]</span>
                      {n.customer.name}
                    </span>
                    <span className="shrink-0 text-sky-400/80">{formatDistanceKm(n.distanceKm)}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => void handlePlanRoute()}
                disabled={routeBusy}
                title="Nahe Kunden in Outlook planen"
                className="mt-2 flex items-center gap-1.5 w-full justify-center px-2 py-1.5 rounded-lg border border-sky-500/30 text-sky-300 hover:bg-sky-500/10 disabled:opacity-50 text-[10px]"
              >
                <Route className="w-3 h-3" />
                {routeBusy ? 'Plane…' : 'Tagesroute planen'}
              </button>
              {routeDay && (
                <p className="mt-1 text-[10px] text-slate-500 text-center">
                  Route geplant für {routeDay.date} ({routeDay.customers.length + 1} Stopps)
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {nearbyCustomers.length > 0 && compact && (
        <button
          type="button"
          onClick={() => void handlePlanRoute()}
          disabled={routeBusy}
          title="Einen Tag wählen und nahe Kunden in Outlook planen"
          className="mt-1 flex items-center gap-1 px-2 py-1 rounded-lg border border-sky-500/30 text-sky-300 hover:bg-sky-500/10 disabled:opacity-50 text-[10px] min-h-[32px]"
        >
          <Route className="w-3 h-3" />
          {routeBusy ? 'Plane…' : 'Tagesroute'}
        </button>
      )}

      {!email && (
        <p className="mt-1 text-[10px] text-amber-400/90">Keine E-Mail – Terminvorschläge nicht möglich</p>
      )}

      {status && (
        <p
          className={`mt-1 flex items-start gap-1 text-[10px] leading-snug max-w-sm ${
            isError ? 'text-red-400' : 'text-emerald-300/90'
          }`}
          role={isError ? 'alert' : undefined}
        >
          {isError && <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />}
          {status}
        </p>
      )}
      {slotOptions.length > 0 && (
        <div className="mt-2 max-w-sm rounded-lg border border-emerald-500/30 bg-dark-800/80 p-2.5">
          <p className="text-[10px] font-medium text-emerald-300 mb-1.5">
            {slotOptions.length} Terminvorschläge
          </p>
          <ul className="space-y-1">
            {slotOptions.map((slot) => (
              <li key={slot.url}>
                <a
                  href={slot.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded border border-slate-700/80 bg-dark-700/50 text-[10px] text-slate-200 hover:border-emerald-500/50 hover:bg-emerald-500/10"
                >
                  <span>{slot.label}</span>
                  <ExternalLink className="w-3 h-3 shrink-0 text-emerald-400" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {previewHtml && previewText && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyPreview(previewHtml, previewText)}
            className="flex items-center gap-1 px-2 py-1 rounded border border-slate-600 text-[10px] text-slate-300 hover:bg-dark-600"
          >
            <Copy className="w-3 h-3" />
            {copied ? 'Kopiert!' : 'E-Mail-Vorschau kopieren'}
          </button>
          {mailtoUrl && (
            <a
              href={mailtoUrl}
              className="flex items-center gap-1 px-2 py-1 rounded border border-slate-600 text-[10px] text-slate-300 hover:bg-dark-600"
            >
              <Mail className="w-3 h-3" />
              In Mail-App öffnen
            </a>
          )}
        </div>
      )}
    </div>
  );
}
