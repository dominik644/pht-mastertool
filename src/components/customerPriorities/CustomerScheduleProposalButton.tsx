import { CalendarClock, Copy, ExternalLink, Mail } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CustomerPriority } from '../../types/customerPriority';
import { getCustomerDetails } from '../../services/customerDetailsStorage';
import {
  URGENCY_LABEL,
  type VisitUrgency,
} from '../../services/customerVisitStorage';
import {
  sendScheduleProposal,
  type ScheduleSlotOption,
} from '../../services/scheduleProposal';

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
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [slotOptions, setSlotOptions] = useState<ScheduleSlotOption[]>([]);
  const [mailtoUrl, setMailtoUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const email = useMemo(() => {
    if (customer.contactEmail) return customer.contactEmail;
    return getCustomerDetails(customer.id).ansprechperson.email || null;
  }, [customer]);

  const eligible = urgency === 'overdue' || urgency === 'due_soon';

  if (!eligible) return null;

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

  const handleSend = async () => {
    setBusy(true);
    setStatus(null);
    setPreviewHtml(null);
    setPreviewText(null);
    setSlotOptions([]);
    setMailtoUrl(null);
    try {
      const result = await sendScheduleProposal({
        customerId: customer.id,
        customerEmail: email ?? undefined,
        territory: customer.salesRep ?? undefined,
      });
      if (result.ok) {
        if (result.slotOptions?.length) {
          setSlotOptions(result.slotOptions);
        }
        if (result.preview && result.emailPreview) {
          setPreviewHtml(result.emailPreview.html);
          setPreviewText(result.emailPreview.text);
          setMailtoUrl(result.emailPreview.mailtoUrl ?? null);
          setStatus(result.message ?? 'E-Mail-Vorschau bereit');
        } else {
          setStatus(result.message ?? 'Terminvorschläge gesendet');
          onSent?.();
        }
      } else {
        setStatus(result.error ?? 'Senden fehlgeschlagen');
      }
      if (!result.preview) {
        window.setTimeout(() => setStatus(null), 6000);
      }
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
        {busy ? 'Erstelle…' : 'Terminvorschlag senden'}
      </button>
      {status && (
        <p className="mt-1 text-[10px] text-slate-500 leading-snug max-w-xs">{status}</p>
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
