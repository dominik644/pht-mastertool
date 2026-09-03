import { Check, Copy, Mail, ExternalLink } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CustomerPriority } from '../../types/customerPriority';
import { getCustomerDetails } from '../../services/customerDetailsStorage';

const OUTREACH_TEMPLATE = `Sehr geehrte Damen und Herren,

wir unterstützen Lebensmittelbetriebe mit industriellen Wasch-, Hygiene- und Schleusen-Anlagen.

Gerne würde ich einen kurzen Termin für ein persönliches Gespräch vereinbaren.

Mit freundlichen Grüßen
Dominik Weller
PHT`;

interface CustomerOutreachActionsProps {
  customer: CustomerPriority;
}

export function CustomerOutreachActions({ customer }: CustomerOutreachActionsProps) {
  const [copied, setCopied] = useState(false);

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

  return (
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
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-pht-500/40 text-xs text-pht-300 hover:bg-pht-600/10"
        >
          <Mail className="w-3 h-3" /> In Outlook öffnen
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
  );
}

export { OUTREACH_TEMPLATE };
