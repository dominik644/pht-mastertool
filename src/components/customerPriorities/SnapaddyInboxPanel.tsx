import { CreditCard, Plus, UserPlus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CustomerPriority } from '../../types/customerPriority';
import type { SnapaddyCard } from '../../types/snapaddy';
import { matchSnapaddyCard } from '../../lib/snapaddyMatch';
import {
  applySnapaddyAsNewCustomer,
  applySnapaddyToExisting,
  fetchSnapaddyInbox,
  markSnapaddyCard,
} from '../../services/snapaddyInbox';

interface SnapaddyInboxPanelProps {
  customers: CustomerPriority[];
  ownerName: string;
  focusId?: string | null;
  onApplied: () => void;
}

export function SnapaddyInboxPanel({
  customers,
  ownerName,
  focusId,
  onApplied,
}: SnapaddyInboxPanelProps) {
  const [cards, setCards] = useState<SnapaddyCard[]>([]);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    void fetchSnapaddyInbox().then((incoming) => {
      const packed = new URLSearchParams(window.location.search).get('card');
      if (packed) {
        try {
          const padded = packed.replace(/-/g, '+').replace(/_/g, '/');
          const b64 = padded + '='.repeat((4 - (padded.length % 4)) % 4);
          const decoded = JSON.parse(atob(b64)) as SnapaddyCard;
          if (decoded?.id && !incoming.some((c) => c.id === decoded.id)) {
            incoming = [decoded, ...incoming];
          }
        } catch { /* ignore */ }
      }
      setCards(incoming);
    });
  };

  useEffect(() => {
    load();
  }, [focusId]);

  const visible = useMemo(() => {
    if (!focusId) return cards;
    const focused = cards.filter((c) => c.id === focusId);
    return focused.length ? focused : cards;
  }, [cards, focusId]);

  if (!visible.length) return null;

  const handleNew = async (card: SnapaddyCard) => {
    setBusyId(card.id);
    applySnapaddyAsNewCustomer(card, ownerName);
    await markSnapaddyCard(card.id, 'applied');
    setCards((prev) => prev.filter((c) => c.id !== card.id));
    setBusyId(null);
    onApplied();
  };

  const handleAssign = async (card: SnapaddyCard, customer: CustomerPriority) => {
    setBusyId(card.id);
    applySnapaddyToExisting(card, customer);
    await markSnapaddyCard(card.id, 'applied');
    setCards((prev) => prev.filter((c) => c.id !== card.id));
    setAssignFor(null);
    setBusyId(null);
    onApplied();
  };

  const handleDismiss = async (id: string) => {
    await markSnapaddyCard(id, 'dismissed');
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="mb-4 rounded-xl border border-pht-500/30 bg-pht-600/10 p-3 space-y-3">
      <p className="text-sm font-semibold text-white flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-pht-300" />
        Snapaddy Visitenkarten ({visible.length})
      </p>
      {visible.map((card) => {
        const matches = matchSnapaddyCard(card, customers);
        const pickList = search.trim()
          ? customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
          : matches.map((m) => customers.find((c) => c.id === m.customerId)).filter(Boolean) as CustomerPriority[];

        return (
          <div key={card.id} className="rounded-lg border border-dark-500/60 bg-dark-800/80 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-white font-medium">{card.company || card.fullName || 'Kontakt'}</p>
                <p className="text-xs text-slate-400">
                  {[card.fullName, card.role].filter(Boolean).join(' · ')}
                </p>
                <p className="text-xs text-slate-500">
                  {[card.email, card.phone, `${card.zip} ${card.city}`.trim()].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleDismiss(card.id)}
                className="text-slate-500 hover:text-white p-1"
                aria-label="Ablehnen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {matches.length > 0 && assignFor !== card.id && (
              <p className="text-[11px] text-pht-300">
                Ähnlich: {matches.map((m) => `${m.customerName} (${m.reason})`).join(' · ')}
              </p>
            )}

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={busyId === card.id}
                onClick={() => void handleNew(card)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-pht-600 text-white text-xs font-medium hover:bg-pht-700 disabled:opacity-50"
              >
                <Plus className="w-3 h-3" />
                Neuer Kunde
              </button>
              <button
                type="button"
                onClick={() => setAssignFor((id) => (id === card.id ? null : card.id))}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dark-500 text-slate-300 text-xs hover:bg-dark-700"
              >
                <UserPlus className="w-3 h-3" />
                Zu bestehendem Kunden
              </button>
            </div>

            {assignFor === card.id && (
              <div className="space-y-1.5">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Kunde suchen…"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-dark-900 border border-dark-500 text-xs text-white"
                />
                <ul className="max-h-40 overflow-y-auto space-y-0.5">
                  {pickList.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        disabled={busyId === card.id}
                        onClick={() => void handleAssign(card, c)}
                        className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-dark-700"
                      >
                        {c.name}
                        <span className="text-slate-600"> · {c.zip} {c.city}</span>
                      </button>
                    </li>
                  ))}
                  {pickList.length === 0 && (
                    <li className="text-[11px] text-slate-500 px-2 py-1">Kein Treffer – Suche anpassen oder als neuen Kunden anlegen.</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
