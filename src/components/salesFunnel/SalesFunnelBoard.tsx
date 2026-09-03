import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SalesFunnelDeal, SalesFunnelStatus } from '../../types/salesFunnel';
import { SALES_FUNNEL_STATUSES } from '../../types/salesFunnel';
import {
  computeFunnelMetrics,
  deleteFunnelDeal,
  loadAllFunnelDeals,
  SALES_FUNNEL_CHANGED_EVENT,
  updateFunnelDeal,
} from '../../services/salesFunnelStorage';
import { SalesFunnelDealDrawer } from './SalesFunnelDealDrawer';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Trash2 } from 'lucide-react';

function formatEur(n: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE');
}

interface SalesFunnelBoardProps {
  deals: SalesFunnelDeal[];
  readOnly?: boolean;
  showOwner?: boolean;
  onChanged?: () => void;
  initialDealId?: string | null;
}

export function SalesFunnelBoard({ deals, readOnly, showOwner, onChanged, initialDealId }: SalesFunnelBoardProps) {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(initialDealId ?? null);
  const metrics = useMemo(() => computeFunnelMetrics(deals), [deals]);

  useEffect(() => {
    if (initialDealId) setSelectedDealId(initialDealId);
  }, [initialDealId]);

  const selectedDeal = useMemo(
    () => deals.find((d) => d.id === selectedDealId) ?? null,
    [deals, selectedDealId],
  );

  const filtered = useMemo(() => {
    if (!statusFilter) return deals;
    return deals.filter((d) => d.status === statusFilter);
  }, [deals, statusFilter]);

  const refresh = () => onChanged?.();

  const handleStatusChange = (id: string, status: SalesFunnelStatus) => {
    updateFunnelDeal(id, { status });
    refresh();
  };

  const handleProbChange = (id: string, winProbability: number) => {
    updateFunnelDeal(id, { winProbability });
    refresh();
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Deal aus dem Funnel entfernen?')) return;
    deleteFunnelDeal(id);
    refresh();
  };

  if (deals.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-slate-500 text-sm">
          Noch keine Funnel-Einträge. Import aus Excel oder neuen Deal anlegen.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
        <div className="p-3 rounded-lg bg-dark-800 border border-dark-500/50">
          <span className="text-slate-500 block">Aktiv</span>
          <span className="text-white font-semibold text-lg">{metrics.activeCount}</span>
        </div>
        <div className="p-3 rounded-lg bg-dark-800 border border-dark-500/50">
          <span className="text-slate-500 block">Volumen</span>
          <span className="text-white font-semibold text-lg">{formatEur(metrics.pipelineVolume)}</span>
        </div>
        <div className="p-3 rounded-lg bg-dark-800 border border-dark-500/50">
          <span className="text-slate-500 block">Forecast</span>
          <span className="text-pht-300 font-semibold text-lg">{formatEur(metrics.weightedForecast)}</span>
        </div>
        <div className="p-3 rounded-lg bg-dark-800 border border-dark-500/50">
          <span className="text-slate-500 block">Gewonnen</span>
          <span className="text-emerald-400 font-semibold text-lg">{formatEur(metrics.wonVolume)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter(null)}
          className={`px-2.5 py-1 rounded-full text-xs border ${!statusFilter ? 'border-pht-500/50 bg-pht-600/20 text-pht-300' : 'border-dark-500 text-slate-500'}`}
        >
          Alle ({deals.length})
        </button>
        {SALES_FUNNEL_STATUSES.map((s) => {
          const count = metrics.byStatus[s] ?? 0;
          if (!count && s !== 'In Bearbeitung' && s !== 'Umsetzung 2027') return null;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-full text-xs border ${statusFilter === s ? 'border-pht-500/50 bg-pht-600/20 text-pht-300' : 'border-dark-500 text-slate-500'}`}
            >
              {s} ({count})
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-white">Deals ({filtered.length})</h2>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[900px]">
            <thead>
              <tr className="text-slate-500 border-b border-dark-600/50">
                {showOwner && <th className="py-2 pr-3">Verkäufer</th>}
                <th className="py-2 pr-3">Nr.</th>
                <th className="py-2 pr-3">Kunde / Projekt</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3 text-right">Volumen</th>
                <th className="py-2 pr-3 text-right">W%</th>
                <th className="py-2 pr-3 text-right">Forecast</th>
                <th className="py-2 pr-3">Abschluss</th>
                <th className="py-2 pr-3">Q</th>
                {!readOnly && <th className="py-2" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-dark-700/40 hover:bg-dark-800/40 cursor-pointer"
                  onClick={() => setSelectedDealId(d.id)}
                >
                  {showOwner && (
                    <td className="py-2.5 pr-3 text-slate-400 capitalize">{d.ownerKey}</td>
                  )}
                  <td className="py-2.5 pr-3 text-slate-300 font-mono">{d.offerNumber ?? '—'}</td>
                  <td className="py-2.5 pr-3">
                    <p className="text-white font-medium">
                      {d.customerId ? (
                        <Link
                          to={`/priorities?q=${encodeURIComponent(d.customer)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-pht-300"
                        >
                          {d.customer}
                        </Link>
                      ) : (
                        d.customer
                      )}
                    </p>
                    <p className="text-slate-500">{d.project}</p>
                    {d.contactPerson && <p className="text-slate-600">{d.contactPerson}</p>}
                    {d.followUpUntil && (
                      <p className="text-amber-500/80 text-[10px] mt-0.5">
                        Nachfassen: {formatDate(d.followUpUntil)}
                      </p>
                    )}
                  </td>
                  <td className="py-2.5 pr-3" onClick={(e) => e.stopPropagation()}>
                    {readOnly ? (
                      <Badge variant="muted">{d.status}</Badge>
                    ) : (
                      <select
                        value={d.status}
                        onChange={(e) => handleStatusChange(d.id, e.target.value)}
                        className="bg-dark-900 border border-dark-500 rounded px-1.5 py-1 text-white text-xs"
                      >
                        {[...new Set([...SALES_FUNNEL_STATUSES, d.status])].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-white tabular-nums">{formatEur(d.volume)}</td>
                  <td className="py-2.5 pr-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {readOnly ? (
                      <span className="text-slate-300">{d.winProbability}%</span>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={d.winProbability}
                        onChange={(e) => handleProbChange(d.id, Number(e.target.value))}
                        className="w-14 bg-dark-900 border border-dark-500 rounded px-1 py-0.5 text-right text-white"
                      />
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-pht-300 tabular-nums">{formatEur(d.forecast)}</td>
                  <td className="py-2.5 pr-3 text-slate-400">{formatDate(d.expectedClose)}</td>
                  <td className="py-2.5 pr-3"><Badge variant="muted">{d.quarter}</Badge></td>
                  {!readOnly && (
                    <td className="py-2.5" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => handleDelete(d.id)} className="text-red-400 hover:text-red-300 p-1" title="Löschen">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <SalesFunnelDealDrawer
        deal={selectedDeal}
        onClose={() => setSelectedDealId(null)}
        onChanged={refresh}
      />
    </div>
  );
}

export function useFunnelDealsRefresh(): [SalesFunnelDeal[], () => void] {
  const [deals, setDeals] = useState(loadAllFunnelDeals);
  const refresh = () => setDeals(loadAllFunnelDeals());

  useEffect(() => {
    const onChange = () => refresh();
    window.addEventListener(SALES_FUNNEL_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(SALES_FUNNEL_CHANGED_EVENT, onChange);
  }, []);

  return [deals, refresh];
}
