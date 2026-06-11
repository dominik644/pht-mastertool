import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { WORKFLOW_STAGES } from '../data/workflow';
import { canAdvanceToStage, groupTendersByStatus, isInWorkflow } from '../services/workflow';
import { useTenders } from '../context/TenderContext';
import type { PipelineStatus, Tender } from '../types/tender';
import { WinLossModal } from './WinLossModal';
import { WorkflowCard } from './WorkflowCard';

export function WorkflowBoard() {
  const { allTenders, moveToStage, updateTender } = useTenders();
  const [searchParams] = useSearchParams();
  const [pending, setPending] = useState<{ tender: Tender; status: 'Gewonnen' | 'Verloren' } | null>(null);
  const [gateMsg, setGateMsg] = useState<string | null>(null);

  useEffect(() => {
    const stage = searchParams.get('stage');
    if (stage) {
      document.getElementById(`workflow-stage-${stage}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [searchParams]);

  const workflowTenders = useMemo(() => allTenders.filter(isInWorkflow), [allTenders]);
  const grouped = useMemo(() => groupTendersByStatus(workflowTenders), [workflowTenders]);
  const activeCount = workflowTenders.filter((t) => t.status !== 'Gewonnen' && t.status !== 'Verloren').length;

  const handleMove = (id: string, status: PipelineStatus) => {
    const tender = allTenders.find((t) => t.id === id);
    if (!tender) return;

    if (status === 'Gewonnen' || status === 'Verloren') {
      setPending({ tender, status });
      return;
    }

    const gate = canAdvanceToStage(tender, status);
    if (!gate.ok) {
      setGateMsg(gate.reason ?? 'Checklist unvollständig');
      setTimeout(() => setGateMsg(null), 4000);
      return;
    }
    moveToStage(id, status);
  };

  const confirmOutcome = (data: { lossReason?: string; competitor?: string; wonValue?: number }) => {
    if (!pending) return;
    updateTender(pending.tender.id, data);
    moveToStage(pending.tender.id, pending.status, data.lossReason ?? `Gewonnen: ${data.wonValue ?? ''}€`);
    setPending(null);
  };

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Ausschreibungs-Workflow</h1>
        <p className="text-slate-400 mt-1 text-sm">
          {workflowTenders.length} bewertete Ausschreibungen · {activeCount} aktiv
          <span className="text-slate-600 ml-2">· Bid-Checklist-Gates aktiv</span>
        </p>
        {gateMsg && <p className="text-xs text-amber-400 mt-2">{gateMsg}</p>}
      </header>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {WORKFLOW_STAGES.map((stage) => {
          const items = grouped[stage.status];
          return (
            <div id={`workflow-stage-${stage.status}`} key={stage.status} className="shrink-0 w-72 rounded-xl border border-dark-500/50 bg-dark-700/50 flex flex-col max-h-[calc(100vh-12rem)]">
              <div className="p-3 border-b border-dark-500/50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-white">{stage.label}</h3>
                  <span className="text-xs font-medium bg-dark-600 px-2 py-0.5 rounded-full text-slate-400">{items.length}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{stage.description}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {items.length === 0 ? <p className="text-xs text-slate-600 text-center py-6">Leer</p> : items.map((t) => (
                  <WorkflowCard key={t.id} tender={t} onMove={handleMove} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {pending && (
        <WinLossModal
          tender={pending.tender}
          outcome={pending.status}
          onConfirm={confirmOutcome}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
