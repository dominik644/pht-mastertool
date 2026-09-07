import { Check, Copy, ExternalLink } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CustomerPriority } from '../../types/customerPriority';
import { getCustomerDetails } from '../../services/customerDetailsStorage';

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

  const copyEmail = async () => {
    if (!email) return;
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!email) {
    return null;
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
