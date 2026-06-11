import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { WORKFLOW_STAGES } from '../data/workflow';
import { canAdvanceToStage, groupTendersByStatus, isInWorkflow } from '../services/workflow';
import { useTenders } from '../context/TenderContext';
import type { PipelineStatus, Tender } from '../types/tender';
import { WinLossModal } from './WinLossModal';
import { WorkflowCard } from './WorkflowCard';
import { WorkflowHistory } from './WorkflowHistory';
import { Card, CardContent } from './ui/Card';

export function WorkflowMobile() {
  const { allTenders, moveToStage, updateTender } = useTenders();
  const [searchParams] = useSearchParams();
  const [pending, setPending] = useState<{ tender: Tender; status: 'Gewonnen' | 'Verloren' } | null>(null);
  const [gateMsg, setGateMsg] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<PipelineStatus>('Neu');

  const workflowTenders = useMemo(() => allTenders.filter(isInWorkflow), [allTenders]);
  const grouped = useMemo(() => groupTendersByStatus(workflowTenders), [workflowTenders]);
  const activeCount = workflowTenders.filter((t) => t.status !== 'Gewonnen' && t.status !== 'Verloren').length;

  useEffect(() => {
    const stage = searchParams.get('stage') as PipelineStatus | null;
    if (stage && WORKFLOW_STAGES.some((s) => s.status === stage)) {
      setActiveStage(stage);
    }
  }, [searchParams]);

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

  const stageInfo = WORKFLOW_STAGES.find((s) => s.status === activeStage);
  const items = grouped[activeStage] ?? [];

  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="text-xl font-bold text-white">Workflow</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {workflowTenders.length} bewertet · {activeCount} aktiv
        </p>
        {gateMsg && <p className="text-xs text-amber-400 mt-1">{gateMsg}</p>}
      </header>

      <div className="-mx-4 px-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {WORKFLOW_STAGES.map((stage) => {
            const count = grouped[stage.status]?.length ?? 0;
            const active = activeStage === stage.status;
            return (
              <button
                key={stage.status}
                type="button"
                onClick={() => setActiveStage(stage.status)}
                className={`shrink-0 px-3 py-2.5 rounded-xl border text-xs font-medium min-h-[44px] transition-colors ${
                  active
                    ? 'border-pht-500/50 bg-pht-600/20 text-pht-300'
                    : 'border-dark-500/50 bg-dark-700/40 text-slate-400'
                }`}
              >
                {stage.label}
                <span className="ml-1.5 text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {stageInfo && (
        <p className="text-xs text-slate-500 px-1">{stageInfo.description}</p>
      )}

      <div className="space-y-2">
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-600">Keine Einträge in dieser Phase.</CardContent>
          </Card>
        ) : (
          items.map((t) => (
            <WorkflowCard key={t.id} tender={t} onMove={handleMove} />
          ))
        )}
      </div>

      <WorkflowHistory />

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
