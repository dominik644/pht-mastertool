import { CalendarHeart, Check } from 'lucide-react';
import { useState } from 'react';
import {
  acceptCustomRequest,
  formatCustomRequestLabel,
  type ScheduleCustomRequest,
} from '../../services/scheduleProposal';
import { setScheduledVisit } from '../../services/customerVisitStorage';
import { planConfirmedVisitInOutlook } from '../../services/visitOutlookIntegrations';
import type { CustomerPriority } from '../../types/customerPriority';

interface CustomerCustomRequestBadgeProps {
  request: ScheduleCustomRequest;
  customer?: CustomerPriority;
  compact?: boolean;
  onAccepted?: () => void;
}

export function CustomerCustomRequestBadge({
  request,
  customer,
  compact = false,
  onAccepted,
}: CustomerCustomRequestBadgeProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = formatCustomRequestLabel(request.customRequest);

  const handleAccept = async () => {
    setBusy(true);
    setError(null);
    const result = await acceptCustomRequest(request.proposalId);
    if (!result.ok) {
      setError(result.error ?? 'Bestätigung fehlgeschlagen');
      setBusy(false);
      return;
    }
    if (result.customerId && result.scheduledVisit) {
      setScheduledVisit(result.customerId, {
        scheduledVisit: result.scheduledVisit,
        nextDue: result.nextDue ?? request.customRequest.dateFrom,
        notes: result.notes ?? `Wunschtermin bestätigt: ${label}`,
      });
      if (customer) {
        void planConfirmedVisitInOutlook(
          customer,
          result.scheduledVisit,
          request.customerEmail,
        );
      }
    }
    onAccepted?.();
    setBusy(false);
  };

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] text-amber-300 font-medium"
        title={`Wunschtermin: ${label}${request.customRequest.message ? ` – ${request.customRequest.message}` : ''}`}
      >
        <CalendarHeart className="w-3 h-3" />
        Wunschtermin offen
      </span>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2 max-w-sm">
      <div className="flex items-start gap-2">
        <CalendarHeart className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-amber-300 uppercase tracking-wide">Wunschtermin offen</p>
          <p className="text-xs text-slate-200 mt-0.5">{label}</p>
          {request.customRequest.message && (
            <p className="text-[11px] text-slate-400 mt-1 italic">„{request.customRequest.message}"</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void handleAccept()}
        disabled={busy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/90 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
      >
        <Check className="w-3.5 h-3.5" />
        {busy ? 'Bestätige…' : 'Wunschtermin bestätigen'}
      </button>
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  );
}
