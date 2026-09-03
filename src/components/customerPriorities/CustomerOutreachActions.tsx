import { Check, Copy, Mail, ExternalLink } from 'lucide-react';
import { useMemo, useState, type MouseEvent } from 'react';
import type { CustomerPriority } from '../../types/customerPriority';
import { getCustomerDetails } from '../../services/customerDetailsStorage';
import type { VisitUrgency } from '../../services/customerVisitStorage';

const OUTREACH_TEMPLATE = `Sehr geehrte Damen und Herren,

wir unterstützen Lebensmittelbetriebe mit industriellen Wasch-, Hygiene- und Schleusen-Anlagen.

Gerne würde ich einen kurzen Termin für ein persönliches Gespräch vereinbaren.

Mit freundlichen Grüßen
Dominik Weller
PHT`;

interface CustomerOutreachActionsProps {
  customer: CustomerPriority;
  urgency?: VisitUrgency;
}

export function CustomerOutreachActions({ customer, urgency }: CustomerOutreachActionsProps) {
  const [copied, setCopied] = useState(false);
  const [outreachHint, setOutreachHint] = useState(false);
  const needsScheduleHint = urgency === 'overdue' || urgency === 'due_soon';

  const email = useMemo(() => {
    if (customer.contactEmail) return customer.contactEmail;
    const details = getCustomerDetails(customer.id);
    return details.ansprechperson.email || null;
  }, [customer]);

  const mailtoHref = useMemo(() => {
    if (!email) return null;
    const subject = encodeURIComponent(`PHT – Hygiene-Anlagen für ${customer.name}`);
    const body = encodeURIComponent(OUTREACH_TEMPLATE);
    return `mailto:${email}?subject=${subject}&body=${body}`;
  }, [email, customer.name]);

  const copyEmail = async () => {
    if (!email) return;
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!email) {
    return (
      <p className="text-[10px] text-slate-600">
        Keine E-Mail – Enrichment läuft im Hintergrund oder manuell unter Stammdaten.
      </p>
    );
  }

  const handleOutreachClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!needsScheduleHint) return;
    const useGeneric = window.confirm(
      'Dieses Anschreiben enthält keine Terminlinks.\n\n'
      + 'Für überfällige Besuche bitte oben „Terminvorschlag senden" verwenden – '
      + 'der Kunde erhält 5 buchbare Termin-Slots per Link.\n\n'
      + 'Trotzdem allgemeines Anschreiben öffnen?',
    );
    if (!useGeneric) {
      e.preventDefault();
      setOutreachHint(true);
      window.setTimeout(() => setOutreachHint(false), 8000);
    }
  };

  return (
    <div className="space-y-1.5">
      {needsScheduleHint && (
        <p className="text-[10px] text-amber-400/90 leading-snug">
          Termin vereinbaren? Oben <strong>Terminvorschlag senden</strong> – nicht dieses allgemeine Anschreiben.
        </p>
      )}
      {outreachHint && (
        <p className="text-[10px] text-emerald-400/90">
          Tipp: Grüner Button „Terminvorschlag senden" erzeugt 5 buchbare Terminlinks.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400 truncate max-w-[200px]" title={email}>{email}</span>
        <button
          type="button"
          onClick={() => void copyEmail()}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dark-500 text-xs text-slate-400 hover:text-white"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Kopiert' : 'E-Mail kopieren'}
        </button>
        {mailtoHref && (
          <a
            href={mailtoHref}
            onClick={handleOutreachClick}
            title="Allgemeines Vertriebs-Anschreiben ohne Terminbuchungs-Links"
            className="flex flex-col items-start gap-0 px-2 py-1 rounded-lg border border-slate-600/60 text-xs text-slate-400 hover:bg-dark-700 hover:text-slate-200"
          >
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3 shrink-0" />
              Allgemeines Anschreiben
            </span>
            <span className="text-[9px] text-slate-600 pl-4">ohne Terminlinks · Outlook</span>
          </a>
        )}
        {customer.enrichmentSource && (
          <a
            href={customer.enrichmentSource}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-400"
            title={`Angereichert ${customer.enrichedAt ? new Date(customer.enrichedAt).toLocaleDateString('de-DE') : ''}`}
          >
            <ExternalLink className="w-3 h-3" /> Quelle
          </a>
        )}
      </div>
    </div>
  );
}

export { OUTREACH_TEMPLATE };
