import { CalendarClock } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CustomerPriority } from '../../types/customerPriority';
import { getCustomerDetails } from '../../services/customerDetailsStorage';
import {
  URGENCY_LABEL,
  type VisitUrgency,
} from '../../services/customerVisitStorage';
import { sendScheduleProposal } from '../../services/scheduleProposal';

interface CustomerScheduleProposalButtonProps {
  customer: CustomerPriority;
  urgency: VisitUrgency;
  onSent?: () => void;
}

export function CustomerScheduleProposalButton({
  customer,
  urgency,
  onSent,
}: CustomerScheduleProposalButtonProps) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const email = useMemo(() => {
    if (customer.contactEmail) return customer.contactEmail;
    return getCustomerDetails(customer.id).ansprechperson.email || null;
  }, [customer]);

  const eligible = urgency === 'overdue' || urgency === 'due_soon';

  if (!eligible) return null;

  const handleSend = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const result = await sendScheduleProposal({
        customerId: customer.id,
        customerEmail: email ?? undefined,
        territory: customer.salesRep ?? undefined,
      });
      if (result.ok) {
        setStatus(result.message ?? 'Terminvorschläge gesendet');
        onSent?.();
      } else {
        setStatus(result.error ?? 'Senden fehlgeschlagen');
      }
      window.setTimeout(() => setStatus(null), 6000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleSend()}
        disabled={busy || !email}
        title={
          email
            ? `Terminvorschläge per E-Mail an ${email} (${URGENCY_LABEL[urgency]})`
            : 'Keine Kunden-E-Mail hinterlegt'
        }
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50 text-xs min-h-[36px]"
      >
        <CalendarClock className="w-3.5 h-3.5" />
        {busy ? 'Sende…' : 'Terminvorschlag senden'}
      </button>
      {status && (
        <p className="mt-1 text-[10px] text-slate-500 leading-snug max-w-xs">{status}</p>
      )}
    </div>
  );
}
