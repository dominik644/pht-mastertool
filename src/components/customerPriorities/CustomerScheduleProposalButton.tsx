import {
  AlertCircle, AlertTriangle, CalendarClock, ChevronDown, ExternalLink, Mail, MapPin, Paperclip, Route, Send, X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { sendEmail } from '../../services/microsoftGraph';
import {
  buildDefaultProposalBody,
  buildDefaultProposalSubject,
  buildMailtoUrl,
  formatAttachmentList,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  readAttachmentFile,
  toGraphAttachments,
  type ScheduleAttachment,
} from '../../services/scheduleEmailCompose';
import { fetchScheduleProposalStatus } from '../../services/scheduleProposal';

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
  const [sendBusy, setSendBusy] = useState(false);
  const [routeBusy, setRouteBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [slotOptions, setSlotOptions] = useState<ScheduleSlotOption[]>([]);
  const [attachments, setAttachments] = useState<ScheduleAttachment[]>([]);
  const [serverGraphMail, setServerGraphMail] = useState(false);
  const [calendarResult, setCalendarResult] = useState<CalendarBusyResult | null>(null);
  const [calendarStats, setCalendarStats] = useState<ScheduleCalendarStats | null>(null);
  const [routeDay, setRouteDay] = useState<{ date: string; customers: NearbyCustomer[] } | null>(null);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visitStore = useMemo(() => loadVisitStore(), []);
  const canGraphSend = Boolean(user) || serverGraphMail;

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
    void fetchScheduleProposalStatus().then((s) => setServerGraphMail(s.email === true && !s.emailPreviewFallback));
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

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const next = [...attachments];
    for (const file of Array.from(files)) {
      if (next.length >= MAX_ATTACHMENTS) break;
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setStatus(`${file.name} ist zu groß (max. 5 MB)`);
        setIsError(true);
        continue;
      }
      const att = await readAttachmentFile(file);
      if (att) next.push(att);
    }
    setAttachments(next);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenMailApp = () => {
    if (!email) return;
    const url = buildMailtoUrl({ to: email, subject, body });
    window.location.href = url;
    setStatus(
      attachments.length
        ? `Mail-App geöffnet – Anhänge manuell hinzufügen: ${formatAttachmentList(attachments)}`
        : 'Mail-App geöffnet – bitte senden',
    );
    onSent?.();
  };

  const handleGraphSend = async () => {
    if (!email) return;
    setSendBusy(true);
    setStatus(null);
    setIsError(false);
    try {
      if (user) {
        await sendEmail({
          to: email,
          subject,
          body,
          attachments: toGraphAttachments(attachments),
        });
        setStatus(`E-Mail an ${email} gesendet${attachments.length ? ` (${attachments.length} Anhang/Anhänge)` : ''}`);
        setComposeOpen(false);
        onSent?.();
        return;
      }

      const res = await fetch('/api/schedule-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject,
          body,
          attachments: attachments.map(({ name, contentType, contentBytes }) => ({
            name,
            contentType,
            contentBytes,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? 'Versand fehlgeschlagen');
      }
      setStatus(`E-Mail an ${email} gesendet`);
      setComposeOpen(false);
      onSent?.();
    } catch (err) {
      setIsError(true);
      setStatus(err instanceof Error ? err.message : 'Versand fehlgeschlagen – bitte „In Mail-App öffnen“ nutzen');
    } finally {
      setSendBusy(false);
    }
  };

  const handleSend = async () => {
    setBusy(true);
    setStatus(null);
    setIsError(false);
    setComposeOpen(false);
    setSlotOptions([]);
    setAttachments([]);
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
        const options = result.slotOptions ?? [];
        if (options.length) setSlotOptions(options);
        if (result.preview || result.emailPreview) {
          const defaultSubject = result.emailPreview?.subject
            ?? buildDefaultProposalSubject(customer.name);
          const defaultBody = result.emailPreview?.text
            ?? buildDefaultProposalBody(customer.name, options);
          setSubject(defaultSubject);
          setBody(defaultBody);
          setComposeOpen(true);
          setStatus(`${options.length} Terminvorschläge bereit – Betreff und Nachricht prüfen, dann senden`);
        } else {
          setStatus(result.message ?? 'Terminvorschläge gesendet');
          onSent?.();
        }
      } else {
        setIsError(true);
        if (result.configured === false) {
          setStatus(result.error ?? 'Terminvorschläge sind auf dem Server noch nicht eingerichtet.');
        } else if (result.error?.includes('Keine Kunden-E-Mail')) {
          setStatus('Keine E-Mail-Adresse hinterlegt – bitte unter Stammdaten ergänzen.');
        } else if (result.error?.includes('Keine freien Termine')) {
          setStatus('Keine freien Termine in den nächsten 2 Wochen – Kalender prüfen.');
        } else {
          setStatus(result.error ?? 'Terminvorschlag konnte nicht erstellt werden.');
        }
      }
    } catch {
      setIsError(true);
      setStatus('Verbindung zum Server fehlgeschlagen.');
    } finally {
      setBusy(false);
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
          {msConfigured ? 'Bitte bei Microsoft anmelden.' : 'MS Graph konfigurieren.'}
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
                  <li key={n.customer.id} className="flex items-center justify-between gap-2 px-2 py-1 rounded text-[10px] hover:bg-dark-700/40">
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
          className={`mt-1 flex items-start gap-1 text-[10px] leading-snug max-w-2xl ${
            isError ? 'text-red-400' : 'text-emerald-300/90'
          }`}
          role={isError ? 'alert' : undefined}
        >
          {isError && <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />}
          {status}
        </p>
      )}

      {composeOpen && email && (
        <div className="mt-3 max-w-2xl rounded-xl border border-emerald-500/25 bg-dark-800/90 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-dark-600/60 bg-dark-700/40 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-emerald-300">E-Mail an {email}</p>
            <button type="button" onClick={() => setComposeOpen(false)} className="text-slate-500 hover:text-slate-300 p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 grid gap-3 sm:grid-cols-[1fr,auto]">
            <div className="space-y-3 min-w-0">
              <label className="block">
                <span className="text-[10px] uppercase tracking-wide text-slate-500">Betreff</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-dark-900 border border-dark-600 text-sm text-white"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-wide text-slate-500">Nachricht</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={12}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-dark-900 border border-dark-600 text-sm text-white font-mono leading-relaxed resize-y min-h-[200px]"
                />
              </label>
            </div>

            <div className="sm:w-52 space-y-3">
              {slotOptions.length > 0 && (
                <div className="rounded-lg border border-dark-600/60 bg-dark-900/60 p-2">
                  <p className="text-[10px] font-semibold text-slate-400 mb-1.5">{slotOptions.length} Terminlinks</p>
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {slotOptions.map((slot) => (
                      <li key={slot.url}>
                        <a
                          href={slot.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-pht-400 hover:text-pht-300 truncate"
                        >
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          {slot.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-lg border border-dark-600/60 bg-dark-900/60 p-2">
                <p className="text-[10px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  Anhänge ({attachments.length}/{MAX_ATTACHMENTS})
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => void handleFiles(e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={attachments.length >= MAX_ATTACHMENTS}
                  className="w-full px-2 py-1.5 rounded border border-dashed border-dark-500 text-[10px] text-slate-400 hover:border-pht-500/40 hover:text-slate-300 disabled:opacity-50"
                >
                  Datei wählen (PDF, Bild · max. 5 MB)
                </button>
                {attachments.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {attachments.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-1 text-[10px] text-slate-400">
                        <span className="truncate">{f.name}</span>
                        <button type="button" onClick={() => removeAttachment(i)} className="text-slate-600 hover:text-red-400">
                          <X className="w-3 h-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="px-4 py-3 border-t border-dark-600/60 bg-dark-700/30 flex flex-wrap items-center gap-2">
            {canGraphSend ? (
              <button
                type="button"
                onClick={() => void handleGraphSend()}
                disabled={sendBusy || !subject.trim() || !body.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {sendBusy ? 'Sende…' : 'Per Outlook senden'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenMailApp}
                disabled={!subject.trim() || !body.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5" />
                In Mail-App öffnen
              </button>
            )}
            {canGraphSend && (
              <button
                type="button"
                onClick={handleOpenMailApp}
                disabled={!subject.trim() || !body.trim()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dark-500 text-slate-400 text-xs hover:bg-dark-700 disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5" />
                In Mail-App öffnen
              </button>
            )}
            {attachments.length > 0 && !canGraphSend && (
              <p className="text-[10px] text-amber-400/90 w-full">
                Anhänge manuell hinzufügen: {formatAttachmentList(attachments)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
