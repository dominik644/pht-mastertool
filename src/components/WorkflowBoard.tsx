import { useMemo } from 'react';
import { WORKFLOW_STAGES } from '../data/workflow';
import { groupTendersByStatus, isInWorkflow } from '../services/workflow';
import { useTenders } from '../context/TenderContext';
import { WorkflowCard } from './WorkflowCard';

export function WorkflowBoard() {
  const { allTenders, moveToStage } = useTenders();
  const workflowTenders = useMemo(() => allTenders.filter(isInWorkflow), [allTenders]);
  const grouped = useMemo(() => groupTendersByStatus(workflowTenders), [workflowTenders]);
  const activeCount = workflowTenders.filter((t) => t.status !== 'Gewonnen' && t.status !== 'Verloren').length;

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Ausschreibungs-Workflow</h1>
        <p className="text-slate-400 mt-1 text-sm">{workflowTenders.length} bewertete Ausschreibungen · {activeCount} aktiv</p>
      </header>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {WORKFLOW_STAGES.map((stage) => {
          const items = grouped[stage.status];
          return (
            <div key={stage.status} className="shrink-0 w-72 rounded-xl border border-dark-500/50 bg-dark-700/50 flex flex-col max-h-[calc(100vh-12rem)]">
              <div className="p-3 border-b border-dark-500/50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-white">{stage.label}</h3>
                  <span className="text-xs font-medium bg-dark-600 px-2 py-0.5 rounded-full text-slate-400">{items.length}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{stage.description}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {items.length === 0 ? <p className="text-xs text-slate-600 text-center py-6">Leer</p> : items.map((t) => (
                  <WorkflowCard key={t.id} tender={t} onMove={(id, status) => moveToStage(id, status)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
