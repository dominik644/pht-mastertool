import { ExternalLink, GitBranch, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SalesFunnelActivity, SalesFunnelDeal } from '../../types/salesFunnel';
import { SALES_FUNNEL_QUARTERS, SALES_FUNNEL_STATUSES } from '../../types/salesFunnel';
import { updateFunnelDeal } from '../../services/salesFunnelStorage';
import { addFromCustomer, isInPipeline } from '../../services/salesPipelineStorage';
import { Badge } from '../ui/Badge';

interface SalesFunnelDealDrawerProps {
  deal: SalesFunnelDeal | null;
  onClose: () => void;
  onChanged: () => void;
}

function formatEur(n: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export function SalesFunnelDealDrawer({ deal, onClose, onChanged }: SalesFunnelDealDrawerProps) {
  const [draft, setDraft] = useState<SalesFunnelDeal | null>(deal);
  const [activityType, setActivityType] = useState('Anruf');
  const [activityResult, setActivityResult] = useState('');

  useEffect(() => {
    setDraft(deal);
  }, [deal]);

  if (!deal || !draft) return null;

  const save = (patch: Partial<SalesFunnelDeal>) => {
    const next = updateFunnelDeal(deal.id, patch);
    if (next) {
      setDraft(next);
      onChanged();
    }
  };

  const addActivity = () => {
    const activity: SalesFunnelActivity = {
      type: activityType.trim() || 'Aktivität',
      date: new Date().toISOString().slice(0, 10),
      result: activityResult.trim() || undefined,
    };
    save({ activities: [activity, ...draft.activities] });
    setActivityResult('');
  };

  const handleAddToPipeline = () => {
    if (!draft.customerId) return;
    addFromCustomer({
      id: draft.customerId,
      name: draft.customer,
      city: draft.city ?? '',
      country: draft.country ?? 'DE',
      priority: 'B',
      potentialScore: Math.round(draft.volume / 1000) || 10,
    });
  };

  const inPipeline = draft.customerId ? isInPipeline('customer', draft.customerId) : false;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Schließen"
        onClick={onClose}
      />
      <aside className="relative w-full max-w-lg bg-dark-900 border-l border-dark-600/50 h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 p-4 border-b border-dark-600/50 bg-dark-900/95 backdrop-blur">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 uppercase tracking-wide">CRM Deal</p>
            <h2 className="text-lg font-semibold text-white truncate">{draft.customer}</h2>
            {draft.project && <p className="text-sm text-slate-400">{draft.project}</p>}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge variant="muted">{draft.status}</Badge>
              <Badge variant="muted">{draft.quarter}</Badge>
              {draft.sourceType === 'customer' && <Badge variant="muted">Tourenplanung</Badge>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-dark-800 border border-dark-600/40">
              <p className="text-xs text-slate-500">Volumen</p>
              <p className="text-white font-semibold">{formatEur(draft.volume)}</p>
            </div>
            <div className="p-3 rounded-lg bg-dark-800 border border-dark-600/40">
              <p className="text-xs text-slate-500">Forecast</p>
              <p className="text-pht-300 font-semibold">{formatEur(draft.forecast)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {draft.customerId && (
              <Link
                to={`/priorities?q=${encodeURIComponent(draft.customer)}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-pht-500/30 text-pht-300 text-xs hover:bg-pht-600/10"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Kunde in Tourenplanung
              </Link>
            )}
            {draft.customerId && !inPipeline && (
              <button
                type="button"
                onClick={handleAddToPipeline}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dark-500 text-slate-400 text-xs hover:text-white"
              >
                <GitBranch className="w-3.5 h-3.5" />
                Zur Pipeline
              </button>
            )}
            {inPipeline && (
              <Link
                to="/command-center?tab=pipeline"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-pht-500/30 text-pht-300 text-xs"
              >
                <GitBranch className="w-3.5 h-3.5" />
                In Pipeline
              </Link>
            )}
          </div>

          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-slate-400 uppercase">Stammdaten</legend>
            <label className="block text-xs text-slate-500">
              Kunde
              <input
                value={draft.customer}
                onChange={(e) => setDraft({ ...draft, customer: e.target.value })}
                onBlur={() => save({ customer: draft.customer })}
                className="mt-1 w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block text-xs text-slate-500">
              Projekt
              <input
                value={draft.project}
                onChange={(e) => setDraft({ ...draft, project: e.target.value })}
                onBlur={() => save({ project: draft.project })}
                className="mt-1 w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs text-slate-500">
                Angebots-Nr.
                <input
                  value={draft.offerNumber ?? ''}
                  onChange={(e) => setDraft({ ...draft, offerNumber: e.target.value || undefined })}
                  onBlur={() => save({ offerNumber: draft.offerNumber })}
                  className="mt-1 w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white font-mono"
                />
              </label>
              <label className="block text-xs text-slate-500">
                Ansprechpartner
                <input
                  value={draft.contactPerson ?? ''}
                  onChange={(e) => setDraft({ ...draft, contactPerson: e.target.value || undefined })}
                  onBlur={() => save({ contactPerson: draft.contactPerson })}
                  className="mt-1 w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs text-slate-500">
                Status
                <select
                  value={draft.status}
                  onChange={(e) => save({ status: e.target.value })}
                  className="mt-1 w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {[...new Set([...SALES_FUNNEL_STATUSES, draft.status])].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-slate-500">
                Quartal
                <select
                  value={draft.quarter}
                  onChange={(e) => save({ quarter: e.target.value })}
                  className="mt-1 w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {[...new Set([...SALES_FUNNEL_QUARTERS, draft.quarter])].map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs text-slate-500">
                Volumen (€)
                <input
                  type="number"
                  value={draft.volume}
                  onChange={(e) => setDraft({ ...draft, volume: Number(e.target.value) })}
                  onBlur={() => save({ volume: draft.volume })}
                  className="mt-1 w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-xs text-slate-500">
                Gewinnwahrscheinlichkeit (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={draft.winProbability}
                  onChange={(e) => setDraft({ ...draft, winProbability: Number(e.target.value) })}
                  onBlur={() => save({ winProbability: draft.winProbability })}
                  className="mt-1 w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs text-slate-500">
                Vorr. Abschluss
                <input
                  type="date"
                  value={draft.expectedClose ?? ''}
                  onChange={(e) => save({ expectedClose: e.target.value || undefined })}
                  className="mt-1 w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-xs text-slate-500">
                Nachfassen bis
                <input
                  type="date"
                  value={draft.followUpUntil ?? ''}
                  onChange={(e) => save({ followUpUntil: e.target.value || undefined })}
                  className="mt-1 w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white"
                />
              </label>
            </div>
            <label className="block text-xs text-slate-500">
              Notizen
              <textarea
                value={draft.notes ?? ''}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value || undefined })}
                onBlur={() => save({ notes: draft.notes })}
                rows={3}
                className="mt-1 w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white resize-y"
              />
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-slate-400 uppercase">Aktivitäten</legend>
            <div className="flex flex-wrap gap-2">
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="bg-dark-800 border border-dark-500 rounded-lg px-2 py-1.5 text-xs text-white"
              >
                {['Anruf', 'Termin', 'E-Mail', 'Angebot', 'Nachfassen'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                value={activityResult}
                onChange={(e) => setActivityResult(e.target.value)}
                placeholder="Ergebnis / Notiz"
                className="flex-1 min-w-[140px] bg-dark-800 border border-dark-500 rounded-lg px-2 py-1.5 text-xs text-white"
              />
              <button
                type="button"
                onClick={addActivity}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pht-600 text-white text-xs hover:bg-pht-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Hinzufügen
              </button>
            </div>
            {draft.activities.length === 0 ? (
              <p className="text-xs text-slate-600">Noch keine Aktivitäten erfasst.</p>
            ) : (
              <ul className="space-y-2">
                {draft.activities.map((a, i) => (
                  <li key={`${a.type}-${a.date}-${i}`} className="text-xs p-2 rounded-lg bg-dark-800/60 border border-dark-600/30">
                    <span className="text-white font-medium">{a.type}</span>
                    {a.date && <span className="text-slate-500 ml-2">{a.date}</span>}
                    {a.result && <p className="text-slate-400 mt-0.5">{a.result}</p>}
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
        </div>
      </aside>
    </div>
  );
}
