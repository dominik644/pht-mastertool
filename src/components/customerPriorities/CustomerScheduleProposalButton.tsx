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
  buildDefaultProposalSubject,
  buildDefaultCustomMessage,
  buildMailtoBodyFromSlots,
  buildMailtoUrl,
  buildMergedProposalEmail,
  isMailtoUrlTooLong,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  openProposalInOutlook,
  readAttachmentFile,
  toEmlAttachments,
  toGraphAttachments,
  type ScheduleAttachment,
} from '../../services/scheduleEmailCompose';
import { fetchScheduleProposalStatus } from '../../services/scheduleProposal';

const PHT_LOGO_URL = 'https://pht.group/wp-content/uploads/2026/05/PHT-Logo_4C.webp';
const PHT_LOGO_WHITE_URL = 'https://pht.group/wp-content/uploads/2026/05/PHT-Logo_weiss.webp';

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
  const [customMessage, setCustomMessage] = useState('');
  const [emailHtml, setEmailHtml] = useState('');
  const [emailText, setEmailText] = useState('');
  const [mailtoBody, setMailtoBody] = useState('');
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

  const mergedEmail = useMemo(
    () => buildMergedProposalEmail({ html: emailHtml, text: emailText, customMessage }),
    [emailHtml, emailText, customMessage],
  );

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
    const baseBody = mailtoBody || buildMailtoBodyFromSlots(slotOptions, customer.name);
    const body = customMessage.trim()
      ? `${customMessage.trim()}\n\n${baseBody}`
      : baseBody;
    const url = buildMailtoUrl({ to: email, subject, body });
    if (isMailtoUrlTooLong(url)) {
      setIsError(true);
      setStatus('Mail-Link zu lang für die Mail-App – bitte „In Outlook öffnen“ (.eml) nutzen.');
      return;
    }
    window.location.href = url;
    setIsError(false);
    setStatus('Mail-App geöffnet – bitte senden (Plain-Text mit klickbaren Terminlinks)');
    onSent?.();
  };

  const handleOpenInOutlook = () => {
    if (!email || !emailHtml) return;
    openProposalInOutlook({
      to: email,
      subject,
      html: mergedEmail.html,
      text: mergedEmail.text,
      attachments: toEmlAttachments(attachments),
    });
    setStatus(
      attachments.length
        ? `Outlook-Entwurf heruntergeladen (.eml) – Datei öffnen zum Senden (${attachments.length} Anhang/Anhänge enthalten)`
        : 'Outlook-Entwurf heruntergeladen (.eml) – Datei öffnen und senden',
    );
    setIsError(false);
    onSent?.();
  };

  const handleGraphSend = async () => {
    if (!email || !mergedEmail.html) return;
    setSendBusy(true);
    setStatus(null);
    setIsError(false);
    try {
      if (user) {
        await sendEmail({
          to: email,
          subject,
          body: mergedEmail.text,
          html: mergedEmail.html,
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
          body: mergedEmail.text,
          html: mergedEmail.html,
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
      setStatus(err instanceof Error ? err.message : 'Versand fehlgeschlagen – bitte „In Outlook öffnen“ nutzen');
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
    setEmailHtml('');
    setEmailText('');
    setMailtoBody('');
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
          const preview = result.emailPreview;
          if (!preview?.html) {
            setIsError(true);
            setStatus('E-Mail-Vorschau konnte nicht geladen werden – bitte erneut versuchen.');
            return;
          }
          const defaultSubject = preview?.subject ?? buildDefaultProposalSubject(customer.name);
          const defaultMessage = buildDefaultCustomMessage(customer.name, options);
          setSubject(defaultSubject);
          setCustomMessage(defaultMessage);
          setEmailHtml(preview.html);
          setEmailText(preview.text ?? '');
          setMailtoBody(
            preview.mailtoBody ?? buildMailtoBodyFromSlots(options, customer.name),
          );
          setComposeOpen(true);
          setStatus(`${options.length} Terminvorschläge bereit – Vorschau prüfen, dann senden`);
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
        className={`flex items-center gap-1.5 rounded-lg bg-pht-accent text-white font-medium hover:bg-pht-accent-hover disabled:opacity-50 disabled:bg-pht-accent/30 disabled:text-white/70 shadow-sm ${btnClass}`}
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
        <p className="mt-0.5 text-[10px] text-pht-300 leading-snug max-w-xs">
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

      {isError && status && (
        <div
          className="mt-2 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 max-w-2xl"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
          <p className="text-xs text-red-300 leading-snug">{status}</p>
        </div>
      )}

      {status && !isError && (
        <p className="mt-1 text-[10px] text-pht-300 leading-snug max-w-2xl">{status}</p>
      )}

      {composeOpen && email && (
        <div className="mt-3 max-w-4xl rounded border border-pht-500/30 bg-dark-800/95 overflow-hidden shadow-lg shadow-pht-700/10">
          <div className="px-5 py-2.5 border-b border-slate-200/10 bg-white flex items-center justify-between gap-3">
            <img src={PHT_LOGO_URL} alt="PHT Group" className="h-8 w-auto" />
            <div className="flex items-center gap-3 min-w-0 flex-1 justify-end">
              <p className="text-xs font-medium text-slate-600 truncate hidden sm:block">Terminvorschlag · {email}</p>
              <button type="button" onClick={() => setComposeOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="px-5 py-3 border-b border-pht-500/25 bg-pht-700 flex items-center justify-between gap-3" style={{ backgroundImage: 'linear-gradient(135deg, rgba(23,65,125,0.95) 0%, rgba(18,53,96,0.98) 100%)' }}>
            <div className="flex items-center gap-3 min-w-0">
              <img src={PHT_LOGO_WHITE_URL} alt="" className="h-6 w-auto opacity-90 hidden sm:block" aria-hidden="true" />
              <p className="text-sm font-light text-white truncate">Wir sind für Sie da. · {email}</p>
            </div>
          </div>

          <div className="p-5 grid gap-4 lg:grid-cols-[1fr,300px]">
            <div className="space-y-3 min-w-0">
              <label className="block">
                <span className="text-[10px] uppercase tracking-wide text-pht-300/80">Betreff</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg bg-dark-900 border border-pht-500/20 text-sm text-white focus:border-pht-400 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-wide text-pht-300/80">Persönliche Nachricht (optional)</span>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={4}
                  placeholder="z. B. Bezug auf letztes Gespräch, Ansprechpartner … wird in die E-Mail eingefügt."
                  className="mt-1 w-full px-3 py-2.5 rounded-lg bg-dark-900 border border-pht-500/20 text-sm text-white leading-relaxed resize-y min-h-[88px] focus:border-pht-400 focus:outline-none"
                />
              </label>
              <div className="rounded border border-slate-200 overflow-hidden bg-[#f1f3f5]">
                <div className="px-3 py-2 border-b border-slate-200 bg-white flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wide text-pht-700 font-semibold">E-Mail-Vorschau (wie beim Kunden)</span>
                  <span className="text-[10px] text-slate-500">PHT-Design · klickbare Terminlinks</span>
                </div>
                {mergedEmail.html ? (
                  <iframe
                    title="Terminvorschlag E-Mail-Vorschau"
                    srcDoc={mergedEmail.html}
                    sandbox="allow-popups allow-popups-to-escape-sandbox"
                    className="w-full border-0 bg-white"
                    style={{ height: '520px' }}
                  />
                ) : (
                  <p className="p-6 text-sm text-slate-500 text-center">Vorschau wird geladen …</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {slotOptions.length > 0 && (
                <div className="rounded-lg border border-pht-500/25 bg-pht-600/5 p-3">
                  <p className="text-[10px] font-semibold text-pht-300 mb-2 uppercase tracking-wide">{slotOptions.length} Terminlinks</p>
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

              <div className="rounded-lg border border-pht-500/20 bg-dark-900/60 p-3">
                <p className="text-[10px] font-semibold text-pht-300/80 mb-2 flex items-center gap-1 uppercase tracking-wide">
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

          <div className="px-5 py-3.5 border-t border-pht-500/20 bg-pht-700/10 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenInOutlook}
              disabled={!subject.trim() || !mergedEmail.html}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-pht-accent text-white text-xs font-semibold hover:bg-pht-accent-hover disabled:opacity-50"
            >
              <Mail className="w-3.5 h-3.5" />
              In Outlook öffnen
            </button>
            <button
              type="button"
              onClick={handleOpenMailApp}
              disabled={!subject.trim() || slotOptions.length === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-pht-500/40 text-pht-300 text-xs font-semibold hover:bg-pht-600/15 disabled:opacity-50"
            >
              <Mail className="w-3.5 h-3.5" />
              In Mail-App öffnen
            </button>
            {canGraphSend && (
              <button
                type="button"
                onClick={() => void handleGraphSend()}
                disabled={sendBusy || !subject.trim() || !mergedEmail.html}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-pht-500/40 text-pht-300 text-xs font-semibold hover:bg-pht-600/15 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {sendBusy ? 'Sende…' : 'Per Outlook senden'}
              </button>
            )}
            <p className="text-[10px] text-slate-500 w-full">
              „In Outlook öffnen“ lädt eine .eml mit PHT-Design und klickbaren Links. „Mail-App“ nutzt Plain-Text mit 5 vollen URLs (eine pro Zeile).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
