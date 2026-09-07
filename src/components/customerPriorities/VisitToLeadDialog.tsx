import { GitBranch, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { CustomerPriority } from '../../types/customerPriority';
import { addFromCustomerToFunnel } from '../../services/salesFunnelStorage';

interface VisitToLeadDialogProps {
  customer: CustomerPriority;
  ownerKey: string;
  onClose: () => void;
  onCreated?: () => void;
}

export function VisitToLeadDialog({ customer, ownerKey, onClose, onCreated }: VisitToLeadDialogProps) {
  const [project, setProject] = useState('');
  const [busy, setBusy] = useState(false);
  const [dealId, setDealId] = useState<string | null>(null);

  const handleCreate = () => {
    setBusy(true);
    const deal = addFromCustomerToFunnel(
      ownerKey,
      customer,
      project.trim() || 'Nach Besuch',
    );
    setDealId(deal.id);
    setBusy(false);
    onCreated?.();
  };

  if (dealId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-dark-800 p-5 shadow-xl">
          <p className="text-sm font-semibold text-white flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-emerald-400" />
            Lead im Sales Funnel angelegt
          </p>
          <p className="text-xs text-slate-400 mt-2">{customer.name}</p>
          <div className="flex gap-2 mt-4">
            <Link
              to={`/sales-funnel?deal=${dealId}`}
              className="flex-1 text-center px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500"
              onClick={onClose}
            >
              Zum Funnel
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-dark-500 text-slate-400 text-xs hover:text-white"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-pht-500/30 bg-dark-800 p-5 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-white">Besuch erfasst</p>
            <p className="text-xs text-slate-400 mt-1">Lead im Sales Funnel anlegen?</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-pht-300 mt-3 font-medium">{customer.name}</p>
        <p className="text-xs text-slate-500">{customer.city} · Priorität {customer.priority}</p>
        <label className="block mt-4">
          <span className="text-xs text-slate-500">Projekt / Notiz (optional)</span>
          <input
            type="text"
            value={project}
            onChange={(e) => setProject(e.target.value)}
            placeholder="z. B. Hygiene-Audit, Käferfarm-Einstieg …"
            className="mt-1 w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-500 text-sm text-white"
          />
        </label>
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={handleCreate}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-pht-600 text-white text-xs font-semibold hover:bg-pht-500 disabled:opacity-50"
          >
            <GitBranch className="w-3.5 h-3.5" />
            Lead anlegen
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-dark-500 text-slate-400 text-xs hover:text-white"
          >
            Nur Besuch
          </button>
        </div>
      </div>
    </div>
  );
}
