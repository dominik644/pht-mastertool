import { useMemo, useState } from 'react';
import {
  computePipelineMetrics,
  deletePipelineEntry,
  groupByStage,
  loadPipelineEntries,
  updatePipelineEntry,
} from '../services/salesPipelineStorage';
import type { SalesPipelineStage } from '../types/salesPipeline';
import { SALES_PIPELINE_STAGES } from '../types/salesPipeline';
import { PipelineCard } from './PipelineCard';
import { GoalProgressBar } from './GoalProgressBar';
import { EmptyState } from './ui/EmptyState';
import { GitBranch } from 'lucide-react';

export function PipelineBoard() {
  const [entries, setEntries] = useState(loadPipelineEntries);

  const refresh = () => setEntries(loadPipelineEntries());

  const groups = useMemo(() => groupByStage(entries), [entries]);
  const metrics = useMemo(() => computePipelineMetrics(entries), [entries]);

  const handleMove = (id: string, stage: SalesPipelineStage) => {
    updatePipelineEntry(id, { stage });
    refresh();
  };

  const handleUpdate = (id: string, patch: Parameters<typeof updatePipelineEntry>[1]) => {
    updatePipelineEntry(id, patch);
    refresh();
  };

  const handleDelete = (id: string) => {
    deletePipelineEntry(id);
    refresh();
  };

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={GitBranch}
        title="Noch keine Pipeline-Einträge"
        description="Fügen Sie Ausschreibungen oder News-Leads per Ein-Klick aus dem Drawer oder der Opportunities-Seite hinzu."
      />
    );
  }

  return (
    <div className="space-y-6">
      <GoalProgressBar
        current={metrics.wonValue + metrics.weightedForecast}
        label="Fortschritt zum 1-Mio.-€-Ziel (Gewonnen + gewichteter Forecast)"
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center text-xs">
        <div className="p-3 rounded-lg bg-dark-800 border border-dark-500/50">
          <span className="text-slate-500 block">Aktiv</span>
          <span className="text-white font-semibold text-lg">{metrics.activeDeals}</span>
        </div>
        <div className="p-3 rounded-lg bg-dark-800 border border-dark-500/50">
          <span className="text-slate-500 block">Pipeline</span>
          <span className="text-white font-semibold text-lg">{(metrics.pipelineValue / 1000).toFixed(0)}k €</span>
        </div>
        <div className="p-3 rounded-lg bg-dark-800 border border-dark-500/50">
          <span className="text-slate-500 block">Forecast</span>
          <span className="text-pht-300 font-semibold text-lg">{(metrics.weightedForecast / 1000).toFixed(0)}k €</span>
        </div>
        <div className="p-3 rounded-lg bg-dark-800 border border-dark-500/50">
          <span className="text-slate-500 block">Gewonnen</span>
          <span className="text-emerald-400 font-semibold text-lg">{(metrics.wonValue / 1000).toFixed(0)}k €</span>
        </div>
        <div className="p-3 rounded-lg bg-dark-800 border border-dark-500/50 col-span-2 sm:col-span-1">
          <span className="text-slate-500 block">Win-Rate</span>
          <span className="text-white font-semibold text-lg">{metrics.winRate}%</span>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
        {SALES_PIPELINE_STAGES.map(({ stage, label, color }) => (
          <div key={stage} className={`min-w-[220px] max-w-[260px] shrink-0 rounded-xl border p-3 ${color}`}>
            <header className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">{label}</h3>
              <span className="text-xs text-slate-500 bg-dark-800/80 px-2 py-0.5 rounded-full">
                {groups[stage]?.length ?? 0}
              </span>
            </header>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {(groups[stage] ?? []).map((entry) => (
                <PipelineCard
                  key={entry.id}
                  entry={entry}
                  onMove={handleMove}
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
