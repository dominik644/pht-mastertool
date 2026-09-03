import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CustomerPriority } from '../../types/customerPriority';
import { createFunnelDeal, winProbabilityFromPriority } from '../../services/salesFunnelStorage';
import { getCustomerDetails } from '../../services/customerDetailsStorage';

interface SalesFunnelAddDealDialogProps {
  open: boolean;
  ownerKey: string;
  customers: CustomerPriority[];
  preselectedCustomerId?: string | null;
  onClose: () => void;
  onCreated: () => void;
}

export function SalesFunnelAddDealDialog({
  open,
  ownerKey,
  customers,
  preselectedCustomerId,
  onClose,
  onCreated,
}: SalesFunnelAddDealDialogProps) {
  const preselected = preselectedCustomerId
    ? customers.find((c) => c.id === preselectedCustomerId)
    : undefined;

  const [mode, setMode] = useState<'customer' | 'manual'>(preselected ? 'customer' : 'customer');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CustomerPriority | null>(preselected ?? null);
  const [customerName, setCustomerName] = useState(preselected?.name ?? '');
  const [project, setProject] = useState('');
  const [volume, setVolume] = useState(
    preselected ? String(Math.round(preselected.potentialScore * 1000)) : '10000',
  );
  const [winProbability, setWinProbability] = useState(
    preselected ? String(winProbabilityFromPriority(preselected.priority)) : '50',
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 12);
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [customers, query]);

  if (!open) return null;

  const handleCreate = () => {
    if (mode === 'customer' && selected) {
      const details = getCustomerDetails(selected.id);
      const contact =
        details.ansprechperson.name?.trim() ||
        selected.contactEmail?.trim() ||
        undefined;
      createFunnelDeal(ownerKey, {
        customerId: selected.id,
        sourceType: 'customer',
        customer: selected.name,
        project: project.trim(),
        city: selected.city,
        country: selected.country,
        contactPerson: contact,
        status: 'In Bearbeitung',
        quarter: 'NEU',
        volume: Number(volume) || Math.round(selected.potentialScore * 1000),
        winProbability: Number(winProbability) || winProbabilityFromPriority(selected.priority),
        forecast: 0,
        activities: [{
          type: 'Lead angelegt',
          date: new Date().toISOString().slice(0, 10),
        }],
        notes: `Priorität ${selected.priority} · ${selected.city}`,
      });
    } else {
      const name = customerName.trim();
      if (!name) return;
      createFunnelDeal(ownerKey, {
        sourceType: 'manual',
        customer: name,
        project: project.trim(),
        status: 'In Bearbeitung',
        quarter: 'NEU',
        volume: Number(volume) || 0,
        winProbability: Number(winProbability) || 50,
        forecast: 0,
        activities: [],
      });
    }
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-dark-900 border border-dark-600/50 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-dark-600/50">
          <h2 className="text-lg font-semibold text-white">Neuer Funnel-Deal</h2>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('customer')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium border ${
                mode === 'customer'
                  ? 'border-pht-500/50 bg-pht-600/20 text-pht-300'
                  : 'border-dark-500 text-slate-500'
              }`}
            >
              Aus Tourenplanung
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium border ${
                mode === 'manual'
                  ? 'border-pht-500/50 bg-pht-600/20 text-pht-300'
                  : 'border-dark-500 text-slate-500'
              }`}
            >
              Manuell
            </button>
          </div>

          {mode === 'customer' ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Kunde suchen…"
                  className="w-full pl-9 pr-3 py-2.5 bg-dark-800 border border-dark-500 rounded-lg text-sm text-white"
                />
              </div>
              <ul className="max-h-48 overflow-y-auto space-y-1">
                {matches.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(c);
                        setCustomerName(c.name);
                        setVolume(String(Math.round(c.potentialScore * 1000)));
                        setWinProbability(String(winProbabilityFromPriority(c.priority)));
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selected?.id === c.id
                          ? 'bg-pht-600/20 border border-pht-500/40 text-white'
                          : 'hover:bg-dark-800 text-slate-300 border border-transparent'
                      }`}
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-slate-500 text-xs ml-2">
                        {c.city} · Prio {c.priority}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <label className="block text-xs text-slate-500">
              Kundenname
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-1 w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white"
              />
            </label>
          )}

          <label className="block text-xs text-slate-500">
            Projekt
            <input
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="mt-1 w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-slate-500">
              Volumen (€)
              <input
                type="number"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="mt-1 w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block text-xs text-slate-500">
              Wahrscheinlichkeit (%)
              <input
                type="number"
                min={0}
                max={100}
                value={winProbability}
                onChange={(e) => setWinProbability(e.target.value)}
                className="mt-1 w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-dark-600/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-dark-500 text-slate-400 text-sm hover:text-white"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={mode === 'customer' ? !selected : !customerName.trim()}
            className="px-4 py-2 rounded-lg bg-pht-600 text-white text-sm font-medium hover:bg-pht-700 disabled:opacity-40"
          >
            Deal anlegen
          </button>
        </div>
      </div>
    </div>
  );
}
