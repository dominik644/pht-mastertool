import { useState } from 'react';
import type { Tender } from '../types/tender';

const LOSS_REASONS = [
  'Preis zu hoch',
  'Technische Anforderungen nicht erfüllt',
  'Lieferzeit / Kapazität',
  'Referenzen fehlend',
  'Eignungskriterien',
  'Kunde hat Bestandslieferant',
  'Sonstiges',
];

interface WinLossModalProps {
  tender: Tender;
  outcome: 'Gewonnen' | 'Verloren';
  onConfirm: (data: { lossReason?: string; competitor?: string; wonValue?: number }) => void;
  onCancel: () => void;
}

export function WinLossModal({ tender, outcome, onConfirm, onCancel }: WinLossModalProps) {
  const [lossReason, setLossReason] = useState(tender.lossReason ?? '');
  const [competitor, setCompetitor] = useState(tender.competitor ?? '');
  const [wonValue, setWonValue] = useState(String(tender.wonValue ?? tender.estimatedValue));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-dark-500 bg-dark-800 p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-white">
          {outcome === 'Gewonnen' ? 'Gewinn dokumentieren' : 'Verlust analysieren'}
        </h3>
        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tender.title}</p>

        {outcome === 'Gewonnen' ? (
          <label className="block mt-4">
            <span className="text-xs text-slate-400">Auftragswert (€)</span>
            <input
              type="number"
              value={wonValue}
              onChange={(e) => setWonValue(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-dark-500 bg-dark-700 text-sm text-white"
            />
          </label>
        ) : (
          <>
            <label className="block mt-4">
              <span className="text-xs text-slate-400">Verlustgrund</span>
              <select
                value={lossReason}
                onChange={(e) => setLossReason(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-dark-500 bg-dark-700 text-sm text-white"
              >
                <option value="">Bitte wählen…</option>
                {LOSS_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="block mt-3">
              <span className="text-xs text-slate-400">Gewinner / Konkurrent</span>
              <input
                type="text"
                value={competitor}
                onChange={(e) => setCompetitor(e.target.value)}
                placeholder="z.B. Ecolab, Diversey…"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-dark-500 bg-dark-700 text-sm text-white"
              />
            </label>
          </>
        )}

        <div className="flex gap-2 mt-6">
          <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-lg border border-dark-500 text-sm text-slate-400 hover:bg-dark-700">
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => onConfirm({
              lossReason: outcome === 'Verloren' ? lossReason : undefined,
              competitor: competitor || undefined,
              wonValue: outcome === 'Gewonnen' ? Number(wonValue) : undefined,
            })}
            disabled={outcome === 'Verloren' && !lossReason}
            className={`flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 ${
              outcome === 'Gewonnen' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
